<div align="center">
<img src="./logo.svg"/>
<h1>Pnpm Category Catalog</h1>

[English](https://github.com/ScaffoldCore/pnpm-category-catalog/blob/master/README.md) | 中文

</div>

`pnpm-category-catalog` 是为使用 pnpm workspace 的 monorepo 项目设计的 CLI 工具。它解决了以下痛点：

- **批量分类管理**：一次性处理 catalog 中的所有依赖包，按功能或用途进行分类
- **自动更新依赖索引**：自动升级 package.json（含子包）中的依赖索引格式为 `catalog:category-name`
- **交互式操作**：提供友好的命令行交互界面，支持确认、取消和撤销操作
- **批量处理**: 支持循环处理，直到所有依赖项都被分类

<img src="https://github.com/lonewolfyx/pnpm-category-catalog/raw/master/screenshot.png" alt="screenshot">

## 🛠️ 如何使用

### 前提条件

1. 项目必须使用 `pnpm workspace`。
2. 项目根路径下必须存在 `pnpm-workspace.yaml`文件。
3. `pnpm-workspace.yaml` 文件中必须包含 `catalog` 配置选项。

### 📦 最佳实践

> 👀 你对 pnpm catalogs 感兴趣？推荐你阅读这篇博客：
> [对依赖项进行分类](https://antfu.me/posts/categorize-deps) 作者：[Anthony](https://antfu.me/)。

### 直接执行

> [!TIP]
> 你可以直接执行命令或者全局安装使用，以直接使用为例：

```bash
# 1. 如果你尚未迁移 `pnpm catalog`，你可以执行这个命令
pnpx codemod pnpm/catalog

# 2. 执行自定义分类命令
npx pnpm-category-catalog
```

### 全局使用

如果你想全局使用该命令，你可以这样做：

#### 全局安装

```bash
npm install -g pnpm-category-catalog
# 或
pnpm add -g pnpm-category-catalog
```

#### 运行

在你项目的根路径执行该命令：

```bash
pcc
```

## 🔧 扩展

### ESLint 生态

如果你想用 Eslint 进行一些 [约束](https://github.com/antfu/pnpm-workspace-utils)，可以选择使用任意一个方法（可选）：

1. 如果你正在使用 [`@antfu/eslint-config`](https://github.com/antfu/eslint-config)

```ts
export default antfu({
    pnpm: true,
    // 其他选项 ...
})
```

2. 如果没有使用 `@antfu/eslint-config`，而是直接使用 `eslint.config.js`
   。详情请参见 [pnpm-workspace-utils](https://github.com/antfu/pnpm-workspace-utils/tree/main/packages/eslint-plugin-pnpm)

## 🤝 贡献

欢迎提交 Issues 和 Pull Request！

### 开发

```bash
# 安装依赖
pnpm install

# 运行示例场景（自动初始化并运行 CLI 命令）
pnpm dev:basic
```

#### 示例场景

| 命令               | 详情                                  |
|------------------|-------------------------------------|
| `pnpm dev:basic` | 基础场景：所有的依赖项均位于 `catalog` 默认分类中，尚未分类 |

每次运行都会自动重置为初始状态，因此干净地重复执行测试。

#### 目录结构

```
examples/
├── fixtures/     # 原始模板（只读的）
│   └── basic/
└── workspace/    # 工作目录（自动生成且该文件下文件已被 git 忽略）
    └── basic/
```

## 📄 License

[MIT](./LICENSE) License © [lonewolfyx](https://github.com/lonewolfyx)
