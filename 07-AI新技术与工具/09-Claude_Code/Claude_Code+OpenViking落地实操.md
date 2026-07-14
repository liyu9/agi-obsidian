# Claude Code + OpenViking 落地实操(原生 Windows 11)

> 给 Claude Code 接入 OpenViking 长期语义记忆:每轮对话自动召回相关记忆、回合结束自动捕获上下文,**模型无需主动调用 MCP**;同时保留 MCP 工具通道(search/store 等)供显式调用。
> 本文档基于 **2026-07-07 在原生 Win11 上的真实落地过程**整理,所有命令、路径、端口均为本机实测值。

---

## 1. 背景与价值

### Claude Code 的记忆痛点
- Claude Code 原生只有「会话内上下文 + 文件系统(CLAUDE.md / memory)」,跨会话、跨项目的长期语义记忆缺失。
- 长周期、多步骤、多工具任务中,**记忆混乱导致幻觉**、**Token 爆炸导致成本失控**两大问题突出。

### OpenViking 是什么
- 火山引擎开源的 **AI Agent 上下文数据库**(context database)。
- 用**文件系统范式**管理上下文(记忆/资源/技能),通过 `viking://...` URI 寻址,把扁平向量存储升级成可检索、可归档的「记忆盘」。
- 提供 MCP Server,可接入一切支持 MCP 的工具(Claude Code / Codex / Cursor …)。

### 两条接入通道(hooks vs MCP)
| 通道 | 触发方式 | 谁调用 | 用途 |
|------|----------|--------|------|
| **Hooks**(自动) | Claude Code 在对话生命周期事件(UserPromptSubmit / Stop …)自动跑脚本 | 模型无感 | 自动召回 + 自动捕获,**主体验** |
| **MCP**(手动) | 模型主动调用 `search`/`store` 等工具 | 模型显式 | 精确检索 / 写入 / 归档管理 |

> 本次落地**两条通道都要**:hooks 给自动体验,MCP 给精确控制。

---

## 2. 架构(本机实测)

```
                       Claude Code (v2.1.150)
                      /                      \
            (1) hooks 通道                    (2) MCP 通道
        8 个生命周期 hook 自动触发        stdio MCP proxy(servers/mcp-proxy.mjs)
        scripts/auto-recall.mjs           Claude Code 启动时拉起,模型可调 14 个工具
        scripts/auto-capture.mjs                       |
                  |                                   |
                  +------> HTTP 127.0.0.1:19333 <-----+
                           openviking-server.exe       /mcp 端点
                           (v0.4.6, auth_mode=dev)
                                  |
              +-------------------+-------------------+
              |                                       |
      Embedding(召回/检索)                    VLM(捕获时抽取记忆)
      volcengine 豆包                         openai 兼容 → 本地 GLM proxy
      doubao-embedding-vision                 glm-5.2 @ 127.0.0.1:15721
      直连 ark.cn-beijing.volces.com          (PROXY_MANAGED)
```

**关键端口:本机是 `19333`,不是 OpenViking 文档默认的 `1933`**(之前自定义过)。所有客户端(ovcli.conf、插件 proxy)都指向 19333。

---

## 3. 前置条件(本机现状)

| 组件 | 要求 | 本机 | 备注 |
|------|------|------|------|
| Python | ≥3.10 | 3.11.14 ✓ | openviking server 是纯 Python |
| Node | ≥18 | 24.12.0 ✓ | 插件脚本运行时 |
| git | 任意 | 2.53.0 ✓ | 插件安装要克隆仓库 |
| claude CLI | ≥2.0(支持 `claude plugin`) | 2.1.150 ✓ | 关键:决定能否走原生插件路径 |
| openviking(pip) | 已装 | 0.2.15(server 实际跑 0.4.6) | server 已在线 |
| 火山引擎豆包 key | 有 | 已配在 ov.conf | embedding 用 |
| OpenViking server | 在线 | ✓ `:19333/health` ok | `openviking-server.exe` 常驻 |

---

## 4. 安装步骤(原生 Win,实测可行)

### 为什么不用官方一键脚本?
官方 README 给的:
```bash
bash <(curl -fsSL https://raw.githubusercontent.com/volcengine/OpenViking/main/examples/memory-plugin-shared/install.sh) --harness claude
```
**仅支持 macOS / Linux**(POSIX 专用:`/dev/tty`、`mktemp /tmp`、`chmod`、`sed` …)。Windows 上跑不了。

### 正解:走 Claude Code 原生插件路径(claude CLI ≥ 2.0)
`claude plugin` 子命令**完全绕开 bash 脚本**,由 Claude Code 自己克隆仓库、注册 hooks + MCP,而插件运行时全是跨平台 Node ESM(`node:os.homedir()` / `node:path` / `fetch`,无 shell-out、无 `/tmp`),所以**原生 Win11 上能直接拿到 hooks + MCP 全套**。

**三连命令:**
```bash
# 1) 添加 OpenViking 插件市场
claude plugin marketplace add https://raw.githubusercontent.com/volcengine/OpenViking/main/.claude-plugin/marketplace.json

# 2) 安装插件(自动注册 8 hooks + 1 MCP server + /ov skill)
claude plugin install openviking-memory@openviking

# 3) 确认
claude plugin list
claude plugin details openviking-memory@openviking
```

