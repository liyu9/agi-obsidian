# 智能体集成 OpenViking 报告

> 本报告调研各类 AI 智能体（Agent）与 OpenViking 的集成方式、交互流程与落地细节。当前已覆盖 Claude Code，后续将持续补充 Codex、OpenClaw、OpenCode、Hermes、Cursor、Trae 等智能体。
>
> 所有事实点均基于官方仓库 `volcengine/OpenViking`（`README.md`、`examples/claude-code-memory-plugin/README.md`、`hooks/hooks.json`、`scripts/auto-recall.mjs`、`scripts/auto-capture.mjs`）与官网 openviking.ai，未编撰。

---

## 第一部分：OpenViking 产品总览

**OpenViking** 是火山引擎（ByteDance/Volcengine）开源的 AI Agent **上下文数据库（Context Database）**，采用"文件系统范式"统一管理 Agent 的记忆、资源与技能。

- 官网：openviking.ai
- 仓库：github.com/volcengine/OpenViking（26.2K+ Stars）
- 许可证：AGPL-3.0（以主仓 LICENSE 为准）

### 1. 分层架构

| 层级 | 组件 | 说明 |
|---|---|---|
| **接入层** | Plugins / Providers | Claude Code、Codex、OpenClaw、OpenCode、Hermes、MCP（Trae/Cursor/Manus/ChatGPT）、SDK（Python/LangChain/LangGraph） |
| **服务层** | `openviking-server` | 核心服务进程，负责索引/检索/存储/会话管理 |
| **工具层** | `ov` CLI（Rust） | 命令行工具，通过 npm/cargo 安装 |
| **控制台** | `web-studio` | Web 控制台（Playground、可视化检索轨迹） |
| **模型层** | VLM + Embedding | 支持 Volcengine、OpenAI、OpenAI-Codex（OAuth）、Kimi、GLM、Ollama、LiteLLM 等 |
| **存储层** | RAGFS（Rust）+ VectorDB | 文件系统范式 + 向量存储，支持本地/S3 后端 |

### 2. 统一命名空间（viking:// 目录协议）

```
viking://resources/    多模态资源：项目文档、代码库、知识/规则
viking://user/         用户个人偏好、习惯、长期记忆
viking://session/      Agent 会话上下文
viking://agent/        Agent 技能、指令、任务记忆
```

### 3. 核心功能

- **文件系统范式**：把记忆/资源/技能组织成可 `ls`、`tree`、`read`、`find/search` 的目录
- **分层加载（L0/L1/L2）**：`.abstract.md`（L0 摘要）→ `.overview.md`（L1 概览）→ 完整内容（L2），按需拉取以省 Token
- **目录递归检索**：目录定位 + 语义搜索结合
- **自动会话管理**：自动压缩对话内容、抽取长期记忆
- **可视化检索轨迹**：Web Studio 展示目录检索路径，可观测、可调试

### 4. 性能表现（LOCOMO 评测，来源：官网）

| Agent + 记忆方案 | 任务完成率 | 输入 Token |
|---|---|---|
| Claude Code 原生 Auto-Memory | 57.21% | 353.31M |
| Claude Code + OpenViking | **80.32%** | **129.97M（↓63%）** |
| Hermes 原生 | 33.38% | — |
| Hermes + OpenViking | **82.26%** | — |
| OpenClaw + memory-core | 24.2% | — |
| OpenClaw + OpenViking | **82.08%** | — |

---

## 第二部分：Claude Code × OpenViking 集成方式

### 一、集成方式：Hooks + MCP 双通道

#### 1. Hooks 与 MCP 的作用及为何这样设计

| 通道 | 触发方 | 作用 | 为何这样设计 |
|---|---|---|---|
| **Hooks 通道** | Claude Code 主动在生命周期节点回调 `.mjs` 脚本 | **自动**做记忆的召回（recall）与沉淀（capture），无需模型意识到 OpenViking 的存在 | 官方原话：*"Recall happens automatically before every prompt, capture happens automatically after every turn — no MCP tool calls required from the model."* → 保证记忆能力**不依赖 LLM 的意愿或工具编排能力**，稳定、可预期 |
| **MCP 通道** | Claude 模型主动决策后调用 | 提供 9 个按需操作的工具（详见下节） | 用于**精细化操作**（模型判断"自动注入的 6 条记忆不够"时可主动搜/读/写/删）；Hook 无法覆盖的动态语义操作交给模型判断 |

