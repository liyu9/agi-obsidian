# MRD → PRD 多智能体架构设计方案 v3

> **版本**：v3（最终版，基于课程 v1 框架 + Chatflow 工程经验演化）
> **架构**：1 主 + 5 子（持久化角色，Orchestrator 范式）
> **场景**：B 端产品 MRD（市场需求文档）→ 结构化 PRD（产品需求文档）
> **课程依据**：极客时间《企业级多智能体设计实战》第 23-29 课 + 第 30-40 课（可观测/可靠性/质量）
> **工程依据**：Coze Chatflow `PRD_llms_1-draft.yaml` 实际生产 workflow

---

## 0. 文档导航

| 章节 | 内容 | 阅读时长 |
|------|------|---------|
| §1 设计背景 | 课程 v1 + Chatflow 经验 + 3 轮迭代的演化路径 | 5 分钟 |
| §2 整体架构 | 1 主 + 5 子的拓扑图与节点清单 | 5 分钟 |
| §3 角色定义 | Manager / 5 子 Agent 的四层框架 | 20 分钟 |
| §4 协作协议 | 共享工作区 + 邮箱 + handoff 协议 | 10 分钟 |
| §5 端到端时序 | 完整流程图 + 9 阶段 SOP | 10 分钟 |
| §6 模型与可靠性 | 模型选型 + 3 级降级 + 熔断 | 5 分钟 |
| §7 质检体系 | 100 分制评分 + 多视角审查 | 5 分钟 |
| §8 人类介入点 | 3 个介入点 + 自动触发规则 | 5 分钟 |
| §9 关键技术决策 | 12 个核心设计决策与依据 | 10 分钟 |
| §10 风险与缓解 | 8 类风险 + 缓解策略 | 5 分钟 |
| §11 落地路线图 | 4 阶段 / 12 周实施计划 | 5 分钟 |
| §12 附录 | MRD/PRD 模板 + 字段映射 + 完整数据流 | 5 分钟 |

---

## 1. 设计背景

### 1.1 起点：3 个输入

| 输入 | 关键经验 | 本设计的吸收 |
|------|---------|------------|
| **课程 v1 框架**（L23-29 课） | Orchestrator 范式 / 团队角色体系 / 协作协议 / 人类介入 | 整体范式 + 4 个基础角色 + 3 类协议 |
| **Chatflow PRD workflow**（15 节点 Pipeline） | 5 章节 SOP / 4 维映射 / 功能 ID 规范 / 多视角校验 / 模型降级 | 5 章节写作 SOP + 4 维映射规则 + 100 分制评分 + 3 级降级 |
| **v1 角色调整分析**（3 轮迭代） | 单 Agent token 临界 / Soul 漂移 / 注意力稀释 / 7 倍准确率差距 | 拆分为 5 个子 Agent（基于"token + Soul"双重证据） |

### 1.2 3 轮迭代的核心发现

| 迭代 | 问题 | 解法 |
|------|------|------|
| v0 → v1 | 通用 Agent 3 崩溃 | 拆为 1+3 子 Agent |
| v1 → v2 | ② PRD 撰写过载（5 章节 / 6 万 token） | 拆为产品组（PRD1+2）+ 工程组（PRD3+4+5） |
| v2 → v3 | PRD5 单独占工程组 54% / Soul 漂移 / 前端-后端服务对象不同 | PRD5 独立成 ④ 页面规格 Agent |
| **v3 = 1 主 + 5 子** | — | 上下文全部可控（最大 25K），角色职责清晰 |

### 1.3 关键设计原则

1. **Orchestrator 范式**：所有任务经 Manager，禁止子 Agent 自由互调（避免 L25 AP-4 误差 17 倍放大）
2. **三维隔离判断法**：每个角色都通过"记忆数据 / 技能体系 / 决策偏好"三维验证独立性
3. **上下文工程硬约束**：每个 Agent 单次上下文 < 30K token，避免 Context Rot
4. **GT（Ground Truth）驱动**：每个 Agent 配 20-50 条历史样本作为参考
5. **独立验收**：③ 质检 Agent 只报告不修改，修复权归 Manager
6. **单一人类接口**：Human 只与 Manager 对话，避免多头沟通

---

## 2. 整体架构

### 2.1 1 主 + 5 子拓扑

```
                         ┌──────────────────────┐
                         │   Human（甲方）       │
                         │   3 个介入点          │
                         └──────────┬───────────┘
                                    │ 邮件（needs_clarify / checkpoint / error_alert）
                                    ▼
        ┌──────────────────────────────────────────────────────────┐
        │            Manager（主 Agent / 调度者）                   │
        │  · 调度：spawn 5 个子 Agent，路由任务与产物                │
        │  · 决策：GT 选择 / 修复策略 / 异常熔断                     │
        │  · 验收：读每子 Agent 产物，独立判断                       │
        │  · 通知：与 Human 单一接口                                 │
        │  ★ 绝不写任何业务文档（PRD/breakdown/qa_report）         │
        └──────┬──────┬──────┬──────┬──────┬──────────────────────┘
               │      │      │      │      │      邮件（三态状态机）
        ┌──────▼─┐ ┌──▼────┐ ┌▼─────┐ ┌▼────┐ ┌▼─────┐
        │ ①      │ │ ②     │ │ ②''  │ │ ②'''│ │ ④   │
        │ MRD    │ │ 产品组│ │ 流程 │ │ 数据 │ │ 页面 │
        │ 结构化 │ │ PRD1+2│ │ PRD3 │ │ PRD4 │ │ PRD5 │
        │        │ │       │ │      │ │      │ │      │
        │ 8K ctx │ │ 15K   │ │ 8K   │ │ 7K   │ │ 15K  │
        └────┬───┘ └───┬───┘ └──┬───┘ └──┬───┘ └──┬───┘
             │         │        │        │        │
             └─────────┴────┬───┴────┬───┴────────┘
                            │        │
                       handoff    handoff
                            │        │
                            ▼        ▼
        ┌────────────────────────────────────────────────┐
        │   ③ PRD 质检 Agent（独立视角，多角色审查）      │
        │   · 只出 qa_report.md，不修改 PRD              │
        │   · 100 分制评分（完整性/一致性/可执行性/风险/风格）│
        │   · 25K ctx                                    │
        └────────────────────┬───────────────────────────┘
                             │ qa_report.md
                             ▼
                    Manager 决策 + Human 终审
                             │
                             ▼
                    delivery/prd_final.md
```

