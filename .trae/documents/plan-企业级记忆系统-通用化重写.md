# Plan · 企业级 Claude Code 记忆系统调研（Ch.2 / Ch.3 / Ch.4 / Ch.5 深度重写）

> 计划文件路径：`d:\360MoveData\Users\admin\Desktop\AgiP\AGI-obsidian\.trae\documents\plan-企业级记忆系统-通用化重写.md`
> 目标文档：`d:\360MoveData\Users\admin\Desktop\AgiP\AGI-obsidian\企业级Claude Code记忆系统调研.md`
> 中间产物目录：`c:\Users\admin\.trae-cn\work\6a45cefa2d8a0f210e5c64dd\step{1..4}\`
> 版本：v1（计划稿，待用户确认）


## 一、Summary（本次要做什么）

用户已确认当前文档 Ch.1 / Ch.6 骨架无需大改；需要**基于最新（近 12 个月）业界最佳实践**重写以下四章：

- **Ch.2 需求与约束**：先调研 Claude Code / Codex / Hermes / OpenClaw 四个 Agent 的记忆最佳实践，从中反推「记忆系统的需求维度」
- **Ch.3 OpenViking 能力评估**：以 Ch.2 得出的维度为参照系，重列 OpenViking 能力清单并逐项评估满足度
- **Ch.4 记忆模型设计**：结合 Ch.2 最佳实践细化 L0/L1/L2、命名空间、写入/检索、schema
- **Ch.5**：从「Agent 集成方案」升级为「**通用记忆系统设计**」——产品架构、核心模块、功能清单、Agent 适配协议

执行原则：**每一步产出后先做校验，再进入下一步**；每步内部若子任务独立可派**并行子智能体**保证质量与效率；所有结论必须有可溯源 URL + 抓取日期。

Ch.1 微调（背景已含 4 个 Agent）、Ch.6 联动更新（跟随 Ch.4 schema）**不在本次范围**，遗留下期。


## 二、Current State Analysis（当前状态）

### 2.1 已完成
- Ch.1-6 初版骨架已写入目标文档（v0.1）
- 前置报告《智能体集成OpenViking报告.md》完整覆盖 Claude Code × OpenViking 的 Hook / MCP / 七段式抽取

### 2.2 现状不足（需要本次修复）
| 章节 | 当前问题 |
| --- | --- |
| Ch.2 | 需求条目泛泛而谈，未基于 4 个 Agent 的真实实践 |
| Ch.3 | 能力维度是随机列的，未与需求维度对齐；「满足度」结论未附证据 |
| Ch.4 | 只有骨架，缺 schema、参数默认值、时序细节、与其他 Agent 的对齐说明 |
| Ch.5 | 只是逐个讲 Agent 集成，未上升到「通用系统设计」层次；对未来 Agent 接入无协议 |

### 2.3 关键歧义（开工前需澄清）
- **Hermes 指代**：Nous Research Hermes / OpenViking 生态 Hermes Provider / 其他？→ **默认取 Nous Research Hermes（Function-Calling Agent 框架）**，若不符请开工前告知
- **OpenClaw 公开度**：若无独立公开仓库，则以 `@openviking/openclaw-plugin` README + 已有报告为一手来源
- **交付形式**：确认为「直接替换原文件的 Ch.2/3/4/5」，中间稿存 `work/` 目录


## 三、Proposed Changes（每一步的具体动作）

### 全局约束（四步共用）

1. **信息新鲜度**：优先近 12 个月一手资料；1 年以外仅在无近期资料时降级并标注日期
2. **来源分级**：官方仓库 / 官方文档 > 官方博客 / 演讲 > 社区博客（社区≤30%）
3. **可溯源**：每条被写入正文的结论必须留下 URL + 抓取日期（汇总到附录 C）
4. **无编撰**：非官方结论必须显式标注「合理推算」或「社区反馈」
5. **无时间点**：正文不出现「第 X 周 / Q1 / 下月」等时间承诺
6. **5D 统一口径**（步骤 1 定义，2/3/4 复用）：
   - D1 记忆分层（短期 / 工作 / 长期 / 归档；载体形态）
   - D2 写入路径（触发、抽取器、schema、去噪）
   - D3 检索路径（触发、召回、重排、token 预算、注入位）
   - D4 命名空间与身份路由（session / user / agent / peer / project）
   - D5 可观测性与治理（可视化、遗忘、隐私、许可证、并发）

---

### 步骤 1 · 重写 Ch.2（需求与约束 / 反推自 4 Agent 最佳实践）

**动作**：调研 Claude Code / Codex / Hermes / OpenClaw 四个 Agent 的记忆最佳实践 → 抽取 5D 矩阵 → 反推需求维度 → 重写 Ch.2。

**信息源分工（可完全并行，4 个子智能体）**

| 子任务 | Agent | 一手信息源 |
| --- | --- | --- |
| S1-A | Claude Code | `docs.claude.com/en/docs/claude-code/memory`、`.../hooks`、`.../mcp`；`CLAUDE.md` 规范；`anthropics/claude-code` releases 与 issues |
| S1-B | Codex | `platform.openai.com/docs/codex`、`openai/codex` 仓库 README、`AGENTS.md` 官方规范、Codex Cloud / Codex Web 更新记录 |
| S1-C | Hermes（默认 Nous Research） | Hermes 官方仓库 README、Function-Calling 规范、Memory Provider 源码 |
| S1-D | OpenClaw | `@openviking/openclaw-plugin` README（已抓取）+ 已有报告 + 火山引擎相关博客 |

**并行完成后（串行 1 步）**
- S1-E：横向汇总 4 Agent 的 5D 矩阵 → 反推需求维度候选池 → 每条需求附至少 2 个 Agent 的共性证据（单点需求标为「参考性」）

**校验点（步骤 1 校验，通过后才进入步骤 2）**
- [ ] 每 Agent 的 5 个维度都有 ≥ 1 条一手来源；缺项显式标注「公开资料未涵盖」
- [ ] 抓取日期均在近 12 个月内
- [ ] 需求维度候选池每一条都可追溯到 ≥ 2 Agent 共性
- [ ] 独立审校子智能体抽样回访（每 Agent 抽 3 条）验证描述与原文一致

**正文交付（写入 Ch.2）**
- 2.1 功能需求（基于 4 Agent 共性）
- 2.2 非功能需求（含官方数据点）
- 2.3 约束与前提（技术栈、AGPL-3.0、Docker 边界）
- 2.4 5D 需求维度速查表（为 Ch.3/4/5 提供参照系）

**中间产物**
- `work/step1/{claude-code,codex,hermes,openclaw}.md` × 4 份 5D 笔记
- `work/step1/matrix.md`（4 Agent 5D 横向对比）
- `work/step1/requirements-derivation.md`（需求维度候选池 + 证据）
- `work/step1/raw/`（关键页面 markdown 快照，防链接漂移）

---

### 步骤 2 · 重写 Ch.3（OpenViking 能力评估）

**动作**：以步骤 1 的需求维度为参照系，重列 OpenViking 能力清单 → 逐维度评估满足度 + 附证据 + 列缺口。

**信息源分工（可并行，3 个子智能体）**

| 子任务 | 信息源 |
| --- | --- |
| S2-A OpenViking 官方能力（近 1 年） | `github.com/volcengine/OpenViking` README / docs / examples；`openviking.ai`；CHANGELOG；`ov` CLI help |
| S2-C 官方基准数据 | LoCoMo 榜单、token savings 图表、Working Memory v2 相关材料 |
| S2-D 社区反馈 | GitHub issues / discussions（近 1 年）中并发、Docker、Hermes provider 的实测反馈 |

**串行**
- S2-B（读已有报告 `智能体集成OpenViking报告.md`，直接引用）
- S2-E（需求 × 能力双向映射 → 满足度矩阵）

**校验点**
- [ ] 3.3 满足度矩阵每行必须附 URL + 一句原文摘录
- [ ] 缺口清单每项必须给出「验证方法」（读源码 / 跑样例 / 提 issue）
- [ ] 抽样 5 行回访原始 URL 验证
- [ ] 明确列出与旧版 Ch.3 的差异点

**正文交付（写入 Ch.3）**
- 3.1 评估参照系（承接 Ch.2 需求维度）
- 3.2 OpenViking 能力全景（按 5D 口径重排）
- 3.3 需求 × 能力满足度矩阵（含「部分满足」细粒度）
- 3.4 潜在缺口与验证清单

---

### 步骤 3 · 补齐 Ch.4（记忆模型设计）

**动作**：结合步骤 1 最佳实践 + 步骤 2 缺口，把 L0/L1/L2、命名空间、写入/检索从骨架细化到可实施规格 + 统一 schema。

**信息源分工（5 个子智能体并行）**

| 子任务 | 内容 |
| --- | --- |
| S3-A 分层细化 | 4 Agent 分层实践 + OpenViking abstract/overview/body 三分 |
| S3-B 命名空间 | Claude Code sessionId / Codex AGENTS.md scope / Hermes provider scope / OpenClaw peer_id / `viking://` scheme |
| S3-C 写入策略 | 触发时机对比 + 结构化 schema（七段式 vs AGENTS.md vs FC schema）+ 去噪与切分 |
| S3-D 检索策略 | 触发点、召回+重排、token 预算、注入位 |
| S3-E 遗忘与更新 | forget / compact / archive 语义 |

