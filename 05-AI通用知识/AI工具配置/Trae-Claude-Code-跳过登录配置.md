# Trae 中 Claude Code 跳过登录的完整解决方案

> 记录日期：2026-05-28
> 适用环境：Windows 10/11 + Trae CN + Claude Code 插件
> 关联文档：[Claude-Code-Model-Config-Guide.md](Claude-Code-Model-Config-Guide.md)

## 一、问题根因

| 现象 | 根因 |
|---|---|
| Trae Claude Code 插件反复要求登录 | Trae 插件**只认 `ANTHROPIC_API_KEY` 环境变量** |
| OAuth 登录页无法关闭 | `disableLoginPrompt` 只禁错误弹窗，不禁欢迎页 |
| 配置文件改了无效 | 用的变量名错了（`CLAUDE_CODE_OAUTH_TOKEN` 不被识别） |

## 二、5 个配置文件（全部统一用 `ANTHROPIC_API_KEY`）

| # | 文件路径 | 作用范围 | 关键字段 |
|---|---|---|---|
| 1 | `C:\Users\<用户>\.claude\settings.json` | Claude Code 全局 | `env.ANTHROPIC_API_KEY` |
| 2 | `C:\Users\<用户>\.claude.json` | 全局 | `hasCompletedOnboarding: true` |
| 3 | `C:\Users\<用户>\.claude\config.json` | 全局 | `primaryApiKey: "any-string"` |
| 4 | `C:\Users\<用户>\AppData\Roaming\Trae CN\User\settings.json` | Trae 用户级 | `claudeCode.environmentVariables` 数组 |
| 5 | `<工作区>\.vscode\settings.json` | 工作区级 | `claudeCode.environmentVariables` 数组 |
| + | Windows 系统环境变量 `HKCU\Environment` | 系统全局 | `ANTHROPIC_API_KEY` |

## 三、完整配置模板

### 1️⃣ `~/.claude/settings.json`

```json
{
  "env": {
    "CLAUDE_CODE_SKIP_AUTH_LOGIN": "1",
    "ANTHROPIC_BASE_URL": "https://api.minimaxi.com/anthropic",
    "ANTHROPIC_API_KEY": "sk-cp-你的API-KEY",
    "API_TIMEOUT_MS": "3000000",
    "CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC": "1",
    "CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS": "1",
    "ANTHROPIC_MODEL": "MiniMax-M3",
    "ANTHROPIC_DEFAULT_SONNET_MODEL": "MiniMax-M3",
    "ANTHROPIC_DEFAULT_OPUS_MODEL": "MiniMax-M3",
    "ANTHROPIC_DEFAULT_HAIKU_MODEL": "MiniMax-M3"
  },
  "model": "MiniMax-M3",
  "hasCompletedOnboarding": true
}
```

### 2️⃣ `Trae CN/User/settings.json`（Trae 用户级）

```json
{
  "claudeCode.disableLoginPrompt": true,
  "claudeCode.hideOnboarding": true,
  "claudeCode.environmentVariables": [
    { "name": "ANTHROPIC_API_KEY", "value": "sk-cp-你的API-KEY" },
    { "name": "ANTHROPIC_BASE_URL", "value": "https://api.minimaxi.com/anthropic" },
    { "name": "ANTHROPIC_MODEL", "value": "MiniMax-M3" },
    { "name": "CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC", "value": "1" }
  ],
  "claudeCode.selectedModel": "MiniMax-M3"
}
```

### 3️⃣ 工作区 `<项目>/.vscode/settings.json`

```json
{
  "claudeCode.disableLoginPrompt": true,
  "claudeCode.hideOnboarding": true,
  "claudeCode.environmentVariables": [
    { "name": "ANTHROPIC_API_KEY", "value": "sk-cp-你的API-KEY" },
    { "name": "ANTHROPIC_BASE_URL", "value": "https://api.minimaxi.com/anthropic" },
    { "name": "ANTHROPIC_MODEL", "value": "MiniMax-M3" }
  ],
  "claudeCode.selectedModel": "MiniMax-M3"
}
```

### 4️⃣ Windows 系统环境变量

