import type { FormatOptions, IConfig } from '@/types'
import { readFileSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { cancel, isCancel } from '@clack/prompts'
import { Table } from 'console-table-printer'
import pc from 'picocolors'
import { parseDocument, YAMLMap } from 'yaml'
import { DEPENDENCY_TYPES } from '@/constant.ts'

export type DependencyUsageMap = Map<string, string[]>

export function scanDependencyUsage(
    config: IConfig,
    packagePaths: string[],
): DependencyUsageMap {
    const usageMap: DependencyUsageMap = new Map()

    for (const pkgPath of packagePaths) {
        const filePath = resolve(config.cwd, pkgPath)
        const fileContent = readFileSync(filePath, 'utf-8')
        const pkgData = JSON.parse(fileContent)

        const pkgName
            = pkgData.name
                || (pkgPath === 'package.json'
                    ? 'root'
                    : pkgPath.replace('/package.json', ''))

        for (const depType of DEPENDENCY_TYPES) {
            const deps = pkgData[depType]
            if (deps) {
                for (const depName of Object.keys(deps)) {
                    if (!usageMap.has(depName)) {
                        usageMap.set(depName, [])
                    }
                    usageMap.get(depName)!.push(pkgName)
                }
            }
        }
    }

    return usageMap
}

/**
 * Format the list of dependent consumers
 * @param usageMap Dependencies use relational mapping tables
 * @param depName dependency names
 * @param options Format options
 *
 * Rules:
 * -0: returns "unused"
 * - 1-3: Display specific package names
 * - >3: Show the first two + "wait N packages"
 *
 * @returns string
 */
export const formatDependencyUsage = (
    usageMap: DependencyUsageMap,
    depName: string,
    options: FormatOptions = {},
): string => {
    const {
        unusedText = 'unUsed',
        abbreviationTemplate = (firstFew, total) => `use on ${firstFew} and other ${total} project packages`,
    } = options

    const users = usageMap.get(depName) ?? []

    if (users.length === 0)
        return pc.red(unusedText)
    if (users.length < 3)
        return users.join(', ')

    return abbreviationTemplate(pc.cyan(users.slice(0, 2).join(', ')), pc.red(users.length))
}

export const stringifyYamlWithTopLevelBlankLine = (value: string) => {
    const doc = parseDocument(value)

    if (doc.contents && doc.contents instanceof YAMLMap) {
        const items = doc.contents.items

        items.forEach((item: any, index: number) => {
            if (index > 0) {
                item.key.commentBefore = '\n'
            }
        })
    }

    return doc.toString()
}

export const writeFile = (path: string, content: string) => {
    writeFileSync(path, content, 'utf-8')
}

export const printTable = (data: any) => {
    const p = new Table()

    p.addColumns([
        { name: 'Dependencies', alignment: 'left' },
        { name: 'Catalog', alignment: 'left' },
    ])

    p.addRows(data)
    return p.printTable()
}

export const isCancelProcess = (value: unknown, message: string) => {
    if (isCancel(value)) {
        cancel(message)
        return process.exit(0)
    }
}

export const packageSort = (packages: Record<string, string>) =>
    Object.fromEntries(
        Object.entries(packages).sort(([a], [b]) =>
            a.startsWith('@') === b.startsWith('@')
                ? a.localeCompare(b)
                : a.startsWith('@') ? -1 : 1,
        ),
    )
