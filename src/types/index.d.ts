import type { DependencyUsageMap } from '@/utils'

export type KnownKeys<T> = {
    [K in keyof T]: string extends K ? never : number extends K ? never : K
} extends { [_ in keyof T]: infer U } ? U : never

export type StrictRequire<T> = Required<Pick<T, KnownKeys<T>>> & {
    [K in Exclude<keyof T, KnownKeys<T>>]: T[K]
}

export interface IConfig {
    cwd: string
}

export interface IWorkSpace {
    workSpaceYamlPath: string
    workspace: IWorkSpaceYaml
}

export interface IWorkSpaceYaml {
    /**
     * unclassified catalog
     */
    catalog?: Record<string, string>
    /**
     * classified catalogs
     */
    catalogs?: Record<string, Record<string, string>>
}

export type IWorkSpaceConfig = IConfig & IWorkSpace & {
    usageMap?: DependencyUsageMap
}

export interface ICatalogsCategories {
    name: string
    packages: string[]
    dependencies: Record<string, string>
}

export interface IWorkSpaceContext {
    path: string
    context: string
    catalogs: {
        choice: string[]
        name: string
        dependencies: Record<string, string>
        categories?: ICatalogsCategories[]
    }
}

export interface IResolvedPackageDependencies {
    dependency: string
    version: string
}

export interface IResolvedPackage {
    path: string
    context: string
    isUpdate: boolean
    dependencies: IResolvedPackageDependencies[]
}

export interface IResolvedPackageResult {
    used: IResolvedPackage[]
    unused: IResolvedPackageDependencies[]
}

export interface CatalogsContextType {
    /**
     * selected package names list
     */
    choice: string[]
    /**
     * original content object from pnpm-workspace.yaml
     */
    context: IWorkSpaceYaml
    /**
     * inputed category name
     */
    catalogsName: string
    /**
     * selected packages list
     */
    dependencies: Record<string, string>
}

export interface AllCatalogsType {
    choice: string[]
    name: string
    dependencies: Record<string, string>
}

export interface ProcessCatalogOptionsType {
    allCatalogs: AllCatalogsType[]
    context: IWorkSpaceYaml
    usageMap?: DependencyUsageMap
}