**分工本质**：Hooks = 自动、粗粒度、生命周期驱动；MCP = 按需、细粒度、模型意图驱动。

#### 2. 7 个 Hook 的作用（引自官方 README「Hook responsibilities」表）

> Hook = Claude Code 在关键生命周期节点自动回调的脚本。以下 7 个 Hook 是插件的全部自动化入口，覆盖"读记忆 / 写记忆 / 会话生命周期 / 子 Agent"四类场景。

| Hook | 触发时机 | 动作 |
|---|---|---|
| **UserPromptSubmit** | 用户每次提交 prompt 时 | 检索 OV → 排序 → 在 token 预算内注入 `<openviking-context>` 上下文块（读记忆） |
| **Stop** | Claude 每轮回答结束时 | 解析 transcript → 把新增 turn 推送到 OV Session → pending token 达到阈值即触发 commit（写记忆） |
| **SessionStart** | 新会话 / 恢复会话 / compact 之后重启时 | 恢复或压缩后启动时，拉取最近 archive 概要注入作为额外上下文（初始化） |
| **PreCompact** | Claude Code 即将改写 transcript（压缩上下文）前 | 强制 commit pending 消息，抢在 CC 改写 transcript 之前把它们归档（防丢失） |
| **SessionEnd** | Claude Code 会话关闭时 | 收尾 commit，把最后一个窗口归档（收尾） |
| **SubagentStart** | 主 Agent 通过 Task 工具派生子 Agent 时 | 为子 Agent 分配独立的 OV Session ID，持久化启动状态（隔离） |
| **SubagentStop** | 子 Agent 结束时 | 读子 Agent 的 transcript → 以子 Agent 的 peer 身份推送到独立 session → commit（隔离归档） |

#### 3. MCP 通道的 9 个工具（引自官方 README「MCP tools available from the server」表）

> MCP（Model Context Protocol）= 模型上下文协议。Claude 模型在推理过程中可以像调用函数一样调用这些工具。这些工具由 **OpenViking Server 的 `/mcp` HTTP 端点** 暴露，共 9 个。

| 工具 | 作用 | 典型触发场景 |
|---|---|---|
| **search** | 跨 memories / resources / skills 做语义检索 | 当模型觉得 Hooks 自动注入的 6 条记忆还不够，或需要检索 `viking://resources`（Hooks 不自动搜资源）时调用 |
| **read** | 读取一个或多个 `viking://` URI 的完整内容（L2 原文） | 当自动召回只给了 abstract/URI 提示，模型想看全文时调用 |
| **list** | 列出某个 viking:// 目录下的条目（类似 `ls`） | 用于"这个知识库/项目文档目录里有哪些文件"这类目录浏览 |
| **store** | 把一段消息**显式**写入长期记忆，并触发服务端 memory extraction | 用户明确说"记住这一条"或模型判断某结论值得沉淀时 |
| **add_resource** | 把本地文件或 URL 注册为 OpenViking 资源（服务端会做 VLM 理解 + Embedding 向量化 + 分层摘要） | 用于"把这份 PDF / 这个 GitHub 仓库加进知识库" |
| **grep** | 在 viking:// 文件内容上做正则匹配（类似 `grep`） | 精确字面量查找，比语义 `search` 更适合"找所有含 `TODO(auth)` 的位置" |
| **glob** | 按 glob 通配符找文件（类似 `find`/`glob`） | 用于"找所有 `**/*.spec.ts` 测试文件"这类按路径模式定位 |
| **forget** | 删除任意 `viking://` URI 对应的条目 | 用于"把那条错误记忆删掉"，是长期记忆的显式反悔机制 |
| **health** | 探活，检查 OpenViking 服务是否可达 | Statusline 与调试命令用它判断服务是否在线 |

