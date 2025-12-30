import { confirm, intro, log, outro } from '@clack/prompts'
import cac from 'cac'
import pc from 'picocolors'
import {
    clearBackups,
    deleteBackup,
    formatBackupTime,
    getLatestBackup,
    listBackups,
    restoreBackup,
} from '@/backup.ts'
import { managementWorkSpaceCatalog } from '@/command/management.ts'
import { resolveConfig } from '@/config.ts'
import { name, version } from '../package.json'

const cli = cac(name)

// 主命令
cli
    .command('')
    .option('--cwd <path>', 'Specify the working directory')
    .action(async (options: { cwd?: string }) => {
        try {
            const config = resolveConfig(options.cwd)
            await managementWorkSpaceCatalog(config)
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