**实测 `plugin details` 输出(成功标志):**
```
Hooks (8)  SessionStart, UserPromptSubmit, PostToolUse, Stop, PreCompact, SessionEnd, SubagentStart, SubagentStop
MCP servers (1)  openviking
Skills (1)  ov
```

插件落到:`C:\Users\admin\.claude\plugins\cache\openviking\openviking-memory\0.3.0\`

> **网络被墙回退**:若 `marketplace add` 拉不动 GitHub,先 `git clone https://github.com/volcengine/OpenViking`,再 `claude plugin marketplace add <本地克隆路径>`(注意:克隆要完整,`examples/claude-code-memory-plugin` 子目录必须在)。

---

## 5. 配置文件详解

### `~/.openviking/ov.conf`(server 主配置,本机实测值)
```jsonc
{
  "server":    { "host": "127.0.0.1", "port": 19333, "cors_origins": ["*"] },
  "storage":   { "workspace": "C:\\Users\\admin\\.openviking\\data2",
                 "vectordb": { "name": "context", "backend": "local", "project": "default" } },
  "embedding": {                       // 召回/检索用
    "dense": {
      "provider": "volcengine",
      "api_key":  "ark-xxxx...(豆包 ARK key)",
      "model":    "doubao-embedding-vision",
      "api_base": "https://ark.cn-beijing.volces.com/api/coding/v3",
      "dimension": 1024, "input": "multimodal"
    }
  },
  "vlm": {                             // 捕获时抽取记忆用
    "provider": "openai",              //   openai 兼容协议
    "api_key":  "PROXY_MANAGED",
    "model":    "glm-5.2",
    "api_base": "http://127.0.0.1:15721/v1"   // 本地 GLM 代理
  }
}
```

### `~/.openviking/ovcli.conf`(客户端凭据,插件自动读)
```json
{
  "url": "http://127.0.0.1:19333",
  "api_key": "openviking-local-dev-2026",
  "account": "default",
  "user": "admin"
}
```
> 插件的 `config.mjs` 解析顺序:**环境变量 `OPENVIKING_*` > ovcli.conf > ov.conf > 默认(127.0.0.1:1933)**。本机 ovcli.conf 已就绪,所以插件开箱即用。

### `OPENVIKING_*` 常用环境变量速查
| 变量 | 作用 | 默认 |
|------|------|------|
| `OPENVIKING_URL` / `OPENVIKING_BASE_URL` | server 地址 | `http://127.0.0.1:1933` |
| `OPENVIKING_API_KEY` / `OPENVIKING_BEARER_TOKEN` | 鉴权 | 空 |
| `OPENVIKING_AUTO_RECALL` | 开关自动召回 | `true` |
| `OPENVIKING_AUTO_CAPTURE` | 开关自动捕获 | `true` |
| `OPENVIKING_RECALL_LIMIT` | 召回条数 | `6` |
| `OPENVIKING_SCORE_THRESHOLD` | 相似度阈值 | `0.35` |
| `OPENVIKING_MEMORY_ENABLED` | 总开关(0/1) | 1 |
| `OPENVIKING_DEBUG` | 调试日志 | `false` |
| `OPENVIKING_BYPASS_SESSION` | 当前会话跳过 | 空 |

---

## 6. 自动召回 / 捕获原理(hooks.json 8 个事件)

| Hook 事件 | 脚本 | 超时 | 干什么 |
|-----------|------|------|--------|
| `SessionStart` | session-start.mjs | 120s | 恢复/打开会话时注入历史归档概览(profile) |
| `UserPromptSubmit` | **auto-recall.mjs** | **8s** | **每条用户输入前,语义召回相关记忆,注入 `<openviking-context>` 块** |
| `PostToolUse`(matcher=`Read`) | skill-experience.mjs | 5s | 读文件时注入与该文件/技能相关的经验记忆 |
| `Stop` | **auto-capture.mjs** | **45s** | **回合结束,用 VLM 从对话抽取记忆写入** |
| `PreCompact` | pre-compact.mjs | 30s | 压缩前把待压缩内容先存档 |
| `SessionEnd` | session-end.mjs | 30s | 会话结束归档 |
| `SubagentStart` | subagent-start.mjs | 10s | 子 agent 启动注入 |
| `SubagentStop` | subagent-stop.mjs | 45s | 子 agent 结束捕获 |

**为什么模型不用调 MCP?** 因为召回/捕获是 Claude Code 在生命周期节点自动执行 `node <脚本>.mjs`,脚本直接 HTTP 打 server,记忆以「additionalContext」形式注入 prompt 或异步落库——模型完全无感。MCP 工具(search/store)只是给模型一个**显式精确操作**的口子。

---

## 7. 可选:状态栏(OV ✓)

`plugin.json` 未声明 `statusLine`,所以装完插件状态栏不会自动出现。手动加(已做):