### 2.2 6 个角色 + 上下文控制

| # | 角色 | 章节 | 单次上下文 | 总产出 | 决策偏好 |
|---|------|------|----------|--------|---------|
| 1 | **Manager** | — | 20K | — | 全局视野 / 严验收 / 不下场 |
| 2 | **① MRD 结构化** | — | 8K | 9 字段 + 47 需求 | 拆得细 / 问得全 / 不放过模糊点 |
| 3 | **② 产品组** | PRD1 + PRD2 | 15K | 8 章节概述 + 功能 ID 清单 | 用户友好 / 价值清晰 / 对业务方负责 |
| 4 | **②'' 流程组** | PRD3 | 8K | 用户旅程 + 业务流程图 + 操作步骤 | 严谨穷举 / 异常分支 / 对后端负责 |
| 5 | **②''' 数据组** | PRD4 | 7K | 数据模型 + 流转规则 + 存储安全 | 模型严谨 / 约束完整 / 对后端+DBA 负责 |
| 6 | **④ 页面组** | PRD5 | 15K | 页面结构 + 交互规范 + 组件清单 | 视觉可还原 / 组件可复用 / 对前端+设计师负责 |
| 7 | **③ 质检** | 全文 | 25K | qa_report.md（100 分制） | 挑剔质疑 / 找漏洞 / 不替写者决策 |

**合计 7 个 Agent（含 Manager），子 Agent 5 个。**

### 2.3 与 BP-2 "2-3 个有效 Agent 上限"的兼容性

课程 BP-2 反对"无层级 Agent 堆"，v3 严格符合：
- **中心化调度**：所有任务经 Manager（无自由互调）
- **流程型职责**：5 个子 Agent 是 PRD 写作的 5 个连续工序，不是"5 个不同领域"
- **强制验收**：每个子 Agent 都有 Manager 验收 + ③ 质检两道关

**前提**：先跑 v1（1+3）→ 验证收益 → 扩 v2（1+4）→ 验证收益 → 扩 v3（1+5），不一次性到位。

---

## 3. 角色定义（四层框架）

### 3.1 Manager（主 Agent）

#### Role Charter

| 职责 | 不负责 |
|------|--------|
| 读 MRD 初始化工作区 | 写任何业务文档 |
| 选 GT 样本（关键词匹配） | 拆解 MRD（→ ①） |
| 派子 Agent 任务（含分批 / 并发） | 写 PRD 任何章节（→ ② / ②'' / ②''' / ④） |
| 验收每个子 Agent 产物 | 质检 PRD（→ ③） |
| 决策修复策略 | 替 Human 做业务决策 |
| 监控 3 级降级与熔断 | 实际执行 LLM 调用 |
| 与 Human 通信（3 介入点） | — |

#### Soul

> "全局视野、不下场、严验收"

#### NEVER 清单

- 绝不写 PRD / breakdown / qa_report
- 绝不替 Human 做业务决策
- 绝不跳过验收环节
- 绝不在子 Agent 失败 ≥ 3 轮时继续重试（必须熔断）
- 绝不接受任何子 Agent 产物前不读原文

#### Memory

```
workspace/manager/
├── sop_prd_team.md       # 团队 SOP（阶段 0-4 流转规则）
├── team_roster.md        # 5 个子 Agent 名册与职责
├── decision_patterns.md  # 修复决策模式（"qa_report 命中 X → 自动派修订 Y"）
├── gt_index.md           # GT 样本索引
└── escalation_log.md     # 历史熔断记录
```

#### Skills

| Skill | 作用 |
|-------|------|
| `gt_matcher` | 根据 MRD 关键词匹配 1-2 份历史 PRD 样本 |
| `sub_agent_router` | 派发任务到 5 个子 Agent 的 inbox |
| `artifact_validator` | 验收每个子 Agent 产物（清单 / 字段 / 格式） |
| `qa_decision_tree` | 读 qa_report.md → 决策（通过 / 修订 / 熔断） |
| `level3_fallback` | L1 重试 → L2 换模型 → L3 熔断 |

---

### 3.2 ① MRD 结构化 Agent

#### Role Charter

| 职责 | 不负责 |
|------|--------|
| 拆 MRD 为 5 大模块（市场/用户/竞品/产品规划） | 写 PRD 任何章节 |
| 抽取 9 字段 + 47+ 需求条目（带 ID） | 业务优先级决策 |
| 标注推断来源（"「注：推断依据——XXX」"） | 需求方案设计 |
| 列出开放问题（`open_questions.md`） | — |

#### Soul

> "宁可多问，不要漏拆；遇到模糊词先列问题、不擅自补全"

#### NEVER 清单

- 绝不写 PRD
- 绝不改 MRD 原意
- 绝不跳过开放问题直接给方案

#### Memory

```
workspace/mrd_struct/
├── breakdown_methodology.md  # 拆解方法论
├── domain_patterns.md        # 行业拆解套路（ToB SaaS / 工具 / 电商）
├── requirement_id_spec.md    # 需求 ID 命名规范
└── history_clarifications.md # 历史澄清记录
```

