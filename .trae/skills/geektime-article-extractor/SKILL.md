---
name: "geektime-article-extractor"
description: "从极客时间网站获取课程文章，提取文本和图片，保存为Markdown。通过CDP连接本地Chrome（已登录态）抓取完整内容。触发：用户说提取文章、极客时间文章，或发送极客时间链接（time.geekbang.org）。"
---

# 极客时间文章提取器

## 前置条件

- 用户本地 Chrome 已开启调试端口：`--remote-debugging-port=9222`（或 9223/9224）
- 用户已登录极客时间账号（付费课程需订阅）
- 目标文章已在 Chrome 中打开

**如 Chrome 未开启调试端口，帮用户启动：**

```bash
Start-Process "C:\Program Files\Google\Chrome\Application\chrome.exe" -ArgumentList "--remote-debugging-port=9222","--user-data-dir=$env:TEMP\chrome-debug-profile","<文章URL>"
```

## 脚本说明

| 脚本 | 用途 | 参数 |
|------|------|------|
| `extract-full.js` | **主入口**：提取+下载图片+生成MD+校验+缓存 | 见下方模式 |
| `validate.js` | **独立校验**：检查MD格式、代码块、图片等 | `[--json] <mdFile>` |
| `validate-lib.js` | **校验库**：共享校验逻辑，extract-full.js 和 validate.js 共同引用 | 内部模块 |
| `cdp.cjs` | **工具**：检测端口(`detect`)、列出标签页(`list`) | `<command>` |

### extract-full.js 三种模式

```bash
# 模式1：初始化（从课程目录页生成清单+创建目录）
node scripts/extract-full.js --init "<saveBaseDir>"

# 模式2：批量提取（单次连接浏览器，循环处理所有文章）
node scripts/extract-full.js --batch "<listFile>" [saveBaseDir]

# 模式3：单篇提取
node scripts/extract-full.js <articleId> "<saveDir>"

# 模式4：从缓存重新生成（不需要浏览器）
node scripts/extract-full.js --regen <articleId> "<saveDir>"
```

---

## ⚠️ 硬性规则（必须遵守）

### 规则1：三阶段分离

整个提取任务分为三个严格分离的阶段，**每个阶段完成后用户确认再进入下一阶段**：

| 阶段 | 操作 | 产出 |
|------|------|------|
| **阶段一：初始化** | `--init` 创建目录+清单 | article-list.json, extraction-progress.md, course-info.md |
| **阶段二：提取+校验** | `--batch` 或逐篇提取+校验 | 30个MD文件+图片+缓存 |
| **阶段三：清理** | 用户确认后删除缓存 | 干净的课程目录 |

**禁止行为**：
- ❌ 在阶段二未完成时进入阶段三
- ❌ 在阶段一未完成时开始提取
- ❌ 跳过用户确认直接清理

### 规则2：禁止创建临时脚本

- ❌ 禁止在任务过程中创建 fix-*.js、regen-fix.js 等临时脚本
- ❌ 禁止在任务过程中删除任何 Skill 内的文件
- ✅ 所有修复逻辑必须内建于 Skill 脚本中
- ✅ `--regen` 已内置嵌套代码块修复和图片映射修复，无需外部脚本

### 规则3：目录优先

- `--init` **必须**在批量提取前执行
- Agent 不需要扫描 Obsidian 库目录结构来决定保存位置
- 直接读取 `article-list.json` 获取完整清单

### 规则4：进度文件

- 提取进度通过 `extraction-progress.md` 文件持久化（非 TodoWrite）
- Agent 中断恢复时读取此文件，而非依赖对话上下文
- `--batch` 模式自动更新进度文件

### 规则5：输出与代码严格隔离

**致命教训**：2026-06-02 因 `--init "."` 把 `<saveBaseDir>` 指向 `scripts/` 内部，导致 32 个课程抓取结果污染了 skill 自身目录（78 MB 冗余数据），清理才恢复。

**铁律**：
- ✅ `<saveBaseDir>` 必须是 `12-学习笔记/xx-课程名/` 之类的**工作区内容目录**
- ❌ 禁止把 `<saveBaseDir>` 指向 `.trae/skills/...` 或 skill 自己内部目录
- ❌ 禁止 `cd scripts && node extract-full.js --init .` 这种"在代码目录里初始化"
- ❌ 禁止在 skill 的 `scripts/` 下创建任何 `NN-课程名/` 形式的子目录

**自检清单**（每次跑完批量提取后必做）：
```powershell
# 检查 skill scripts 目录是否被污染
Get-ChildItem ".trae\skills\geektime-article-extractor\scripts" -Directory |
  Where-Object { $_.Name -match '^\d{2}-' } |
  ForEach-Object { Write-Host "污染项: $($_.FullName)" }
# 期望输出为空。任何结果都是污染，立刻清理。
```

---

## 批量提取流程（推荐）

### Step 1: 环境检测

```bash
node scripts/cdp.cjs detect
```

### Step 2: 初始化

确保课程目录页在 Chrome 中打开（如 `https://time.geekbang.org/column/intro/100107701`）。

```bash
node scripts/extract-full.js --init "d:\...\12-学习笔记\05-课程名"
```

自动产出：
- `article-list.json` — 文章清单（ID + 标题 + 目录路径）
- `extraction-progress.md` — 提取进度表
- `course-info.md` — 课程元数据+目录索引
- N个子目录（每个含 `assets/`）

### Step 3: 参考文章

提取1篇，用户确认格式正确：

```bash
node scripts/extract-full.js 942438 "d:\...\12-学习笔记\05-课程名\01-xxx"
```

