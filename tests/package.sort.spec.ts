import { describe, expect, it } from 'vitest'
import { packageSort } from '@/utils.ts'

describe('packageSort', () => {
    it('should sort packages alphabetically', () => {
        const input = {
            react: '18.2.0',
            axios: '1.3.0',
            lodash: '4.17.21',
        }
        const expected = {
            axios: '1.3.0',
            lodash: '4.17.21',
            react: '18.2.0',
        }
        expect(packageSort(input)).toEqual(expected)
        expect(Object.keys(packageSort(input))).toEqual(['axios', 'lodash', 'react'])
    })

    it('should handle scoped packages correctly', () => {
        const input = {
            'zod': '3.21.4',
            '@types/node': '18.15.0',
            'react': '18.2.0',
            '@clack/prompts': '0.6.0',
        }
        const expected = {
            '@clack/prompts': '0.6.0',
            '@types/node': '18.15.0',
            'react': '18.2.0',
            'zod': '3.21.4',
        }
        expect(packageSort(input)).toEqual(expected)
        expect(Object.keys(packageSort(input))).toEqual([
            '@clack/prompts',
            '@types/node',
            'react',
            'zod',
        ])
    })
})