1. 备份:`cp ~/.claude/settings.json ~/.claude/settings.json.bak.pre-statusline`
2. 在 `~/.claude/settings.json` 追加:
```jsonc
"statusLine": {
  "type": "command",
  "command": "node \"C:/Users/admin/.claude/plugins/cache/openviking/openviking-memory/0.3.0/scripts/statusline.mjs\"",
  "padding": 0
}
```

**显示含义:** `OV ✓` = server 可达 │ `Fable 5 · ctx 42%` = 模型/上下文 │ `↩ 6 mem (0.92) · 50ms` = 上次召回 6 条/最高分 0.92/耗时 │ `✎ 573/20k · 2 arch` = 待提交 token / 已归档数。

> ⚠️ **版本钉子坑**:路径里的 `0.3.0/` 是版本号,`claude plugin update` 升级后版本目录会变,状态栏会指向空路径失效。升级后需同步改这里的版本号(或用 `jq -r '.statusLine.command' ~/.claude/settings.json` 核对)。hooks 用 `${CLAUDE_PLUGIN_ROOT}` 动态展开,不受此影响。

---

## 8. 验证清单

### 8.1 重启前(本会话已通过 ✓)
- [x] `claude plugin list` 含 `openviking-memory@openviking`,enabled
- [x] `claude plugin details openviking-memory@openviking` 含 8 hooks + 1 MCP + ov skill
- [x] `curl -s http://127.0.0.1:19333/health` → `{"status":"ok","healthy":true,...}`
- [x] statusline.mjs 实跑通过(输出 `OV ✓ │ Sonnet`)
- [x] settings.json JSON 合法

### 8.2 重启 Claude Code 后(需新会话,hooks 启动时加载)
> hooks 在 CC 启动时注册,装完插件必须重启 CC 才生效。
- [ ] `/mcp` 列表里出现 `openviking`,且其 14 个工具(search/store/…)可展开
- [ ] `/ov` 斜杠命令可用
- [ ] 状态栏显示 `OV ✓`(若配了 statusLine)
- [ ] 发一句测试 prompt → 8s 内 `~/.openviking/state/last-recall.json` 时间戳更新(库空则召回为空,正常)
- [ ] 回合结束 → 45s 内 `~/.openviking/state/last-capture.json` 更新
- [ ] `~/.openviking/logs/cc-hooks.log` 有 recall/capture 记录
- [ ] 排障:`OPENVIKING_DEBUG=1 claude` 启动,看详细日志

---

## 9. 踩坑清单

| # | 坑 | 对策 |
|---|----|------|
| 1 | **端口 19333 ≠ 文档默认 1933** | 本机自定义过;ovcli.conf 已对齐,直接复用 |
| 2 | 官方一键 bash 脚本不支持 Win | 走 `claude plugin install` 原生路径 |
| 3 | **VLM 走本地 GLM proxy(15721)** | proxy 挂了→**捕获失败**;embedding 直连豆包不受影响。排查先看 proxy 是否在跑 |
| 4 | **server 必须常驻** | server 掉线时 hooks 静默 8s 超时返回空(不报错但不生效)。建议做开机自启 |
| 5 | hooks 需重启 CC 才生效 | 装完插件必须重启 Claude Code |
| 6 | statusLine 版本钉子 | 升级插件后同步改 settings.json 里的版本号路径 |
| 7 | GitHub 拉不动 | 用本地完整克隆做 marketplace 源 |

### server 开机自启(可选,推荐)
用 Windows 任务计划程序,登录时触发:
```
程序: C:\Users\admin\AppData\Local\Programs\Python\Python313\Scripts\openviking-server.exe
参数: --config C:\Users\admin\.openviking\ov.conf
起始于: C:\Users\admin\.openviking
```
或写个 `start-openviking.bat` 放 `shell:startup`。

---

## 10. 回滚

```bash
# 卸插件(连 hooks + MCP 一起撤)
claude plugin uninstall openviking-memory@openviking
claude plugin marketplace remove openviking

# 还原 settings.json(去掉 statusLine / 插件注册)
cp ~/.claude/settings.json.bak.pre-openviking-statusline ~/.claude/settings.json
```
server、ov.conf、ovcli.conf、记忆数据(`~/.openviking/data2`)**不动**,下次重装插件即可续用。

---

## 附:本次落地的真实命令序列(可复现)
```bash
claude plugin marketplace add https://raw.githubusercontent.com/volcengine/OpenViking/main/.claude-plugin/marketplace.json
claude plugin install openviking-memory@openviking
claude plugin list
claude plugin details openviking-memory@openviking
curl -s http://127.0.0.1:19333/health
# statusline 烟测
echo '{"session_id":"t","cwd":"/tmp","model":{"display_name":"Sonnet"}}' \
  | node "C:/Users/admin/.claude/plugins/cache/openviking/openviking-memory/0.3.0/scripts/statusline.mjs"
# 手动加 statusLine 到 ~/.claude/settings.json(见第 7 节)
# —— 然后 restart Claude Code,按 8.2 清单验证 ——
```

---
**落地日期**:2026-07-07 ｜ **环境**:Win11 ｜ **CC**:2.1.150 ｜ **OpenViking server**:0.4.6 @ :19333 ｜ **插件**:openviking-memory 0.3.0