#### Skills

- `mrd_decomposer`（5 模块固定结构拆解）
- `requirement_extractor`（INVEST 检查法）
- `user_story_template`（用户故事模板）
- `glossary_extractor`（业务术语抽取）
- `open_question_lister`（开放问题清单）

---

### 3.3 ② 产品组 Agent

#### Role Charter

| 职责 | 不负责 |
|------|--------|
| 写 PRD1（产品概述，8 子模块） | 写流程图 / 数据模型 / 页面规格 |
| 写 PRD2（功能规格，含 ID 清单） | 拆 MRD（→ ①） |
| 标注功能 ID（`F-DOMAIN_类型_序号`） | 验收（→ ③） |
| 维护 `feature_id_list.md`（给下游 ②'' / ②''' / ④ 的输入契约） | 业务规则定义 |

#### Soul

> "对用户友好、价值清晰、对业务方负责；结构 > 文采"

#### NEVER 清单

- 绝不写流程图 / 数据模型 / 页面规格
- 绝不自行补充未确认的需求
- 绝不省略功能 ID
- 绝不用模糊词"可能/大概/也许"

#### Memory

```
workspace/product_team/
├── prd1_template.md           # PRD1 8 子模块模板
├── prd2_template.md           # PRD2 功能规格模板
├── gt_samples_product/        # 产品级 GT（30 条）
│   ├── saas/001_客户分级.md
│   ├── saas/002_数据分析.md
│   └── ...
├── feature_id_spec.md         # F-DOMAIN_类型_序号 命名规范
└── value_proposition_lib.md   # 价值主张库
```

#### Skills

- `prd1_writer_sop`（4 维映射规则 + 工具/社交/电商类适配）
- `prd2_function_spec`（价值动作 → 功能关键词 + P0~P3 优先级）
- `feature_id_assigner`（强制 ID 命名）
- `cross_section_consistency`（PRD1.6 ↔ PRD2.1 跨章节引用检查）

---

### 3.4 ②'' 流程组 Agent

#### Role Charter

| 职责 | 不负责 |
|------|--------|
| 写 PRD3（流程设计：用户旅程 + 业务流程图 + 操作步骤） | 写价值主张 / 数据模型 / 页面规格 |
| 用 Mermaid 语法画流程图 | 拆 MRD（→ ①） |
| 必含审批 / 校验 / 数据更新环节 | 业务决策 |
| 维护 `handoff_34.md`（给 ②''' 数据的输入契约） | — |

#### Soul

> "严谨穷举、异常分支、对后端负责"

#### NEVER 清单

- 绝不省略异常分支
- 绝不写价值主张 / 用户画像
- 绝不省略必含环节（审批 / 校验 / 数据更新）
- 绝不用 Mermaid 之外的流程图语法

#### Memory

```
workspace/flow_team/
├── prd3_template.md           # PRD3 3 子模块模板
├── gt_samples_flow/           # 流程级 GT（20 条）
│   ├── approval_flows/
│   ├── state_machines/
│   └── exception_patterns/
├── mermaid_syntax.md          # Mermaid 规范
└── journey_map_patterns.md    # 用户旅程模式
```

#### Skills

- `prd3_writer_sop`（场景→阶段；功能→行为）
- `mermaid_flowchart`（Mermaid 流程图生成）
- `exception_branch_lister`（异常分支穷举）
- `journey_map_designer`（用户旅程地图）

---

### 3.5 ②''' 数据组 Agent

#### Role Charter

| 职责 | 不负责 |
|------|--------|
| 写 PRD4（数据流建模：数据模型 + 流转规则 + 存储安全） | 写价值主张 / 流程图 / 页面规格 |
| 设计 ER 图 / 表结构 / 字段定义 | 业务决策 |
| 标注存储选型 / 索引 / 约束 | 拆 MRD（→ ①） |
| 维护 `handoff_45.md`（给 ④ 页面的数据契约） | — |

#### Soul

> "模型严谨、约束完整、对后端+DBA 负责"

#### NEVER 清单

- 绝不省略字段类型 / 长度 / 约束
- 绝不写价值主张 / 流程图
- 绝不省略索引建议
- 绝不漏掉敏感数据脱敏 / 加密要求

#### Memory

```
workspace/data_team/
├── prd4_template.md           # PRD4 3 子模块模板
├── gt_samples_data/           # 数据级 GT（20 条）
│   ├── er_diagrams/
│   ├── table_designs/
│   └── security_patterns/
├── er_notation.md             # ER 图规范（mermaid erDiagram）
└── storage_selection.md       # 存储选型指南
```

#### Skills

- `prd4_writer_sop`（实体识别 / 关系设计 / 字段定义）
- `er_diagram_designer`（mermaid erDiagram）
- `data_flow_lister`（跨模块数据流）
- `security_checklist`（加密 / 脱敏 / 审计基线）

---

### 3.6 ④ 页面规格 Agent

#### Role Charter

| 职责 | 不负责 |
|------|--------|
| 写 PRD5（页面规格：页面结构 + 交互规范 + 组件清单） | 写价值主张 / 流程图 / 数据模型 |
| 维护页面模板库（CRUD / 表单 / 列表 / 详情 / 统计） | 拆 MRD（→ ①） |
| 标注页面状态（空/加载/错误/权限不足/成功） | 业务决策 |
| 用 Mermaid 画页面跳转关系图 | 验收（→ ③） |

#### Soul

> "视觉可还原、组件可复用、状态完整、权限清晰；对前端+设计师负责"

#### NEVER 清单

