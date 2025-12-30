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

    // scanning depends on usage
    const usageMap = scanDependencyUsage(config, packagePathMap)

    // batch processing catalog
    const workspace = await batchProcessCatalog({
        ...config,
        ...workSpaceYaml,
        usageMap,
    })

    // only after the classification operation has been carried out
    // and the saving has been confirmed will subsequent processing be conducted
    if (!workspace) {
        return ''
    }

    // collect the file path to be modified
    const pkgFiles = resolvePackageDependencies(
        config,
        packagePathMap,
        workspace,
    )

    const updatedFiles = pkgFiles.used.filter(i => i.isUpdate)

    if (!updatedFiles.length) {
        outro(pc.red('⚠️ Since you might have selected an unused dependency package, the package.json did not match, so this process will end.'))
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

    // create a backup
    const categoryNames
        = workspace.catalogs.categories?.map(c => c.name).join(', ') || ''
    const backupId = createBackup(
        config,
        filesToBackup,
        `categories: ${categoryNames}`,
    )
    log.info(
        `Current operation has been backed up, if you want to restore, please run: ${pc.cyan(
            'pcc undo',
        )}`,
    )

    // Update the dependency versions in package.json
    updatedFiles.forEach((i) => {
        writeFile(i.path, i.context)
    })
    // log.success(`Updated ${updatedFiles.length} package.json files`)

    writeFile(
        workspace.path,
        stringifyYamlWithTopLevelBlankLine(workspace.context),
    )
    // log.success('done. updated pnpm-workspace.yaml')

    s.stop(`Done. Congratulations, you have successfully managed. Back ID: ${pc.dim(backupId)}`)

    // show the details of the successfully updated package.json
    console.log()
    updatedFiles.forEach((i) => {
        intro(`[update: ${link(pc.blue(pc.bold(i.path.replace(config.cwd, ''))), `file://${i.path}`)}]`)
        printTable(i.dependencies.map(d => ({
            Dependencies: pc.yellow(d.dependency),
            Catalog: `${CATALOG_PLACEHOLDER}${pc.blue(d.version.replace(CATALOG_PLACEHOLDER, ''))}`,
        })))
    })

    // shows unused dependencies
    if (pkgFiles.unused.length) {
        intro(pc.red('You currently have selected but unused dependencies:'))
        printTable(pkgFiles.unused.map(i => ({
            Dependencies: pc.yellow(i.dependency),
            Catalog: `${CATALOG_PLACEHOLDER}${pc.blue(i.version.replace(CATALOG_PLACEHOLDER, ''))}`,
        })))
    }
}
