import type { Option } from '@clack/prompts'
import type {
    AllCatalogsType,
    CatalogsContextType,
    IConfig,
    IWorkSpace,
    IWorkSpaceConfig,
    IWorkSpaceContext,
    IWorkSpaceYaml,
    ProcessCatalogOptionsType,
} from '@/types'
import { readFile } from 'node:fs/promises'
import { confirm, multiselect, outro, select, text } from '@clack/prompts'
import boxen from 'boxen'
import { findUp } from 'find-up'
import pc from 'picocolors'
import { parse, stringify } from 'yaml'
import { CANCEL_PROCESS, DEFAULT_CATALOGS } from '@/constant.ts'
import { formatDependencyUsage, isCancelProcess, packageSort } from '@/utils.ts'

export const getWorkSpaceYaml = async (config: IConfig): Promise<IWorkSpace> => {
    const workSpaceYamlPath = await findUp('pnpm-workspace.yaml', {
        cwd: config.cwd,
    })

    if (!workSpaceYamlPath) {
        throw new Error('pnpm-workspace.yaml is not currently used, please check your current project before using this CLI tool!')
    }

    return {
        workSpaceYamlPath,
        workspace: parse(await readFile(workSpaceYamlPath, 'utf-8')),
    }
}
export const updateCatalogsWithContext = (options: CatalogsContextType) => {
    const { choice, context, catalogsName, dependencies } = options
    // Remove the selected key from context.catalog
    choice.forEach((key: string) => {
        delete context.catalog![key]
    })

    // Make sure context.catalogs exists
    if (!context.catalogs) {
        context.catalogs = {}
    }

    // Check if the node exists; if it does, merge; if it doesn't, create
    if (context.catalogs[catalogsName]) {
        context.catalogs[catalogsName] = packageSort({
            ...context.catalogs[catalogsName],
            ...dependencies,
        })
        // console.log(`✅ ${choice.length} packages have been merged into the catalogs.${catalogsName} node`)
    }
    else {
        context.catalogs[catalogsName] = packageSort(dependencies)
        // console.log(`✅ ${choice.length} packages have been added to the catalogs.${catalogsName} node`)
    }
    return context
}

interface ConfirmModifyOptions {
    allCatalogs: AllCatalogsType[]
    config: IWorkSpaceConfig
    context: IWorkSpaceYaml
}

/**
 * final confirmation to save all changes
 */
export const confirmModify = async (options: ConfirmModifyOptions): Promise<IWorkSpaceContext | null> => {
    const { allCatalogs, config, context } = options
    if (allCatalogs.length === 0) {
        outro(CANCEL_PROCESS)
        return null
    }

    const finalConfirm = await confirm({
        message: `Are you sure write the latest management configuration to the ${pc.yellow('pnpm-workspace.yaml')} file?`,
    }) as boolean

    isCancelProcess(finalConfirm, CANCEL_PROCESS)

    if (!finalConfirm) {
        outro('❌ All changes will be discarded because the user cancels saving!')
        return null
    }

    // For batch processing, complete information for all classifications is returned
    const allDependencies: Record<string, string> = {}
    const catalogNames: string[] = []

    allCatalogs.forEach((catalog) => {
        catalogNames.push(catalog.name)
        Object.assign(allDependencies, catalog.dependencies)
    })

    return {
        path: config.workSpaceYamlPath,
        context: stringify(context, {
            indent: 2,
            lineWidth: 0,
            minContentWidth: 0,
        }),
        catalogs: {
            choice: allCatalogs.flatMap(c => c.choice),
            name: catalogNames.join(', '),
            dependencies: allDependencies,
            categories: allCatalogs.map(c => ({
                name: c.name,
                packages: c.choice,
                dependencies: c.dependencies,
            })),
        },
    }
}

async function getCatalogName(
    catalogs: IWorkSpaceYaml['catalogs'],
): Promise<string> {
    const existingCatalogs = Object.keys(catalogs || {})
    const CUSTOM_CATALOG_NAME = '__new__'

    const options: Option<string>[] = existingCatalogs.map((key) => {
        const inlay = DEFAULT_CATALOGS.find(i => i.name.toLowerCase() === key.toLowerCase())

        return {
            label: key.toLowerCase(),
            value: key.toLowerCase(),
            hint: inlay?.descriptions,
        }
    })

    DEFAULT_CATALOGS.forEach((c) => {
        const isDuplicate = options.some(o => o.label === c.name)

        if (!isDuplicate) {
            options.push({
                label: c.name,
                value: c.name,
                hint: c.descriptions,
            })
        }
    })

    options.push({
        label: 'create a new catalog name?',
        value: CUSTOM_CATALOG_NAME,
    })

    let catalogsName = await select({
        message: 'Please select or customize catalog name',
        options: Array.from(new Set([...options])),
    }) as string

    isCancelProcess(catalogsName, CANCEL_PROCESS)

    if (catalogsName === CUSTOM_CATALOG_NAME) {
        catalogsName = await text({
            message: 'Please enter custom catalog name:',
            placeholder: '',
            validate: (value) => {
                if (!value || !value.trim())
                    return 'catalog name cannot be empty.'
                if (options.map(i => i.label).includes(value.trim()))
                    return 'this catalog name already exists, please select it from the list.'
            },
        }) as string
    }

    return catalogsName
}

