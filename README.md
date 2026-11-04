# Unehao 随笔

Astro + Markdown 的静态个人博客。米白纸面、宋体、桌面双页连续排版；手机和较窄窗口单栏滚动。

## 本地运行

需要 Node.js 22 或以上和 pnpm 10。

```sh
pnpm install
pnpm dev
```

打开终端给出的本地地址。构建与静态预览：

```sh
pnpm build
pnpm preview
```

## 添加文章

在 `src/content/posts/` 新建英文命名的 `.md` 文件，比如 `a-new-start.md`：

```markdown
---
title: '新的开始'
description: '一句话摘要。'
date: 2026-11-04
category: 随笔
sample: false
draft: false
---

这里开始写正文。

## 一个小标题

这里是下一段文字。
```

- 文章按日期倒序排列，文件名对应 `/read/a-new-start/`。
- `draft: true` 不生成网页；示例文章的 `sample: true` 会显示明确标记。
- 现有两篇文章仅用于展示排版，非个人经历，替换后再正式发布。
- 首页名称与介绍在 `src/pages/index.astro`，默认标题在 `src/layouts/Layout.astro`，颜色和字体在 `src/styles/global.css`。
- 默认使用随站点托管的 Noto Serif SC（与思源宋体同源），400/500 两档分片加载；不请求外部字体服务。

## 图片

图片放 `public/images/`。根路径部署可用 `![说明](/images/photo.jpg)`。
如果采用 GitHub 项目子路径部署，Markdown 图片路径需要包含项目路径，如 `/blogs/images/photo.jpg`；迁移时须一起调整。更推荐把 GitHub 仓库命名为 `用户名.github.io`，以根路径发布，避免文章里的根绝对路径变化。

## GitHub Pages

本项目已提供 `.github/workflows/deploy.yml`，但尚未建立远程仓库或发布。

1. 创建公开 GitHub 仓库，推荐名称 `你的用户名.github.io`，以得到根路径地址。
2. 将项目提交到仓库的 `main` 分支，不提交 `node_modules/` 和 `dist/`。
3. 仓库 Settings → Pages → Build and deployment → Source 选择 GitHub Actions。
4. 推送后运行工作流，完成后可访问 Pages 地址。

普通项目仓库也支持：工作流根据仓库名称自动配置 `BLOG_BASE`，例如仓库 `blogs` 对应 `/blogs/`。

## 迁移到其他托管

```sh
BLOG_SITE=https://your-domain.com BLOG_BASE=/ pnpm build
```

将 `dist/` 内容完整上传到支持静态目录的托管即可，保留目录结构。所有文章均为预生成 HTML，字体不依赖外部服务。发布前更换示例文章，并检查文章内图片、链接是否使用旧站点路径。

## 阅读操作与测试

桌面 >900px、窗口高度 >560px 时双页翻页；上一页、下一页和键盘左右键可切换。其他尺寸自动恢复单栏。无 JavaScript 时仍可阅读全文。

可选浏览器回归测试（需已安装 Chrome 或 Playwright Chromium）：

```sh
CHROME_PATH='/path/to/chrome' node doc/verify.mjs
```

`TEST_URL` 可指定服务地址（默认 `http://localhost:4321`）。测试截图保存在 `doc/`，可由测试重新生成；无需上传这些截图用于建站。

## 明暗模式
右上角切换主题，首次跟随系统，手动选择后保存在浏览器。首页简介在 `src/pages/index.astro` 的 profile 区块中修改。

## 导航与分类
首页仅简介。`/essays/` 显示非技术分类文章，`/tech/` 显示 `category: 技术` 文章，`/archive/` 按年份及日期倒序显示所有非草稿文章。

## 复制文章模板

模板位于 `doc/article-template.md`，不会被发布为文章。

```sh
cp doc/article-template.md src/content/posts/my-new-post.md
```

修改标题、摘要和日期，正文格式按需删改。`category: 随笔` 进入 Blog，`category: 技术` 进入 Tech；`draft: true` 是草稿，准备发布时改为 `false`。`sample: false` 表示自己的文章，不显示示例标记。文件名用英文小写和短横线，例如 `reading-notes.md`，它会成为文章链接的一部分。

## 跨平台字体
正文和标题使用自托管 Noto Serif SC，导航、日期及按钮使用 Noto Sans SC，代码使用 JetBrains Mono（中文回退至 Noto Sans SC）。不优先调用设备系统字体；首次加载和缺失字形仍可能触发通用回退。不同系统与屏幕的抗锯齿效果可能略有差异。
