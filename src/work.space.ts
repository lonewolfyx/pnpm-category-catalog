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
import { parse, stringify } from 'yaml'
import { CANCEL_PROCESS, DEFAULT_CATALOGS } from '@/constant.ts'
import { formatDependencyUsage, isCancelProcess } from '@/utils.ts'

export const getWorkSpaceYaml = async (config: IConfig): Promise<IWorkSpace> => {
    const workSpaceYamlPath = await findUp('pnpm-workspace.yaml', {
        cwd: config.cwd,
    })

    if (!workSpaceYamlPath) {
        throw new Error('当前暂未使用 pnpm-workspace.yaml 相关功能，请检测您当前的项目后在使用此 CLI 工具')
    }

    return {
        workSpaceYamlPath,
        workspace: parse(await readFile(workSpaceYamlPath, 'utf-8')),
    }
}
export const updateCatalogsWithContext = (options: CatalogsContextType) => {
    const { choice, context, catalogsName, dependencies } = options
    // 从 context.catalog 中删除选中的 key
    choice.forEach((key: string) => {
        delete context.catalog![key]
    })

    // 确保 context.catalogs 存在
    if (!context.catalogs) {
        context.catalogs = {}
    }

    // 检查节点是否存在，存在则合并，不存在则创建
    if (context.catalogs[catalogsName]) {
        context.catalogs[catalogsName] = {
            ...context.catalogs[catalogsName],
            ...dependencies,
        }
        // console.log(`✅ 已将 ${choice.length} 个包合并到 catalogs.${catalogsName} 节点中`)
    }
    else {
        context.catalogs[catalogsName] = dependencies
        // console.log(`✅ 已将 ${choice.length} 个包添加到 catalogs.${catalogsName} 节点中`)
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
        outro('用户当前已取消操作')
        return null
    }

    const finalConfirm = await confirm({
        message: `已完成 ${allCatalogs.length} 个分类的创建，确认保存所有更改到 pnpm-workspace.yaml？`,
    }) as boolean

    if (!finalConfirm) {
        outro('❌ 用户取消保存，所有更改将被丢弃')
        return null
    }

    // outro('✅ 用户确认保存所有更改')

    // 对于批量处理，返回所有分类的完整信息
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
    let catalogsName: string = ''

    const combinedCatalogs = Array.from(new Set([...DEFAULT_CATALOGS, ...existingCatalogs]))

    const selected = await select({
        message: '请选择或自定义分类名称',
        options: [
            ...combinedCatalogs.map(name => ({ value: name, label: name })),
            { value: CUSTOM_CATALOG_NAME, label: '创建新分类' },
        ],
    }) as string

    isCancelProcess(selected, CANCEL_PROCESS)

    if (selected === CUSTOM_CATALOG_NAME) {
        catalogsName = await text({
            message: '请输入自定义分类名称',
            placeholder: '',
            validate: (value) => {
                if (!value || !value.trim())
                    return '分类名称不能为空.'
                if (combinedCatalogs.includes(value))
                    return '该分类已存在，请直接在列表中选择.'
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
            outro('✅ 所有包已处理完毕')
            break
        }

        // console.log(`\n剩余 ${remainingKeys.length} 个包待处理:`)
        // remainingKeys.forEach((key) => {
        //     console.log(`  - ${key}: ${context.catalog![key]}`)
        // })

        const choice = await multiselect({
            message: '请选择要分类的依赖包 (如无需操作，请回车跳过本轮)',
            options: remainingKeys.map((key) => {
                const version = context.catalog![key]
                const usage = usageMap ? formatDependencyUsage(usageMap, key) : ''
                const label = usage ? `${key} (${version}) - ${usage}` : `${key} (${version})`
                return {
                    value: key,
                    label,
                }
            }),
            required: false,
        }) as string[]

        isCancelProcess(choice, CANCEL_PROCESS)

        if (!choice || choice.length === 0) {
            // console.log('本轮未选择任何包')
        }
        else {
            const catalogsName = await getCatalogName(context.catalogs)

            isCancelProcess(catalogsName, CANCEL_PROCESS)

            if (catalogsName && catalogsName.trim()) {
                // 将选择的结果与 catalog 匹配，得到 key: value 版本号
                const dependencies: Record<string, string> = {}
                choice.forEach((key: string) => {
                    dependencies[key] = context.catalog![key]!
                })

                // console.log(`分类 "${catalogsName}" 将包含以下包:`)
                // Object.entries(dependencies).forEach(([key, version]) => {
                //     console.log(`  - ${key}: ${version}`)
                // })

                // 确认操作
                const confirmed = await confirm({
                    message: `确认将这 ${choice.length} 个包添加到分类 "${catalogsName}" 中？`,
                }) as boolean

                isCancelProcess(confirmed, CANCEL_PROCESS)

                if (confirmed)
                    updateCatalogsWithContext({ choice, context, catalogsName, dependencies })
                if (confirmed) {
                    // 保存本轮操作结果
                    allCatalogs.push({ choice, name: catalogsName, dependencies })
                }
            }
        }

        // 询问是否继续处理
        if (Object.keys(context.catalog || {}).length > 0) {
            continueProcessing = await confirm({
                message: '是否继续处理剩余的包？',
                initialValue: false,
            }) as boolean

            isCancelProcess(continueProcessing, CANCEL_PROCESS)
        }
        else {
            continueProcessing = false
        }
    }
}

export const getNewWorkSpaceYaml = async (config: IWorkSpaceConfig): Promise<IWorkSpaceContext> => {
    const context = config.workspace
    if (!context.catalog) {
        throw new Error('暂无 catalog')
    }

    const catalog = context.catalog

    const choice = await multiselect({
        message: '选择要切换的包',
        options: Object.keys(catalog).map((key) => {
            const version = catalog[key]
            const usage = config.usageMap ? formatDependencyUsage(config.usageMap, key) : ''
            const label = usage ? `${key} (${version}) - ${usage}` : `${key} (${version})`
            return {
                value: key,
                label,
            }
        }),
    }) as string[]

    const catalogsName = await text({
        message: '请输入自定义分类名称',
        placeholder: '',
        defaultValue: '',
    }) as string

    // 将选择的结果与 catalog 匹配，得到 key: value 版本号
    const dependencies: Record<string, string> = {}
    if (choice && typeof choice === 'object') {
        choice.forEach((key: string) => {
            dependencies[key] = catalog[key]!
        })
    }

    console.log('选中的包对象:', dependencies)

    // 从 context.catalog 中删除选中的 key
    if (choice && typeof choice === 'object') {
        choice.forEach((key: string) => {
            delete context.catalog![key]
        })
    }

    // 检查 catalogsName 是否有值
    if (!catalogsName) {
        throw new Error('未输入有效的分类名称，操作已取消')
    }

    // 确保 context.catalogs 存在
    if (!context.catalogs) {
        context.catalogs = {}
    }

    // 检查节点是否存在，存在则合并，不存在则创建
    if (context.catalogs[catalogsName]) {
        // 节点已存在，合并 packages
        context.catalogs[catalogsName] = {
            ...context.catalogs[catalogsName],
            ...dependencies,
        }
        // console.log(`已将选中的包合并到 catalogs.${catalogsName} 节点中`)
    }
    else {
        // 节点不存在，直接赋值
        context.catalogs[catalogsName] = dependencies
        // console.log(`已将选中的包添加到 catalogs.${catalogsName} 节点中`)
    }

    // 将更新后的 context 写回到文件
    return {
        path: config.workSpaceYamlPath,
        // 最终要替换 pnpm-workspace.yaml 内容
        context: stringify(context, {
            indent: 2,
            lineWidth: 0,
            minContentWidth: 0,
        }),
        // catalogs 新增节点内容
        catalogs: {
            choice,
            name: catalogsName,
            dependencies,
        },

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
        outro('✅ pnpm-workspace.yaml catalog 已经为空，无需处理')
        return null
    }

    // // 询问是否需要进行批量管理
    // const shouldBatch = await confirm({
    //     message: `检测到 catalog 中有 ${catalogKeys.length} 个包，是否进行批量分类管理？`,
    // }) as boolean
    //
    // if (!shouldBatch) {
    //     console.log('❌ 用户选择跳过批量管理')
    //     return null
    // }

    // console.log(`当前 catalog 中的包列表:`)
    // catalogKeys.forEach((key) => {
    //     console.log(`  - ${key}: ${catalog[key]}`)
    // })

    const allCatalogs: AllCatalogsType[] = []

    await processCatalog({ allCatalogs, context, usageMap: config.usageMap })
    return await confirmModify({ allCatalogs, config, context })
}