**串行**
- S3-F：统一 schema 定稿（category / abstract / overview / body / embedding / peer_id / provenance / ttl），需与 OpenViking MCP 工具入参出参双向对齐

**校验点**
- [ ] 每小节末尾附「与 4 Agent 的对齐关系」表格（共性 vs 我方增强）
- [ ] schema 反向映射到 OpenViking MCP 工具（附映射表）
- [ ] 每个参数默认值有官方来源或「合理推算」标注
- [ ] 用一个虚构 Codex 会话样例走一遍写入/检索链路，验证字段完整性

**正文交付（写入 Ch.4）**
- 4.1 分层（L0/L1/L2 载体、加载、token 预算分摊）
- 4.2 命名空间（`viking://` 完整枚举 + 生命周期 + 隔离粒度）
- 4.3 会话与身份路由（Session ID 派生规则 / Agent header / Peer 隔离）
- 4.4 写入策略（触发矩阵、七段式 schema、异步/同步双模、去噪）
- 4.5 检索策略（触发矩阵、召回、重排权重、token budget、注入位）
- 4.6 遗忘与更新（手动/自动、archive/forget 边界）
- 4.7 统一 schema 与示例
- 4.8 与 4 Agent 实践的对齐说明

---

### 步骤 4 · 重写 Ch.5（通用记忆系统设计 · 本次核心）

