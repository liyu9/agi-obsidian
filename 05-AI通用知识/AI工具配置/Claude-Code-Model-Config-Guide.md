# Claude Code 模型配置指南

本文档记录在 Windows + Trae IDE 环境下成功配置 Claude Code 多模型的完整过程。

## 问题描述

使用 Trae IDE 插件形式的 Claude Code 时，遇到错误：
```
There's an issue with the selected model (MiniMax-M2.7-highspeed). It may not exist or you may not have access to it.
```

**根本原因**：`MiniMax-M2.7-highspeed` 不是有效的模型名称。正确的模型名是 `MiniMax-M2.7`。

---

## 配置方案

### 方案一：MiniMax M2.7（执行任务用）

**适用场景**：日常代码编写、调试、简单任务执行

**官方文档**：https://platform.minimaxi.com/docs/token-plan/claude-code

**配置步骤**：

1. 编辑配置文件 `C:\Users\<用户名>\.claude\settings.json`

2. 添加以下配置：

```json
{
  "env": {
    "ANTHROPIC_BASE_URL": "https://api.minimaxi.com/anthropic",
    "ANTHROPIC_AUTH_TOKEN": "<你的MiniMax API Key>",
    "API_TIMEOUT_MS": "3000000",
    "CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC": "1",
    "ANTHROPIC_MODEL": "MiniMax-M2.7",
    "ANTHROPIC_DEFAULT_SONNET_MODEL": "MiniMax-M2.7",
    "ANTHROPIC_DEFAULT_OPUS_MODEL": "MiniMax-M2.7",
    "ANTHROPIC_DEFAULT_HAIKU_MODEL": "MiniMax-M2.7"
  },
  "hasCompletedOnboarding": true,
  "model": "MiniMax-M2.7"
}
```

3. **清除 Trae 代理环境变量**（重要！否则会走 Trae 代理而非 MiniMax 直连）：
   - 删除或修改 `ANTHROPIC_BASE_URL` 和 `ANTHROPIC_AUTH_TOKEN`
   - 确保不再指向 `http://127.0.0.1:15721`（Trae 代理）

4. 验证配置：
   ```bash
   claude -p "Hello"
   ```
   应返回 `OK`

---

### 方案二：火山引擎 GLM-5.1（规划任务用）

**适用场景**：复杂任务规划、架构设计、深度思考

**官方文档**：https://www.volcengine.com/docs/82379/1928262

**配置步骤**：

1. 编辑配置文件 `C:\Users\<用户名>\.claude\settings.json`

2. 添加以下配置：

```json
{
  "env": {
    "ANTHROPIC_BASE_URL": "https://ark.cn-beijing.volces.com/api/coding",
    "ANTHROPIC_AUTH_TOKEN": "<你的火山引擎API Key>",
    "API_TIMEOUT_MS": "3000000",
    "CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC": "1",
    "ANTHROPIC_MODEL": "glm-5.1",
    "ANTHROPIC_DEFAULT_SONNET_MODEL": "glm-5.1",
    "ANTHROPIC_DEFAULT_OPUS_MODEL": "glm-5.1",
    "ANTHROPIC_DEFAULT_HAIKU_MODEL": "glm-5.1"
  },
  "hasCompletedOnboarding": true,
  "model": "glm-5.1"
}
```

3. 验证配置：
   ```bash
   claude -p "Hello"
   ```
   应返回 `OK`

---

## 模型切换方法

### 方法一：命令行启动时指定

```bash
# 使用 GLM-5.1（规划）
claude --model glm-5.1

# 使用 MiniMax-M2.7（执行）
claude --model MiniMax-M2.7
```

### 方法二：对话中动态切换

启动 Claude Code 后，输入：

```
/model MiniMax-M2.7
```

切换回 GLM：

```
/model glm-5.1
```

### 方法三：查看当前状态

```
/status
/model
```

---

## 常见问题排查

### 1. 仍然报模型错误

**检查项**：
- [ ] 是否重启了终端/Trae IDE？配置需要新会话才能生效
- [ ] `ANTHROPIC_BASE_URL` 是否还指向 `127.0.0.1:15721`？必须改为直连地址
- [ ] API Key 是否正确？有无多余空格或换行

### 2. 认证失败

**检查项**：
- [ ] API Key 是否有效/未过期
- [ ] API Key 是否有该模型的访问权限
- [ ] MiniMax 需要开通 Token Plan 才能使用

### 3. Trae IDE 覆盖配置

**解决**：Trae 插件可能有自己的配置覆盖机制，需要同时在 Trae 设置中修改模型配置

---

## 关键配置项说明

| 配置项 | 说明 | MiniMax 值 | 火山引擎值 |
|--------|------|-----------|-----------|
| `ANTHROPIC_BASE_URL` | API 端点 | `https://api.minimaxi.com/anthropic` | `https://ark.cn-beijing.volces.com/api/coding` |
| `ANTHROPIC_AUTH_TOKEN` | API 密钥 | MiniMax API Key | 火山引擎 API Key |
| `ANTHROPIC_MODEL` | 默认模型 | `MiniMax-M2.7` | `glm-5.1` |
| `model` | 启动默认模型 | `MiniMax-M2.7` | `glm-5.1` |

---

## 推荐的 cc-switch 工具（进阶）

官方推荐的配置管理工具，支持图形化切换多套配置：

- **安装**：`brew install --cask cc-switch`（Mac/Linux）
- **Windows**：从 https://github.com/farion1231/cc-switch/releases 下载
- **用途**：管理多套 API 配置，一键切换

---

## 工作流建议

1. **规划阶段** → 使用 `glm-5.1`（更强的推理能力，适合复杂任务）
2. **执行阶段** → 切换到 `MiniMax-M2.7`（性价比高，适合日常编码）

切换命令：
```
/model MiniMax-M2.7
```
