export const CANCEL_PROCESS = 'Current operation canceled.'

// dependency type lists, async from https://github.com/pnpm/codemod/blob/main/catalog/src/index.ts#L11
export const DEPENDENCY_TYPES = ['dependencies', 'devDependencies', 'optionalDependencies'] as const

// back up about
export const BACKUP_CACHE_DIR = 'node_modules/.pcc-cache'
export const BACKUP_MANIFEST_FILE = 'manifest.json'

export const CATALOG_PLACEHOLDER = 'catalog:'

export const DEFAULT_CATALOGS: {
    name: string
    descriptions: string
}[] = [
    { name: 'prod', descriptions: 'Runtime production dependencies.' },
    { name: 'dev', descriptions: 'Runtime development dependencies.' },
    { name: 'lint', descriptions: 'Packages for linting/formatting (e.g., eslint, knip).' },
    { name: 'config', descriptions: 'Packages for configuration.' },
    { name: 'types', descriptions: 'Packages for type checking and definitions.' },
    { name: 'build', descriptions: 'Packages used for building the project (e.g., vite, rolldown).' },
    { name: 'test', descriptions: 'Packages used for testing (e.g., vitest, playwright, msw).' },
    { name: 'script', descriptions: 'Packages used for scripting tasks (e.g., tsx, tinyglobby, cpx).' },
    { name: 'frontend', descriptions: 'Packages for frontend development (e.g., vue, pinia).' },
    { name: 'backend', descriptions: 'Packages for the backend server.' },
    { name: 'inlined', descriptions: 'Packages that are included directly in the final bundle.' },
]
