# 云端 Agent 记忆系统调研报告

> **版本**：v1.3（方案3 · 以知识库为中心 · 架构选型重构版）
> **发布日期**：2026-07-03
> **面向读者**：AI 产品经理 / 平台工程 / 安全合规 / 部门业务方
> **本次修订摘要**：架构选型从方案2（多 Agent 一库）转为方案3（以 KB 为中心 + 方式C 混合），详见文末【修订记录 v1.3】。

> **候选池说明**：将 Coze、火山引擎 VikingDB、Dify 从候选池移出，仅保留为**竞品功能参考**，独立承载在 [附录文档](附件2-引用来源与竞品参考.md)；候选池只保留 4 款开源框架（OpenViking / Mem0 / Letta / Cognee）。

> **术语约定**：
> - **Hermes**：本文特指公司内自研 Agent（代号），与业界开源的 [NousResearch/hermes-agent](https://github.com/NousResearch/hermes-agent) 不同名同物，请勿混淆。
> - **OpenClaw**：公司内自研 Agent 平台代号。
> - **云端 Agent 记忆系统**：正式术语；正文尽量避免"云 Agent / 记忆中间件"混用。

---

## 0. 阅读说明

本报告按 **"能力先行 → 产品映射 → 业务选型"** 三步法组织：

- 第 1-3 章：业务背景、问题、用户
- 第 4 章：**Agent 记忆系统的定义、边界与能力框架**（先定义记忆系统，再区分组成层次、产品形态、核心能力与 RAG / 向量数据库底座能力）
- 第 5 章：候选产品调研（OpenViking 详尽、Mem0/Letta 重点、Cognee 概览）
- 第 6 章：**业务侧选型推荐**
- 第 7 章：关键风险与建议
- 附录（[附件2-引用来源与竞品参考.md](附件2-引用来源与竞品参考.md)）：引用来源 + 竞品功能参考（Coze / 火山 VikingDB / Dify，仅用于借鉴功能设计，不参与选型）

---

## 1. 业务背景

**公司规模与场景**：互联网公司 **2000 人规模**，希望在云端搭建**云端 Agent 平台**，为员工统一部署 **Claude Code / OpenClaw / Hermes** 等多类 AI 智能体，未来仍会持续接入新 Agent。

**当前痛点**：
- 每位员工、每个部门的 Agent **各自维护上下文**，用户偏好、部门 SOP、项目上下文无法跨 Agent 复用
- 每个 Agent 独立缓存对话，**跨会话记忆缺失**——同一用户明天再来还要"重讲一遍"
- 部门 / 个人间**数据边界模糊**，无统一治理入口，安全、审计、合规无处落地

**目标形态**：给云端 Claude Code 等 Agent 挂载**统一的记忆系统**，具备
- **短期记忆**（会话内 / 工作记忆）+ **长期记忆**（稳定偏好 / 部门知识 / 归档）
- **部门粒度隔离**（研发 / 产品 / 设计各自的记忆域）+ **个人粒度隔离**（同一部门内不同人不串数据）+ **会话粒度隔离**（临时上下文不污染长期记忆）
- **企业级治理**：多 Agent 共享 schema + ACL + 审计 + 合规 + 可观测

> 具体的落地模式与产品选型延后到 §5 候选调研与 §6 业务侧选型推荐，本章不预设结论。

## 2. 典型用户

本报告涉及两侧用户：

**A 侧 · Agent 使用方（2000 名员工，通过 Agent 消费记忆系统）**

- **研发工程师**：使用 Claude Code 写代码，需要记住项目结构、代码风格、常用命令
- **产品 / 设计人员**：使用 OpenClaw / Hermes 编排任务，需要记住偏好、项目状态、协作规范
- **管理者**：关注 2000 人规模下的合规、审计、成本、可观测性

**B 侧 · 云端 Agent 平台运营方（平台团队，为使用方提供并治理记忆系统）**

- **平台工程团队**：负责记忆库的部署、Agent 接入、隔离与生命周期治理
- **安全 / 合规团队**：负责 ACL、审计日志、数据驻留、GDPR / 个保法合规
- **可观测团队**：负责命中率、污染率、延迟、成本等运行指标

## 3. 要解决的问题

1. **多 Agent 之间的记忆共享**：Claude Code 写入的用户偏好 / 项目上下文，OpenClaw、Hermes 应能读到；未来接入的新 Agent 零改造即可复用
2. **短期 / 工作 / 长期 / 归档 四层分级**：从单次对话上下文到跨年的稳定偏好，都要有对应承载层
3. **部门级 / 个人级 / 会话级 三级隔离**：部门知识不外泄、同部门不同人不串数据、临时会话不污染长期记忆
4. **企业级治理**：ACL / 审计 / 加密 / 数据驻留 / 删除权，满足 2000 人规模的合规要求
5. **运行可观测**：命中率 / 污染率 / P95 延迟 / 成本，供平台运营方持续调优

---

## 4. Agent 记忆系统：定义、边界与能力框架

> **定义**：Agent 记忆系统不是单一的长期上下文库，而是覆盖会话内**短期上下文**、跨会话**工作记忆**、**长期稳定记忆**与**归档记忆**的**上下文管理层**。它位于 Agent Runtime 与知识 / 存储底座之间，用于把会话中产生的事实、偏好、任务状态、过程经验和可共享知识，沉淀为**可写入、可检索、可治理、可审计**的记忆，并按用户、部门、Agent、会话等边界在后续任务中安全召回。
>
> 它不等同于 RAG 或向量数据库。RAG / 向量数据库主要解决"从资料中找相关内容"；Agent 记忆系统还要解决**什么应该被记住、由谁写入、谁可以使用、何时更新或删除、如何跨 Agent 共享、如何避免记忆污染**。

### 4.1 记忆系统的组成层次

| 层次 | 生命周期 | 典型内容 |
|---|---|---|
| **短期上下文** | 单次会话内 | 当前对话轮次、临时变量、工具调用中间结果 |
| **工作记忆** | 跨会话、任务级 | 未完成任务状态、过程草稿、暂存偏好 |
| **长期记忆** | 跨用户生命周期 | 稳定事实、偏好、部门 SOP、项目知识 |
| **归档记忆** | 冷数据 | 时效过期但需保留的历史条目 |

### 4.2 参考实践

| 参考对象 | 一手事实 | 可迁移原则 |
|---|---|---|
| Claude Code Memory | 官方 **4 层**：Enterprise policy（组织级只读）+ Project memory（`./CLAUDE.md`）+ User memory（`~/.claude/CLAUDE.md`）+ Project memory local（`./CLAUDE.local.md`，已 Deprecated 建议改用 imports）；提供 `/memory` 编辑入口 | 企业场景需要**组织级只读 + 项目级 + 用户级**分层承载 |
| Codex / AGENTS.md | 将项目规则、测试命令、代码风格、安全注意事项写成 Agent 可读文档，并支持目录级覆盖 | 需要项目级、目录级、团队级**记忆类型** |
| MemGPT / Letta | 强调 Core / Archival / Conversation 层次与外部工具集，跨会话记忆持续复用 | 需要短期、工作、长期**记忆的组成层次** |

### 4.3 记忆系统的产品形态

| 形态 | 代表 | 边界 |
|---|---|---|
| Agent 内置长期记忆 | Claude Code、Coze LTM | 平台内部闭环；Coze LTM 是 Coze 记忆资源之一（Coze 完整记忆分层见附录 B.1） |
| 平台型知识库 / 应用记忆 | Dify、Coze | 应用内可用，不天然跨 Agent |
| 记忆中间件 | Mem0、Letta、OpenViking | 独立治理 schema/权限/生命周期 |
| RAG / 向量数据库底座 | VikingDB、Qdrant、Milvus | 靠切片、向量索引、语义召回解决检索，不直接解决记忆写入判断和治理 |

### 4.4 Agent 记忆系统核心能力

按「能力类 → 必要能力 → 必要能力介绍」三层展开。这 8 类能力对应完整记忆闭环：写入前先判断作用域和权限，写入时记录来源和类型，运行时按任务召回，长期通过生命周期治理保持准确，并通过可观测指标发现污染、延迟和成本问题。

#### 4.4.1 作用域与隔离

| 功能 | 子能力 | 能力说明 |
|---|---|---|
| 隔离层级 | 用户级隔离 | 每个自然人独立命名空间，防止跨人污染 |
| 隔离层级 | 部门/团队级隔离 | 按组织层级隔离记忆域，支持部门间共享或独占 |
| 隔离层级 | 项目/资源级隔离 | 以项目、知识库或资源为边界，跨用户共享同一份项目记忆 |
| 隔离层级 | Agent 级隔离 | 不同 Agent（Claude Code / Hermes / OpenClaw 等）可持有独立或共享记忆 |
| 隔离层级 | 会话级隔离 | 单次会话/任务的短期上下文与长期记忆解耦 |
| 权限模型 | 命名空间与 ID 体系 | user_id / agent_id / run_id / app_id / workspace 等多级 ID 组合 |
| 权限模型 | 访问控制 ACL | Read / Write / Delete / Share 细粒度权限，支持部门树映射 |
| 权限模型 | 多租户与数据驻留 | 租户级密钥、region 隔离、私有化部署可控 |

#### 4.4.2 记忆写入

| 功能 | 子能力 | 能力说明 |
|---|---|---|
| 写入方式 | 显式写入 | Agent 或用户主动通过 API/工具调用把事实写入长期记忆 |
| 写入方式 | 自动抽取 | LLM 从对话/文档中被动抽取事实、偏好、关系并入库 |
| 写入方式 | 批量导入 | 从文件、外部知识库、历史会话批量导入 |
| 写入治理 | 来源记录 | 每条记忆保留来源 URL / 会话 ID / 用户 / 时间戳 |
| 写入治理 | 写入确认与撤回 | 支持写入前确认、写入后撤回，避免误写污染 |
| 写入治理 | 幂等与去重 | 同一事实多次写入不产生重复条目 |

#### 4.4.3 记忆类型

| 功能 | 子能力 | 能力说明 |
|---|---|---|
| 结构化记忆 | 事实型 | 人名、时间、数值、状态等原子事实 |
| 结构化记忆 | 偏好型 | 用户偏好、风格、口味、习惯 |
| 结构化记忆 | 实体-关系型 | 人-项目-文档等图状关联，支持图检索 |
| 半结构化记忆 | 过程型 | 任务步骤、流程状态、Agent 执行轨迹 |
| 半结构化记忆 | 任务状态 | 待办、进行中、已完成的任务上下文 |
| 非结构化记忆 | 文档型 | 长文档、笔记、纪要、代码片段 |
| 非结构化记忆 | 多模态 | 图像、音频、视频及其描述文本 |

#### 4.4.4 记忆召回

| 功能 | 子能力 | 能力说明 |
|---|---|---|
| 召回维度 | 按任务/查询召回 | 基于当前对话或工具调用意图检索相关记忆 |
| 召回维度 | 按用户/主体召回 | 按 user_id / agent_id 限定召回范围 |
| 召回维度 | 按时间召回 | 支持时间窗、最近 N 条、时间衰减加权 |
| 召回维度 | 按来源/重要性召回 | 按来源可信度、访问频次、置信度加权 |
| 召回控制 | Top-K 与阈值 | 控制返回条数与最低相关度门槛 |
| 召回控制 | 多信号融合 | 语义 + 关键词 + 元数据 + 图 多路合并排序 |
| 召回控制 | 上下文注入策略 | 决定召回结果如何拼接进 Agent Prompt |

#### 4.4.5 生命周期

| 功能 | 子能力 | 能力说明 |
|---|---|---|
| 去重与合并 | 语义去重 | 同义/近似事实归并成单条记忆 |
| 去重与合并 | 冲突解决 | 新旧事实冲突时按时间/来源/置信度裁决 |
| 更新与版本 | 记忆更新 | 支持字段级或整条更新，保留历史版本 |
| 更新与版本 | 版本化与回溯 | 记忆变更可审计、可回滚 |
| 遗忘与归档 | 时间衰减 | 长期未使用记忆分数衰减、退出热召回 |
| 遗忘与归档 | 自动归档 | 冷记忆迁移到归档层或对象存储 |
| 遗忘与归档 | 删除与遗忘 | 显式删除、级联删除（连同引用与摘要一并清理，即"被引用清理"）、GDPR 遗忘权支持 |

#### 4.4.6 跨 Agent 共享

| 功能 | 子能力 | 能力说明 |
|---|---|---|
| 接入形态 | API / HTTP 接口 | 语言无关，任何 Agent 可通过 HTTP 接入 |
| 接入形态 | 多语言 SDK | Python / TypeScript / Go 等主流语言 SDK |
| 接入形态 | MCP 协议 | 通过 Model Context Protocol 让新 Agent 零改造接入 |
| 共享语义 | 统一 schema | 事实/偏好/文档等类型有跨 Agent 一致定义 |
| 共享语义 | 共享/私有边界 | 明确哪些记忆全 Agent 可读、哪些仅本 Agent 可读 |
| 共享语义 | 冲突协调 | 多 Agent 同时写入时的锁/合并/顺序策略 |

#### 4.4.7 治理与安全

| 功能 | 子能力 | 能力说明 |
|---|---|---|
| 访问控制 | 细粒度 ACL | Read / Write / Delete / Share 分权到 dataset / 目录 |
| 访问控制 | SSO / RBAC | 企业级单点登录 + 角色权限模型；组织级只读策略可参考 Claude Code Enterprise policy |
| 数据安全 | 传输与静态加密 | HTTPS + 存储侧 AES / KMS + 租户密钥 |
| 数据安全 | 敏感数据脱敏 | 写入前对手机号、身份证、密钥等自动脱敏 |
| 合规与审计 | 审计日志 | 每次读/写/删可追溯到人、Agent、时间 |
| 合规与审计 | 删除权与数据驻留 | 支持用户级彻底删除；数据 region 可选 |
| 合规与审计 | 合规证书 | SOC 2 / HIPAA 等企业合规资质；ISO 27001 为通用行业期望（本次 4 款候选未公开该证书） |

#### 4.4.8 可观测性

| 功能 | 子能力 | 能力说明 |
|---|---|---|
| 质量指标 | 命中率 | 召回结果被 Agent 实际采用的比例 |
| 质量指标 | 错误召回 / 污染率 | 误召回、被 Agent 拒用、被用户负反馈的比例 |
| 质量指标 | 记忆有效性 | 记忆条目在下游任务中的贡献度 |
| 性能指标 | 延迟 | 召回 P95 / P99、写入延迟、端到端响应时长 |
| 性能指标 | QPS 与并发 | 峰值 QPS、并发上限、限流策略 |
| 成本指标 | 存储与计算成本 | 向量库、对象存储、Embedding / Rerank 调用费用 |
| 追踪与调试 | 调用链追踪 | OTel Trace 关联 Agent 调用 → 记忆读写 → LLM 调用 |
| 追踪与调试 | 记忆使用回放 | 复盘每次会话中记忆的读写、命中、被用情况 |

### 4.5 RAG / 向量数据库底座能力

按**数据处理 / 数据存储 / 数据获取**三维展开。

#### 4.5.1 数据处理

| 功能 | 子能力 | 能力说明 |
|---|---|---|
| 数据类型 | 非结构化 | Markdown、TXT、PDF、HTML、Office 文档 |
| 数据类型 | 结构化 | 表格、CSV、JSON、数据库导出 |
| 数据类型 | 多模态 | 图像 / 音频 / 视频 + 其描述文本 |
| 数据类型 | 代码 | 代码仓库、AST、跨语言解析 |
| 处理方式 | 解析与转换 | 各类文件到统一文本表示 |
| 处理方式 | 切片 / 分段 | 按段落 / Token / 结构切片 |
| 处理方式 | 摘要 / L1 抽取 | 生成短摘要、Overview 层 |

#### 4.5.2 数据存储

| 功能 | 子能力 | 能力说明 |
|---|---|---|
| 存储介质 | 向量索引 | 语义召回，支持 HNSW / IVF / Flat / DiskANN |
| 存储介质 | 元数据存储 | 结构化字段、过滤条件 |
| 存储介质 | 全文索引 | 关键词 / BM25 检索 |
| 存储介质 | 对象存储 | 原始附件、冷归档 |
| 后端选择 | 向量数据库 | Qdrant / Milvus / Weaviate / pgvector / VikingDB 等（品牌为示意，非选型池） |
| 后端选择 | 图数据库 | Ladybug / Neo4j，用于实体-关系型记忆 |
| 权限与规模 | 多租户与 ACL | namespace / collection / row 级权限 |
| 权限与规模 | 容量与限流 | 单集合上限、QPS、副本、计费 |

#### 4.5.3 数据获取

| 功能 | 子能力 | 能力说明 |
|---|---|---|
| 检索模式 | 向量检索 | 语义相似度召回 |
| 检索模式 | 关键词 / 全文检索 | BM25 / 精确匹配 |
| 检索模式 | 混合检索 | 向量 + 关键词 + 图 融合 |
| 过滤与排序 | 元数据过滤 | 按字段过滤（user_id / dept / 时间等） |
| 过滤与排序 | Rerank | Cross-Encoder / 神经重排 |
| 过滤与排序 | 阈值控制 | 相似度阈值、Top-K、置信度 |
| 检索测试 | 命中调试面板 | 查询、召回、排序结果可视化 |
| 检索测试 | 运行观测 | QPS、P95、命中率指标暴露 |

---

## 5. 候选产品调研

本节先给出 §4.4 与 §4.5 两个能力框架对 4 款开源候选产品的横向总览，每格采用「符号 + 一句摘要」。总览在前，§5.1-§5.4 为逐产品详情。Coze / VikingDB / Dify 定位为竞品功能参考，见[附录文档](附件2-引用来源与竞品参考.md)。

**调研范围与打分口径**

- **调研对象**：4 款开源候选（OpenViking / Mem0 / Letta / Cognee）参与选型打分；3 款竞品（Coze / VikingDB / Dify）仅作功能借鉴，见[附录 B](附件2-引用来源与竞品参考.md#附录-b竞品功能参考coze--vikingdb--dify)
- **调研内容**：§4.4 8 项核心能力 + §4.5 3 维 RAG 底座 + §3 5 道业务题（多 Agent 共享 / 四层分级 / 三级隔离 / 企业治理 / 可观测）的作答
- **打分口径**：✅ 官方文档已明示 / ⚠️ 部分支持或需自建 / ❌ 官方明示不支持 / `INSUFFICIENT_DATA` 官方未公开
- **来源等级**：P0 官方仓库 / 官方文档；P1 官方博客 / 论文；P2 二手权威（企业级评测）；P3 社区讨论
- **检索截止**：2026-07-01；调研方法与已知局限见 §5.5

### 5.0 产品能力对比总览

**表 A：§4.4 核心能力 × 4 产品**

| 核心能力 | OpenViking | Mem0 | Letta | Cognee |
|---|---|---|---|---|
| 作用域与隔离 | ⚠️ 目录级天然分层，企业 ACL 需自建 | ✅ user_id/agent_id/run_id/app_id 四级 ID 原生 | ⚠️ 用户/Agent 级完备（原生多 Agent 共享 + read-only），部门级 ACL 自建 | ⚠️ 自托管可控，无企业级 ACL |
| 记忆写入 | ✅ 文件式 + L0/L1/L2 摘要 | ✅ add API + LLM 自动抽取 | ✅ 显式工具调用 core/archival | ✅ 自动抽取实体-关系图 |
| 记忆类型 | ✅ 事实/偏好/文档；实体-关系弱 | ✅ 事实/偏好为主 + entity linking（v3） | ✅ 事实/偏好/过程/文档 | ✅ 实体-关系图为最大特色 |
| 记忆召回 | ✅ 向量+关键词+元数据+doubao-seed-rerank | ✅ 多信号并行融合（semantic + BM25 + entity）+ 时序推理 | ✅ 向量+全文 hybrid+RRF | ✅ 向量+图混合 |
| 生命周期 | ⚠️ 读写完备，去重/合并/版本需自建 | ✅ v3 单次 ADD-only 累积不覆写；实体链接跨记忆检索 | ✅ FIFO 层 recursive summary + sleep-time 后台整合 | ⚠️ forget 支持，图去重需上层维护 |
| 跨 Agent 共享 | ✅ HTTP API + Python/Go SDK | ✅ Python + TypeScript SDK + HTTP API | ✅ 多 Agent 原生共享 memory blocks | ⚠️ SDK + MCP 集成 |
| 治理与安全 | ⚠️ AGPL 自托管 + KMS + 租户密钥 | ✅ SOC 2 声明 + HIPAA 声明 + BYOK（级别以官方 trust 页为准） | ⚠️ Enterprise RBAC + SSO；未见公开合规证书 | ⚠️ 自托管 + Read/Write/Delete/Share ACL |
| 可观测性 | ✅ Prometheus + rerank_used_total 等指标 | ✅ Mem0 Platform 面板 | ✅ OTel + ClickHouse/Signoz/Datadog | ✅ OTEL Collector + audit trails |

**表 B-1：§4.5.1 数据处理**

| 功能 | OpenViking | Mem0 | Letta | Cognee |
|---|---|---|---|---|
| 支持数据类型 | 文本 + 图/视频/音频 L2 | 主要对话文本 + 图像 ≤20MB（Cloud 官方限制） | 主要对话文本 | Text / PDF / Unstructured / Docling |
| 解析与切片 | 靠 VLM 生成 L0/L1，L2 挂原文 | 无内置文档解析 | archival passage ≤300 tokens 简单分段 | 内置 Parser + AdvancedPdfLoader + OCR |
| 多模态 | ✅ L2 层支持 image/video/audio + VLM 描述 | ⚠️ 图像 ≤20MB（JPEG/PNG/WebP/GIF） | ⚠️ 图像依赖底座模型 | ✅ ImageLoader + AudioLoader |

**表 B-2：§4.5.2 数据存储**

| 功能 | OpenViking | Mem0 | Letta | Cognee |
|---|---|---|---|---|
| 存储后端 | 内置 dense + sparse + flat_hybrid | 20+ 向量后端可插拔 | TurboPuffer / pgvector / SQLite-vec | LanceDB / PGVector / **Ladybug（默认，v1.0.4 起替换 Kuzu）** / Neo4j |
| 索引 | flat_hybrid（cosine + int8 量化） | 各后端原生 | 向量 + FTS | 向量 + 图 |
| 权限模型 | account/user/peer + ROOT/ADMIN/USER；账号密钥隔离 | 元数据可查询；条目级容量未公开 | Memory Blocks <50k characters / <20 blocks | ENABLE_BACKEND_ACCESS_CONTROL + dataset 粒度 ACL |
| 规模与容量 | LOCOMO 端到端千万级案例 | BEAM 1M/10M（1M/10M token 上下文，非条目数） | Cloud 有条目上限；企业级另议 | 取决于图/向量后端 |

**表 B-3：§4.5.3 数据获取**

| 功能 | OpenViking | Mem0 | Letta | Cognee |
|---|---|---|---|---|
| 检索模式 | 向量 + 关键词 + 元数据两阶段 | 多信号并行融合（semantic + BM25 + entity）+ 时序推理 | 向量 + FTS hybrid | 向量 + 图 hybrid |
| Rerank | 内置 doubao-seed-rerank | v3 rank fusion（多信号并行评分） | ⚠️ RRF 合并，无独立神经 Rerank | ⚠️ triplet_distance_penalty，无 Cross-Encoder |
| 阈值 | 需上层实现 | threshold 默认 0.3 | 分数返回，阈值上层实现 | wide_search_top_k + 排序权重 |
| 多路合并 | 两阶段 vector recall + rerank | Multi-signal parallel + rank fusion | RRF | 图 + 向量合并 |
| 检索测试 | 手动调试为主 | Platform 面板可视化 | 内置 CLI 工具 | evals/ + HotpotQA 基准 |
| 运行观测 | Prometheus + rerank_used_total | Platform 命中/延迟/成本看板 | OTel + ClickHouse | OTEL + audit trails |

### 5.1 OpenViking（详尽）

- **定位**：火山引擎开源记忆中间件；文件系统式抽象；AGPL-3.0
- **独特优势**：4 款中唯一"文件系统式抽象 + 内置 doubao-seed-rerank + 原生 Prometheus + 火山生态亲和"；分级目录直接映射公司/部门/个人四级
- **独特短板**：部门级 ACL / 合规资质需自建；SDK 只覆盖 Python/Go；实体-关系记忆弱

> 详细能力映射（§4.4 × §4.5）、§3 5 道业务题作答、行内证据 URL 见 [候选调研详情 §1](附件1-候选产品调研详情.md#1-openviking详尽)

---

### 5.2 Mem0（重点）

- **定位**：开源个人化记忆中间件；LLM 自动抽取事实/偏好；4 级 ID 隔离
- **独特优势**：4 款中唯一同时公开 SOC 2 + HIPAA + BYOK + Air-gapped；**2026-04 v3 新算法**给出 LoCoMo **91.6**（+20）、LongMemEval **94.8**（+27）、BEAM 1M **64.1**、BEAM 10M **48.6**（单次调用，非 agentic 循环）；引入 entity linking + 多信号（semantic + BM25 + entity）并行融合 + 时序推理
- **独特短板**：文档型记忆仍弱；开源版无内置观测面板；部门级隔离靠元数据过滤自建

> 详情见 [候选调研详情 §2](附件1-候选产品调研详情.md#2-mem0重点)；基准来源见 GitHub `mem0ai/mem0` README "New Memory Algorithm (April 2026)" 与 `mem0.ai/research`

---

### 5.3 Letta（原 MemGPT）（重点）

- **定位**：分层记忆 Agent 框架；Memory Blocks（Core）+ Archival + Conversation 三层 + 外部工具集；唯一原生多 Agent 共享 memory blocks
- **独特优势**：4 款中唯一原生"多 Agent 共享 memory blocks + read-only 权限"；分层记忆最完整；OTel + ClickHouse 观测栈最完整
- **独特短板**：显式 LLM 调用模式，2000 人高频场景成本高；无独立神经 Rerank；archival passage ≤300 tokens

> 详情见 [候选调研详情 §3](附件1-候选产品调研详情.md#3-letta原-memgpt重点)

---

### 5.4 Cognee（概览）

- **定位**：认知图 + 向量融合；实体-关系图为核心；Apache-2.0
- **独特优势**：4 款中唯一内置"实体-关系图 + 向量混合"；唯一 Read/Write/Delete/Share 4 类 ACL（dataset 粒度）；数据处理管线最丰富（Docling / OCR / Parser）
- **独特短板**：多 Agent 成熟度弱；图数据库运维成本高；分层记忆抽象弱
- **重要变更（2026-05）**：v1.0.4 主图后端由 Kuzu 迁移到 **Ladybug**（Kuzu 目录保留兼容）；主 API 已改为 `remember` / `recall` / `forget` / `improve`（原 `add` / `cognify` / `search` 语义收敛）

> 详情见 [候选调研详情 §4](附件1-候选产品调研详情.md#4-cognee概览)

---

### 5.5 调研执行方法与限制

- **来源分级**：P0 官方仓库/文档 · P1 官方博客/论文 · P2 二手权威 · P3 社区；**本报告结论性论述所需的引用均使用 P0/P1**，附录 A 部分参考阅读会标注 P2/P3 等级
- **覆盖清单**：§4.4 8 项 × 4 产品 = 32 单元 + §4.5 3 维 × 4 产品 = 12 单元 + §3 5 道题 × 4 产品 = 20 单元，均已完成
- **已知局限**：未做压测、未真实 2000 人部署、`INSUFFICIENT_DATA` 表示官方未公开但可能实际存在、版本截止 2026-07-01

> 完整分级方法、一手引用位置、未覆盖项与复核建议见 [候选调研详情 §5](附件1-候选产品调研详情.md#5-调研执行方法与限制)

---

## 6. 业务侧选型推荐

### 6.1 业务约束复述
- 2000 人并发
- 多 Agent 共存：Claude Code / OpenClaw / Hermes + 未来
- 隔离：公司 → 部门 → 个人 → 会话 四级
- 信息新鲜度：2026 年技术栈

### 6.2 候选池范围说明

| 类别 | 产品 | 是否参与主选型 |
|------|------|----------------------|
| **主选型对象** | OpenViking | ✅ 主选型 |
| **能力参考（不参与主选型）** | Mem0、Letta、Cognee | ⚠️ 仅作能力对照，淘汰理由见 §6.2.1 |
| **竞品功能参考（不参与主选型）** | Coze、VikingDB、Dify | ⚠️ 仅作功能借鉴，见[附录文档](附件2-引用来源与竞品参考.md) |

#### 6.2.1 为什么 Mem0 / Letta / Cognee 不参与主选型（三选一裁决）

四款开源候选逐题对照 §3 5 道业务题：

| 业务题（§3） | OpenViking | Mem0 | Letta | Cognee |
|---|---|---|---|---|
| Q1 多 Agent 共享 | ✅ HTTP + SDK + 文件系统命名空间 | ✅ 四级 ID 天然 | ✅ 原生多 Agent 共享 memory blocks + read-only | ⚠️ 靠上层封装 |
| Q2 四层分级（短/工作/长/归档） | ✅ L0/L1/L2 + `archive/` 官方分层 | ⚠️ 事实/偏好为主，缺归档语义 | ✅ Core / Archival / Conversation | ⚠️ 分层抽象弱 |
| Q3 三级隔离（部门/个人/会话） | ✅ 目录树天然承载 team/user/session | ⚠️ 部门级靠元数据过滤自建 | ⚠️ 部门级 ACL 自建 | ⚠️ 部门级 ACL 自建 |
| Q4 企业级治理 | ⚠️ 自托管 + KMS + audit（合规靠部署侧承担） | ⚠️ 云端有合规声明，自托管需自建 | ⚠️ Enterprise RBAC/SSO，无公开合规证书 | ⚠️ 自托管,无公开合规证书 |
| Q5 可观测 | ✅ Prometheus 原生 | ✅ Platform 面板（云端） | ✅ OTel + ClickHouse | ✅ OTEL Collector |

**淘汰理由**：

- **Mem0**：Q2 四层分级偏弱（缺归档语义）、Q3 部门级隔离需元数据自建；且以"个人化偏好"为核心叙事，与本报告"部门 SOP / 项目上下文"侧重错位。
- **Letta**：显式 LLM 调用模式在 2000 人高频场景成本高；archival passage ≤300 tokens 限制大文档承载；虽 Q1 强，但 Q3 部门 ACL 仍需自建。
- **Cognee**：图后端（Ladybug / Neo4j）运维成本高；分层抽象弱；多 Agent 共享成熟度低。实体-关系图能力可作为"能力借鉴"而非主栈。

**综上**：OpenViking 在 Q1/Q2/Q3 三题上综合最优，且**"文件系统式抽象 + 分级目录 + 火山生态"三点组合**天然映射"公司 / 部门 / 个人 / 会话"四级隔离，其余三款保留作能力参考。

> 竞品功能参考的三款商业产品仅用于借鉴功能设计，不进入选型池，原因：
> 1. **不是开源候选**：本轮候选池的定位是"未来可能落地的开源框架"，商业闭源平台与本目标不匹配。
> 2. **平台边界定位不同**：Coze 是 Bot 平台，Dify 是应用开发平台，VikingDB 是向量底座，均与本报告的"Agent 记忆系统"目标不在同一抽象层。
> 3. **能力覆盖 ≤ 开源候选**：三者在 §4.4 的 **作用域与隔离（部门/ACL） / 生命周期 / 跨 Agent 共享** 等能力上比开源候选弱。详细一手事实见[附录文档](附件2-引用来源与竞品参考.md)。

### 6.3 推荐方案：**OpenViking 单产品长期方案**

> 一期与长期均采用 OpenViking 单栈。Mem0 / Letta / Cognee 不参与选型（淘汰理由见 §6.2.1）；SDK / Adapter 抽象层保留作为**通用兼容接口**（供未来任何后端切换预留，与具体产品无关）。**Coze / VikingDB / Dify 不参与打分**，仅在[附录文档](附件2-引用来源与竞品参考.md)中承载功能借鉴。

### 6.4 方案架构（OpenViking 单栈）

#### 6.4.0 设计理念：以知识库为中心 + OpenViking 官方原生 vs 企业侧扩展

> **范式声明（方案3 · 以 KB 为中心）**：本方案以"**知识库（KB）**"为一等公民，KB 归属组织/部门/个人，**不归属于 Agent**；Agent 是被授权的访问者。一个组织/人可拥有多个 KB（个人偏好 KB、项目上下文 KB、部门 SOP KB 等），多个 Agent 可被授权访问同一 KB。这是经典 RBAC + 数据权限模型在记忆系统的应用——**Agent 与数据归属解耦**，新增/下线 Agent 只改授权矩阵，不动数据。
>
> **实现方式（方式C · 混合）**：个人偏好/技能/会话 KB → 共享 OpenViking 实例，按 `viking://user/{uid}/` namespace 隔离 + 授权中心 ACL；部门 SOP KB → 独立实例（按部门或敏感度分组），强物理隔离；公司政策 KB → 独立只读实例，所有 Agent 授权只读。
>
> **一句话定义（企业侧扩展）**：**企业侧扩展 = 在 OpenViking 官方原生能力之上，由公司（企业侧）自己叠加的一层治理逻辑与目录约定；OpenViking 不提供、不感知、不改源码。** 其中"**KB 授权中心（RBAC + ACL + 审计）**"是企业侧扩展的核心组件，在 Agent 与 OpenViking 多 KB 实例池之间做授权决策与路由。

**为什么需要"企业侧扩展"？** OpenViking 是面向个人开发者 / 小团队的通用开源产品，官方只提供必要且通用的能力（4 个顶级命名空间、7 Hook、9 MCP 工具、LLM+Embedding+VLM 三分工）。本报告场景是 **2000 人互联网企业**，业务上有 OpenViking 官方不解决的 4 类需求：

| 企业需求 | OpenViking 官方是否原生支持 | 是否需企业侧扩展补齐 |
|---|---|---|
| 部门级隔离（设计部/研发部 SOP 不串数据） | ❌ 无 dept 概念 | ✅ 企业侧扩展 |
| 多租户账号根（一套 OpenViking 服务多个子公司/BU） | ⚠️ 有 ROOT/ADMIN/USER 权限模型，无账号根目录约定 | ✅ 企业侧扩展 |
| Visibility 白名单过滤（部门私有不被跨部门召回） | ❌ 无 visibility 字段 | ✅ 企业侧扩展 |
| 归档冷存 180 天迁 TOS | ⚠️ 官方支持 resources 挂 S3，但无"180 天规则" | ✅ 企业侧策略 |

**概念归属对照**（以下架构图与目录表中，每个节点用 `(官方)` / `(企业侧扩展)` 标注）：

| 概念 | 归属 | 依据（附件4 行号） |
|---|---|---|
| `viking://user` / `session` / `agent` / `resources` 4 顶级命名空间 | ✅ 官方原生 | 第 28-35 行 |
| L0/L1/L2 分层（`.abstract.md` / `.overview.md` / 原文） | ✅ 官方原生 | 第 337-343 行 |
| 7 Hook + 9 MCP 工具 | ✅ 官方原生 | 第 75-99 行 |
| 5 类记忆分类（preferences/events/cases/memories/skills）+ archive + resources | ✅ 官方原生 | 第 323-333 行 |
| RAGFS + VectorDB 存储引擎 | ✅ 官方原生 | 第 26 行 |
| web-studio 控制台 + ov CLI | ✅ 官方原生 | 第 23-24 行 |
| LLM + Embedding + VLM 三类模型分工 | ✅ 官方原生 | 第 25、315-319 行 |
| Prometheus + `rerank_used_total` 等指标 | ✅ 官方原生 | 第 273、301 行 |
| **`account/` 根节点**（多租户账号根） | ⚠️ 企业侧扩展 | 官方无此目录，主报告设计 |
| **`account/team/{dept}/`**（部门 SOP 目录） | ⚠️ 企业侧扩展 | 官方无 team 概念 |
| **`account/archive/` + 180 天冷存挂 TOS** | ⚠️ 企业侧扩展 | 官方有 session archive 归档，无 180 天规则 |
| **五级 ID 注入**（account/team/user/agent/session） | ⚠️ 企业侧扩展 | 官方只有 peer_id + session_id 两级 |
| **Visibility 字段与值域**（public/shared_within_dept/…/inherit） | ⚠️ 企业侧扩展 | 附件4 全文未见 |
| **SDK 治理层**（接口收敛 + ID 注入 + Visibility 拼路径 + 观测埋点转发） | ⚠️ 企业侧扩展 | 官方 SDK 不含企业治理 |
| **KMS + 租户密钥 + audit log** | ⚠️ 企业侧扩展（AGPL-3.0 自托管通用做法） | OpenViking 支持自托管加密，企业 KMS 集成与 audit 规范由公司安全团队实现 |
| 豆包 embedding + doubao-seed-rerank | ⚙️ 配置选择（不是扩展） | 官方支持多家 embedding，选豆包是配置 |

**设计理念：分界与承接**

- **官方能力**：解决"记忆怎么读、怎么写、怎么召回、怎么分层、怎么被 LLM 结构化压缩"——**技术闭环**。
- **企业侧扩展**：解决"谁能读、谁能写、什么算部门数据、什么算个人隐私、多租户如何隔离、审计怎么落"——**业务与合规闭环**。
- **两者接口**：企业侧扩展**不改 OpenViking 源码**，只做两件事——
  1. **SDK 层拼路径 + 拼元数据**：把 `dept_id / uid / aid / sid` 拼进 `viking://user/{uid}/...` 的 URI，把 `visibility` 塞进元数据字段；
  2. **召回层加白名单过滤**：召回结果按 `visibility + dept + user` 三路白名单过滤，防跨界泄露。
- **好处**：OpenViking 升级 → 企业侧扩展无需重写（仅靠 URI 拼装 + 元数据过滤对接）；未来切换后端 → Adapter 内改 URI 拼装规则即可；合规责任边界清晰（与 §6.6 风险 2 一致）。

> 以下架构图中，`(官方)` 标注为 OpenViking 原生能力，`(企业侧扩展)` 标注为本报告设计的企业侧治理逻辑。

#### 6.4.1 完整产品架构图（5 层）

```
┌─────────────────────────────────────────────────────────────────┐
│  ① Agent 应用层  (官方接入对象 · 无库归属)                         │
│     Claude Code │ OpenClaw │ Hermes │ 未来 Agent（Cursor/Trae）   │
│     Agent 是被授权的访问者，不拥有 KB                              │
└─────────────────────────────┬───────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│  ② 接入通道层  (官方 · 附件4 第 60-110 行)                         │
│  ┌────────────────────┬────────────────────┬─────────────────┐  │
│  │ Plugins 通道·Hooks │ MCP 通道           │ SDK / HTTP 通道 │  │
│  │ 生命周期驱动·自动   │ 模型意图驱动·按需  │ 通用编程接入    │  │
│  │ 7 Hook 覆盖读/写/  │ 9 工具：search/    │ LangChain/      │  │
│  │ 归档/隔离四类       │ read/list/store/   │ LangGraph/      │  │
│  │                     │ add_resource/grep/ │ 自研 Agent      │  │
│  │                     │ glob/forget/health │                 │  │
│  └────────────────────┴────────────────────┴─────────────────┘  │
│                                                                  │
│  ▼ 7 Hook 生命周期时间轴（官方 · 附件4 第 75-83 行）              │
│  SessionStart ─► UserPromptSubmit(读) ─► Stop(写)                │
│       │            │                       │                     │
│       │            └─► [模型可选调 MCP 9 工具]                   │
│       ▼                                    ▼                     │
│  PreCompact(强制归档) ─► SessionEnd(收尾)  SubagentStart(隔离)    │
│                                            └─► SubagentStop      │
│                                                 (子 Agent 归档)   │
└─────────────────────────────┬───────────────────────────────────┘
                              │  remember / recall / update / forget
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│  ③ KB 授权中心 + 平台路由层  (企业侧扩展 · 方案3 核心)             │
│  ┌─────────────┬──────────────┬─────────────┬──────────────┐    │
│  │ KB 授权中心  │ Agent 身份   │ KB 路由      │ 观测埋点转发  │    │
│  │ RBAC + ACL  │ 鉴权         │ 按授权矩阵   │ OTel + Prom  │    │
│  │ Agent×KB    │ mTLS / JWT   │ 路由到目标   │ +token 成本  │    │
│  │ 读/写/删权限 │ 不可伪造令牌 │ KB 实例      │ llm_token/   │    │
│  │ + 审计日志   │              │              │ embed_token  │    │
│  └─────────────┴──────────────┴─────────────┴──────────────┘    │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │ 授权矩阵示例：Agent × KB → 读/写/删                       │   │
│  │  Claude Code × 张三偏好KB = 读+写 │ × 研发SOP KB = 读    │   │
│  │  OpenClaw   × 张三偏好KB = 读    │ × 研发SOP KB = 读+写 │   │
│  └──────────────────────────────────────────────────────────┘   │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │ OpenVikingAdapter（一期：仅 OpenViking 调用封装）         │   │
│  │  ─ 长期预留 VectorAdapter/GraphAdapter/KVAdapter 接口     │   │
│  │  ─ 一期不启用具体后端切换；Adapter 内嵌于 SDK 进程内      │   │
│  └──────────────────────────────────────────────────────────┘   │
└─────────────────────────────┬───────────────────────────────────┘
                              │  按授权决策路由到目标 KB 实例
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│  ④ 多 KB 实例池  (官方 · 方式C 混合 · 附件4 第 17-27 行 六层)     │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │ 个人 KB 共享实例（逻辑隔离 · namespace）                   │   │
│  │  ├ viking://user/{uid}/memories/（preferences/events/    │   │
│  │  │  cases/memories）+ viking://user/{uid}/skills/        │   │
│  │  └ viking://session/{sid}/archive/（会话归档）            │   │
│  ├──────────────────────────────────────────────────────────┤   │
│  │ 部门 KB 独立实例（物理隔离 · 按部门或敏感度分组）          │   │
│  │  ├ 研发部 OV 实例：viking://resources/team/rd/           │   │
│  │  ├ 设计部 OV 实例：viking://resources/team/design/       │   │
│  │  └ ...（~20 部门，按敏感度合并为若干实例）                │   │
│  ├──────────────────────────────────────────────────────────┤   │
│  │ 公司政策 KB 独立只读实例                                   │   │
│  │  └ viking://resources/public/（HR/合规/通用知识·全只读）  │   │
│  ├──────────────────────────────────────────────────────────┤   │
│  │ 每个实例内部（官方六层架构）：                             │   │
│  │  ├ openviking-server（治理+抽取+检索+存储）              │   │
│  │  │  ├ Memory Extraction（LLM，按 MemoryTypeRegistry 5 类）│   │
│  │  │  ├ Working Memory v2 Compression（WM 7 sections）     │   │
│  │  │  ├ L0 .abstract.md / L1 .overview.md / L2 原文        │   │
│  │  │  ├ flat_hybrid + doubao-seed-rerank 两阶段检索        │   │
│  │  │  └ RAGFS（Rust）+ VectorDB 底座                       │   │
│  │  │  ─ 注：v1 组件名 Parser/TreeBuilder/SessionCompressorV2│   │
│  │  │    /MemoryUpdater 已合并入现行管线                     │   │
│  │  ├ web-studio（Web 控制台 · Playground + 检索轨迹可视化）  │   │
│  │  └ ov CLI（Rust 命令行 · ls/tree/read/search 运维）       │   │
│  └──────────────────────────────────────────────────────────┘   │
└─────────────────────────────┬───────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│  ⑤ 外围支撑                                                       │
│   Prometheus + Grafana（多 KB 聚合观测）│ KMS（密钥·企业侧扩展）   │
│   TOS（对象存储）+ audit log（合规审计·企业侧扩展）               │
│   模型层 (官方)：LLM（extraction/compression）+ Embedding（向量化）│
│                  + VLM（多模态资源视觉理解）+ doubao-seed-rerank   │
└─────────────────────────────────────────────────────────────────┘
```

> **层职责边界说明**：
> - ② 接入通道层是 OpenViking 官方提供的三种接入形态（Plugins(Hooks)/MCP/SDK），非企业侧扩展
> - ③ KB 授权中心 + 平台路由层是本报告设计的方案3 核心组件（企业侧扩展），在 Agent 与 KB 实例池之间做 RBAC 授权决策 + 路由 + 审计；OpenVikingAdapter 一期仅做调用封装
> - ④ 多 KB 实例池采用方式C 混合：个人 KB 共享实例（namespace 逻辑隔离）+ 部门 KB 独立实例（物理隔离）+ 公司政策 KB 只读实例；每个实例内部是 OpenViking 官方六层架构
> - 各实例的 ROOT/ADMIN/USER 是 OpenViking 内置权限模型（账号级），与 Claude Code 4 层记忆分层（Enterprise/Project/User/Local）无关；跨 KB 的 Agent 级权限由 ③ 层 KB 授权中心强制

#### 6.4.2 层职责说明

| 层 | 承担职责 | 关键组件 | 归属 |
|---|---|---|---|
| ① Agent 应用层 | 消费记忆能力，产生对话 / 任务 / 事实；Agent 无库归属，被授权访问 KB | Claude Code、OpenClaw、Hermes、未来 Agent | 官方接入对象 |
| ② 接入通道层 | 三通道接入：Plugins(Hooks) 自动驱动读/写/归档/隔离；MCP 模型按需调 9 工具；SDK/HTTP 通用编程接入 | 7 Hook 脚本 + MCP Server（9 工具）+ Python/Go/TS SDK | 官方 |
| ③ KB 授权中心 + 平台路由层 | **方案3 核心**：Agent 身份鉴权（mTLS/JWT）+ KB 授权矩阵（RBAC + ACL，Agent×KB 读/写/删）+ 按授权路由到目标 KB 实例 + 审计日志 + 观测埋点转发（含 token 成本）；OpenVikingAdapter 一期仅做调用封装 | KB 授权中心（RBAC + ACL + 审计）+ OpenVikingAdapter | 企业侧扩展 |
| ④ 多 KB 实例池 | **方式C 混合**：个人 KB 共享实例（namespace 逻辑隔离）+ 部门 KB 独立实例（物理隔离）+ 公司政策 KB 只读实例；每实例含 openviking-server（治理+抽取+检索+存储）+ web-studio + ov CLI + RAGFS | 多个 OpenViking 实例 + RAGFS + flat_hybrid + web-studio + ov CLI | 官方 |
| ⑤ 外围支撑 | 多 KB 聚合观测、密钥、对象存储、合规审计、模型层（LLM+Embedding+VLM+rerank） | Prometheus / Grafana / KMS / TOS / audit log / 豆包模型 | 官方 + 企业侧扩展 |

**接入范式（未来 Agent 接入决策树）**：
- **Claude Code / 同类生命周期型 Agent** → Plugins(Hooks) + MCP 双通道（自动召回 + 模型按需检索）
- **LangChain / LangGraph / 自研 Agent** → Python/Go SDK + HTTP
- **Cursor / Trae / 其他 MCP 兼容 Agent** → MCP 通道（9 工具）
- **新增 Agent 零改造接入**：只需在 KB 授权中心配置 Agent×KB 授权矩阵，不动任何 KB 数据（方案3 解耦优势）
- **Adapter 一期定位**：仅 OpenVikingAdapter 做 HTTP/SDK 调用封装；VectorAdapter/GraphAdapter/KVAdapter 是长期后端迁移预留接口，不在一期实现（对齐 §6.6 风险 1）

#### 6.4.3 KB 归属 × 授权矩阵（方案3 双维度表）

> **范式转变**：方案3 以"KB 归属方"为建库维度（非 Agent），Agent 退化为被授权访问者。一个归属方可有多个 KB，多 Agent 可访问同一 KB。
>
> **官方原生命名空间（4 个顶级，附件4 第 28-35 行）**：`viking://resources` / `viking://user` / `viking://session` / `viking://agent`。OpenViking 官方无 `account/`、`team/` 顶级目录。
>
> **企业侧扩展**：KB 授权中心（RBAC + ACL + 审计）管理 Agent×KB 授权矩阵；部门 KB 目录 `viking://resources/team/{dept}/` 是企业侧分区约定；180 天冷存挂 TOS 是企业侧策略。
>
> **服务端记忆分类（官方，附件4 第 323-333 行）**：LLM 抽取后落地为 preferences / events / cases / memories / skills 五类 + archive 对话档案 + resources 多模态资源，共 7 类。

**KB 归属与承载内容**：

| KB 类型 | 归属方 | OpenViking 命名空间 | 记忆类型（官方分类） | 承载内容 | 实例形态（方式C） | 数量预估（2000 人） |
|---|---|---|---|---|---|---|
| 个人偏好 KB | 个人 | `viking://user/{uid}/memories/` | preferences / events / cases / memories | 用户偏好、稳定事实、决策案例 | 共享实例（namespace 隔离） | 2000 个 |
| 个人技能 KB | 个人 | `viking://user/{uid}/skills/` | skills | 用户习得的操作方式、任务经验 | 共享实例（namespace 隔离） | 2000 个 |
| 项目上下文 KB | 个人/项目组 | `viking://resources/{project}/` | 多模态资源 / 知识规则 | 项目结构、代码风格、协作规范 | 按项目独立或共享 | 按项目数 |
| 部门 SOP KB | 部门 | `viking://resources/team/{dept}/` | 多模态资源 / skills | 部门规范、流程、最佳实践 | 独立实例（物理隔离） | ~20 部门 |
| 公司政策 KB | 公司 | `viking://resources/public/` | 多模态资源 / 知识规则 | HR 制度、合规规范、通用知识 | 独立只读实例 | 1 个 |
| 会话归档 KB | 个人（临时） | `viking://session/{sid}/archive/` | archive（对话档案） | 单次对话上下文（20000 token 切分） | 共享实例 | 按活跃会话 |

**Agent × KB 授权矩阵示例**（③ 层 KB 授权中心强制）：

| Agent \ KB | 张三·偏好 KB | 张三·技能 KB | 研发部·SOP KB | 公司·政策 KB | 张三·项目A KB |
|---|---|---|---|---|---|
| Claude Code | 读 + 写 | 读 + 写 | 读 | 读 | 读 + 写 |
| OpenClaw | 读 | 读 | 读 + 写 | 读 | 读 |
| Hermes | 读 | 读 | 读 | 读 | — |
| 未来 Agent | 按需配置 | 按需配置 | 按需配置 | 只读 | 按需配置 |

> **授权粒度**：读 / 写 / 删 三权分立；删除操作需 KB 归属方或 ADMIN 审批；审计日志记录每次 Agent×KB 访问。
>
> **子 Agent 隔离（官方能力，附件4 第 82-83 行）**：Claude Code 通过 Task 工具派生子 Agent 时，`SubagentStart` Hook 分配独立 `cc-<sha256(child_session_id)>` OV Session，子 Agent 继承父 Agent 的 KB 授权但以独立 peer_id 归档，避免主/子 Agent 记忆串染。
>
> **resources/ 语义澄清（对齐附件4 第 31、333 行）**：官方 `viking://resources` 是"多模态资源：项目文档、代码库、知识/规则"，通过 MCP `add_resource` 主动加入。HR 制度等企业策略性文本挂到 `viking://resources/public/` 是企业侧分区约定，非官方语义。
>
> **归档冷存（企业侧策略）**：180 天未访问的长期记忆迁移到 TOS 对象存储；KB 级归档，不影响其他 KB。

#### 6.4.4 关键数据流（4 条路径）

> 4 条路径对应 §6.4.1 接入通道层的两条通道（Plugins/Hooks + MCP）× 两个方向（写入 + 召回）。Hooks 通道自动触发，MCP 通道模型按需触发。

**路径 1 · Hooks 自动 Capture（写入 · 生命周期驱动）**
```
Stop Hook 触发（模型每轮回答结束）
   │
   ▼
auto-capture.mjs 读 transcript_path → 解析 turn → 增量过滤（capturedTurnCount）
   │
   ▼
sanitize：剥离 <openviking-context> / <system-reminder> 等注入块（防污染回环）
   │
   ▼
shouldCapture 门禁：长度 / 命令 / 问句 / 符号 / 关键词模式
   │
   ▼
buildParts：text→text part，tool_use/tool_result→tool part（output ≤2000 字）
   │
   ▼
★ KB 授权中心校验：Agent 身份鉴权（mTLS/JWT）→ 确认写入权限 → 路由到目标 KB 实例
   │
   ▼
addMessage → POST 到目标 KB 实例的 OV Session（cc-<sha256(cc_session_id)>）
   │
   ▼
OV 服务端 pending token ≥ 20000（COMMIT_TOKEN_THRESHOLD）→ commit
   │
   ▼
Memory Extraction（LLM，按 MemoryTypeRegistry 5 类分类）
   + Working Memory v2 Compression（LLM Function Calling，按 WM 7 sections）
   + Embedding 向量化
   │
   ▼
落地到目标 KB 实例的 viking://user/{uid}/memories/{preferences|events|cases|...}/ 或 viking://user/{uid}/skills/
```

**路径 2 · MCP store 显式写入（写入 · 模型意图驱动）**
```
模型判断"这一条值得沉淀" → 调 MCP store 工具
   │
   ▼
★ KB 选择 + 授权校验：Agent 指定目标 KB → KB 授权中心校验写入权限（RBAC + ACL）
   │  ─ 无写入权限 → 拒绝 + 审计日志
   ▼
SDK 层补 ID + 元数据拼路径（企业侧扩展）
   │
   ▼
OpenVikingAdapter → 路由到目标 KB 实例的 OpenViking HTTP/SDK
   │
   ▼
显式写入：服务端 LLM extraction + Embedding 向量化 → 生成 L0/L1 → 落地
```

**路径 3 · Hooks 自动 Recall（召回 · 生命周期驱动）**
```
UserPromptSubmit Hook 触发（用户每次提交 prompt）
   │
   ▼
auto-recall.mjs 通过 stdin 拿到 prompt / session_id / cwd
   │
   ├─ 命中 bypass / query<3 字符 / server offline → 直接 approve（跳过）
   ▼
★ KB 授权中心校验：Agent 身份鉴权 → 获取授权 KB 列表 → 路由到目标 KB 实例
   │
   ▼
多路检索：POST /api/v1/search/find（发往授权的个人 KB 共享实例）
   │
   ▼
★ 自动召回边界（官方安全边界，附件4 第 345-350 行）：
   只搜 viking://user/memories + viking://user/skills
   viking://resources 不参与自动召回（防跨命名空间泄露）
   │
   ▼
排序：base score + leafBoost + eventBoost + prefBoost + lexicalOverlap
   │
   ▼
score ≥ 0.35 过滤（SCORE_THRESHOLD）+ 去重 + 取前 recallLimit=6
   │
   ▼
内容解析：优先 L0 abstract，abstract 空时 fallback L1 overview，
        相关度高 + 预算充足时才拉 L2 全文（单条截 500 字 RECALL_MAX_CONTENT_CHARS）
   │
   ▼
预算：2000 token 内（RECALL_TOKEN_BUDGET）注入完整内容，
     超出降级为「URI + 相关度%」
   │
   ▼
输出 <openviking-context> 注入块 → 追加到用户 Prompt 前
   │
   ▼
SDK 层按授权矩阵过滤（企业侧扩展 · KB 授权中心已校验）
   │
   ▼
SDK 发 OTel Trace + Prometheus 指标（命中率 / 延迟 / llm_token_usage / embedding_token_usage）
```

**路径 4 · MCP search 模型主动检索（召回 · 模型意图驱动 · 跨 KB 联邦）**
```
模型判断"自动注入的 6 条不够" → 调 MCP search 工具（可指定 scope + KB）
   │
   ▼
★ KB 授权中心校验：Agent 身份鉴权 → 获取授权 KB 列表 → 确认目标 KB 读权限
   │
   ▼
★ 跨 KB 联邦查询：平台层 fan-out 到多个授权 KB 实例并行检索
   │  ├ 个人偏好 KB 共享实例（viking://user/）
   │  ├ 部门 SOP KB 独立实例（viking://resources/team/{dept}/）
   │  └ 公司政策 KB 只读实例（viking://resources/public/）
   ▼
各 KB 实例执行两阶段检索
   │
   ├─ 阶段 1：flat_hybrid（dense + sparse + int8 量化）向量召回
   └─ 阶段 2：doubao-seed-rerank 精排 + 阈值过滤
   │
   ▼
★ 可覆盖 viking://resources（路径 3 不搜的范围），由模型显式指定 scope
   │
   ▼
合并排序：多 KB 结果按相关度 + KB 优先级合并 → 去重 → 取 Top-K
   │
   ▼
返回 L0/L1 摘要 + 必要时按 URI 调 MCP read 加载 L2 详情
```

> **4 条路径对应关系**：路径 1/3 走 Hooks 通道（自动），路径 2/4 走 MCP 通道（按需）；写入走路径 1/2，召回走路径 3/4。Hooks 与 MCP 互补：Hooks 保证记忆能力不依赖 LLM 意愿，MCP 提供精细化操作能力。
>
> **方案3 授权贯穿**：4 条路径均经过 ③ 层 KB 授权中心校验——写入路径（1/2）校验写权限后路由到目标 KB 实例；召回路径（3/4）校验读权限后路由/联邦查询授权 KB 实例。Agent 无法越界访问未授权 KB。

#### 6.4.5 部署视图（KB 实例池 · 方式C 混合）

| 服务 | 数量 | 用途 | 归属 |
|---|---|---|---|
| **KB 授权中心** | 1 组（高可用） | Agent×KB 授权矩阵（RBAC + ACL）+ 身份鉴权（mTLS/JWT）+ 路由决策 + 审计日志 | 企业侧扩展 |
| 个人 KB 共享实例（openviking-server） | 1 组（主 + 副本） | 承载 2000 人个人偏好/技能/会话 KB（namespace 逻辑隔离） | 官方 |
| 部门 KB 独立实例（openviking-server） | ~5-10 组（按敏感度合并 20 部门） | 各部门 SOP KB 物理隔离（研发/设计/产品等） | 官方 |
| 公司政策 KB 只读实例（openviking-server） | 1 组 | HR/合规/通用知识，全 Agent 只读授权 | 官方 |
| RAGFS 存储卷 | 每实例 1 组 | 各 KB 实例的目录树承载（viking://{resources,user,session,agent}/…） | 官方 |
| web-studio | 每实例 1 个 | B 侧 Web 控制台 · Playground + 检索轨迹可视化（命中率调优利器） | 官方 |
| ov CLI（Rust） | 复用 | 一期运维：目录树 `ls/tree/read/search` + 跨 KB 批量导入 | 官方 |
| MCP Server（/mcp 端点） | 每实例 1 组 | 暴露 9 工具给模型按需调用（经 KB 授权中心路由） | 官方 |
| Plugins（Hooks 脚本） | 每 Agent 1 套 | 7 Hook 生命周期回调（auto-recall.mjs / auto-capture.mjs 等） | 官方 |
| Prometheus + Grafana | 1 套 | 多 KB 实例指标聚合 + 面板（含 llm_token_usage / embedding_token_usage 成本曲线，按 KB 分维度） | 官方 + 企业侧扩展 |
| KMS | 复用企业侧 | 静态加密密钥 + 租户密钥（各 KB 实例独立密钥） | 企业侧扩展 |
| TOS（对象存储） | 复用企业侧 | 各 KB 的 archive/ 冷存（180 天规则）+ 原始附件 | 企业侧策略 |
| 模型层 | 外部调用 | LLM（extraction/compression）+ Embedding（向量化）+ VLM（多模态资源）+ doubao-seed-rerank | 官方配置 |

- **KB 实例池拓扑**：1 个个人 KB 共享实例 + ~5-10 个部门 KB 独立实例 + 1 个公司政策 KB 只读实例 + 1 个 KB 授权中心
- **KB 授权中心**：统一管理 Agent×KB 授权矩阵、身份鉴权、路由决策、审计日志；详见 [一期落地方案](附件3-与openvking对接问题.md)
- **远程 MCP 配置注意（附件4 第 110 行）**：远程 server 场景需 shell function wrapper 把 `OPENVIKING_URL` / `OPENVIKING_API_KEY` 注入到 `claude` 进程，否则 MCP 会静默连回 `http://127.0.0.1:1933` 且不带鉴权头

#### 6.4.6 关键参数与运行阈值

> 以下参数来自附件4 附录「关键参数默认值」（官方默认），是 2000 人规模下成本预算与性能调优的核心判据。

| 参数 | 默认值 | 作用 | 影响维度 |
|---|---|---|---|
| `OPENVIKING_RECALL_LIMIT` | 6 | 每轮最多注入的记忆条数 | Prompt 增量成本 |
| `OPENVIKING_RECALL_TOKEN_BUDGET` | 2000 | 内联内容的 token 预算 | 单次召回成本 |
| `OPENVIKING_RECALL_MAX_CONTENT_CHARS` | 500 | 单条内容截断上限 | 注入质量 |
| `OPENVIKING_SCORE_THRESHOLD` | 0.35 | 最低相关度阈值 | 召回精度 / 召回率权衡 |
| `OPENVIKING_MIN_QUERY_LENGTH` | 3 | 少于该长度跳过 recall | 防误触发 |
| `OPENVIKING_CAPTURE_MAX_LENGTH` | 24000 | 单次 capture 决策的最大文本长度 | 防超长污染 |
| `OPENVIKING_COMMIT_TOKEN_THRESHOLD` | 20000 | pending token 达到即触发 commit + LLM extraction | LLM extraction 调用频率（成本关键） |
| `OPENVIKING_RESUME_CONTEXT_BUDGET` | 32000 | 会话恢复时拉取 archive overview 的 token 预算 | 恢复上下文质量 |
| `OPENVIKING_TIMEOUT_MS` | 15000 | recall / 常规请求超时（ms） | 用户体验 |
| `OPENVIKING_CAPTURE_TIMEOUT_MS` | 30000 | capture 请求超时（ms） | 写入可靠性 |
| `OPENVIKING_WRITE_PATH_ASYNC` | true | 写路径 Hook 后台异步执行 | 不阻塞主流程 |
| `KB_AUTH_MATRIX_CACHE_TTL` | 300 | KB 授权矩阵缓存有效期（秒） | 授权中心查询频率 |
| `KB_FEDERATION_TIMEOUT_MS` | 8000 | 跨 KB 联邦查询超时（ms） | 多 KB 召回延迟 |
| `KB_FEDERATION_MAX_KB` | 5 | 单次联邦查询最多 fan-out 的 KB 实例数 | 联邦查询成本 |

**2000 人规模成本判据**：
- **LLM extraction 成本** = (人均日对话 token / 20000) × LLM 单次 extraction 调用价 × 2000 人
- **Embedding 成本** = 日新增记忆条数 × Embedding 单价 × 2000 人
- **召回 Prompt 增量** = 人均日召回次数 × min(6 条 × 平均 L0 长度, 2000 token) × 2000 人
- 三项均通过 `llm_token_usage` / `embedding_token_usage` Prometheus 指标可观测（对齐 §6.5 理由 5）

### 6.5 核心理由（5 条 · 对齐 §3 5 道业务题）

1. **业务题 Q1/Q3：KB 授权访问天然满足多 Agent 共享 + 隔离** — 方案3 以知识库（KB）为一等公民，KB 归属组织/部门/个人，Agent 被授权访问指定 KB（详见 §6.4.0 设计理念）。多 Agent 授权访问同一 KB → 天然满足 Q1 跨 Agent 共享（用户偏好/部门 SOP 单份存储）；公司/部门/个人 = 不同 KB → 天然满足 Q3 三级隔离（KB 级 ACL 服务端强制，Agent 无法越界）。新增/下线 Agent 只改授权矩阵，不动数据（Agent 与数据归属解耦）
2. **业务题 Q2：短期 + 长期记忆闭环** — OpenViking 内置 **L0/L1/L2 三层信息模型**（`.abstract.md`/`.overview.md`/原文，附件4 第 337-343 行）+ **官方抽取管线**（Memory Extraction 按 MemoryTypeRegistry 5 类分类 + Working Memory v2 Compression 按 WM 7 sections 结构化压缩，附件4 第 297-308 行）+ **7 Hook 生命周期**（覆盖读/写/归档/隔离四类时机），从对话解析到长期入库无需自建
3. **业务约束：单栈运维简化 + 生态亲和** — 一套服务、一份运维；AGPL-3.0 自托管可控；与火山生态（TOS / 豆包 rerank）天然对接
4. **业务题 Q4：企业级治理闭环** — KB 授权中心（RBAC + ACL + 审计）服务端强制 Agent×KB 读/写/删权限，配合 KMS + 租户密钥 + audit log，覆盖 ACL/审计/驻留/删除权四要素；删除权按 KB 级联；具体合规证书由公司部署侧承担
5. **业务题 Q5：运行可观测开箱可用** — OpenViking 原生 Prometheus 指标（含 `llm_token_usage` / `embedding_token_usage` / `rerank_used_total`）+ SDK 层 OTel Trace + **web-studio 检索轨迹可视化**，命中率 / 污染率 / P95 / 成本（LLM+Embedding token 花费）四条曲线可开箱使用；关键参数默认值（commit=20000 / recallLimit=6 / score=0.35）见 §6.4.6

### 6.6 最大风险（3 条）

1. **单产品绑定** — 若 OpenViking 项目停滞或不满足新需求，迁移成本高
   - **缓解**：SDK / Adapter 抽象层预留 `VectorAdapter / GraphAdapter / KVAdapter` 通用接口，未来新增或切换任意后端零改造业务代码
   - **一期定位澄清**：一期仅启用 `OpenVikingAdapter` 做 HTTP/SDK 调用封装；`VectorAdapter / GraphAdapter / KVAdapter` 是长期后端迁移预留接口，不在一期实现（对齐 §6.4.2 Adapter 行），避免过度设计
2. **企业合规责任由部署侧承担** — OpenViking 不提供第三方 SaaS 合规证书；由于是自托管部署，数据不出企业，合规能力由公司内部审计 / 等保 / 数据驻留策略保证（**这是私有化部署的常规做法，不构成产品缺陷**）
3. **被动抽取质量需持续调优** — OpenViking 官方抽取管线（`compression.ov_wm_v2` + Memory Extraction，附件4 第 297-308 行）依赖 LLM 与 prompt
   - **缓解**：建立 golden set 抽取效果基线，定期回归；PoC 阶段用真实数据校准；利用 web-studio 检索轨迹可视化定位抽取偏差
4. **多 KB 联邦查询延迟** — 方案3 方式C 混合部署下，Agent 跨 KB 召回需平台层 fan-out 多个 KB 实例并行检索再合并排序，增加召回 P95 延迟
   - **缓解**：并行 fan-out（最多 5 个 KB 实例，`KB_FEDERATION_MAX_KB`）+ 8000ms 超时（`KB_FEDERATION_TIMEOUT_MS`）；高频 KB 结果本地缓存（授权矩阵缓存 `KB_AUTH_MATRIX_CACHE_TTL=300s`）；Hooks 自动召回（路径 3）只查个人 KB 共享实例（单实例无联邦），仅 MCP search（路径 4）才触发跨 KB 联邦

### 6.7 一期落地方案

**方案3 · 方式C 混合部署一期目标**：
- **KB 授权中心**：优先落地 RBAC + ACL + 审计，管理 Agent×KB 授权矩阵
- **KB 实例池**：1 个个人 KB 共享实例（2000 人 namespace 隔离）+ ~5-10 个部门 KB 独立实例 + 1 个公司政策 KB 只读实例
- **2000 人压测**：PoC 阶段验证个人 KB 共享实例的 2000 人并发 + 跨 KB 联邦查询延迟（P95 < 8000ms）
- **防篡改验证**：验证 Agent 无法越界访问未授权 KB（KB 授权中心服务端强制）

详细的 SDK/MCP 定位、多 Agent 对接方式、写入 / 遗忘规则、4 层记忆存储抽象、Adapter 与 RAG 关系，见 [附件3-一期OpenViking落地方案.md](附件3-与openvking对接问题.md)。

Claude Code × OpenViking 的端到端接入实证（含 hooks 生命周期、写入抽取、召回注入、观测埋点全链路）见 [附件4-智能体集成OpenViking实证.md](附件4-智能体集成OpenViking实证.md)。

---

## 7. 关键风险与建议

### 7.1 关键风险
| # | 风险 | 影响 | 缓解 |
|---|------|------|------|
| R1 | 单产品绑定 → 未来后端切换成本 | OpenViking 项目停滞或不满足新需求时迁移成本高 | SDK / Adapter 抽象层预留通用可插拔接口，未来切换任意后端零改造业务代码 |
| R2 | 记忆污染（错误偏好被强化） | AI 行为偏离 | 借鉴 Letta 的召回-证据引用做法（archival passage + sleep-time 整合，每次召回要求 LLM 显式引用来源），做记忆污染防护 |
| R3 | 2000 人规模的成本失控 | 算力/存储账单爆 | 引入"记忆生命周期"策略：180 天未访问自动归档到 `account/archive/`（挂 TOS）；并按 §6.4.6 关键参数（commit=20000 / recallLimit=6）预算 LLM+Embedding 成本 |
| R4 | 敏感数据泄露（跨部门/跨人） | 合规事故 | 方案3 KB 级 ACL 服务端强制（KB 授权中心 RBAC + ACL），Agent 无法越界访问未授权 KB；部门 KB 物理隔离（独立实例）|
| R5 | 删除权不彻底 | GDPR/个保法违规 | 选型时优先支持"级联删除 + 被引用清理"的产品 |
| R6 | Agent 框架绑定 | 未来 Agent 接入成本 | 优先使用 MCP 协议或 HTTP API，避免 SDK 锁定 |

### 7.1.1 文档使用注意（非技术风险）

- **竞品功能参考被误读为"完整候选"**：Coze / VikingDB / Dify 已从 §6.2 的候选池移出，仅在附录 B 承载功能借鉴。选型评审时请复核，不要把附录 B 三款商业产品误当作可选项。

### 7.2 后续建议
1. **下一步**：先在研发部小范围 PoC（建议 2 周内），验证"个人偏好命中率"和"部门 SOP 召回质量"
2. **关注 2026 H2 / 2027 新动向**：
   - OpenViking 的多 Agent 协议层演进
   - OpenViking 官方抽取管线（SessionCompressorV2）的持续优化
   - OpenViking 生态工具链与 Agent 生态（Claude Code / OpenClaw / Hermes 等）的集成成熟度
3. **持续观察竞品功能参考三者向"记忆系统级"抽象的演进**（Coze / VikingDB / Dify）；**触发重评估条件**：Coze 补齐部门级 ACL 或 VikingDB 提供长期记忆 SaaS 或 Dify 官方深化 Mem0 集成，任一发生即重开选型
4. **暂不评估**：商业 SaaS（如 Zep、ChatGPT Memory）的私有化部署能力——若公有云合规可接受，可作为对标基线

---

> 引用来源与竞品功能参考详情见 [附件2-引用来源与竞品参考.md](附件2-引用来源与竞品参考.md)。

---

## 修订记录

### v1.3（2026-07-03）— 架构选型从方案2 转为方案3（以知识库为中心）

- **重构动因**：用户在方案2（多 Agent 共享单 OpenViking 库 + 企业侧 account/team 目录隔离）落地后，提出两点质疑（单库性能/篡改风险），并补充新框架——"一个组织/人，有一个/多个知识库，多个 agent 都可以访问指定的库"。经三方案对比（方案1 一 Agent 一库 / 方案2 多 Agent 一库 / 方案3 以 KB 为中心），方案3 在跨 Agent 共享、防篡改、灵活性、Agent 与数据解耦四维度综合最优，对齐全部 5 道业务题。
- **§6.4.0 设计理念**：新增"以 KB 为中心"范式声明（KB 归属组织/人，Agent 被授权访问）+ 方式C 混合实现说明；KB 授权中心（RBAC + ACL + 审计）定位为企业侧扩展核心组件。
- **§6.4.1 架构图**：③ 层从"企业侧记忆治理层"重构为"KB 授权中心 + 平台路由层"（RBAC + ACL + Agent×KB 授权矩阵 + 路由 + 审计）；④ 层从"OpenViking 单栈（单实例）"重构为"多 KB 实例池"（方式C 混合：个人 KB 共享实例 + 部门 KB 独立实例 + 公司政策 KB 只读实例）。
- **§6.4.2 层职责表**：新增"KB 授权中心"职责（RBAC + ACL + 审计 + 路由）；④ 层改为"多 KB 实例池"（方式C 混合）；新增"新增 Agent 零改造接入"范式（只改授权矩阵）。
- **§6.4.3 目录承载**：从"account/ 隔离级"改为"KB 归属 × 授权矩阵"双维度表；6 类 KB（个人偏好/个人技能/项目上下文/部门 SOP/公司政策/会话归档）+ Agent×KB 授权矩阵示例。
- **§6.4.4 数据流**：4 条路径均增加 KB 授权中心校验步骤；路径 1/2（写入）增加"授权校验 + 路由到目标 KB 实例"；路径 3（Hooks Recall）增加"授权中心校验 → 路由"；路径 4（MCP search）增加"跨 KB 联邦查询 fan-out + 合并排序"；新增"方案3 授权贯穿"说明。
- **§6.4.5 部署视图**：从单实例改为"KB 实例池"（1 个个人 KB 共享实例 + ~5-10 个部门 KB 独立实例 + 1 个公司政策 KB 只读实例 + 1 个 KB 授权中心）；各实例独立 RAGFS/web-studio/MCP Server。
- **§6.4.6 关键参数**：新增 3 个参数（KB_AUTH_MATRIX_CACHE_TTL=300 / KB_FEDERATION_TIMEOUT_MS=8000 / KB_FEDERATION_MAX_KB=5）。
- **§6.5 理由**：理由 1 从"四级隔离天然匹配"改为"KB 授权访问天然满足多 Agent 共享 + 隔离"；理由 4 从"SDK 层 Visibility 白名单"改为"KB 授权中心 RBAC + ACL 服务端强制"。
- **§6.6 风险**：新增风险 4"多 KB 联邦查询延迟" + 缓解（并行 fan-out + 本地缓存 + Hooks 自动召回只查单实例）。
- **§6.7 一期落地**：新增方案3 一期目标（KB 授权中心 + 方式C 混合部署 + 2000 人压测 + 防篡改验证）。
- **§7.1 R4**：从"SDK 层 ID 注入 + namespace"改为"KB 级 ACL 服务端强制 + 部门 KB 物理隔离"。
- **未触动项**：§6.5 理由 2/3/5、§6.6 风险 1/2/3、§7.1 R1/R2/R3/R5/R6、§7.2 保持不动；附件3/附件4 引用不变。

### v1.2（2026-07-03）— §6.4 方案架构重构（对齐附件4 官方事实）

- **重构动因**：附件4「智能体集成 OpenViking 实证」梳理出 OpenViking 官方分层 / 命名空间 / Hooks+MCP 双通道 / 7 Hook / 9 MCP / 5 类记忆分类 / L0/L1/L2 / RAGFS / web-studio / ov CLI 等官方事实，原 §6.4 与之存在 21 项判断空间（4 Blocker · 12 Major · 5 Minor）。
- **新增 §6.4.0 设计理念**：显式说明"OpenViking 官方原生 vs 企业侧扩展"边界（account/team/Visibility/五级 ID/SDK 治理层属企业侧扩展；viking:// 4 命名空间/7 Hook/9 MCP/L0/L1/L2/RAGFS/web-studio 属官方原生）。
- **重画 §6.4.1 架构图（4 层 → 5 层）**：新增"接入通道层"显式画出 Plugins(Hooks)+MCP+SDK 三通道 + 7 Hook 生命周期时间轴 + 9 MCP 工具；③ 层重命名为"企业侧记忆治理层"；④ 层补 web-studio / ov CLI / RAGFS；⑤ 层补 LLM+Embedding+VLM 三分工。
- **更新 §6.4.2 层职责表**：4 行 → 5 行 + 归属列 + 接入范式决策树 + Adapter 一期定位澄清。
- **重构 §6.4.3 目录承载表**：标注"官方 4 命名空间 vs 企业侧扩展 account/ 根"；新增"记忆类型（服务端 5 类分类）"列；新增"子 Agent 隔离"行（SubagentStart/Stop 独立 OV Session）；resources/ 语义澄清（多模态资源，非"HR 制度"）；Visibility 标注为企业侧扩展。
- **重构 §6.4.4 数据流（2 路径 → 4 路径）**：Hooks 自动 Capture / MCP store 显式写入 / Hooks 自动 Recall / MCP search 主动检索；补自动召回边界（Hooks 只搜 memories+skills，resources 不参与自动召回）+ L0/L1/L2 召回阶梯 + 关键阈值。
- **修正 §6.4.5 部署视图**：`AGFS → RAGFS`；补 web-studio / ov CLI / MCP Server / Plugins(Hooks) 行 + 归属列 + 远程 MCP 配置注意。
- **新增 §6.4.6 关键参数与运行阈值表**：11 个官方默认参数 + 2000 人规模成本判据（LLM extraction / Embedding / 召回 Prompt 增量三项）。
- **联动更新**：§6.5 理由 1/2/5（对齐新架构与官方事实）；§6.6 风险 1（Adapter 一期定位）/ 风险 3（SessionCompressorV2 → compression.ov_wm_v2）；§7.1 R3（90 天 → 180 天，对齐 §6.4.3 archive 规则）。
- **术语一致性传导**：抽取管线组件名 Parser/TreeBuilder/SemanticQueue/SessionCompressorV2/MemoryUpdater → Memory Extraction + Working Memory v2 Compression（旧名保留历史注）；AGFS → RAGFS（全文 2 处）。
- **未触动项**：§6.7 一期落地方案指向附件3/附件4 的引用不变；§7.2 后续建议保持不动。

### v1.1（2026-07-02）— 校验后修订

- **Blocker 修复（B1 · v1 → v1.1 修订）**：§6.2 表精简为"主选型 / 能力参考 / 竞品功能参考"三类；新增 §6.2.1「三选一裁决」小节，用 §3 5 道业务题逐题对比 4 款开源候选并明写 Mem0 / Letta / Cognee 淘汰理由。
- **Major 修复**：
  - M1 §4.3 表标注 Coze LTM 是 Coze 记忆资源之一（完整分层见附录 B.1）。
  - M2 §5.0 表 B-2 与 §5.4 更新 Cognee 主图后端 Kuzu → **Ladybug（v1.0.4 起）**；主 API 已改为 `remember/recall/forget/improve`；§4.5.2 图数据库示例同步。
  - M3 §4.2 Claude Code Memory 改为官方 **4 层**（Enterprise policy / Project / User / Project local-Deprecated）；§4.4.7 SSO/RBAC 行补组织级只读参照。
  - M4 §1 删除"参考模式：以 OpenViking 为主要参考"整段，避免"先射后画靶"。
  - M5 §6.4.1 图 · §6.4.3 表 · §6.5 理由 1 · §6.4.4/§6.4.5 目录示例统一为 `account/` 根节点下的 `resource/ team/ user/ agent/ archive/` 五类子树；§6.4.3 补 Visibility 值域说明。
  - M6 §5.2 独特优势与 §5.0 表 A/B-3 更新为 **2026-04 v3 新算法**（LoCoMo 91.6 / LongMemEval 94.8 / BEAM 1M 64.1 / BEAM 10M 48.6，entity linking + 多信号并行融合 + 时序推理）。
  - M7 §4.2 Hermes 行改为 MemGPT/Letta；报告头部术语约定明确 Hermes 特指公司内自研 Agent。
- **Minor / Nit 收敛**：4.4.1-4.4.8 / 4.5.1-4.5.3 加粗改 `####` 标题（F04-F05）；报告头部新增 metadata 与术语约定（F03/F07/M7）；§4.4.5 定义"被引用清理"（L10）；§4.4.7 合规证书标注 ISO 27001 为通用期望（C07）；§4.5.2 向量索引补 DiskANN；§5.0 表 A Letta 作用域描述与 §5.3 呼应（L07）；§5.0 表 B-1 Mem0 图像上限标 Cloud 官方限制（C09）；§5.0 表 A Mem0 合规级别改为"SOC 2 声明 + HIPAA 声明"（C10）；§5.3 Letta 定位改三层 + 外部工具集（C06）；§5.5 来源分级承诺口径调整（L04）；§5.5 单位统一为"单元"（C12）；§6.4.1 图注 Adapter 内嵌于 SDK（L12）；§6.5 补 2 条理由覆盖 Q4/Q5（L08）；§6.7 引入附件 4 端到端接入实证（C11）；§7.1 R2 Letta 术语措辞更正（F10）；§7.1 R7 移出风险表并独立成 §7.1.1（L05）；§7.2 建议 3 补重评估触发条件（L11）；§7.2 时间描述改 2026 H2 / 2027（C14）；§2 删除 Cursor（C13）；术语"云 Agent 平台"统一为"云端 Agent 平台"（F07）。
- **前次校验推翻项（v1 → v1.1 修订时未触动原文）**：
  - VikingDB IVF 索引：官方 pq 量化行明确"适用于 diskann、ivf 索引算法"，前版认为 VikingDB 不支持 IVF 的判定被推翻，附件 2 §B.2 保持不动。
  - 术语大小写：全文未出现 Openviking / Vikingdb / mem0 混用，前版关于大小写混用的判定被推翻，原文保持不动。

### v1（2026-06-XX）— 初版

- 建立"能力先行 → 产品映射 → 业务选型"三步法主结构；将 Coze / VikingDB / Dify 从候选池外移作为竞品功能参考；候选池保留 4 款开源框架。
