import { readFile } from 'node:fs/promises'
import { multiselect, text } from '@clack/prompts'
import cac from 'cac'
import { findUp } from 'find-up'
import { parse } from 'yaml'
import { resolveConfig } from '@/config.ts'
import { name, version } from '../package.json'

const cli = cac(name)

cli.command('')
    .action(async () => {
        const config = resolveConfig()
        const pnpmWorkSpacePath = await findUp('pnpm-workspace.yaml', {
            cwd: config.cwd,
        })

        if (!pnpmWorkSpacePath) {
            return 'no has pnpm-workspace.yaml'
        }

        const context = parse(await readFile(pnpmWorkSpacePath, 'utf-8'))

        if (!context.catalog) {
            return '暂无 catalog'
        }

        const catalog = context.catalog

        const choice = await multiselect({
            message: '选择要切换的包',
            options: Object.keys(catalog).map(key => ({
                value: key,
                label: key,
            })),

        })

        const catalogsName = await text({
            message: '请输入自定义分类名称',
            placeholder: '',
            defaultValue: '',
        })

        // 将选择的结果与 catalog 匹配，得到 key: value 版本号
        const selectedPackages: Record<string, string> = {}
        if (choice && typeof choice === 'object') {
            choice.forEach((key: string) => {
                selectedPackages[key] = catalog[key]
            })
        }

        console.log('选中的包对象:', selectedPackages)

        // 从 context.catalog 中删除选中的 key
        if (choice && typeof choice === 'object') {
            choice.forEach((key: string) => {
                delete context.catalog[key]
            })
        }

        console.log(context)
        // 将更新后的 context 写回到文件
        // const updatedContent = stringify(context, {
        //     indent: 2,
        // })
        // await writeFile(pnpmWorkSpacePath, updatedContent, 'utf-8')
        // console.log('已从 catalog 中删除选中的包')
    })

cli.help()
cli.version(version)
cli.parse()