**分层关系**：
- 语义检索 → `search`（模糊）
- 字面量检索 → `grep`（精确）
- 结构检索 → `list`（目录）/ `glob`（路径模式）
- 内容读取 → `read`
- 写入 → `store`（记忆）/ `add_resource`（资源）
- 删除 → `forget`
- 运维 → `health`

> 补充：远程 server 场景下，MCP 通道需要 shell function wrapper 把 `OPENVIKING_URL` / `OPENVIKING_API_KEY` 注入到 `claude` 进程；否则 MCP 会静默连回 `http://127.0.0.1:1933` 且不带鉴权头（README「Configuring MCP」章节明示的常见误配）。

---

### 二、完整交互时序（一次典型会话）

#### 名词解释

- **transcript（会话记录）**：Claude Code 在磁盘上维护的当前会话消息文件，包含 user / assistant / tool_use / tool_result 全部消息块。插件通过 stdin 收到 `transcript_path` 字段后去读它。
- **auto-recall.mjs（自动召回脚本）**：`UserPromptSubmit` 触发的 Node 脚本；用用户 prompt 去 OpenViking 检索、排序、构造 `<openviking-context>` 注入块。
- **auto-capture.mjs（自动沉淀脚本）**：`Stop` 触发的 Node 脚本；解析 transcript、抽取本轮新增 turn、清洗后推送至 OV Session，触达阈值即触发归档抽取。
- **turn（轮次）**：一次 user 或 assistant 的消息单元（含其 tool_use / tool_result 子块）。
- **OV Session（会话对象）**：OpenViking 服务端里以 `cc-<sha256(cc_session_id)>` 为 ID 的持久会话，跨 recall/capture/PreCompact/SessionEnd 共用。
- **archive（归档）** & **commit（提交）**：OV Session 内 pending token 累积到阈值（默认 20000）后触发 commit，把这段对话结晶为 archive（结构化档案），并由服务端做 memory extraction。
- **peer_id（对端身份）**：多租户下把记忆挂在哪个"人格"名下，子 Agent 会 fallback 到 Claude 的 `agent_id`。
- **`<openviking-context>` 注入块**：auto-recall 拼装的 XML 风格文本块，包含"相关记忆 + 相关度% + URI/内容"，作为额外上下文追加到用户 Prompt 前，供模型直接读取。

#### 时序图

```
① 启动 claude
    └─► SessionStart Hook（120s）
         ├─ 新会话：绑定 OV Session ID = cc-<sha256(cc_session_id)>
         └─ 恢复/PreCompact 后重启：拉取最近 archive overview 注入到系统上下文

② 用户输入 prompt
    └─► UserPromptSubmit Hook（8s）→ auto-recall.mjs
         ├─ 通过 stdin 拿到 prompt / session_id / cwd
         ├─ 命中 bypass / 过短 query / server offline → 直接 approve（跳过）
         ├─ 多路检索：POST /api/v1/search/find
         │           （viking://user/memories + viking://user/skills）
         ├─ 排序：base score + leafBoost + eventBoost + prefBoost + lexicalOverlap
         ├─ score ≥ 0.35 过滤，去重，取前 recallLimit=6
         ├─ 内容解析：优先 abstract（L0/L1），必要时读 L2 全文，单条截到 500 字
         ├─ 预算：2000 token 内的注入完整内容，超出的降级为「URI + 相关度%」
         └─ 输出 <openviking-context>...</openviking-context> 注入到 prompt 前

③ 模型生成回答（过程中可选）
    └─► 模型判断信息不够 → 主动调用 MCP 工具：
        search / read / list / store / add_resource / grep / glob / forget / health

④ 模型完成回答
    └─► Stop Hook（45s，异步 detach）→ auto-capture.mjs
         ├─ 读 transcript_path 全文
         ├─ 解析每条消息为 {role, text, toolNames, parts}
         ├─ 增量：state 文件记录 capturedTurnCount，只处理新增 turn
         ├─ sanitize：剥离 <openviking-context> / <system-reminder> /
         │           <relevant-memories> / [Subagent Context]（防污染回环）
         ├─ shouldCapture 门禁：非空、长度合理、非纯命令、非纯问句、非纯符号
         ├─ 结构化：文本→text part，工具→tool part
         │         （tool_id/name/input/output/status，output 单条截 2000 字）
         └─ addMessage 推送至 OV Session
              → OV 服务端 pending token 累积到 20000
              → commit → archive → extract memory

⑤ Claude Code 即将压缩上下文
    └─► PreCompact Hook（30s，同步）→ 强制 commit，把 pending 消息落为 archive

⑥ 会话关闭
    └─► SessionEnd Hook（30s，异步）→ 收尾 commit

⑦ Task 工具派发子 Agent
    ├─► SubagentStart Hook（10s）→ 分配隔离的子 OV Session
    └─► SubagentStop Hook（45s，异步）→ 用子 Agent peer 身份归档
```