const processCatalog = async (options: ProcessCatalogOptionsType) => {
    const { context, allCatalogs, usageMap } = options
    let continueProcessing = true

    while (continueProcessing) {
        const remainingKeys = Object.keys(context.catalog || {})

        if (remainingKeys.length === 0) {
            outro('✅ All dependencies have been assigned a catalog name.')
            break
        }

        // console.log(`\n${remainingKeys.length} remaining to be processed:`)
        // remainingKeys.forEach((key) => {
        //     console.log(`  - ${key}: ${context.catalog![key]}`)
        // })

        const choice = await multiselect({
            message: 'Please select the dependencies you want to manage (if not, press Enter to skip this round)',
            options: remainingKeys.map((key) => {
                const version = context.catalog![key]
                return {
                    value: key,
                    label: `${key} (${version})`,
                    hint: usageMap ? formatDependencyUsage(usageMap, key) : '',
                }
            }),
            required: false,
        }) as string[]

        isCancelProcess(choice, CANCEL_PROCESS)

        if (!choice || choice.length === 0) {
            // console.log('No packet was selected for this round')
        }
        else {
            const catalogsName = await getCatalogName(context.catalogs)

            isCancelProcess(catalogsName, CANCEL_PROCESS)

            if (catalogsName && catalogsName.trim()) {
                // Match the selection with the catalog to get the key: value version number
                const dependencies: Record<string, string> = {}
                choice.forEach((key: string) => {
                    dependencies[key] = context.catalog![key]!
                })

                // console.log(`The category "${catalogsName}" will contain the following packages:`)
                // Object.entries(dependencies).forEach(([key, version]) => {
                //     console.log(`  - ${key}: ${version}`)
                // })

                // confirm operation
                const confirmed = await confirm({
                    message: `Do you place the selected dependencies in the \`${pc.red(catalogsName)}\` category?`,
                }) as boolean

                isCancelProcess(confirmed, CANCEL_PROCESS)

                if (confirmed)
                    updateCatalogsWithContext({ choice, context, catalogsName, dependencies })
                if (confirmed) {
                    // save the operation result of this round
                    allCatalogs.push({ choice, name: catalogsName, dependencies })
                }
            }
        }

        // Ask whether to continue processing
        if (Object.keys(context.catalog || {}).length > 0) {
            continueProcessing = await confirm({
                message: 'Do you continue to manage the remaining dependencies?',
                initialValue: false,
            }) as boolean

            isCancelProcess(continueProcessing, CANCEL_PROCESS)
        }
        else {
            continueProcessing = false
        }
    }
}

export const batchProcessCatalog = async (config: IWorkSpaceConfig): Promise<IWorkSpaceContext | null> => {
    const context = config.workspace
    if (!context.catalog) {
        outro('')
        console.log(boxen(
            `If you have an existing workspace that you want to migrate to using catalogs,
you can use the following codemod:
Run "pnpx codemod pnpm/catalog"`,
            {
                title: 'Warning',
                padding: 1,
                margin: 0,
                borderStyle: 'round',
                borderColor: 'yellow',
            },
        ))
        return null
    }

    const catalog = context.catalog
    const catalogKeys = Object.keys(catalog)

    if (catalogKeys.length === 0) {
        outro('✅ The catalog is not currently in the pnpm-workspace.yaml file, so it cannot be managed.')
        return null
    }

    // // Ask if batch management is required
    // const shouldBatch = await confirm({
    //     message: `We detected ${catalogKeys.length} dependencies in the catalog. Do you want to batch catalog?`,
    // }) as boolean
    //
    // if (!shouldBatch) {
    //     console.log('❌ The user chooses to skip batch management')
    //     return null
    // }

    // console.log(`dependencies list:`)
    // catalogKeys.forEach((key) => {
    //     console.log(`  - ${key}: ${catalog[key]}`)
    // })

    const allCatalogs: AllCatalogsType[] = []

    await processCatalog({ allCatalogs, context, usageMap: config.usageMap })
    return await confirmModify({ allCatalogs, config, context })
}
