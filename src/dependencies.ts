import type { IConfig, IResolvedPackageDependencies, IResolvedPackageResult, IWorkSpaceContext } from '@/types'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { DEPENDENCY_TYPES } from '@/constant.ts'

export const resolvePackageDependencies = (
    config: IConfig,
    packagePathMap: string[],
    workspace: IWorkSpaceContext,
): IResolvedPackageResult => {
    const { catalogs } = workspace

    const allCatalogDepNames = new Set(Object.keys(catalogs.dependencies))
    const usedCatalogDepNames = new Set<string>()

    const depToCategoryMap = new Map<string, string>()
    if (catalogs.categories) {
        for (const cat of catalogs.categories) {
            for (const depName of Object.keys(cat.dependencies)) {
                depToCategoryMap.set(depName, cat.name)
            }
        }
    }

    const usedResults = packagePathMap.map((path: string) => {
        const filePath = resolve(config.cwd, path)
        const fileContent = readFileSync(filePath, 'utf-8')
        const pkgData = JSON.parse(fileContent)

        let isUpdated = false
        const hitDependencies: IResolvedPackageDependencies[] = []

        for (const depType of DEPENDENCY_TYPES) {
            const deps = pkgData[depType] as Record<string, string> | undefined
            if (!deps)
                continue

            for (const [depName, currentVersion] of Object.entries(deps)) {
                if (catalogs.dependencies[depName]) {
                    usedCatalogDepNames.add(depName)

                    const categoryName = depToCategoryMap.get(depName) || catalogs.name
                    const targetVersion = `catalog:${categoryName}`

                    hitDependencies.push({
                        dependency: depName,
                        version: targetVersion,
                    })

                    if (currentVersion !== targetVersion) {
                        deps[depName] = targetVersion
                        isUpdated = true
                    }
                }
            }
        }

        return {
            path: filePath,
            isUpdate: isUpdated,
            context: isUpdated ? `${JSON.stringify(pkgData, null, 2)}\n` : fileContent,
            dependencies: hitDependencies,
        }
    })

    // Find items that are in allCatalogDepNames but not in usedCatalogDepNames
    const unused: IResolvedPackageDependencies[] = []
    allCatalogDepNames.forEach((depName) => {
        if (!usedCatalogDepNames.has(depName)) {
            const categoryName = depToCategoryMap.get(depName) || catalogs.name
            unused.push({
                dependency: depName,
                version: `catalog:${categoryName}`,
            })
        }
    })

    return {
        used: usedResults,
        unused,
    }
}
