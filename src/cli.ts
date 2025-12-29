import { confirm, intro, log, outro, spinner } from '@clack/prompts'
import { link } from 'ansi-escapes'
import cac from 'cac'
import { glob } from 'glob'
import pc from 'picocolors'
import {
    clearBackups,
    createBackup,
    deleteBackup,
    formatBackupTime,
    getLatestBackup,
    listBackups,
    restoreBackup,
} from '@/backup.ts'
import { resolveConfig } from '@/config.ts'
import { CATALOG_PLACEHOLDER } from '@/constant.ts'
import { resolvePackageDependencies } from '@/dependencies.ts'
import { printTable, scanDependencyUsage, stringifyYamlWithTopLevelBlankLine, writeFile } from '@/utils.ts'
import { batchProcessCatalog, getWorkSpaceYaml } from '@/work.space.ts'
import { name, version } from '../package.json'

const cli = cac(name)

// 主命令
cli
    .command('')
    .option('--cwd <path>', 'Specify the working directory')
    .action(async (options: { cwd?: string }) => {
        try {
            const config = resolveConfig(options.cwd)
            const packagePathMap = await glob(['package.json', '*/**/package.json'], {
                cwd: config.cwd,
                ignore: ['**/node_modules/**'],
            })

            intro(pc.bgCyan(` Pnpm workspace catalog category manage [v${version}]`))

            const workSpaceYaml = await getWorkSpaceYaml(config)

            // 扫描依赖使用情况
            const usageMap = scanDependencyUsage(config, packagePathMap)

            // 批量处理 catalog
            const workspace = await batchProcessCatalog({
                ...config,
                ...workSpaceYaml,
                usageMap,
            })

            // 只有在进行了分类操作且确认保存后才进行后续处理
            if (!workspace) {
                return ''
            }

            // 收集要修改的文件路径
            const pkgFiles = resolvePackageDependencies(
                config,
                packagePathMap,
                workspace,
            )

            const updatedFiles = pkgFiles.used.filter(i => i.isUpdate)

            if (!updatedFiles.length) {
                outro('由于您可能选择了未使用到的依赖包，因此未能匹配到 package.json ,所以此进程将结束.')
                printTable(
                    workspace.catalogs.categories?.reduce(
                        (
                            acc: {
                                Dependencies: string
                                Catalog: string
                            }[],
                            category,
                        ) => {
                            for (const pkg of category.packages) {
                                acc.push({
                                    Dependencies: pkg,
                                    Catalog: `catalog:${category.name}`,
                                })
                            }
                            return acc
                        },
                        [],
                    ),
                )
                process.exit(0)
            }

            const filesToBackup = [
                workspace.path,
                ...updatedFiles.map(i => i.path),
            ]

            const s = spinner({
                indicator: 'timer',
            })
            s.start('pnpm-workspace.yaml processing...')

            // 创建备份
            const categoryNames
                = workspace.catalogs.categories?.map(c => c.name).join(', ') || ''
            const backupId = createBackup(
                config,
                filesToBackup,
                `创建分类: ${categoryNames}`,
            )
            log.info(
                `已备份 ${filesToBackup.length} 个文件，如需恢复请执行: ${pc.cyan(
                    'pcc undo',
                )}`,
            )

            // 更新 package.json 中的依赖版本
            updatedFiles.forEach((i) => {
                writeFile(i.path, i.context)
            })
            // log.success(`已更新 ${updatedFiles.length} 个 package.json 文件`)

            writeFile(
                workspace.path,
                stringifyYamlWithTopLevelBlankLine(workspace.context),
            )
            // log.success('已更新 pnpm-workspace.yaml')

            s.stop(`Done. Congratulations, you have successfully managed. Back ID: ${pc.dim(backupId)}`)

            // 显示已成功更新的 package.json 详情
            console.log()
            updatedFiles.forEach((i) => {
                intro(`[update: ${link(pc.blue(pc.bold(i.path.replace(config.cwd, ''))), `file://${i.path}`)}]`)
                printTable(i.dependencies.map(d => ({
                    Dependencies: pc.yellow(d.dependency),
                    Catalog: `${CATALOG_PLACEHOLDER}${pc.blue(d.version.replace(CATALOG_PLACEHOLDER, ''))}`,
                })))
            })

            // 显示未使用到的依赖
            if (pkgFiles.unused) {
                intro(pc.red('当前您存在选择但未使用上的依赖包'))
                printTable(pkgFiles.unused.map(i => ({
                    Dependencies: pc.yellow(i.dependency),
                    Catalog: `${CATALOG_PLACEHOLDER}${pc.blue(i.version.replace(CATALOG_PLACEHOLDER, ''))}`,
                })))
            }
        }
        catch (e) {
            outro(e as string)
        }
    })

// undo 命令
cli
    .command('undo [backupId]', 'Restore files from backup')
    .option('--list', 'List all backups')
    .option('--clear', 'Clear all backups')
    .option('--delete <id>', 'Delete a specific backup')
    .option('--cwd <path>', 'Specify the working directory')
    .action(
        async (
            backupId: string | undefined,
            options: {
                list?: boolean
                clear?: boolean
                delete?: string
                cwd?: string
            },
        ) => {
            const config = resolveConfig(options.cwd)

            intro(pc.bgCyan(` Pnpm workspace catalog - Undo [v${version}]`))

            if (options.list) {
                const backups = listBackups(config)

                if (backups.length === 0) {
                    log.warn('没有找到任何备份')
                    outro('')
                    return
                }

                log.info(`共找到 ${backups.length} 个备份:\n`)

                for (const backup of backups) {
                    const { manifest } = backup
                    console.log(`  ${pc.cyan(manifest.id)}`)
                    console.log(`    时间: ${formatBackupTime(manifest.timestamp)}`)
                    console.log(`    文件: ${manifest.files.length} 个`)
                    if (manifest.description) {
                        console.log(`    描述: ${manifest.description}`)
                    }
                    console.log('')
                }

                outro('')
                return
            }

            if (options.clear) {
                const backups = listBackups(config)

                if (backups.length === 0) {
                    log.warn('没有找到任何备份')
                    outro('')
                    return
                }

                const confirmed = await confirm({
                    message: `确认删除所有 ${backups.length} 个备份？`,
                })

                if (!confirmed) {
                    outro('已取消')
                    return
                }

                const deletedCount = clearBackups(config)
                log.success(`已删除 ${deletedCount} 个备份`)
                outro('')
                return
            }

            if (options.delete) {
                const success = deleteBackup(config, options.delete)

                if (success) {
                    log.success(`已删除备份: ${options.delete}`)
                }
                else {
                    log.error(`未找到备份: ${options.delete}`)
                }

                outro('')
                return
            }

            const backup = backupId
                ? listBackups(config).find(b => b.manifest.id === backupId)
                : getLatestBackup(config)

            if (!backup) {
                log.error(backupId ? `未找到备份: ${backupId}` : '没有找到任何备份')
                outro('')
                return
            }

            const { manifest } = backup

            log.info('备份信息:')
            console.log(`  ID: ${pc.cyan(manifest.id)}`)
            console.log(`  时间: ${formatBackupTime(manifest.timestamp)}`)
            console.log(`  描述: ${manifest.description || '(无)'}`)
            console.log(`  文件:`)
            for (const file of manifest.files) {
                console.log(`    - ${file.relativePath}`)
            }
            console.log('')

            const confirmed = await confirm({
                message: `确认恢复这 ${manifest.files.length} 个文件？`,
            })

            if (!confirmed) {
                outro('已取消')
                return
            }

            const restoredCount = restoreBackup(config, manifest.id)

            if (restoredCount >= 0) {
                log.success(`已恢复 ${restoredCount} 个文件`)

                const shouldDelete = await confirm({
                    message: '是否删除该备份？',
                    initialValue: false,
                })

                if (shouldDelete) {
                    deleteBackup(config, manifest.id)
                    log.info('备份已删除')
                }
            }
            else {
                log.error('恢复失败')
            }

            outro('')
        },
    )

cli.help()
cli.version(version)
cli.parse()