---

### 三、触发 OpenViking 的场景 & 处理流程 & 落地位置

#### 1. 触发场景

**A. Hooks 通道 —— 自动触发（用户/模型无感）**

| 场景 | 对应 Hook |
|---|---|
| 用户按回车提交提问 | UserPromptSubmit |
| 新会话首次启动 | SessionStart |
| 恢复历史会话 / compact 后重启 | SessionStart |
| 模型每轮回答完成 | Stop |
| Claude Code 即将压缩 transcript | PreCompact |
| 会话正常关闭 | SessionEnd |
| 主 Agent 通过 Task 工具派生子 Agent | SubagentStart |
| 子 Agent 结束 | SubagentStop |

**默认不触发**（源码 & README 明确的 skip 条件）：

- `OPENVIKING_MEMORY_ENABLED=0/false/no`
- 未配置 `ov.conf` 也未配置 `ovcli.conf`（silently disabled）
- `OPENVIKING_BYPASS_SESSION=1` 或 `session_id/cwd` 命中 `OPENVIKING_BYPASS_SESSION_PATTERNS`
- Recall 侧：query 长度 < 3、server `/health` 不通、检索无结果、全部低于 `score_threshold=0.35`
- Capture 侧：文本为空、CJK 少于 4 字符或非 CJK 少于 10 字符、超过 `captureMaxLength=24000`、纯 `/command`、纯符号、纯问句（正则 `QUESTION_ONLY_RE`）；`keyword` 模式下未命中 `MEMORY_TRIGGERS`（`remember/preference/记住/偏好/邮箱/电话/…`）

**B. MCP 通道 —— 模型按需触发**

| 场景（模型判断） | 调用的 MCP 工具 |
|---|---|
| 需要更精准的跨命名空间检索 | `search` |
| 想读取某个 viking:// URI 的完整内容 | `read` |
| 想看目录下有哪些条目 | `list` |
| 想把一段结论/偏好显式写入长期记忆 | `store` |
| 想把文件 / URL / 目录加为资源 | `add_resource` |
| 需要按正则搜内容 | `grep` |
| 需要按 glob 找文件 | `glob` |
| 需要删除某条错误记忆 | `forget` |
| 探活 | `health` |

#### 2. 内容处理流程（Capture 路径为主）

```
Claude Code transcript.jsonl
   │
   │ ① 读取 transcript_path → parseTranscript()
   ▼
原始消息数组 [{role, content:[text|tool_use|tool_result], ...}]
   │
   │ ② extractAllTurns()：拆成 {role, text, toolNames, parts}
   ▼
本轮全部 turn
   │
   │ ③ 增量过滤：capturedTurnCount 之后的 turn
   ▼
新增 turn
   │
   │ ④ sanitize / stripInjectedBlocks：
   │    剥离 <openviking-context> / <system-reminder> /
   │         <relevant-memories> / [Subagent Context]
   ▼
清洗后 turn
   │
   │ ⑤ shouldCapture 门禁：长度、命令、问句、符号、语义/关键词模式
   ▼
可捕获 turn
   │
   │ ⑥ buildParts + sanitizePartsForSend：
   │    text → text part
   │    tool_use → tool part(id/name/input/status=running)
   │    tool_result → tool part(id/name/output(≤2000字)/status=completed|error)
   ▼
结构化 parts
   │
   │ ⑦ addMessage → POST 到 OV Session
   │   （session_id = cc-<sha256(cc_session_id)>）
   ▼
OV 服务端 pending 队列
   │
   │ ⑧ pending token ≥ 20000（COMMIT_TOKEN_THRESHOLD） → commit
   ▼
OV 服务端触发 archive & memory extraction（LLM 提炼）
   │
   ▼
落地到 viking:// 目录
```