**动作**：把 Ch.5 从「逐个 Agent 集成」升级为「**通用记忆系统**」——产品架构 + 核心模块 + 功能清单 + Agent 适配协议 + 未来 Agent 接入 SOP。

**信息源与子任务（3 并行 + 3 串行）**

| 子任务 | 内容 | 依赖 |
| --- | --- | --- |
| S4-A 产品架构 | 步骤 3 时序 + 步骤 2 部署 + 借鉴 Mem0/SuperMemory/Zep/Letta 公开架构 | 并行 |
| S4-C 功能清单 | 短期/长期/归档/资源/主动调用/自动召回/可视化/配额/审计/多模型/多 Agent 路由 → P0/P1/P2 分级 | 并行 |
| S4-E 业界对标 | Mem0（`mem0ai/mem0`）、Zep（`getzep/zep`）、Letta（`letta-ai/letta`）、SuperMemory、LangGraph memory、OpenAI Assistants v2 memory 的公开设计 | 并行 |
| S4-B 核心模块 | 接入适配层 / 消息规范化 / 抽取器 / 存储与索引 / 检索与重排 / 观测治理 / MCP 网关 / SDK；逐模块给职责、I/O、依赖 | 依赖 S4-A |
| S4-D 适配协议 | 抽象 Agent Adapter Contract（beforeTurn / afterTurn / onSessionEnd / onCompact / onForget）+ 4 Agent 实现映射 + 未来 Agent 三条接入路径（MCP / SDK / Hook） | 依赖 S4-B |
| S4-F 可扩展性 | 最小充要条件 / 版本兼容 / schema 演进 | 依赖 S4-D |

**校验点**
- [ ] 适配协议**同时**覆盖 4 Agent，任何 1 个覆盖不了则重设计
- [ ] 用一个假想新 Agent（如 Cursor Agent / Cline）做「纸面接入演练」验证协议充分性
- [ ] 每个模块必须对应到步骤 3 的 schema 或时序中至少一个环节（不留孤儿模块）
- [ ] 对标数据点必须有 URL + 近 1 年时间戳
- [ ] 与既有报告《智能体集成OpenViking报告.md》不重复：本章讲「通用系统」而非单 Agent 集成手册