- 绝不写价值主张 / 用户画像（→ ②）
- 绝不写后端流程 / 数据模型（→ ②'' / ②'''）
- 绝不省略页面异常状态（空/加载/错误/权限不足/成功 5 类必含）
- 绝不用模糊词描述交互
- 绝不复用其他 Agent 的中间过程作为输入

#### Memory

```
workspace/page_spec/
├── page_templates/                # 页面模板库（5+ 套）
│   ├── crud_list.md
│   ├── crud_form.md
│   ├── detail_view.md
│   ├── dashboard.md
│   ├── wizard.md
│   └── ...
├── component_patterns.md          # 组件使用模式
├── state_machine_patterns.md      # 状态机模式
├── access_control_patterns.md     # 权限模式
└── history_feedback.md            # 历史 PRD5 反馈
```

#### Skills

- `prd5_writer_sop`（页面清单 → 字段表 → 状态机 → 交互 → 权限）
- `page_template_loader`（按功能类型加载模板）
- `component_consistency_check`（页面间组件命名/样式一致性）
- `mermaid_wireframe`（页面跳转关系图）
- `accessibility_baseline`（可访问性基线）

---

### 3.7 ③ PRD 质检 Agent

#### Role Charter

| 职责 | 不负责 |
|------|--------|
| 多视角审查（开发 / 测试 / 运营） | 修改 PRD 任何内容 |
| 100 分制评分（5 维度） | 写 PRD 任何章节 |
| 标注具体段落 + 修改建议 | 拆 MRD（→ ①） |
| 维护缺陷模式库 | 业务决策 |

#### Soul

> "挑剔质疑、找漏洞、不替写者决策"

#### NEVER 清单

- 绝不修改 PRD 内容
- 绝不替 PRD 撰写者做决策
- 绝不放任未标 `[TBD]` 的空洞描述
- 绝不只看"通过"维度（必须找"失败"证据）

#### Memory

```
workspace/qa_team/
├── qa_checklist.md            # 完整质检 checklist（5 维度）
├── defect_patterns.md         # 历史 PRD 缺陷模式
├── gt_bad_prds.md             # 反面 GT（常见错误样本）
├── review_perspectives.md     # 3 视角审查标准
└── score_calibration.md       # 评分校准记录
```

#### Skills

- `completeness_checker`（8 章节齐全性）
- `consistency_checker`（跨章节引用 / 术语 / 流程闭环）
- `executability_checker`（每条功能可写测试用例 / 验收 SMART）
- `risk_identifier`（模糊词 / 缺失依赖 / 范围蔓延信号）
- `style_consistency_checker`（术语 / 句式 / 排版）
- `scoring_engine`（100 分制评分 + 雷达图）

---

## 4. 协作协议

### 4.1 共享工作区（Owner 唯一原则）

```
workspace/shared/
├── input/                          # MRD 原始输入
│   └── mrd.md                      # Owner: Human
├── breakdown/                      # ① MRD 结构化
│   ├── requirements_list.md        # 功能需求清单（ID / 描述 / 优先级 / 验收点）
│   ├── non_functional.md           # 非功能需求
│   ├── open_questions.md           # 待澄清问题
│   ├── glossary.md                 # 业务术语表
│   └── section_3.md                # 竞品分析完整段
│   Owner: ① MRD 结构化
├── prd/                            # 5 个写作 Agent
│   ├── outline.md                  # 大纲（先于正文，Manager 验收）
│   ├── section_1_2.md              # PRD1 + PRD2（② 产品组）
│   ├── section_3.md                # PRD3（②'' 流程组）
│   ├── section_4.md                # PRD4（②''' 数据组）
│   ├── section_5.md                # PRD5（④ 页面组）
│   ├── handoff_34.md               # ②'' → ②''' 数据契约
│   ├── handoff_45.md               # ②''' → ④ 页面契约
│   ├── feature_id_list.md          # ② 产品组输出，下游 3 个 Agent 共享
│   └── prd_draft.md                # 拼装后的 PRD 草稿
│   Owner: ② / ②'' / ②''' / ④（按 section 严格切分）
├── qa/                             # ③ 质检
│   └── qa_report.md                # 质检报告（100 分制 + 缺陷清单）
│   Owner: ③ 质检
├── delivery/                       # Manager 验收后归档
│   └── prd_final.md
│   Owner: Manager
├── gt_samples/                     # GT 样本库
│   ├── product/                    # 30 条
│   ├── flow/                       # 20 条
│   ├── data/                       # 20 条
│   └── page/                       # 50 条
│   Owner: Manager（沉淀权归各 Agent）
└── mailboxes/                      # 邮箱协议
    ├── manager.json
    ├── mrd_struct.json
    ├── product_team.json
    ├── flow_team.json
    ├── data_team.json
    ├── page_team.json
    ├── qa_team.json
    └── human.json
```

**Owner 唯一原则**：每个文件只有一个 Owner Agent，其他 Agent 只有读权限（通过 SOP + 工具权限双重约束）。

### 4.2 邮箱协议（三态状态机）

```json
{
  "id": "msg-20260624-001",
  "from": "manager",
  "to": "product_team",
  "type": "task_assign | task_done | needs_clarify | checkpoint_request | error_alert",
  "subject": "派发 task-20260624-002：写 PRD1+PRD2",
  "content": "路径引用 + 关键摘要，不复制文档全文",
  "task_payload": {
    "input_path": "shared/breakdown/requirements_list.md",
    "gt_sample_path": "shared/gt_samples/product/saas/001.md",
    "output_path": "shared/prd/section_1_2.md",
    "feature_id_list_path": "shared/prd/feature_id_list.md"
  },
  "timestamp": "2026-06-24T10:30:00+08:00",
  "status": "unread | in_progress | done",
  "processing_since": "2026-06-24T10:30:05+08:00",
  "retry_count": 0
}
```

**三态状态机 + Watchdog**：
- `unread`：未读
- `in_progress`：已读处理中（设 `processing_since`）
- `done`：已完成
- Watchdog 每 10 分钟扫一次：超时 in_progress → reset 为 unread，触发重试

### 4.3 handoff 协议（5 个写作 Agent 间）

```
② 产品组  ──产 feature_id_list.md──>  ②'' 流程组
                + handoff_2to3.md
                                          │
                                          ▼
                                    handoff_34.md
                                          │
②''' 数据组 <──读 handoff_34.md──┘
        │
        ▼
   handoff_45.md
        │
        ▼
    ④ 页面组
