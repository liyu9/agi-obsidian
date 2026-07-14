# Query改写节点引入方案 - 位置分析与实施计划

## 概述

分析 v1.2.3 对话流中哪些位置需要引入 Query 改写节点，以提升知识库检索效果。

---

## 当前检索链路分析

### 进入知识库检索（节点13）的所有路径

```
路径A：缓存判断分支3（业务缓存命中）
  用户输入 → 缓存匹配(is_hit=cached) → 缓存判断(分支3) → 知识库检索
  Query = {{USER_INPUT}}
  特点：跳过意图识别，有 boost_query 但未用于检索

路径B：分支路由分支5（product_feature）
  用户输入 → 缓存匹配(未命中) → 意图识别 → 分支路由(分支5) → 知识库检索
  Query = {{USER_INPUT}}
  特点：有 intent + key_info，但未用于检索

路径C：分支路由分支6（product_pricing）
  用户输入 → 缓存匹配(未命中) → 意图识别 → 分支路由(分支6) → 知识库检索
  Query = {{USER_INPUT}}
  特点：有 intent + key_info + boost_query，但均未用于检索
```

### 各路径的检索优化需求

| 路径 | 是否需要改写 | 原因 | 可用信息 |
|------|-------------|------|---------|
| **路径A**（缓存命中） | ✅ 需要 | 用户输入可能口语化，boost_query 已准备好但被浪费 | boost_query |
| **路径B**（product_feature） | ✅ 需要 | 用户口语化表达，key_info 已提取但被浪费 | intent + key_info |
| **路径C**（product_pricing） | ✅ 需要 | 同上，且 boost_query 也可能存在 | intent + key_info + boost_query |

---

## 结论：两条路径各需一个 Query 改写节点

由于路径A（缓存命中）和路径B/C（意图识别后）走的是**完全不同的流程分支**，且可用的改写信息不同，因此需要在**两个位置**分别放置 Query 改写节点。

---

## 位置1：缓存命中快速路径的 Query 改写

### 放置位置

```
缓存判断（分支3）→ [新节点] Query改写-缓存 → 知识库检索
```

### 改写依据

缓存命中时，已有 `boost_query`（增强检索词），但当前直接用 USER_INPUT 检索。

**典型场景**：
- 用户输入："免费版能几个人用" → 缓存命中（keywords="免费版"）→ boost_query="免费版功能限制 用户数 行数 自动化次数"
- 当前：Query = "免费版能几个人用"（口语化）
- 改写后：Query = "免费版功能限制 用户数 行数 自动化次数"（专业术语）

### 节点配置

**类型**：代码节点（无需 LLM，直接拼接即可）

> **为什么用代码节点而非 LLM**：缓存命中路径的核心价值是"快速"，boost_query 已经是人工预设好的专业检索词，直接拼接比 LLM 改写更快（0延迟 vs 200-500ms），且更可控。

**输入**：
- `user_input` / String / `{{USER_INPUT}}`
- `boost_query` / String / `{{缓存匹配.boost_query}}`

**输出**：
- `search_query` / String / 改写后的检索 Query

**代码逻辑**：
```python
async def main(args: Args) -> Output:
    user_input = str(params.get("user_input", "")).strip()
    boost_query = str(params.get("boost_query", "")).strip()
    if boost_query:
        ret: Output = {"search_query": f"{user_input} {boost_query}"}
    else:
        ret: Output = {"search_query": user_input}
    return ret
```

**效果**：将用户原始输入 + boost_query 拼接，使检索同时匹配用户的口语化表达和知识库中的专业术语。

---

## 位置2：意图识别后路径的 Query 改写

### 放置位置

```
意图识别（节点7）→ [新节点] Query改写-意图 → 分支路由（节点8）
```

> 注意：放在分支路由**之前**而非分支5/6之后，这样改写只执行一次，不随分支重复。

### 改写依据

意图识别后，已有 `intent`（意图分类）和 `key_info`（关键信息），可用于将用户口语化表达改写为专业检索 Query。

**典型场景**：
- 用户输入："怎么把表里的数据弄进来" → intent=product_feature, key_info=["数据导入"]
- 当前：Query = "怎么把表里的数据弄进来"
- 改写后：Query = "数据导入 操作方法"

### 节点配置

**类型**：大模型节点（需要语义理解能力）

**模型**：豆包 Lite 7B（轻量快速）

**Temperature**：0.2

**输入**：
- `question` / String / `{{USER_INPUT}}`
- `intent` / String / `{{意图识别.intent}}`
- `key_info` / Array / `{{意图识别.key_info}}`

**输出**：
- `rewritten_query` / String / 改写后的检索 Query

**System Prompt**：
```
你是无代码产品客服系统的查询改写专家。根据用户问题和提取的关键信息，生成优化后的检索 Query。

## 改写规则
1. 将口语化表达替换为知识库中的专业术语
2. 将 key_info 中的关键实体融入 Query
3. 保持 Query 简洁，不超过50字
4. 不改变用户原始意图
5. 不添加用户未提及的信息
6. 仅在 intent 为 product_feature 或 product_pricing 时执行改写，其他意图直接输出原始问题

## 输出
直接输出改写后的 Query，不要输出任何其他内容。
```