```powershell
[Environment]::SetEnvironmentVariable("ANTHROPIC_API_KEY", "sk-cp-你的API-KEY", "User")
[Environment]::SetEnvironmentVariable("ANTHROPIC_BASE_URL", "https://api.minimaxi.com/anthropic", "User")
[Environment]::SetEnvironmentVariable("ANTHROPIC_MODEL", "MiniMax-M3", "User")
```

## 四、关键洞察（踩过的坑）

### 1. 变量名陷阱

- ❌ `CLAUDE_CODE_OAUTH_TOKEN`（只 CLI 用）
- ✅ `ANTHROPIC_API_KEY`（**插件和 CLI 都认**）
- 中转服务（MiniMax、Any Router、魔芋 API）一律用 API key 模式

### 2. 多层配置叠加

Trae 插件的配置优先级（**高 → 低**）：

```
工作区 .vscode/settings.json  >  Trae User/settings.json  >  全局 ~/.claude/settings.json  >  系统环境变量
```

5 个文件都配上**互相不冲突**，全配上最稳。

### 3. 重启时机

所有路径都需要**完全关闭 Trae 进程**：

```
Ctrl+Shift+Esc → 找到 Trae CN.exe → 结束任务 → 重新打开
```

**关窗口不算，进程还在跑**。

### 4. 关键开关字段对照

| 字段 | 作用 | 文件 |
|------|------|------|
| `claudeCode.disableLoginPrompt` | 禁用错误弹窗 | Trae settings.json |
| `claudeCode.hideOnboarding` | 隐藏欢迎/登录页 | Trae settings.json |
| `CLAUDE_CODE_SKIP_AUTH_LOGIN` | CLI 跳过 OAuth | `~/.claude/settings.json` |
| `hasCompletedOnboarding: true` | 标记已完成引导 | `~/.claude.json` |
| `primaryApiKey: "any-string"` | 注入 API key | `~/.claude/config.json` |

## 五、验证步骤

1. ✅ **看 Trae 启动时是否跳过登录页** —— 直接进入对话界面
2. ✅ **测试对话** —— 输入 `你好` 看是否有响应
3. ✅ **测试复杂命令** —— 输入 `/opsx:explore` 看是否能调用工具
4. ✅ **检查模型** —— 右下角状态栏应该显示 `MiniMax-M3`

## 六、常见错误排查

| 错误 | 原因 | 修复 |
|---|---|---|
| 仍显示登录页 | 变量名错（用了 `*_OAUTH_TOKEN`） | 改成 `ANTHROPIC_API_KEY` |
| 显示 `usage limit exceeded (2056) (HTTP Status: 429)` | MiniMax 套餐额度用尽 | 等下个周期或升级套餐 |
| 显示 `model not found` | 模型名拼错 | 检查 `ANTHROPIC_MODEL` 值 |
| 插件打开是空白 | Trae 没完全重启 | 任务管理器结束 `Trae CN.exe` |
| CLI 能用但插件不行 | Trae 插件读不到 `claudeCode.environmentVariables` | 检查数组是否写成 `[ {name, value}, ... ]` 格式 |

## 七、备份与回滚

操作前已自动备份（命名格式 `.bak.YYYYMMDD...`）：

- `~/.claude/.credentials.json.bak.20260528...`
- `Trae CN/User/settings.json.bak.20260528...`
- `Trae/User/settings.json.bak.20260528...`
- `Trae/User/settings.json.bak2.20260528...`

如需回滚，直接恢复备份文件即可。

## 八、核心原文

> 来源：用户实战记录
> 日期：2026-05-28
>
> 解决 Trae IDE 中 Claude Code 插件反复弹出登录页面的问题。核心是把所有配置中的 token 变量名从 `CLAUDE_CODE_OAUTH_TOKEN` 改成 `ANTHROPIC_API_KEY`，并在 Trae 用户级 settings.json 的 `claudeCode.environmentVariables` 数组中显式声明 API key、Base URL、Model 三个变量。同时配置 5 个文件 + 系统环境变量，重启 Trae 进程后即可跳过登录。
