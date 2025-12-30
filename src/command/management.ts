import type { IConfig } from '@/types'
import { intro, log, outro, spinner } from '@clack/prompts'
import { link } from 'ansi-escapes'
import { glob } from 'glob'
import pc from 'picocolors'
import { createBackup } from '@/backup.ts'
import { CATALOG_PLACEHOLDER } from '@/constant.ts'
import { resolvePackageDependencies } from '@/dependencies.ts'
import { printTable, scanDependencyUsage, stringifyYamlWithTopLevelBlankLine, writeFile } from '@/utils.ts'
import { batchProcessCatalog, getWorkSpaceYaml } from '@/work.space.ts'
import { version } from '../../package.json'

export const managementWorkSpaceCatalog = async (config: IConfig): Promise<void | string> => {
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
    if (pkgFiles.unused.length) {
        intro(pc.red('当前您存在选择但未使用上的依赖包'))
        printTable(pkgFiles.unused.map(i => ({
            Dependencies: pc.yellow(i.dependency),
            Catalog: `${CATALOG_PLACEHOLDER}${pc.blue(i.version.replace(CATALOG_PLACEHOLDER, ''))}`,
        })))
    }
}