**正文交付（写入 Ch.5）**
- 5.1 产品定位与目标用户
- 5.2 总体架构（分层图 + 部署图）
- 5.3 核心模块清单（8 大模块）
- 5.4 功能矩阵（P0/P1/P2）
- 5.5 Agent 适配协议 + 4 Agent 映射
- 5.6 未来 Agent 接入 SOP（MCP / SDK / Hook 三种路径）
- 5.7 与业界方案的横向对标
- 5.8 可扩展性与版本演进策略


## 四、Assumptions & Decisions（关键决策）

| # | 假设 / 决策 | 备注 |
| --- | --- | --- |
| A1 | Hermes 默认指 Nous Research Hermes | 若不符请开工前告知，会调整 S1-C 信息源 |
| A2 | OpenClaw 以 `@openviking/openclaw-plugin` 为一手来源 | 若发现独立仓库会补充 |
| A3 | 5D 口径全流程复用 | 步骤 1 定义，步骤 2/3/4 复用，保证跨章一致性 |
| A4 | 一次并行 ≤ 5 个子智能体 | 平台上限；一步内子任务多于 5 时分批 |
| A5 | 中间产物均落地在 `work/step{1..4}/` | 便于校验与回溯，正文精简 |
| A6 | Ch.1 与 Ch.6 本次不动 | Ch.5 语义变化对 Ch.6 的联动改动放到下期 |
| A7 | 每步结束由独立「审校子智能体」抽样回访 URL | 硬性质量门槛，未通过不进入下一步 |
| A8 | 直接替换目标文档的 Ch.2/3/4/5 | 中间稿存 `work/`，非旁路评审 |


## 五、Step Dependency（依赖图）

```
步骤1 (Ch.2 需求 + 4 Agent 5D)  ── 根节点
    │
    ├──────► 步骤2 (Ch.3 能力评估)
    │             │
    │             ├──► 缺口清单
    │             │
    └──────►─────►──► 步骤3 (Ch.4 记忆模型 + schema)
                             │
                             ▼
                         步骤4 (Ch.5 通用系统设计)
```

- 步骤 2 与步骤 3 部分并行窗口：S3-A、S3-B 可提前启动
- 步骤 4 强依赖步骤 3 的 schema + 时序图


## 六、Verification（每步 & 通稿两级校验）

### 6.1 每步校验（步骤内质量门槛）
详见各步骤「校验点」清单。**校验不通过不进入下一步**。

### 6.2 通稿校验（4 步全部结束后一次）
- [ ] **一致性追溯矩阵**：需求 → 能力 → 模型 → 模块 四列贯通（附录）
- [ ] **来源清单**：附录 C 汇总所有 URL + 抓取日期，抽 10% 回访
- [ ] **无时间点**：全文 grep `周|月|日内|Q[1-4]|20\d\d 年` 确认无时间承诺
- [ ] **无编撰**：非官方结论均标注「合理推算」或「社区反馈」
- [ ] **与既有报告去重**：与《智能体集成OpenViking报告.md》做交叉对比，重复部分改为引用
- [ ] **章节回指**：全文章节号引用有效


## 七、Resource Conflict & Consistency（并行冲突处理）

- **文件冲突**：4 步对目标文档 apply patch 必须串行；中间产物写 `work/stepN/` 隔离
- **子智能体一致性**：并行子智能体使用同一 5D 口径模板，产物 schema 一致
- **URL 快照**：一手页面同步保存 markdown 快照到 `work/stepN/raw/`
- **审校独立性**：审校子智能体不参与写作，只做回访与抽查


## 八、开工前需用户确认的事项

1. **Hermes 指代**：默认 Nous Research Hermes，是否正确？
2. **OpenClaw 一手来源**：可否以 `@openviking/openclaw-plugin` 为唯一一手来源？
3. **Ch.6 联动**：本次不动 Ch.6，是否接受？
4. **交付形式**：直接替换 Ch.2/3/4/5，中间稿留 `work/`，是否接受？

以上任一有异议请在开工前反馈，否则计划确认后我按此执行。
