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
    catalog?: {
        [key: string]: string
    }
    catalogs?: Record<string, Record<string, string>>
}

export type IWorkSpaceConfig = IConfig & IWorkSpace

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

export interface IUpdatePackage {
    path: string
    context: string
    isUpdate: boolean
}