#### 3. 处理成什么内容 & 存在什么位置

##### 3.1 上传前：信息类型识别与结构化（auto-capture.mjs 客户端处理）

插件在把消息推到 OpenViking 之前，会先把 transcript 里的原始消息**按类型拆解、清洗、结构化**，避免噪声进入长期记忆。

| 信息类型（transcript 中的原始形态） | 客户端处理策略 | 结构化后形态（发送到 OV 的 payload） |
|---|---|---|
| **用户纯文本** `{role:"user", content:"..."}` | sanitize：剥离 `<openviking-context>` / `<system-reminder>` / `<relevant-memories>` / `[Subagent Context]`（防污染回环）；shouldCapture 门禁 | `{role:"user", parts:[{type:"text", text:"..."}]}` |
| **模型纯文本** `{role:"assistant", content:"..."}` | 同上；受 `OPENVIKING_CAPTURE_ASSISTANT_TURNS=true` 控制是否上传 | `{role:"assistant", parts:[{type:"text", text:"..."}]}` |
| **模型调用工具** `content:[{type:"tool_use", id, name, input}]` | 作为独立 `tool part`（不再内联到文本里），保留调用意图 | `{type:"tool", tool_id, tool_name, tool_input, tool_status:"running"}` |
| **工具返回结果** `content:[{type:"tool_result", tool_use_id, content, is_error}]` | 按 `tool_use_id` 反查配对的 tool_name；`tool_output` 截断到 **2000 字符**（原文 `TOOL_OUTPUT_PART_MAX_CHARS`） | `{type:"tool", tool_id, tool_name, tool_output:"(≤2000字)", tool_status:"completed"｜"error"}` |
| **纯 `/command`（如 `/help`）** | shouldCapture 直接过滤（`COMMAND_TEXT_RE`） | ❌ 不上传 |
| **纯问句（如"什么时候…？"）** | 命中 `QUESTION_ONLY_RE` 直接过滤（问句本身几乎不产生记忆） | ❌ 不上传 |
| **纯符号 / 空白 / 过短文本** | 非 CJK < 10 字符、CJK < 4 字符、或纯 `\p{P}\p{S}` → 过滤 | ❌ 不上传 |
| **超长文本（> 24000 字符）** | 命中 `captureMaxLength` → 过滤 | ❌ 不上传 |
| **重复消息** | 增量追踪：state 文件记录 `capturedTurnCount`，只处理新增 turn | 只发新增部分 |

##### 3.2 上传后：服务端语义抽取策略（OV Server 处理）

当 OV Session 的 pending token 累积到 **20000（`COMMIT_TOKEN_THRESHOLD`）**，或触发 PreCompact / SessionEnd / SubagentStop 时，会强制 commit。commit 后服务端由 **VLM（视觉语言模型）+ LLM** 进行 memory extraction，把对话结晶为**分类别的、可检索的**长期知识。

###### 3.2.0 "语义"是怎么实现的？—— 大模型 + Embedding，不是规则

问：3.1 的客户端过滤（关键词、正则、长度）像是规则；那 3.2 的"语义"抽取到底是什么？

答：**是真正的大模型调用**。源码 `openviking/session/session.py` 明确使用 LLM + Embedding 双通道，不是关键词匹配：

**（1）Phase 1 — 消息侧写 & 分类（LLM 完成）**
- commit 触发后，服务端把即将归档的消息批量丢给 **LLM**（配置在 `ov.conf` 的 `vlm.provider/model`，如 Doubao、GPT-4o、Kimi、GLM 等）
- LLM 按 **MemoryTypeRegistry** 注册的类型（preferences / events / cases / skills / general）判定每条消息属于哪一类记忆，并抽取结构化字段
- 有 3 次重试 + 指数退避（源码 `_MEMORY_EXTRACTION_MAX_RETRIES = 3`）

