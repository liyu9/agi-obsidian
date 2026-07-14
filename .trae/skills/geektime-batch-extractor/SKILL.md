---
name: "geektime-batch-extractor"
description: "从极客时间批量获取课程文档。通过CDP连接本地Chrome（已登录态），并行提取多篇文章的文本和图片，保存为Markdown。采用流水线架构：并行提取→并行校验→修复。触发：用户说批量提取/批量获取极客时间课程，或发送课程目录页链接并要求批量处理。"
---

# 极客时间批量文档提取器

## 前置条件

- Chrome 已开启调试端口：`--remote-debugging-port=9222`（或 9223/9224）
- 已登录极客时间（付费课程需订阅）
- 所有目标文章已在 Chrome 中打开

**启动调试 Chrome：**
```bash
Start-Process "C:\Program Files\Google\Chrome\Application\chrome.exe" -ArgumentList "--remote-debugging-port=9222","--user-data-dir=$env:TEMP\chrome-debug-profile","<URL>"
```

## 脚本说明

| 脚本 | 用途 | 参数 |
|------|------|------|
| `init-course.js` | 初始化：生成清单+创建目录 | `<saveBaseDir>` |
| `extract-single.js` | 单篇提取+下载图片+生成MD+校验 | `<articleId> "<saveDir>" "<cacheDir>"` |
| `regen.js` | 从缓存重新生成（不需要浏览器） | `<articleId> "<saveDir>" "<cacheDir>"` |
| `validate-lib.js` | 校验库 + CLI | `[--json] <mdFile>` |
| `batch-validate.js` | 批量校验 | `[--json] "<baseDir>"` |
| `diagnose.js` | DOM 诊断 | `<articleId>` |

所有脚本输出 JSON，异常时 `exit code = 1`。sub_agent 契约详见 @sub-agent-contracts.md。

## ⚠️ 硬性规则

### 规则1：四阶段分离

| 阶段 | 操作 | 产出 |
|------|------|------|
| 阶段0: 环境检测 | 检测 Chrome 端口 | 端口号 or 报错 |
| 阶段1: 初始化 | 生成清单+创建目录+raw-data | article-list.json + 目录结构 |
| 阶段2: 流水线 | 并行提取+并行校验+修复 | 全部MD+图片+校验报告 |
| 阶段3: 清理 | 用户确认后整理 | 最终课程目录 |

- ❌ 在阶段2未完成时进入阶段3
- ❌ 跳过用户确认直接清理

### 规则2：sub_agent 调度

- 提取和校验可并行，提取不等待校验
- 校验 sub_agent 只报告问题，不自动修复
- 修复由主 Agent 决定策略（优先 regen）
- ❌ 禁止创建 fix-*.js 等临时脚本

### 规则3：超时与重试

| 场景 | 超时 | 重试 | 降级 |
|------|------|------|------|
| 提取 sub_agent | 120s | 1次 | 标记失败，继续下一轮 |
| 校验 sub_agent | 30s | 0次 | 标记未校验 |
| 修复 sub_agent (regen) | 30s | 1次 | 标记需重新提取 |
| 图片下载 | 30s/张 | 1次 | 保留远程链接 |

### 规则4：原始数据分离

- 原始数据存放在 `<saveBaseDir>/../raw-data/<课程名>/`
- 输出 MD 存放在 `<saveBaseDir>`
- 修复时从 raw-data 读取缓存，无需重新获取

### 规则5：进度追踪

- 主 Agent 通过 TodoWrite 追踪进度
- 每轮结束后主 Agent 统一更新进度（非 sub_agent）
- TodoWrite 模板参考 @todolist-template.md

---

## 完整流程

### 阶段0: 环境检测

```
检测 Chrome 端口 → 成功？
├─ Yes → 进入阶段1
└─ No  → 提示用户启动调试 Chrome，暂停
```

```bash
node -e "require('./scripts/cdp-utils').findPort().then(p => console.log(p || 'not found'))"
```

### 阶段1: 初始化

```
有课程目录页？
├─ Yes → init-course.js 从目录页提取清单（推荐）
└─ No  → init-course.js 扫描标签页生成清单
         └─ 无文章标签页 → 报错退出
```

```bash
node scripts/init-course.js "d:\...\12-学习笔记\05-课程名"
```

产出：`article-list.json` + `course-info.md` + `assets/` 目录 + `raw-data/` 缓存目录

**输出目录结构（扁平）：**
```
10-极客时间-课程名/
├── assets/                  ← 全部图片集中存放
│   ├── 20260518-923498-01-头图.jpg    ← 文章ID保证唯一
│   └── 20260518-923514-01-头图.jpg
├── 开篇词｜从对话到陪伴.md
├── 01｜蓝图构建.md
├── course-info.md           ← wikilink格式，点击即可跳转
└── article-list.json
```

### 阶段2: 流水线批量提取+校验

```
读取 article-list.json
    ↓
按每3篇分组
    ↓
┌─ 轮次循环 ─────────────────────────────────────────┐
│                                                      │
│  并行启动 3 个提取 sub_agent                          │
│      ↓                                               │
│  全部返回？                                           │
│  ├─ 有超时 → 记录失败，重试1次                         │
│  ├─ 有失败(Page not found/paywall) → 记录，继续       │
│  └─ 全部成功 → 并行启动 3 个校验 sub_agent             │
│                    ↓                                  │
│              校验结果？                                │
│              ├─ 全部通过 → 下一轮                      │
│              └─ 有失败 → 并行启动修复 sub_agent         │
│                          ↓                            │
│                    regen 成功？                        │
│                    ├─ Yes → 记录已修复                 │
│                    └─ No  → 标记需重新提取              │
│                                                      │
│  还有下一组？                                         │
│  ├─ Yes → 继续轮次                                    │
│  └─ No  → 退出循环                                    │
└──────────────────────────────────────────────────────┘
    ↓
batch-validate.js 全局校验
    ↓
汇总失败列表（如有）→ 逐篇修复
    ↓
全部通过 → 进入阶段3
```

**sub_agent 契约详见 @sub-agent-contracts.md**

### 阶段3: 清理

```
用户确认所有文章 → 确认？
├─ Yes → 可选删除 raw-data/，任务完成
└─ No  → 回到阶段2修复
```

---

## 质量标准

| 检查项 | 级别 | 标准 |
|--------|------|------|
| 一级标题 | FAIL | 必须存在 |
| 付费墙 | FAIL | 不能包含「仅可试看」 |
| 代码块闭合 | FAIL | 所有 ``` 必须闭合 |
| 空代码块 | FAIL | 不允许空代码块 |
| 空标题 | FAIL | 不允许空标题 |
| 图片存在 | FAIL | 所有本地图片路径必须存在 |
| 图片下载 | WARN | 远程图片数 = 0 |
| 来源分隔线 | WARN | 必须包含 `---` |
| 二级标题 | WARN | >= 2 个 |

## 触发条件

- 「极客时间」+「批量提取/批量获取/课程提取/全部提取」
- 课程目录页链接（`time.geekbang.org/column/intro/`）+ 要求提取
- 一次性提取多篇文章

## 参考文件

- **异常处理与修复策略**：@troubleshooting.md
- **sub_agent 输入输出契约**：@sub-agent-contracts.md
- **TodoWrite 清单模板**：@todolist-template.md
