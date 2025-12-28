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

## 📦 Installation

### Global Installation

```bash
npm install -g pnpm-category-catalog
# or
pnpm add -g pnpm-category-catalog
```

### Project Installation

```bash
npm install pnpm-category-catalog
# or
pnpm add pnpm-category-catalog
```

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

## 🤝 Contributing

Welcome to submit Issues and Pull Requests!

## 📄 License

[MIT](./LICENSE) License © [lonewolfyx](https://github.com/lonewolfyx)