**（2）Phase 2 — Working Memory v2 结构化压缩（LLM Function Calling）**
- 服务端调用 `compression.ov_wm_v2` / `compression.ov_wm_v2_update` 两个 Prompt 模板
- 通过 **OpenAI Function Calling / Tool Use** 强制 LLM 按 7 个固定 section 输出（源码 `WM_SEVEN_SECTIONS`）：
    1. `Session Title`（会话标题）
    2. `Current State`（当前状态）
    3. `Task & Goals`（任务与目标）
    4. `Key Facts & Decisions`（关键事实与决策）
    5. `Files & Context`（涉及的文件与上下文）
    6. `Errors & Corrections`（错误与纠正）
    7. `Open Issues`（未决问题）
- 每个 section 输出三选一操作：`KEEP`（不变）/ `UPDATE`（全量替换）/ `APPEND`（追加要点）
- 服务端做 section 级 merge，落为 `archive_NNN/.overview.md`（即 L1）

**（3）Embedding 向量化（Embedding 模型）**
- 每条落地的记忆条目会调用 `ov.conf` 的 `embedding.dense`（Doubao Embedding / OpenAI text-embedding-3 / Jina / Voyage / Cohere / 本地 Ollama 等）转成向量
- 向量存到 VectorDB（RAGFS），供 Recall 时的语义相似度检索使用
- 服务端 meta 会记账 `llm_token_usage` 和 `embedding_token_usage`

**（4）VLM（视觉语言模型）用在哪里？**
- 仅当资源含图片/PDF/多模态内容（`add_resource` 加入的文件、`viking://resources/` 下的资产）时，才走 VLM 做视觉理解、生成 L0/L1 摘要
- 纯文本对话的 memory extraction 由 LLM 而非 VLM 完成

**一句话概括**：客户端 auto-capture 用**规则**做粗过滤；服务端用**LLM Function Calling** 按 7 个 section 做结构化压缩、按 5 类做记忆分类；用 **Embedding 模型**做向量化以支持后续的语义 Recall；**VLM** 只在多模态资源入库时启用。

---

**服务端识别的信息类别**（源自 auto-recall.mjs 的排序逻辑 `rankItem`：`preferences / events / cases / memories / skills`）：

| 服务端类别 | 内容特征 | 服务端处理策略 | 落地位置 |
|---|---|---|---|
| **偏好类（preferences）** | "我喜欢…" / "prefer…" / "favorite…" | LLM 抽取偏好三元组，Embedding 向量化，生成 L0 abstract | `viking://user/<space>/memories/preferences/...` |
| **事件类（events）** | 带时间的事实（"昨天…" / "on 2025-…"） | LLM 抽取事件+时间戳，按 URI 去重（而非按摘要去重） | `viking://user/<space>/memories/events/...` |
| **案例类（cases）** | 具体决策 / 解决方案的可复用案例 | LLM 抽取问题-方案对，按 URI 去重 | `viking://user/<space>/memories/cases/...` |
| **一般记忆（memories）** | 用户长期事实（姓名、邮箱、住址、身份等） | LLM 提炼为陈述句，Embedding 向量化 | `viking://user/<space>/memories/...` |
| **技能 / 指令（skills）** | Agent 学到的操作方式、任务经验 | 抽取为可复用的 skill 描述 | `viking://user/<space>/skills/...` |
| **对话档案（archive）** | 本轮完整对话（去除注入块后的原文） | 按 20000 token 窗口切分，保留原文供追溯 | 挂在 OV Session `cc-<sha256(cc_session_id)>` 名下 |
| **多模态资源（resources）** | 通过 MCP `add_resource` 主动加入的文件/URL/仓库 | VLM 视觉理解 → 分层生成 L0 abstract / L1 overview / L2 全文 → Embedding | `viking://resources/...` |

##### 3.3 分层存储策略（L0 / L1 / L2）

服务端对每个存入的条目生成**三层**产物，Recall 时按需拉取以省 Token：

