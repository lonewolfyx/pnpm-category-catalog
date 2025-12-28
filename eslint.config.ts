import type { Linter } from 'eslint'
import antfu from '@antfu/eslint-config'

const config = antfu({
    type: 'lib',
    stylistic: {
        indent: 4,
        quotes: 'single',
    },
    rules: {
        'no-console': 'off',
        'node/prefer-global/process': 'off',
        'ts/explicit-function-return-type': 'off',
        'vue/block-order': 'off',
        'vue/valid-template-root': 'off',
        'unused-imports/no-unused-vars': 'off',
        'antfu/top-level-function': 'off',
        'regexp/no-unused-capturing-group': 'off',
    },
    yaml: {
        overrides: {
            'yaml/indent': ['error', 2],
        },
    },
    test: {
        overrides: {
            'test/padding-around-after-all-blocks': 'error',
            'test/padding-around-after-each-blocks': 'error',
            'test/padding-around-before-all-blocks': 'error',
            'test/padding-around-before-each-blocks': 'error',
            'test/padding-around-describe-blocks': 'error',
            'test/padding-around-test-blocks': 'error',
        },
    },
}) as Linter.Config

export default config
