import type { IConfig, IUpdatePackage, IWorkSpaceContext } from '@/types.ts'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

export const resolvePackageDependencies = (
    config: IConfig,
    packagePathMap: string[],
    workspace: IWorkSpaceContext,
): IUpdatePackage[] => {
    const dependencyTypes = ['dependencies', 'devDependencies', 'peerDependencies', 'optionalDependencies']

    return packagePathMap.map((path: string) => {
        const filePath = resolve(config.cwd, path)
        const fileContent = readFileSync(filePath, 'utf-8')
        const pkgData = JSON.parse(fileContent)

        let isUpdated = false
        dependencyTypes.forEach((depType) => {
            const dependencies = pkgData[depType]
            if (dependencies) {
                Object.keys(dependencies).forEach((depName) => {
                    // 检查该依赖是否命中 workspace 的 catalog 配置
                    if (workspace.catalogs.dependencies[depName]) {
                        const targetVersion = `catalog:${workspace.catalogs.name}`

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