**异常处理**：返回设定内容 `{{USER_INPUT}}`（改写失败时兜底使用原始输入）

### 条件性执行优化

在 System Prompt 中指定"仅在 product_feature/product_pricing 时改写"，这样：
- 闲聊（chitchat）→ 直接透传 USER_INPUT（不改写，因为不进入知识库检索）
- 非客服（non_service）→ 直接透传 USER_INPUT（不改写）
- 低置信度 → 直接透传 USER_INPUT（不改写）
- 负面情绪 → 直接透传 USER_INPUT（不改写，先安抚）

---

## 知识库检索节点的 Query 输入变更

两条路径最终都汇入知识库检索（节点13），需要统一 Query 来源。

### 方案：新增"检索Query组装"代码节点

在知识库检索之前新增一个轻量代码节点，统一两条路径的 Query：

```
路径A：缓存判断(分支3) → Query改写-缓存 → [新节点] 检索Query组装 → 知识库检索
路径B/C：分支路由(分支5/6) → [新节点] 检索Query组装 → 知识库检索
```

**输入**：
- `user_input` / String / `{{USER_INPUT}}`
- `cached_query` / String / `{{Query改写-缓存.search_query}}`
- `intent_query` / String / `{{Query改写-意图.rewritten_query}}`

**输出**：
- `final_query` / String / 最终检索 Query

**代码逻辑**：
```python
async def main(args: Args) -> Output:
    cached = str(params.get("cached_query", "")).strip()
    intent_q = str(params.get("intent_query", "")).strip()
    user = str(params.get("user_input", "")).strip()
    # 优先使用改写后的 Query，兜底使用原始输入
    query = cached or intent_q or user
    ret: Output = {"final_query": query}
    return ret
```

**知识库检索节点变更**：Query = `{{检索Query组装.final_query}}`

---

## 完整改写后流程图

```
用户输入(节点1)
  │
  ▼
读取缓存规则(节点2) → 缓存匹配(节点3)
  │
  ├── 找人工·第1次 → 挽留引导(节点5) → 写入会话变量(节点6) → 回复输出(节点26)
  ├── 找人工·第2次+ → 写入会话变量(节点6) → 回复输出(节点26)
  ├── 业务缓存命中 → [新] Query改写-缓存(代码) → [新] 检索Query组装(代码) → 知识库检索(节点13) → ...
  └── 未命中 → 意图识别(节点7) → [新] Query改写-意图(LLM) → 分支路由(节点8)
                                                              │
                                                    ┌─────────┼─────────┬─────────┬─────────┐
                                                    ▼         ▼         ▼         ▼         ▼
                                                  闲聊      超范围     低置信    负面情绪   产品功能/价格
                                                  (不改写)  (不改写)  (不改写)  (不改写)   ↓
                                                                                    [新] 检索Query组装
                                                                                         ↓
                                                                                    知识库检索(节点13) → ...
```

---

## 新增节点汇总

| # | 节点名称 | 类型 | 位置 | 作用 | 延迟影响 |
|---|---------|------|------|------|---------|
| 新1 | Query改写-缓存 | 代码 | 缓存判断(分支3) → 检索Query组装 | 拼接 USER_INPUT + boost_query | ~0ms |
| 新2 | Query改写-意图 | 大模型(Lite 7B) | 意图识别 → 分支路由 | 利用 intent+key_info 改写口语化 Query | ~200-500ms |
| 新3 | 检索Query组装 | 代码 | 两条路径汇合 → 知识库检索 | 统一 Query 来源，优先使用改写结果 | ~0ms |

---

## 延迟影响评估

| 路径 | 改写前延迟 | 改写后延迟 | 增加 |
|------|-----------|-----------|------|
| 缓存命中快速路径 | 基准 | +0ms（代码节点） | 无感 |
| 意图识别后路径（product_feature/product_pricing） | 基准 | +200-500ms（LLM改写） | 可接受 |
| 闲聊/非客服/低置信/负面情绪路径 | 基准 | +200-500ms（LLM改写，但透传） | 可优化* |

> *优化建议：如果对闲聊等路径的延迟敏感，可在分支路由之后、知识库检索之前放置改写节点（仅分支5/6经过），而非在分支路由之前。但这需要将改写节点放在分支5/6各自的连线上，Coze 是否支持需验证。

---

## 实施步骤

1. 新增节点"Query改写-缓存"（代码节点），放在缓存判断分支3和知识库检索之间
2. 新增节点"Query改写-意图"（大模型节点），放在意图识别和分支路由之间
3. 新增节点"检索Query组装"（代码节点），放在两条路径汇合处、知识库检索之前
4. 修改知识库检索（节点13）的 Query 输入为 `{{检索Query组装.final_query}}`
5. 更新所有连线
6. 测试验证三条路径的检索效果

---

## 验证方式

1. **缓存命中路径**：输入"免费版能几个人用" → 验证 Query 是否包含 boost_query 中的专业术语
2. **意图识别路径**：输入"怎么把表里的数据弄进来" → 验证 Query 是否被改写为"数据导入"相关专业术语
3. **闲聊路径**：输入"你好" → 验证不改写、不影响延迟
4. **改写失败兜底**：模拟 LLM 超时 → 验证使用原始 USER_INPUT 作为 Query
