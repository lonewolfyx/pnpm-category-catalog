import type { IConfig, IResolvedPackage, IWorkSpaceContext } from '@/types'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { DEPENDENCY_TYPES } from '@/constant.ts'

export const resolvePackageDependencies = (
    config: IConfig,
    packagePathMap: string[],
    workspace: IWorkSpaceContext,
): IResolvedPackage[] => {
    return packagePathMap.map((path: string) => {
        const filePath = resolve(config.cwd, path)
        const fileContent = readFileSync(filePath, 'utf-8')
        const pkgData = JSON.parse(fileContent)

        let isUpdated = false
        DEPENDENCY_TYPES.forEach((depType) => {
            const dependencies = pkgData[depType]
            if (dependencies) {
                Object.keys(dependencies).forEach((depName) => {
                    // 检查该依赖是否命中 workspace 的 catalog 配置
                    if (workspace.catalogs.dependencies[depName]) {
                        let targetVersion: string

                        // 如果有分类信息，使用对应的分类名称
                        if (workspace.catalogs.categories) {
                            const category = workspace.catalogs.categories.find(cat =>
                                cat.dependencies[depName],
                            )
                            if (category) {
                                targetVersion = `catalog:${category.name}`
                            }
                            else {
                                // 如果没找到对应分类，使用组合名称
                                targetVersion = `catalog:${workspace.catalogs.name}`
                            }
                        }
                        else {
                            // 兼容单个分类的情况
                            targetVersion = `catalog:${workspace.catalogs.name}`
                        }

                        // 只有在版本不一致时才标记更新，避免不必要的改动
                        if (dependencies[depName] !== targetVersion) {
                            dependencies[depName] = targetVersion
                            isUpdated = true
                        }
                    }
                })
            }
        })

        return {
            path: filePath,
            context: isUpdated ? `${JSON.stringify(pkgData, null, 2)}\n` : fileContent,
            isUpdate: isUpdated,
        }
    })
}
