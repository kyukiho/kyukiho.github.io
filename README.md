# kyukiho's Blog

基于 [Astro](https://astro.build) 的个人博客，文章以本地 Markdown 维护，构建时生成静态页面，部署到 GitHub Pages。

## 本地开发

```bash
npm install
npm run dev      # 本地开发 http://localhost:4321
npm run build    # 构建到 dist/
npm run preview  # 预览构建产物
```

## 写文章

在 `src/content/blog/` 新增 `.md` 文件，frontmatter 示例：

```yaml
---
title: 文章标题
date: 2025-07-20
description: 文章摘要（可选）
tags: [标签A, 标签B]
category: 分类（可选）
draft: false
---
```

关于页内容维护在 `src/content/pages/about.md`。

## 部署

推送到 `main` 分支后由 GitHub Actions 自动构建部署。
首次使用需在仓库 **Settings → Pages → Build and deployment → Source** 中选择 **GitHub Actions**。
