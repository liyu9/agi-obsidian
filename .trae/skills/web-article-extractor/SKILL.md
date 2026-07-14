---
name: "web-article-extractor"
description: "从网页提取文章内容，保留代码块、图片、GIF等格式，生成Obsidian兼容的Markdown。通过HTTP请求直接抓取，无需浏览器。触发：用户提供文章URL要求提取、保存网页内容、或说'提取文章'/'抓取内容'/'保存这个页面'。"
---

# 网页文章提取器

## 概述

通过 HTTP 请求直接获取网页 HTML，解析 `<article>` 标签，转换为 Markdown 格式保存到 Obsidian 笔记库。保留原文结构（代码块、图片引用、粗体、列表等），同时下载所有图片到本地，适合公开博客/文档站点的文章提取。

## 核心能力

| 能力 | 说明 |
|------|------|
| 代码块保留 | `<pre><span class="line">` → ` ``` `，完整保留空格对齐 |
| 引用转换 | `<blockquote><p>...</p></blockquote>` → `> 内容`（嵌套标签先处理） |
| HTML 表格转换 | `<table><thead><tr><th><td>` → Markdown pipe table |
| 图片内联 | `<img>` → `![alt](相对路径)`，GIF 动图一并下载 |
| 格式转换 | `<strong>→**粗体**`、`<em>→*斜体*`、`<a>→[链接]()`、`<code>→``、`<table>→pipe table`、`<blockquote>→> ` |
| heading 清理 | 移除 `# [](#abc)` 锚点，保留为干净 `# 标题` |
| figure 处理 | 优先提取 `<figure class="highlight">` 内代码，降级为内容保留 |
| 编码修复 | 自动检测并清理 U+FFFD 乱码字符 |
| 批量提取 | 支持单篇/批量/范围提取模式 |

## 脚本

| 脚本 | 用途 |
|------|------|
| `scripts/extract-article.cjs` | **主脚本**：提取+下载图片+生成MD |

---

## 使用方式

### 模式一：单篇提取

```bash
node .trae/skills/web-article-extractor/scripts/extract-article.cjs <url> <"保存目录">
```

**示例：**
```bash
node .trae/skills/web-article-extractor/scripts/extract-article.cjs https://wmyskxz.cn/wiki/whats_ai/1/ "d:\...\12-学习笔记\10-课程名"
```

### 模式二：批量提取（按序号范围）

```bash
node .trae/skills/web-article-extractor/scripts/extract-article.cjs --batch <基础URL模式> <起始号> <结束号> <"保存目录">
```

**示例：**
```bash
node .trae/skills/web-article-extractor/scripts/extract-article.cjs --batch "https://wmyskxz.cn/wiki/whats_ai/{n}/" 1 14 "d:\...\12-学习笔记\10-课程名"
```

URL 中 `{n}` 占位符会被替换为实际序号。

### 模式三：批量提取（自定义URL列表）

```bash
node .trae/skills/web-article-extractor/scripts/extract-article.cjs --urls <urls.json> <"保存目录">
```

`urls.json` 格式：
```json
[
  {"url": "https://example.com/post/1/", "num": 1, "title": "文章标题"},
  {"url": "https://example.com/post/2/", "num": 2}
]
```

---

## 产出结构

```
保存目录/
├── 1-文章标题.md          # Markdown 笔记
├── 2-文章标题.md
├── ...
└── images/
    ├── course_1/            # 第1篇的图片
    │   ├── img001.png
    │   └── animation.gif
    ├── course_2/
    └── ...
```

## Markdown 输出格式

每篇笔记的固定结构：

```markdown
# 页面标题

> 课程来源：原始URL

---

正文内容（代码块、图片内联、格式化文本）

---

*笔记整理日期：YYYY-MM-DD*
```

## 图片处理规则

1. 图片下载到 `images/course_{序号}/` 子目录
2. Markdown 中引用为 `![alt](images/course_{N}/filename)`
3. 已存在的图片跳过下载
4. 支持 PNG、JPG、GIF、WebP 格式

---

## 提取流程

### 快速流程（公开内容，无登录要求）

1. **确认目标URL** — 用户提供或从上下文推断
2. **确认保存目录** — 不询问用户，直接推断：
   - 单篇：从URL最后一段推断编号，用页面标题命名
   - 批量：检查是否已有同系列目录结构，匹配编号
3. **运行提取** — 执行对应模式的命令
4. **验证** — 检查生成的 MD 文件：
   - 代码块是否正确闭合
   - 图片引用是否指向存在的文件
   - 是否有 `\?\?\?` 乱码
5. **报告** — 列出提取结果（篇数、图片数、文件大小）

---

## 硬性规则

### 规则1：HTTP 优先，无需浏览器
- 公开内容直接用 HTTP 请求，不依赖 Chrome CDP
- 需要登录态的内容才用 chrome-devtools-mcp skill

### 规则2：不创建临时脚本
- 所有逻辑内建于 `scripts/extract-article.cjs`
- 禁止在任务过程中创建 fix-*.js 等临时脚本

### 规则3：提取后必须校验
- 检查 UTF-8 编码（不能有 U+FFFD）
- 检查代码块 ` ``` ` 正确闭合
- 检查图片文件是否存在

### 规则4：保持原文结构
- 不概括、不改写原文
- 代码块保留原始空格对齐
- 图片插入在原文对应位置

---

## 编码修复

Node.js 写入含 `」`（U+300D）等中日韩字符时可能损坏。提取后必须执行：

```powershell
$file = "<md文件路径>"
$c = [System.IO.File]::ReadAllText((Resolve-Path $file).Path, [System.Text.Encoding]::UTF8)
$c = $c -replace [char]0xFFFD, ''
$utf8 = New-Object System.Text.UTF8Encoding $false
[System.IO.File]::WriteAllText((Resolve-Path $file).Path, $c, $utf8)
```

或使用脚本内置的 `--fix` 模式（建议）。

---

## 触发条件

- 用户发送网页 URL（博客、文档、教程等）
- 用户说"提取文章"、"抓取内容"、"保存这个页面"
- 用户想批量获取一个系列的文章
- 含以下域名的 URL 自动触发：`wmyskxz.cn`、博客类、文档类站点

---

## 常见站点适配

### wmyskxz.cn

- 文章内容在 `<article>` 标签内
- 代码块：`<figure class="highlight"><td class="code"><pre>...`
- 行号：`<span class="line">`（提取时自动剥离）
- 图片：`wmyskxz-blog.oss-cn-chengdu.aliyuncs.com`
- 动图：同样以 `<img>` 形式出现，正常下载
- 标题从 `<title>` 提取，去掉" - 我没有三颗心脏的博客"后缀

### 适配新站点

遇到新站点结构时：
1. 先 `curl` 获取 HTML，分析 `<article>` 或主内容区结构
2. 识别代码块、图片的 DOM 结构
3. 在 `extract-article.cjs` 的 `htmlToMarkdown()` 中添加对应的 replace 规则
4. 先跑1篇验证，确认后再批量