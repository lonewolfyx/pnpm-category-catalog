import { describe, expect, it } from 'vitest'
import { normalizerUsedDependencies } from '@/dependencies.ts'

describe('normalizerDependencies', () => {
    it('should normalize dependencies correctly', () => {
        const pkgData = {
            devDependencies: {
                bumpp: 'catalog:',
                eslint: 'catalog:',
            },
        }
        const catalogs = {
            choice: ['bumpp', 'eslint'],
            name: 'newCata',
            dependencies: {
                bumpp: '^10.3.2',
                eslint: '^9.39.2',
            },
            categories: [],
        }
        const usedCatalogDepNames = new Set<string>()
        const depToCategoryMap = new Map<string, string>()
        for (const cat of catalogs.categories) {

        }

        expect(normalizerUsedDependencies({ pkgData, usedCatalogDepNames, catalogs, depToCategoryMap })).toMatchSnapshot()
    })
})
