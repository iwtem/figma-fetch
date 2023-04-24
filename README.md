# figma-fetch

用于导出 Figma File 中 SVG/PNG/JPG 的 GitHub Action

## 🚀 基本使用

```yaml
name: Export SVG Icon from Figma
on: [push]
jobs:
  all:
    name: Figma Export
    runs-on: ubuntu-latest
    steps:
      - uses: iwtem/figma-fetch@latest
        with:
          args: 'format=svg outputDir=./build/'
        env:
          FIGMA_FILE_URL: 'https://www.figma.com/file/ZFjrph2HUwFK8Q3uEtJIu1PT/yourfilename'
          FIGMA_TOKEN: ${{ secrets.FIGMA_TOKEN }}
```

### Action secrets and variables

**Secrets**

`FIGMA_TOKEN` **(必需)**

此令牌用于访问 [Figma API](https://www.figma.com/developers/docs#access-tokens)。 建议在 GitHub 仓库的 [secret token](https://help.github.com/articles/virtual-environments-for-github-actions#creating-and-using-secrets-encrypted-variables) 中设置令牌。

**Variables**

`FIGMA_FILE_URL` **(必需)**

Figma 页面地址，用于下载该页面中的 [components](https://help.figma.com/article/66-components) 。

### Action arguments

- `format` – 从 Figma 导出的文件格式。 选项有 `svg`、`jpg`、`png`。 默认为 `jpg`。
- `outputDir` – 导出的文件所在的位置。 默认是`./build/`。
- `scale` – 当图像格式 `jpg` 或 `png` 时，图片的缩放比例，可配置范围为 `0.01` - `4`，默认为 `1`。
- `maxFetchSize` – 一次最多获取多少个 figma 组件的信息，默认 `500`.

### 输出

默认输出位于 `./build/` 中，但可以配置。 除了导出的文件之外，您还会看到导出的 `data.json` 文件。 这包含有关由组件 `id` 映射的导出组件的信息。

该目录将如下所示：

```
./outputDir/
  ├── format/
  |     └── componentName.format
  └── data.json
```

`data.json` 文件如下所示：

```json5
{
  '0:639': {
    name: 'plus', // component name
    id: '0:639', // component figma id
    key: '89696b0b52493acc8692546ac829bd4e334c63a2', // component global figma id
    file: 'FP7lqd1V00LUaT5zvdklkkZr', // figma file key
    description: 'keywords: add, new, more', // figma component description
    width: 12, // width of the component frame
    height: 16, // height of the component frame
    image: 'https://s3-us-west-2.amazonaws.com/figma-alpha-api/img/1/6d/1234', // aws URL for the exported file
  },
}
```

## License

The scripts and documentation in this project are released under the [MIT License](LICENSE)
