<h1 align="center">
    Pnpm Category Catalog
</h1>

`pnpm-category-catalog` is a CLI tool designed for monorepo projects using pnpm workspace. It solves the following pain
points:

- **Batch Category Management**: Process all dependencies in catalog at once, categorizing them by function or purpose
- **Automatic Reference Updates**: Automatically update dependency references in package.json files of sub-projects to
  `catalog:category-name` format
- **Interactive Operations**: Provide a friendly command-line interactive interface with confirmation and cancellation
  support
- **Batch Processing**: Support loop processing until all packages are categorized

<img src="https://github.com/lonewolfyx/pnpm-category-catalog/raw/master/screenshot.gif" alt="screenshot">

## 🛠️ Usage

### Prerequisites

1. Project must use pnpm workspace
2. `pnpm-workspace.yaml` file must exist in the project root directory
3. `pnpm-workspace.yaml` file must contain `catalog` configuration

### Basic Usage

Run in the project root directory:

```bash
pcc
```

## 📦 Best Practices
> 👀 Interested in pnpm catalogs? Recommend you read this post: [Categorize Your Dependencies](https://antfu.me/posts/categorize-deps) by Anthony.

### Direct Execution
> [!TIP]
> You can execute directly or install globally. The following examples use direct execution:

```bash
# 1. migrate to pnpm catalog (execute this command if not yet migrated).
pnpx codemod pnpm/catalog

# 2. execute custom category migration command.
npx pnpm-category-catalog
```

## 🔧 Extensions
### ESLint Ecosystem
If you want to use ESLint for some [constraints](https://github.com/antfu/pnpm-workspace-utils), you can choose one of the following methods (optional):

1. If you are using [`@antfu/eslint-config`](https://github.com/antfu/eslint-config)
```ts
export default antfu({
    pnpm: true,
    // other options ...
})
```
2. If you are not using `@antfu/eslint-config`, use it directly in `eslint.config.js`. For details, see: [pnpm-workspace-utils](https://github.com/antfu/pnpm-workspace-utils/tree/main/packages/eslint-plugin-pnpm)

## 🤝 Contributing

Welcome to submit Issues and Pull Requests!

### Development

```bash
# Install dependencies
pnpm install

# Run with example scenario (auto setup + run CLI)
pnpm dev:basic
```

#### Example Scenarios

| Command | Description |
|---------|-------------|
| `pnpm dev:basic` | Basic scenario: all deps in `catalog`, not yet categorized |

Each run automatically resets to initial state, so you can test repeatedly without pollution.

#### Directory Structure

```
examples/
├── fixtures/     # Original templates (read-only)
│   └── basic/
└── workspace/    # Working directory (auto-generated, git ignored)
    └── basic/
```

## 📄 License

[MIT](./LICENSE) License © [lonewolfyx](https://github.com/lonewolfyx)
