import type { CatalogsContextType } from '@/types'
import { describe, expect, it } from 'vitest'
import { updateCatalogsWithContext } from '@/work.space'

describe('updateCatalogsWithContext', () => {
    it('should merge catalogs correctly', () => {
        const options: CatalogsContextType = {
            choice: ['package1', 'package2'],
            context: {
                catalog: {
                    package1: '1.0.0',
                    package2: '2.0.0',
                    package3: '3.0.0',
                },
            },
            catalogsName: 'newCatalog',
            dependencies: {
                package1: '1.0.0',
                package2: '2.0.0',
            },
        }
        expect(updateCatalogsWithContext(options)).toMatchSnapshot()
    })

    it('catalogs is defined', () => {
        const options: CatalogsContextType = {
            choice: ['package1', 'package2'],
            context: {
                catalog: {
                    package2: '2.0.0',
                    package3: '3.0.0',
                },
                catalogs: {
                    lint: {
                        eslint: '^9.39.2',
                    },
                },
            },
            catalogsName: 'newCatalog',
            dependencies: {
                package1: '1.0.0',
                package2: '2.0.0',
            },
        }
        expect(updateCatalogsWithContext(options)).toMatchSnapshot()
    })

    it('catalogs is not defined', () => {
        const options: CatalogsContextType = {
            choice: ['package1', 'package2'],
            context: {
                catalog: {
                    package2: '2.0.0',
                    package3: '3.0.0',
                },
                catalogs: {
                    lint: {
                        eslint: '^9.39.2',
                    },
                },
            },
            catalogsName: 'newCatalog',
            dependencies: {
                package1: '1.0.0',
                package2: '2.0.0',
            },
        }
        expect(updateCatalogsWithContext(options)).toMatchSnapshot()
    })
})