```

**关键约束**：
- 每个 handoff 文件由前序 Agent 写、后序 Agent 读（Owner 唯一）
- handoff 内容只列"接口契约"（功能 ID / 数据实体 / 页面清单），不复制 PRD 全文
- 强制 Manager 验收前序产物后再开后序 Agent

---

## 5. 端到端时序

### 5.1 9 阶段 SOP

```
T+0  阶段 0: Manager 初始化
       ├─ 读 MRD（input/mrd.md）
       ├─ 初始化 shared/ 工作区 + 邮箱
       ├─ 选 GT 样本（关键词匹配 4 类 GT）
       └─ 检查 MRD 完整性，缺则发 needs_clarify 给 Human

T+10 阶段 1: 派 ① MRD 结构化
       ├─ spawn ①，给定 input 路径
       └─ 等待 task_done

T+50 阶段 2: ① 产出 breakdown
       ├─ 读 breakdown/*
       └─ 验收：47 需求 / 9 字段 / 开放问题齐全
            ├─ 不通过：reject 重派
            └─ 通过：发 task 给 ② 产品组

T+60 阶段 3: 派 ② 产品组（PRD1+PRD2）
       ├─ spawn ②，给定 breakdown 路径 + GT 样本
       └─ 等待 task_done

T+2h  阶段 4: ② 产出 PRD1+PRD2
       ├─ 读 section_1_2.md
       ├─ 验收：8 子模块齐全 / 功能 ID 规范
       └─ 验收通过：发 task 并发派 ②'' / ②''' / ④

T+2h  阶段 5: 并发派发（关键瓶颈段）
       ├─ spawn ②'' 流程组 → 写 PRD3
       ├─ spawn ②''' 数据组 → 写 PRD4
       └─ spawn ④ 页面组 → 写 PRD5
       （三路并发，Manager 串行收集结果）

T+4h  阶段 6: 收集 PRD3+PRD4+PRD5
       ├─ 读 section_3.md / section_4.md / section_5.md
       └─ 验收：每章节必含项齐全
            ├─ 不通过：reject 对应 Agent 重写
            └─ 通过：发 task 给 ③ 质检

T+4h  阶段 7: 派 ③ 质检
       ├─ spawn ③，给定 5 章节路径 + checklist
       └─ 等待 task_done

T+5h  阶段 8: 读 qa_report.md
       ├─ 总分 ≥ 80：进入归档
       └─ 总分 < 80：合并缺陷 → 派对应 Agent 修订
            ├─ 连续 3 轮 < 80：error_alert → Human
            └─ 某 1 轮 < 80：reject 重写

T+5h  阶段 9: 归档 + Human 终审
       ├─ 拼装 prd_final.md（5 章节顺序）
       ├─ 发 checkpoint_request 给 Human
       └─ Human 确认 → 归档
            ├─ 收到 reject：带 human_feedback 重新派
            └─ 收到 confirm：整任务 done

异常兜底（贯穿所有阶段）：
  ├─ L1 软失败：自动重试 1 次（换种子）
  ├─ L2 硬失败：切换 DeepSeek-V3.1 备份模型
  └─ L3 熔断：error_alert → Human 决定 rescue/abandon
```

### 5.2 时序甘特图

```
阶段  0    1    2    3    4    5    6    7    8    9
      ├────┤    │    │    │    │    │    │    │    │
T+0   Manager
T+10       Manager
T+15            ① MRD
T+50                 Manager
T+60                      Manager
T+65                           ② 产品
T+2h                               Manager
T+2h                                    Manager ──── spawn 3 路
T+2h05                                    │ ②'' 流程
                                           │ ②''' 数据
                                           │ ④ 页面
T+4h                                       Manager
T+4h05                                          ③ 质检
T+5h                                               Manager
T+5h30                                                  Manager → Human
```

**总耗时估算**：5 小时（中等复杂度 MRD）。其中：
- 串行段：T+0 至 T+2h（约 2 小时）
- 并发段：T+2h 至 T+4h（约 2 小时，节省 40% 时间）
- 质检段：T+4h 至 T+5h（1 小时）
- 人类介入：T+5h30+（异步）

---

## 6. 模型与可靠性

### 6.1 模型选型

| Agent | 主模型 | 备份模型 | maxTokens | timeout | retry |
|-------|--------|---------|-----------|---------|-------|
| Manager | DeepSeek-V3.2 | V3.1 | 8,192 | 60s | 0 |
| ① MRD 结构化 | DeepSeek-V3.2 | V3.1 | 32,768 | 600s | 1 |
| ② 产品组 | DeepSeek-V3.2 | V3.1 | 32,768 | 300s | 1 |
| ②'' 流程组 | DeepSeek-V3.2 | V3.1 | 32,768 | 300s | 1 |
| ②''' 数据组 | DeepSeek-V3.2 | V3.1 | 32,768 | 300s | 1 |
| ④ 页面组 | DeepSeek-V3.2 | V3.1 | 32,768 | 300s | 1 |
| ③ 质检 | DeepSeek-V3.2 | **V3.1** | 32,768 | 600s | 1 |

**关键设计**：
- ③ 质检节点禁用 thinking（速度优先）+ 备份 V3.1（可靠性优先）
- 5 个写作 Agent 启用 thinking（质量优先）
- ② 流程/数据/页面三类 JSON 输出节点 timeout 提到 300s（Chatflow 180s 偏紧）

### 6.2 3 级降级 + 熔断

```
        ┌────────────────────────────────────────┐
        │  L1 软失败                              │
        │  · 触发：JSON 解析失败 / 字段缺失       │
        │  · 处理：自动重试 1 次（换种子）        │
        │  · 恢复条件：重试成功 → 继续            │
        └────────┬───────────────────────────────┘
                 │ 失败
                 ▼
        ┌────────────────────────────────────────┐
        │  L2 硬失败                              │
        │  · 触发：L1 失败 / LLM 调用超时        │
        │  · 处理：切换备份模型（V3.1）+ 重试    │
        │  · 恢复条件：备份成功 → 继续            │
        └────────┬───────────────────────────────┘
                 │ 失败
                 ▼
        ┌────────────────────────────────────────┐
        │  L3 熔断                                │
        │  · 触发：L2 失败 / 3 轮 reject 不收敛  │
        │  · 处理：error_alert → Human           │
        │  · Human 决定：rescue / abandon / 调向  │
        └────────────────────────────────────────┘
```

### 6.3 可观测性

- **邮箱日志**：所有任务派发 / 完成 / 重试记录在 `mailboxes/`
- **completion.json**：每章节完成后写入 `{section, status, score, time, retry_count}`
- **熔断记录**：`workspace/manager/escalation_log.md`
- **trace_id 贯穿**：每个任务有唯一 trace_id，所有子 Agent 产物引用同一 trace_id

---

## 7. 质检体系

### 7.1 100 分制评分（5 维度）

| 维度 | 满分 | 评分规则 | 及格线 |
|------|------|---------|--------|
| **完整性** | 20 | 5 大章节齐全（各 4 分）+ 20 子模块齐全（每缺 1 扣 1 分） | 16 |
| **一致性** | 20 | 术语统一（5 分）+ 跨章节引用对齐（5 分）+ 流程闭环（5 分）+ 数值/ID 一致（5 分） | 16 |
| **可执行性** | 30 | 每条功能需求可写测试用例（10 分）+ 验收标准 SMART（10 分）+ 异常分支覆盖（5 分）+ 边界条件明确（5 分） | 24 |
| **风险标注** | 15 | 模糊词识别（5 分）+ TBD 标注（3 分）+ 异常分支（4 分）+ 范围蔓延信号（3 分） | 12 |
| **风格统一** | 15 | 术语一致（5 分）+ 句式一致（5 分）+ 排版统一（5 分） | 12 |
| **总分** | 100 | — | **80 分通过** |

### 7.2 多视角审查

| 视角 | 关注点 | 输出物 |
|------|--------|--------|
| **开发视角** | 功能可行性 / 边界条件 / 技术实现路径 | "开发侧 issue 清单" |
| **测试视角** | 可测性 / 异常处理 / 边界用例 | "测试侧 issue 清单" |
| **运营视角** | 业务流程闭环 / 用户场景契合 / 价值主张落地 | "运营侧 issue 清单" |

**3 视角各自输出 issue 清单** → 合并为 qa_report.md 的"具体段落 + 修改建议"部分。

### 7.3 触发规则

- 总分 < 80 → reject 重派对应 Agent
- 连续 3 轮 < 80 → error_alert → Human
- 5 维度中任一维度 < 及格线 → 强制 reject（即使总分 ≥ 80）
- 3 视角中任一视角 issue 数 > 阈值 → 强制 reject

---

## 8. 人类介入点

### 8.1 3 个介入点（单一接口原则）

| # | 介入点 | 触发条件 | Human 动作 | Manager 响应 |
|---|--------|---------|-----------|------------|
| 1 | **needs_clarify** | ① 标注"「注：推断依据」" ≥ 3 处；subsection 字段缺失；MRD 关键维度不全 | 在 `open_questions.md` 补全或回复邮件 | 收到后继续阶段 1 |
| 2 | **checkpoint_request** | PRD 中 `[TBD]` > 阈值；模糊词 ≥ 5 处；非功能需求出现 0 容错场景；多解需求 | 读 PRD 终稿 → confirm / reject + feedback | 确认 → 归档；拒绝 → 重派 |
| 3 | **error_alert** | 子 Agent 失败 ≥ 3 轮；JSON 解析持续失败；LLM 多次超时；qa_report 连续 3 轮不达标 | 决定 rescue / abandon / 调向 | 收到指令继续 |

### 8.2 自动触发规则

| 信号 | 计数 | 触发 |
|------|------|------|
| ① breakdown 中 `「注：推断依据」` 出现次数 | ≥ 3 | needs_clarify |
| `open_questions.md` 条目数 | ≥ 5 | needs_clarify |
| PRD 中 `[TBD]` 标记 | > 3 | checkpoint_request |
| PRD 中模糊词（"可能/大概/也许/或许"） | ≥ 5 处 | checkpoint_request |
| 同一 Agent 累计 reject | ≥ 3 轮 | error_alert |
| ③ qa_report 总分连续 | < 80 达 3 轮 | error_alert |
| LLM 调用失败 | L1+L2 都失败 | error_alert |

### 8.3 不在介入点内（Agent 完全自主）

- 工作区初始化
- 子 Agent 选择与排序
- 章节内部结构调整
- 验收标准措辞优化
- 模板复用
- 状态机内部逻辑

---

## 9. 关键技术决策

| # | 决策 | 备选 | 理由 | 课程依据 |
|---|------|------|------|---------|
| 1 | **1 主 + 5 子** | 1+7 / 1+3 | 5 个角色通过三维验证独立，PRD 写作流程的最细粒度 | L25 三维隔离判断法 |
| 2 | **③ 质检独立** | 合并到 ② 自检 | 7 倍准确率差距 | L23 BP-1 |
| 3 | **Manager 无写工具** | 允许写笔记 | 避免 Manager 下场污染验收 | L23 推论 |
| 4 | **单 Agent 上下文 < 30K** | 单 Agent 写 5 章节 | 避免 Context Rot（n² 注意力衰减） | L23 关键设计 ① |
| 5 | **Owner 唯一文件所有权** | 多 Agent 共享读写 | 37% 失败源于所有权歧义 | L26 反模式二 |
| 6 | **三态邮箱状态机** | read: bool 二态 | 崩溃恢复 / 补单机制 | L26 3.4 节 |
| 7 | **PRD5 单独成 Agent** | 合并到 ②' 工程组 | 占 54% 输出 / Soul 漂移 / 服务对象不同 | L25 三维判断法 |
| 8 | **章节级并发** | 全程串行 | 节省 40% 时间，前提是 outline 锁 | L23 关键设计 ② |
| 9 | **3 级降级** | 无降级 / 仅重试 | 平衡速度与可靠性 | L31 可靠性 |
| 10 | **GT 4 类独立沉淀** | 单一完整 PRD GT 库 | 100 条完整 PRD 占 200 万字，按类拆 ROI 更高 | L35 GT 价值 |
| 11 | **Markdown 中间态** | XML 中间态 | 天然可读，解析更可靠 | 工程实践 |
| 12 | **修复权归 Manager** | ③ 自检自修 | 避免"自检盲区" | L23 AP-2 全链放大 |

---

## 10. 风险与缓解

| # | 风险 | 严重度 | 缓解 |
|---|------|--------|------|
| 1 | Manager 规划失误导致全链放大 | 高 | Manager SOP 化所有决策（"qa_report 命中 X 模式 → 自动派修订"） |
| 2 | 子 Agent 越界（如 ② 写流程图） | 中 | NEVER 清单 + 工具层权限（② 写工具只允许 `prd/section_1_2.md`）+ ③ 质检二次检查 |
| 3 | 5 个 Agent 协调复杂度上升 | 中 | 严格中心调度 + 流程型职责 + Manager 验收 |
| 4 | 人类疲劳型确认（每个 TBD 都点 yes） | 中 | checkpoint 数量限制（每段 ≤ 2 个）+ 高风险 TBD 单独标红 |
| 5 | GT 库初期不足导致 PRD 模板僵化 | 中 | 先 20 条 MVP 验证 → 后续每完成 1 个 PRD 沉淀 1 条 |
| 6 | 章节级并发冲突（接口命名/数据格式） | 中 | 强制 outline 锁（Manager 验收 outline 后才允许并发） |
| 7 | PRD5 模板库未沉淀导致 ④ 质量不稳定 | 中 | ④ 启动前必须有 5+ 套页面模板（CRUD/表单/列表/详情/统计） |
| 8 | 模型降级导致质量波动 | 低 | L2 备份模型用 V3.1（同系列，质量差异 < 5%） |

---

## 11. 落地路线图（12 周）

### 阶段 1：基础工程（Week 1-3）

| 周 | 任务 | 交付物 |
|----|------|--------|
| 1 | 搭建 v1 骨架（1 主 + 3 子：Manager / ① / ② / ③） | v1 可跑通基础链路 |
| 2 | 沉淀 Chatflow 5 章节 SOP（吸收到 ② Skills） | `skills/product_team/section_*.md` |
| 3 | 搭建共享工作区 + 邮箱协议 + Watchdog | `shared/` 结构 + 邮箱收发机制 |

**里程碑 1**：能用 v1 跑 1 个简单 MRD 产出 PRD（不保证质量）。

### 阶段 2：质量提升（Week 4-6）

| 周 | 任务 | 交付物 |
|----|------|--------|
| 4 | 引入 GT 样本（20 条） | `gt_samples/product/` 起步 |
| 5 | ③ 质检 100 分制评分 | `skills/qa_team/scoring_engine` |
| 6 | 3 级降级 + 熔断机制 | `skills/manager/level3_fallback` |

**里程碑 2**：v1 跑 5 个不同 MRD，质量稳定达到 80 分。

### 阶段 3：拆分到 v2（Week 7-9）

| 周 | 任务 | 交付物 |
|----|------|--------|
| 7 | 拆 ② 为产品组（PRD1+2）+ 工程组（PRD3+4+5） | 5 个子 Agent 雏形 |
| 8 | 沉淀 handoff 协议 + 流程型职责边界 | `handoff_*.md` 模板 |
| 9 | 章节级并发（PRD3 独立并发） | 并发链路稳定 |

**里程碑 3**：v2 跑 3 个真实 MRD，时间比 v1 节省 30%。

### 阶段 4：拆出 PRD5（Week 10-12）

| 周 | 任务 | 交付物 |
|----|------|--------|
| 10 | 拆 ②' 为 ②'' 流程 + ②''' 数据 + ④ 页面 | 6 个 Agent（1 主 + 5 子） |
| 11 | 沉淀 ④ 页面模板库（5+ 套） | `page_templates/` |
| 12 | 整体回归 + 端到端 benchmark | benchmark 报告 |

**里程碑 4**：v3 跑 5 个真实 MRD，时间比 v2 节省 40%，质量稳定 85+ 分。

### 后续迭代

- **持续沉淀 GT 库**：20 → 50 → 100 条
- **可观测性升级**：接 Langfuse（参考课程 L30）
- **持续集成**：CI 跑 5 维度质检
- **多端适配**：v3.1 支持 Web/App/桌面可配置化
- **错误注入测试**：覆盖所有介入点

---

## 12. 附录

### 12.1 MRD 模板（5 大模块）

```
1 市场分析
  1.1 行业概况（市场规模 / 发展阶段 / PEST）
  1.2 市场问题与机会（核心痛点 / 机会点）
2 用户分析
  2.1 用户画像（企业属性 / 角色属性 / 行为特征 / 目标与痛点）
  2.2 场景分析（典型场景 / 任务流程 / 痛点）
3 竞争分析（直接竞品 / 差异化优势）
4 产品规划
  4.1 产品定位（产品名 / 一句话定义 / 价值主张）
  4.2 功能规划（功能模块清单 / 优先级 / 关联关系）
  4.3 非功能需求（性能 / 安全 / 可扩展性 / 合规 / 部署）
  4.4 实施路线（里程碑 / 风险评估）
```

### 12.2 PRD 模板（5 大模块 / 20 子模块）

```
1 产品概述（② 产品组）
  1.1 产品名称与定位
  1.2 产品应用语言
  1.3 产品愿景与目标
  1.4 产品使用终端
  1.5 核心价值主张
  1.6 目标用户群体分析
  1.7 市场需求与竞品简析
  1.8 浏览器兼容性要求

2 功能规格（② 产品组）
  2.1 功能详述（功能 ID / 名称 / 描述 / 优先级 / 验收点）
  2.2 功能模块间的关系图

3 流程设计（②'' 流程组）
  3.1 用户旅程地图
  3.2 业务流程图（Mermaid）
  3.3 操作步骤

4 数据流建模（②''' 数据组）
  4.1 数据模型（ER 图 + 表结构）
  4.2 数据流转规则
  4.3 数据存储与安全

5 页面规格设计（④ 页面组）
  5.1 页面结构（含 Mermaid 跳转图）
  5.2 交互规范（5 状态：空/加载/错误/权限/成功）
```

### 12.3 MRD → PRD 字段映射

| PRD 字段 | MRD 来源 | 推导规则 | 负责 Agent |
|---------|---------|---------|-----------|
| 1.1-1.8 产品概述 | 1.1+1.2+2.1+2.2+3+4.1 | 4 维映射（市场/用户/产品/竞品） | ② 产品组 |
| 2.1 功能详述 | 1.5 价值主张 + 2.1 用户 | 价值动作 → 功能关键词 + P0~P3 | ② 产品组 |
| 2.2 功能关系图 | 4.2 功能规划 | 关联关系 → 节点/连线 | ② 产品组 |
| 3.1 用户旅程地图 | 2.2 场景 + 1.6 | 场景→阶段；功能→行为 | ②'' 流程组 |
| 3.2 业务流程图 | 2.1+2.2+4.3 | Mermaid，必含审批/校验/数据更新 | ②'' 流程组 |
| 3.3 操作步骤 | 3.1+3.2 | 拆解流程 | ②'' 流程组 |
| 4.1 数据模型 | 4.3 非功能需求 | 实体识别 / 关系 / 字段 | ②''' 数据组 |
| 4.2 数据流转规则 | 2.1+4.3 | 跨模块数据流 | ②''' 数据组 |
| 4.3 数据存储与安全 | 4.3 非功能需求 | 加密/脱敏/审计/合规 | ②''' 数据组 |
| 5.1 页面结构 | 2.1+1.6+2.1 | 页面框架 + Mermaid 跳转 | ④ 页面组 |
| 5.2 交互规范 | 2.1+3.3+2.1 | UI 行为约束 + 5 状态 | ④ 页面组 |

### 12.4 完整数据流（5 个 PRD 字段组 + 30 个结构化变量）

```
MRD (input)
  ↓ ① MRD 结构化
9 字段 + 47 需求 + 开放问题 + 术语表
  ↓ ② 产品组
PRD_1.x (8 个) + PRD_2.x (2 个) + feature_id_list.md + handoff_2to3.md
  ↓ ②'' 流程组 (并发)
PRD_3.x (3 个) + handoff_34.md
  ↓ ②''' 数据组 (并发)
PRD_4.x (3 个) + handoff_45.md
  ↓ ④ 页面组 (并发)
PRD_5.x (2 个)
  ↓ 拼装
prd_draft.md
  ↓ ③ 质检
qa_report.md (100 分制 + 3 视角 issue 清单)
  ↓ Manager 决策
prd_final.md (归档)
```

### 12.5 与课程 v1 框架的差异表

| 维度 | 课程 v1 | v3（本设计） | 变化原因 |
|------|--------|------------|---------|
| 角色数 | 1+3 | 1+5 | 单 Agent 上下文临界 + Soul 漂移 |
| PRD 章节 | 5 章 | 5 章（拆给 4 个 Agent） | 章节级并发 + 服务对象差异 |
| 流程形态 | 全串行 | outline 锁后章节级并发 | 节省 40% 时间 |
| GT 库 | 50 条完整 | 4 类分库（30+20+20+50） | 沉淀 ROI 更高 |
| 中间态 | Markdown | Markdown | 工程一致 |
| 质检 | 形式化 | 100 分制 + 3 视角 | 可量化 |
| 修复权 | 自检自修 | Manager 派修订 | 避免盲区 |

---

## 13. 致谢与参考

- 课程：极客时间《企业级多智能体设计实战》第 23-40 课
- 工程：Coze Chatflow `PRD_llms_1-draft.yaml`
- 设计原则：Orchestrator 范式 / 三维隔离判断法 / 上下文工程 / GT 驱动
- 方法论附录：[MRD转PRD-推导方法论设计.md](./MRD转PRD-推导方法论设计.md) （附录 A · 推导方法论 v1.0）

---

> **下一步**：基于本设计，进入主-子 Agent 配置文档撰写（每个 Agent 的 prompt 模板 / 工具清单 / NEVER 清单 / Skills 内容骨架 / 邮件模板）
