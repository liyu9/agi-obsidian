# MiniMax 模型配置经验

## 症状

使用 `M2.7-highspeed`（MiniMax 模型）时出现 **401 认证失败**：

```
Anthropic 401 authentication failed.
Auth method: x-api-key (API key)
Token prefix: sk-cp-9emMS1...
Provider: anthropic  Model: M2-7-highspeed
Endpoint: https://api.anthropic.com
Error: HTTP 401: invalid x-api-key
```

**根因**：MiniMax 的 API key 被发送到了 `api.anthropic.com`（Anthropic 官方端点）而不是 MiniMax 的 Anthropic 兼容端点。

## 根因分析

1. `config.yaml` 默认 `provider: anthropic`，导致所有请求发往 `api.anthropic.com`
2. 内置 `anthropic` provider **不读取** `.env` 中的 `ANTHROPIC_BASE_URL` 环境变量
3. `.env` 中的 `ANTHROPIC_API_KEY` 是 MiniMax 的 key，被错发到 Anthropic 官方

## 正确配置

### config.yaml

```yaml
model:
  default: M2.7-highspeed
  provider: mm    # 必须用自定义 provider，不能用内置 anthropic

providers:
  zai:
    base_url: https://open.bigmodel.cn/api/coding/paas/v4
  mm:                         # 自定义 provider（非内置名）
    base_url: https://api.minimaxi.com/anthropic
    api_mode: anthropic_messages

fallback_providers:
  - mm

model_aliases:
  minimax:
    model: M2.7-highspeed
    provider: mm              # 也用 mm
    base_url: https://api.minimaxi.com/anthropic
```

### .env

```bash
# MiniMax API Key
ANTHROPIC_API_KEY=sk-cp-xxx...   # MiniMax 的 key

# MiniMax Anthropic 兼容端点
ANTHROPIC_BASE_URL=https://api.minimaxi.com/anthropic
MINIMAX_CN_API_KEY=sk-cp-xxx...
MINIMAX_CN_BASE_URL=https://api.minimaxi.com/anthropic
```

## 关键教训

1. **不能用内置 provider 名作为默认 provider**：`provider: anthropic` 会让 Hermes 使用内置 Anthropic provider，忽略 `ANTHROPIC_BASE_URL`
2. **必须创建自定义 provider**（如 `mm`）并指向 MiniMax Anthropic 兼容端点
3. **避免 provider 名称冲突**：如果自定义 provider 名字与内置 provider 同名（如 `minimax`），Hermes 会忽略自定义配置而使用内置 provider。**已知的冲突名称**：`zai`, `deepseek`, `anthropic`, `alibaba`, `openrouter`, `xai`, `xiaomi`, `minimax`
4. **model_aliases 里的 provider 也会受冲突影响**：即使在 `model_aliases` 里指定 `provider: mm`，如果别名用 `minimax` 也有风险
5. **.env 中的 `ANTHROPIC_BASE_URL` 对内置 anthropic provider 无效** — 内置 provider 硬编码使用 `api.anthropic.com`

## 验证方法

配置完成后，观察日志中的 `Endpoint` 字段，确保是 `api.minimaxi.com/anthropic` 而不是 `api.anthropic.com`。

## 配置文件位置

- Windows: `C:/Users/admin/AppData/Local/hermes/config.yaml`
- .env: 同级目录下的 `.env` 文件

## 修改记录

- 2025-05-13：修复 `provider: anthropic` → `provider: mm`，解决 401 认证失败问题
