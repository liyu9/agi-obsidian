---
name: "chrome-devtools-mcp"
description: "通过 Chrome DevTools Protocol 连接本地 Chrome，支持：(1)连接已有Chrome需手动确认 (2)Agent自动启动调试Chrome。用于提取文章、获取页面内容、截图等。触发：用户说获取Chrome内容、提取文章、查看打开的页面。"
---

# Chrome DevTools MCP

通过 Chrome DevTools Protocol (CDP) 连接本地 Chrome 浏览器，支持两种模式。

## 两种连接方式

### 方式一：连接已有 Chrome（手动确认）

**特点**：不稳定，需要用户每次手动点允许

```bash
# 1. 用户打开 Chrome，访问
chrome://inspect/#remote-debugging

# 2. 勾选 "Allow remote debugging"

# 3. Agent 检测并连接
node .trae/skills/chrome-devtools-mcp/scripts/cdp.cjs detect
```

---

### 方式二：Agent 启动调试 Chrome（自动稳定）⭐ 推荐

**特点**：Agent 自动启动独立 Chrome 实例，无需用户手动确认

```bash
# Agent 自动启动 Chrome 调试模式并打开指定 URL
node .trae/skills/chrome-devtools-mcp/scripts/cdp.cjs launch https://mp.weixin.qq.com/s/xxx
```

**原理**：
- 使用独立的 `--user-data-dir`（临时目录）
- 每次启动都是全新的隔离环境
- 不影响用户正常的 Chrome 会话

---

## 命令行接口

```bash
# 检测调试端口状态
node .trae/skills/chrome-devtools-mcp/scripts/cdp.cjs detect

# 列出所有打开的页面
node .trae/skills/chrome-devtools-mcp/scripts/cdp.cjs list

# 启动调试 Chrome（可选：指定打开的 URL）
node .trae/skills/chrome-devtools-mcp/scripts/cdp.cjs launch [url]

# 从指定页面提取内容（需要 URL 包含关键词）
node .trae/skills/chrome-devtools-mcp/scripts/cdp.cjs extract <url关键词>

# 截图
node .trae/skills/chrome-devtools-mcp/scripts/cdp.cjs screenshot [tab索引]
```

## 使用流程

### 场景一：公开内容（微信公众号、公开网页）⭐ 推荐

**不需要登录**的内容，直接启动调试 Chrome：

```bash
# 1. 启动 Chrome 并打开目标 URL
node .trae/skills/chrome-devtools-mcp/scripts/cdp.cjs launch https://mp.weixin.qq.com/s/xxx

# 2. 提取内容
node .trae/skills/chrome-devtools-mcp/scripts/cdp.cjs extract mp.weixin.qq.com
```

### 场景二：需要登录的内容（已登录的知乎、已付费的极客时间）

**需要用户登录状态**的内容，连接用户已有的 Chrome：

```bash
# 1. 用户确认 Chrome 调试已启用（chrome://inspect/#remote-debugging）
# 2. 列出标签页
node .trae/skills/chrome-devtools-mcp/scripts/cdp.cjs list

# 3. 提取用户已在 Chrome 打开的页面
node .trae/skills/chrome-devtools-mcp/scripts/cdp.cjs extract 关键词
```

## 提取内容格式

extract 命令返回 JSON 格式：

```json
{
  "title": "文章标题",
  "author": "作者名",
  "date": "2026年4月28日 08:46",
  "text": "文章正文...",
  "textLength": 18656
}
```

## 故障排除

| 问题 | 解决方法 |
|------|----------|
| `Chrome debug port not available` | 使用 `launch` 命令启动调试 Chrome |
| 已有 Chrome 连接不稳定 | 关闭所有 Chrome 实例，用 `launch` 启动新的 |
| WebSocket 超时 | Chrome 可能断开了调试，用 `launch` 重启 |
| 提取内容为空 | 确认页面已完全加载，增加等待时间后重试 |

## 关键概念

### Chrome DevTools Protocol

Chrome 内置的调试协议：
- 调试端口：`127.0.0.1:9222`
- HTTP 端点：`http://127.0.0.1:9222/json`
- WebSocket：`ws://127.0.0.1:9222/devtools/page/<targetId>`

### autoConnect 模式（Chrome 144+）

当启用后，Chrome DevTools MCP 可以自动连接到用户已运行的 Chrome 实例。

## 脚本结构

```
chrome-devtools-mcp/
├── SKILL.md              # 本文件
└── scripts/
    └── cdp.cjs           # CDP 工具（检测/列表/启动/提取/截图）
```

## 触发条件

- 用户说 "获取 Chrome 内容"、"查看打开的页面"、"提取文章"
- 用户发送需要登录的链接（微信公众号、知乎、极客时间等）
- 用户要求截图当前浏览器状态
- 用户想提取他已在 Chrome 打开的某个页面内容