| 层级 | 文件名约定 | 内容 | Recall 默认取哪层 |
|---|---|---|---|
| **L0** | `.abstract.md` | 一句话摘要（≤ 几十字） | 默认注入（`OPENVIKING_RECALL_PREFER_ABSTRACT=true`） |
| **L1** | `.overview.md` | 段落级概览 | fallback（abstract 为空时） |
| **L2** | 原文 `README.md`、文件正文等 | 完整内容 | 相关度高 + token 预算充足时才拉；单条截 500 字（`RECALL_MAX_CONTENT_CHARS`） |

##### 3.4 Recall 时的检索范围（源码 `SOURCES` 常量）

| 检索通道 | 检索目录 | 说明 |
|---|---|---|
| **Hooks 自动召回** | `viking://user/memories` + `viking://user/skills` | 只搜"个人 + 技能"两个安全命名空间 |
| **MCP `search` 工具** | 由模型指定 `scope`，可覆盖 memories / skills / resources | `viking://resources` **不参与自动召回**（防跨命名空间泄露），模型需要资源必须显式调用 MCP |

##### 3.5 本地文件系统落地

除服务端存储外，插件还会在**本地**保留少量状态：

| 文件 | 内容 | 用途 |
|---|---|---|
| `os.tmpdir()/openviking-cc-capture-state/<safe_session_id>.json` | `capturedTurnCount` | 增量追踪，避免重复捕获 |
| `~/.openviking/state/last-recall.json` | 上次注入的条数、相关度、耗时 | Statusline 展示 |
| `~/.openviking/state/last-capture.json` | 上次沉淀的 turn 数、pending token | Statusline 展示 |
| `~/.openviking/state/daily-stats.json` | 当日 archive 数 | Statusline 展示 |
| `~/.openviking/logs/cc-hooks.log` | Hook 运行日志（需 `OPENVIKING_DEBUG=1`） | 排错 |
| `~/.openviking/ov.conf` / `ovcli.conf` | 服务端 URL / API Key / 用户身份 | 配置 |

---

## 附录：关键参数默认值

| 参数 | 默认值 | 作用 |
|---|---|---|
| `OPENVIKING_RECALL_LIMIT` | 6 | 每轮最多注入的记忆条数 |
| `OPENVIKING_RECALL_TOKEN_BUDGET` | 2000 | 内联内容的 token 预算 |
| `OPENVIKING_RECALL_MAX_CONTENT_CHARS` | 500 | 单条内容截断上限 |
| `OPENVIKING_SCORE_THRESHOLD` | 0.35 | 最低相关度阈值 |
| `OPENVIKING_MIN_QUERY_LENGTH` | 3 | 少于该长度跳过 recall |
| `OPENVIKING_CAPTURE_MAX_LENGTH` | 24000 | 单次 capture 决策的最大文本长度 |
| `OPENVIKING_COMMIT_TOKEN_THRESHOLD` | 20000 | pending token 达到即触发 commit |
| `OPENVIKING_RESUME_CONTEXT_BUDGET` | 32000 | 会话恢复时拉取 archive overview 的 token 预算 |
| `OPENVIKING_TIMEOUT_MS` | 15000 | recall / 常规请求超时（ms） |
| `OPENVIKING_CAPTURE_TIMEOUT_MS` | 30000 | capture 请求超时（ms） |
| `OPENVIKING_WRITE_PATH_ASYNC` | true | 写路径 Hook 后台异步执行 |

---

## 参考资料

- [OpenViking 官网](https://openviking.ai/)
- [volcengine/OpenViking (GitHub)](https://github.com/volcengine/OpenViking)
- [claude-code-memory-plugin/README.md (官方)](https://github.com/volcengine/OpenViking/blob/main/examples/claude-code-memory-plugin/README.md)
- [hooks/hooks.json (官方)](https://github.com/volcengine/OpenViking/blob/main/examples/claude-code-memory-plugin/hooks/hooks.json)
- [scripts/auto-recall.mjs (官方源码)](https://github.com/volcengine/OpenViking/blob/main/examples/claude-code-memory-plugin/scripts/auto-recall.mjs)
- [scripts/auto-capture.mjs (官方源码)](https://github.com/volcengine/OpenViking/blob/main/examples/claude-code-memory-plugin/scripts/auto-capture.mjs)
