import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import cac from 'cac'
import { glob } from 'glob'
import { resolveConfig } from '@/config.ts'
import { resolvePackageDependencies } from '@/dependencies.ts'
import { stringifyYamlWithTopLevelBlankLine, writeFile } from '@/utils.ts'
import { getNewWorkSpaceYaml, getWorkSpaceYaml } from '@/work.space.ts'
import { name, version } from '../package.json'

const cli = cac(name)

cli.command('')
    .action(async () => {
        const config = resolveConfig()
        const packagePathMap = await glob(['package.json', '*/**/package.json'], {
            cwd: config.cwd,
            ignore: ['**/node_modules/**'],
        })

        const packageDependencies = packagePathMap.map(p => JSON.parse(readFileSync(resolve(config.cwd, p), 'utf-8')))
        const workSpaceYaml = await getWorkSpaceYaml(config)

        const workspace = await getNewWorkSpaceYaml({
            ...config,
            ...workSpaceYaml,
        })

        // 更新 package.json 中的依赖版本
        const pkgFiles = resolvePackageDependencies(config, packagePathMap, workspace)
        pkgFiles.forEach((i) => {
            if (i.isUpdate) {
                // console.log(`更新 ${i.path} 中的依赖版本`)
                writeFile(i.path, i.context)
            }
        })

        writeFile(workspace.path, stringifyYamlWithTopLevelBlankLine(workspace.context))
    })

cli.help()
cli.version(version)
cli.parse()