### Step 4: 批量提取

```bash
node scripts/extract-full.js --batch "d:\...\12-学习笔记\05-课程名\article-list.json"
```

自动执行：
1. 单次连接浏览器
2. 循环处理所有文章（跳过已提取的）
3. 并行下载图片（并发5）
4. 自动校验每篇文章
5. 更新 `extraction-progress.md`
6. 输出 `batch-report.json`

### Step 5: 检查报告

```bash
# 查看批量报告
type "d:\...\12-学习笔记\05-课程名\batch-report.json"

# 对失败文章重新生成
node scripts/extract-full.js --regen <articleId> "<saveDir>"
```

### Step 6: 用户确认 + 清理

用户确认所有文章正确后，清理缓存：

```bash
Get-ChildItem -Path "<saveBaseDir>" -Recurse -Filter "article-raw.json" | Remove-Item -Force
```

---

## 单篇提取流程

### Step 1: 环境检测

脚本自动检测 Chrome 调试端口（9222/9223/9224）。

### Step 2: 提取文章

```bash
node scripts/extract-full.js <articleId> "<saveDir>"
```

**脚本自动执行：**
1. 检测端口 → 连接 Chrome → 定位标签页
2. 提取内容 + 保存原始数据到 `assets/article-raw.json`
3. 并行下载图片（并发5，失败重试1次）
4. 保存 `imageFiles` 精确映射到缓存
5. 生成 Markdown（自动检测嵌套代码块，使用 `~~~` 围栏）
6. 校验（共享 validate-lib.js）

### Step 3: 从缓存重新生成

```bash
node scripts/extract-full.js --regen <articleId> "<saveDir>"
```

- 自动使用 `imageFiles` 精确映射（零图片链接丢失）
- 自动检测嵌套代码块使用 `~~~` 围栏

---

## TodoWrite 清单模板

批量提取时，必须按以下结构创建清单：

```json
[
  {id:"env", content:"环境检测：Chrome端口+登录状态", status:"pending"},
  {id:"init", content:"初始化：--init 创建目录+清单", status:"pending"},
  {id:"ref", content:"参考文章：提取1篇+用户确认格式", status:"pending"},
  {id:"batch", content:"批量提取：--batch 提取全部文章", status:"pending"},
  {id:"fix", content:"修复失败文章（--regen）", status:"pending"},
  {id:"confirm", content:"用户确认：检查所有文章", status:"pending"},
  {id:"clean", content:"清理缓存：删除article-raw.json", status:"pending"}
]
```

规则：
- 清单粒度为阶段级别，不逐篇列出
- 进度跟踪依赖 `extraction-progress.md` 文件，不依赖 TodoWrite
- 完成时必须报告校验结果（✅/❌ + 数量）

---

## 数据管理

### 缓存机制

- 提取时保存 `<saveDir>/assets/article-raw.json`，包含 `imageFiles` 精确映射
- `--regen` 优先使用 `imageFiles`，缺失时按序号匹配本地文件
- 格式有问题时用 `--regen` 从缓存重新生成，无需浏览器
- **三阶段清理**：用户确认后删除缓存

### 异常处理

| 异常 | 处理 |
|------|------|
| Chrome 端口不可用 | 提示用户启动 Chrome，暂停任务 |
| 页面未打开 | 记录跳过，继续下一篇 |
| 付费墙 | 记录跳过，提示用户登录 |
| 图片下载失败 | 重试1次，仍失败则保留远程链接 |
| 校验 FAIL | 记录到 batch-report.json，继续下一篇 |
| 提取超时/崩溃 | 跳过该篇，继续下一篇 |

---

## 关键实现细节

- **嵌套代码块**：`generateMd()` 检测代码块内容是否包含 ` ``` `，自动使用 `~~~` 围栏，避免 Markdown 语法冲突
- **图片精确映射**：提取时将 URL→本地文件名映射保存到 `article-raw.json` 的 `imageFiles` 字段，`--regen` 直接使用，零丢失
- **并行下载**：图片并发5下载，失败重试1次
- **校验统一**：`validate-lib.js` 为唯一校验逻辑来源，`extract-full.js` 内建校验和 `validate.js` CLI 共享
- **`~~~` 感知**：validate-lib.js 跳过 `~~~` 块内的 ` ``` `，避免误报代码块未闭合
- **内联格式**：极客时间用 Slate 编辑器，`<SPAN data-slate-type="bold/code/mark-class">` 通过 `processEl()` 递归处理
- **反引号传参**：`page.evaluate(extractInBrowser, '\`')` 将反引号作为参数传入

## 防护规则

1. **内容保真**：不杜撰、不概括原文内容，忠实提取
2. **图片完整性**：所有正文图片必须下载，不得遗漏
3. **图片位置**：图片必须插入在原文对应位置
4. **付费内容检测**：innerText < 1000 且含"仅可试看"则报错
5. **校验自动执行**：extract-full.js 内建校验，提取完自动检查
6. **先诊断再编码**：遇到新结构，先运行 diagnose.js
7. **单篇验证后再批量**：先验证1篇，用户确认后再批量
8. **三阶段分离**：初始化 → 提取校验 → 清理，每阶段用户确认
9. **禁止临时脚本**：所有修复逻辑内建于 Skill

## 触发条件

- 极客时间文章 URL（`time.geekbang.org/column/article/xxxxx`）
- 包含"极客时间"关键词 + "文章/提取/获取/抓取/下载"等动作词
- 包含"提取文章"且上下文指向极客时间
