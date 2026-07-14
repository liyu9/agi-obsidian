# OpenViking 企业内多 Agent 使用方案

> 文档版本：v2（基于前序调研 + 3 项优化）
> 适用范围：公司内部 Agent（个人 + 团队共用）
> 技术栈：OpenViking + 自建中间层

---

## 目录

- 第一部分：OpenViking 存储模式（背景）
- 第二部分：需求梳理
- 第三部分：对应方案（优化版）
  - 3.1 整体架构（优化 1）—— 双轨区分
  - 3.2 两类 Agent 对照
  - 3.3 中间层双轨处理
  - 3.4 memories 与 resources 的区别（优化 2）
  - 3.5 共享信息存放矩阵
  - 3.6 从用户信息中提取共享信息的完整通路（优化 2）
  - 3.7 团队 Agent 的记忆/资源/技能配置（优化 3）
  - 3.8 各层配置规则
  - 3.9 团队共享技能的配置流程
  - 3.10 团队 Agent 的初始化配置清单
  - 3.11 共享与私有的边界
  - 3.12 数据流转主链路
  - 3.13 过程隔离（Q1=B 落地）
  - 3.14 4 类冲突解决
  - 3.15 归纳规则（5 条）
  - 3.16 归纳写入策略
  - 3.17 权限模型
  - 3.18 离职与变动
  - 3.19 resources 组织规范
  - 3.20 resources 生命周期
  - 3.21 完整规则集（32 条）
  - 3.22 中间层职责（3 模块）
  - 3.23 成熟度与风险
  - 3.24 待定参数

---

## 第一部分：OpenViking 存储模式（背景）

### 1.1 核心范式

OpenViking 是字节跳动火山引擎开源的 **AI Agent 上下文数据库**，采用**文件系统范式**统一管理 Memory / Resources / Skills，通过 `viking://` 协议组织。

```
viking://
├── resources/              ← 知识库（项目文档、代码库、网页等）
├── user/{user_id}/         ← 用户空间
│   ├── memories/           ← 记忆（偏好、对话历史、经验）
│   ├── resources/          ← 用户私有资源
│   ├── skills/             ← 技能（必须挂在 user 下）
│   ├── sessions/           ← 会话
│   └── peers/{peer_id}/    ← 交互对象（Agent 身份）
│       └── memories/
```

### 1.2 三层身份模型

| 身份 | 含义 | 隔离作用 |
|---|---|---|
| `account_id` | 最外层租户边界 | 不同 account 完全隔离，连检索都搜不到 |
| `user_id` | account 内用户边界 | account 内 resources/skills 共享，memories 按 user 隔离 |
| `peer_id` | user 下的交互对象（Agent 身份） | user 边界内的内容子空间 |

### 1.3 数据类型与共享边界

| 数据类型 | 跨 account | account 内 | 默认隔离边界 |
|---|---|---|---|
| 共享资源 `resources` | 否 | **是** | account |
| 用户资源 `user/{uid}/resources` | 否 | 否 | user |
| 共享技能 `user/{uid}/skills` | 否 | **否** | user |
| Peer 资源 `user/{uid}/peers/{pid}/...` | 否 | 否 | user/peer |
| 记忆 memories | 否 | 否 | user/peer |
| 会话 sessions | 否 | 否 | user/session |

> 注意：skills 必须挂在 user 下，**按 user 隔离，不跨 user 共享**——这是团队共享技能设计的关键约束。

### 1.4 LOD 分层加载

L0 摘要（~100 tokens）/ L1 概览（~2k tokens）/ L2 详情（全文）——按需加载。

### 1.5 resources vs memories

| 维度 | resources | memories |
|---|---|---|
| 定位 | 知识源（静态、权威） | 派生记忆（动态、可变） |
| 写入 | 显式 `add`，走 Parser→向量化流水线 | 会话结束自动提取，schema 驱动 |
| 共享性 | account 内全员共享 | 默认按 user/peer 隔离 |
| schema | 无固定分类 | preferences/writing_style/trajectories/experiences 等 |

### 1.6 鉴权与角色

**三种鉴权模式**：

| 模式 | 身份来源 | 场景 |
|---|---|---|
| `api_key` | API Key 反解 user_id | 标准多租户 |
| `trusted` | `X-OpenViking-Account`/`User` header | 受信网关，逐请求切 account |
| `dev` | 无认证，始终 ROOT | 仅本地 |

**三级角色**：

| 角色 | 作用域 | 能力 |
|---|---|---|
| ROOT | 全局 | 全部 + Admin API |
| ADMIN | 所属 account | 常规 + 管本 account 用户 |
| USER | 所属 account | 常规读写 |

### 1.7 部署形态

Docker / K8s+Helm / Systemd / 云原生 / 私有化本地 / SaaS 托管

### 1.8 成熟度（诚实标注）

- 项目 2026-01 开源，仅半年，0.4.0 刚重构 user/peer 模型
- 主项目 License **AGPL-3.0**（商用需法务确认）
- 社区无完整的企业多 agent 生产案例

---

## 第二部分：需求梳理

### 2.1 场景边界

- 公司内部落地的 Agent（非对外、非多客户）
- 分两类：**个人 Agent**、**团队 Agent**
- 团队 Agent **多人共用**

### 2.2 核心诉求

| # | 诉求 | 确认内容 |
|---|---|---|
| 1 | 隔离 | 个人 Agent 记忆仅本人可见；团队 Agent 记忆团队内共享 |
| 2 | 过程隔离+结果共享 | **Q1=B**：个人会话隔离，归纳后才进团队记忆；最终记忆/知识**仅负责人/有权限者**可看 |
| 3 | 多人冲突 | **Q2：4 类都担心**——记忆矛盾、操作竞争、隐私串扰、资源占用 |
| 4 | account 区分 | **Q4**：用 account 区分 Agent，无公司级共享层；自建中间层给 Agent 授权访问多 account |
| 5 | 归纳规则 | **Q3：未有**，已采纳 5 条规则（共识/权威/冲突/时效/隐私） |
| 6 | 离职/变动 | **Q5**：由负责人查看、操作 |
| 7 | 技术栈 | 已确定用 OpenViking |

### 2.3 关键决策

| 决策点 | 结论 |
|---|---|
| account vs user 映射团队 | **用 account 区分 Agent**（强隔离），团队 account 内用 user 区分成员 |
| 团队 account 内是否用 user 区分成员 | **是（B1 混合方案）**：成员 user + team-shared 虚拟 user |
| 归纳写入策略 | **低风险自动写入，冲突项审批** |
| 团队记忆放 resources | **仅放已归纳为知识的部分**，动态记忆先在 memories |
| 团队共享技能 | **放 `user/team-shared/skills/`**（因 skills 按 user 隔离） |

---

## 第三部分：对应方案（优化版）

### 3.1 整体架构（优化 1 后）—— 双轨区分

```
                            公司员工
                               │
                  ┌────────────┴────────────┐
                  ▼                         ▼
            个人 Agent                    团队 Agent
            (agent-alice)                 (agent-teamX)
                  │                         │
                  │ 唯一成员=Alice          │ 成员 A/B/C + 负责人
                  │                         │
                  ▼                         ▼
       ┌──────────────────┐      ┌──────────────────────┐
       │ account=         │      │ account=             │
       │ agent-alice      │      │ agent-teamX          │
       │                  │      │ ADMIN=负责人         │
       │ ┌──────────────┐ │      │ ┌──────────────────┐ │
       │ │ user/alice/  │ │      │ │ user/alice/      │ │
       │ │  ├memories/  │ │      │ │  ├session/       │ │
       │ │  ├resources/ │ │      │ │  ├memories/(私有)│ │
       │ │  ├skills/    │ │      │ │  └peers/agent/   │ │
       │ │  └peers/     │ │      │ ├user/bob/(同上)   │ │
       │ │    └my-agent/│ │      │ ├user/carol/(同上) │ │
       │ └──────────────┘ │      │ ├user/team-shared/ │ │
       │                  │      │ │  ├memories/(共享)│ │
       │                  │      │ │  ├skills/(共享)  │ │
       │                  │      │ │  └resources/(共享)│ │
       │                  │      │ ├resources/(共享)  │ │
       │                  │      │ │  ├team-wiki/     │ │
       │                  │      │ │  ├docs/          │ │
       │                  │      │ │  └external/      │ │
       │                  │      │ └_archive/         │ │
       └──────────────────┘      └──────────────────────┘
                  ▲                         ▲
                  │                         │
       ┌──────────┴─────────────────────────┴──────────┐
       │              中间层（网关 + 授权 + 归纳调度）     │
       │  ┌──────────┐  ┌────────────┐  ┌────────────┐ │
       │  │ 鉴权模块  │  │account路由 │  │归纳调度器  │ │
       │  │SSO校验   │  │agent→授权  │  │定时扫临时区│ │
       │  │成员身份  │  │account列表 │  │跑5条规则   │ │
       │  │          │  │            │  │冲突检测+过滤│ │
       │  └──────────┘  └────────────┘  │审批→写入  │ │
       │                                └────────────┘ │
       │  [个人通路：透传 user key]                       │
       │  [团队通路：trusted模式 + actor 注入]            │
       └─────────────────────────────────────────────────┘
```

### 3.2 两类 Agent 对照（架构差异清晰化）

| 维度 | 个人 Agent（agent-alice） | 团队 Agent（agent-teamX） |
|---|---|---|
| account | 独立 account，仅本人持有 user key | 独立 account，负责人持 ADMIN |
| user 划分 | 仅 1 个 user（Alice 自身） | 多成员 user + 1 个 team-shared 虚拟 user |
| memories | 全部归 Alice 私有 | 三层：成员私有 / team-shared 共享 / resources 升格 |
| resources | Alice 私有资源 | 团队共享知识库（team-wiki/docs/external） |
| skills | Alice 私有技能 | 团队共享技能（放 team-shared/skills） |
| 中间层 | 可选透传 | 必建（鉴权 + account 路由 + 归纳调度） |
| 负责人 | Alice 本人 | 团队负责人（ADMIN） |
| 离职处理 | Alice 账户自己处理 | 负责人按 R21 操作 |

### 3.3 中间层双轨处理

```
中间层
├── 个人 Agent 通路
│   └── 透传个人 user key，无多 account 路由
└── 团队 Agent 通路
    ├── 鉴权（成员→该团队 Agent 的访问授权）
    ├── account 路由（trusted 模式注入 teamX account）
    ├── actor 注入（X-OpenViking-Actor-Peer 标识实际操作成员）
    └── 归纳调度器
```

### 3.4 memories 与 resources 的区别（优化 2 后）—— 三层职责清晰

| 层级 | 空间 | 存放内容 | 数据特征 | 写入者 |
|---|---|---|---|---|
| **过程隔离层** | `user/{成员}/session/{sid}/` | 当前会话上下文 | 临时、私密 | 成员会话 |
| **动态经验层** | `user/team-shared/memories/` | 团队协作中的新发现、讨论结论、经验教训 | 动态、可变、近期相关 | 归纳调度器（R9/R10/R11 触发） |
| **静态知识层** | `viking://resources/` | 已稳定的决策、规范、FAQ、复盘 | 静态、权威、可复用 | 归纳调度器（R16 升格） + 人工上传 + 负责人声明 |

**核心区分**：
- **memories** 是"刚发生的、可能还会变的事实"（例：上周讨论待定、初步方案）
- **resources** 是"已确定的、长期生效的知识"（例：最终决策、规范、FAQ）
- 两者是同一信息的不同生命周期阶段，而非互斥

### 3.5 共享信息存放矩阵

| 共享信息类型 | 归属空间 | 理由 |
|---|---|---|
| 团队决策（已通过） | `resources/team-wiki/decisions/` | 静态权威知识 |
| 团队规范/约定 | `resources/team-wiki/conventions/` | 长期生效 |
| 高频 FAQ | `resources/team-wiki/faq/` | 稳定可复用 |
| 经验复盘 | `resources/team-wiki/experiences/` | 沉淀为知识 |
| 新近共识（待沉淀） | `user/team-shared/memories/` | 动态，过 30 天可考虑升格 |
| 权威声明但未达高频 | `user/team-shared/memories/` | 负责人声明（R10），暂未升格 |
| 团队共享技能 | `user/team-shared/skills/` | skills 必须挂 user 下 |
| 团队私有共享资源 | `user/team-shared/resources/` | 不放顶层 resources 时 |
| 临时讨论、过程 | `user/{成员}/session/` | 不共享，会话结束清理 |

### 3.6 从用户信息中提取共享信息的完整通路（优化 2 后）

```
成员会话产生
    │
    ▼
[阶段1：会话级沉淀]（OpenViking 原生，自动）
会话结束 → memory_extractor 自动提取 → 写入 user/{成员}/memories/
    │
    ▼
[阶段2：定时扫描]（归纳调度器，cron）
定时触发（如每小时）→ 扫所有成员的 user/{成员}/memories/
    │
    ▼
[阶段3：规则判定]（归纳调度器）
逐条跑 5 条规则：
  R9  共识：≥3 成员/次会话指向同事实
  R10 权威：含负责人标识
  R11 冲突：与已有共享信息矛盾
  R12 时效：已有共享信息过 30/90 天
  R13 隐私：含个人敏感关键词/字段
    │
    ├── R13 命中 → 留在原成员 user，不共享
    ├── R11 命中 → 标记冲突，进审批队列
    ├── R9+R10 命中 + 无 R11/R13 → 低风险自动
    └── 无规则命中 → 不处理
    │
    ▼
[阶段4：写入]
低风险自动 → user/team-shared/memories/
冲突审批 → 负责人审批后 → user/team-shared/memories/
    │
    ▼
[阶段5：升格判定]（R16）
team-shared 中某条 ≥10次/月召回 或 负责人标记
    │
    ▼
升格 → resources/team-wiki/{decisions|conventions|faq|experiences}/
```

**关键点**：
- 阶段 1 由 OpenViking 原生 memory_extractor 完成
- 阶段 2-5 由自建归纳调度器完成
- 提取粒度从"个人偏好"到"团队共识"，由 5 条规则共同决定

### 3.7 团队 Agent 的记忆/资源/技能配置（优化 3 后）

**核心约束**：OpenViking 的 skills 必须挂在 user 下、**按 user 隔离**，因此团队共享技能必须放 `user/team-shared/skills/`。

```
account=agent-teamX
│
├── user/{成员}/                       ← 成员私有空间
│   ├── memories/                     ← 该成员的私有偏好、记忆
│   ├── resources/                    ← 私有资源
│   ├── skills/                       ← 该成员私有技能
│   └── peers/agent/                  ← Agent 与该成员的交互记忆
│       └── memories/
│
├── user/team-shared/                 ← 团队虚拟 user（共享空间）
│   ├── memories/                     ← 团队共享记忆（R9/R10 写入）
│   ├── resources/                    ← 团队私有共享资源
│   └── skills/                       ← 团队共享技能（放这里！）
│
└── resources/                        ← account 内全员可读的静态知识
    ├── team-wiki/                    ← 升格的团队知识
    ├── docs/                         ← 人工上传业务文档
    ├── external/                     ← 外部资料
    └── _archive/                     ← 归档区
```

### 3.8 各层配置规则

| 数据类型 | 空间 | 配置内容 | 写入者 |
|---|---|---|---|
| 记忆 | `user/{成员}/memories/` | 成员个人偏好、私人上下文 | 会话结束自动提取 |
| 记忆 | `user/team-shared/memories/` | 团队共识、权威声明、待沉淀动态经验 | 归纳调度器 |
| 记忆 | `user/{成员}/peers/agent/memories/` | Agent 与该成员的交互经验 | Agent 运行时 |
| 资源 | `viking://resources/team-wiki/` | 已归纳升格的团队知识 | 归纳调度器 R16 + 负责人 |
| 资源 | `viking://resources/docs/` | 业务文档 | 人工上传 |
| 资源 | `user/team-shared/resources/` | 仅团队成员可见的资源 | 负责人 + ADMIN |
| 资源 | `user/{成员}/resources/` | 成员私有资源 | 成员 |
| 技能 | `user/team-shared/skills/` | **团队共享技能（核心）** | 负责人 + ADMIN |
| 技能 | `user/{成员}/skills/` | 成员私有技能 | 成员 |

### 3.9 团队共享技能的配置流程

**场景：给团队 Agent 添加"支付对账"技能**

```
1. 负责人编写技能描述（SKILL.md）
   └── 路径：viking://user/team-shared/skills/payment-reconcile/

2. 负责人用 ADMIN 权限 add 到 team-shared user
   └── 验证：团队所有成员调用时可见

3. 技能调用时，OpenViking 按调用者 user 检索技能
   └── 成员 A 调 agent-teamX
       └── OpenViking 在 user/A/skills/ + user/team-shared/skills/ 检索
       └── 找到团队共享技能，加载到上下文
```

### 3.10 团队 Agent 的初始化配置清单

| 步骤 | 动作 | 空间 |
|---|---|---|
| 1 | 创建 account `agent-teamX` | OpenViking |
| 2 | 创建成员 user（A/B/C） | `user/{成员}/` |
| 3 | 创建 team-shared user | `user/team-shared/` |
| 4 | 设置负责人为 ADMIN | ADMIN role |
| 5 | 配置团队共享技能 | `user/team-shared/skills/` |
| 6 | 上传团队初始业务文档 | `viking://resources/docs/` |
| 7 | 配置归纳规则参数 | 中间层配置 |
| 8 | 接入成员 | 中间层授权成员访问该 Agent |

### 3.11 共享与私有的边界（不混淆）

| 边界 | 规则 |
|---|---|
| 私有记忆 | 永远在成员 user 下，永不进 team-shared/resources |
| 私有资源 | 成员 user 下，成员自己决定 |
| 团队共享记忆 | 仅在 team-shared/memories，归纳规则触发 |
| 团队共享资源 | team-shared/resources 或顶层 resources（按可见范围） |
| 团队共享技能 | **仅** team-shared/skills（OpenViking 设计约束） |
| 团队知识库 | 仅顶层 resources/team-wiki/（升格知识） |

### 3.12 数据流转主链路

```
成员会话（临时，session隔离）
    │ 会话结束自动提取
    ▼
成员私有 memories（user/{成员}/memories/）     ← 个人偏好等，不共享
    │ 归纳调度器跑规则
    ▼
团队共享 memories（user/team-shared/memories/） ← 共识/权威，低风险自动/冲突审批
    │ R16升格（高频/标记）
    ▼
团队知识库（resources/team-wiki/）             ← 静态知识，account内全员可检索
    +
负责人直接 add → resources/docs/             ← 权威知识
```

### 3.13 过程隔离（Q1=B 落地）

- 每次会话独立 session_id，只读写 `user/{成员}/session/{sid}/`
- 会话可只读 `resources/` 和 `team-shared/memories/`
- 成员私有记忆不进 team-shared
- Agent 回答只能引用：当前会话 + 该成员私有 + team-shared + resources

### 3.14 4 类冲突解决

| 冲突 | 解决机制 | 落点 |
|---|---|---|
| C1 记忆矛盾 | 归纳时检测 + 负责人裁决，优先级：权威>共识>个体 | 归纳调度器 |
| C2 操作竞争 | resource 版本号 + 乐观锁 | OpenViking resource 写入 |
| C3 隐私串扰 | 会话级隔离 + 私有不共享 + 归纳时敏感过滤 | session + 归纳调度器 |
| C4 资源占用 | 会话 token 配额 + LOD 分层加载 + 超额压缩 | 中间层 + OpenViking |

### 3.15 归纳规则（5 条）

| 规则 | 条件 | 动作 |
|---|---|---|
| R9 共识 | 同一事实被 ≥3 成员/次会话指向 | 升格 team-shared（低风险自动） |
| R10 权威 | 负责人（ADMIN）声明 | 直接升格 team-shared（自动） |
| R11 冲突 | 同一事实出现矛盾值 | 标记，进负责人审批队列 |
| R12 时效 | team-shared 中某条 30 天未召回 | 降权；90 天未召回归档 |
| R13 隐私 | 含个人敏感信息 | 不进 team-shared，留成员 user |

### 3.16 归纳写入策略

- **低风险自动写入**：满足 R9/R10 + 无冲突（R11）+ 无隐私（R13） → 自动写 team-shared
- **冲突审批**：触发 R11 → 进负责人审批队列，7 工作日未审批保留标记不写入
- **升格 resources**：team-shared 中某条被高频召回（≥10次/月）或负责人标记 → 升格 resources

### 3.17 权限模型

| 角色 | 权限 |
|---|---|
| 普通成员 | 读写自己 user + 只读 resources/team-shared + 禁止访问他人 user |
| 负责人（ADMIN） | 全 user 读写 + 审批 + 成员管理（入职/离职） |
| 中间层 | ROOT/trusted 模式，按授权矩阵路由，注入操作者身份 |

### 3.18 离职与变动

- **成员离职**：session 删除；memories 由负责人查看后决定保留/删除/上交；已进 team-shared 的保留；操作日志保留
- **成员变动**：原团队按离职处理，新团队新建 user
- **负责人变更**：旧 ADMIN 权限收回，新 ADMIN 授予

### 3.19 resources 组织规范

```
viking://resources/
├── team-wiki/           ← 归纳升格（decisions/faq/conventions/experiences）
├── docs/                ← 人工上传业务文档（按业务域/项目分）
├── external/            ← 外部导入资料
└── _archive/            ← 归档区（按月份）
```

升格文档格式：YAML metadata（title/type/source/owner/confidence/origin_memory/contributors/tags） + 结构化正文（背景/核心内容/适用场景/来源依据）。

### 3.20 resources 生命周期

```
active（生效） → stale（过期） → archived（归档） → deleted（删除）
```

- 过时：移 `_archive/`，新文档标注 `supersedes`
- 矛盾：进负责人审批，不自动覆盖
- 高频变更（30 天 ≥3 次）：降级回 memories
- 90 天未召回：归档；180 天确认删除
- 来源失效（离职）：不自动删，负责人审查

### 3.21 完整规则集（32 条）

| 类别 | 规则编号 | 数量 |
|---|---|---|
| 身份与空间 | R1-R3 | 3 |
| 访问权限 | R4-R6 | 3 |
| 过程隔离 | R7-R8 | 2 |
| 归纳规则 | R9-R13 | 5 |
| 归纳写入 | R14-R16 | 3 |
| 冲突解决 | R17-R20 | 4 |
| 离职变动 | R21-R23 | 3 |
| 审计 | R24-R25 | 2 |
| 版本管理 | R26-R29 | 4 |
| 定期维护 | R30-R32 | 3 |

### 3.22 中间层职责（3 模块）

1. **鉴权**：SSO 校验成员身份 + 判断是否有权用该团队 Agent
2. **account 路由**：按授权矩阵，trusted 模式注入对应 account
3. **归纳调度器**：定时扫临时区 → 跑规则 → 冲突检测 → 审批 → 写入

### 3.23 成熟度与风险（诚实标注）

| 部分 | 成熟度 | 风险 |
|---|---|---|
| OpenViking 原生能力 | 官方文档+示例验证 | 低（API 可能变） |
| team-shared 虚拟 user | 符合语义但无先例 | 中（需 PoC 验证） |
| 归纳调度器 | 行业有类似但 OpenViking 无原生 | 中高（需自建） |
| 冲突审批 | 行业有思路，OpenViking 无原生 | 高（需自建） |
| 中间层多 account 授权 | 机制推断无案例 | 高（需 PoC 验证） |

**结论**：方案在 OpenViking 能力边界内自洽，但属"无人走过的组合路径"，需 PoC 验证关键环节。

### 3.24 待定参数

1. 每会话 token 配额上限（R20）
2. 审计日志保留期（R24，建议≥180 天）

---

## 附录：版本记录

| 版本 | 日期 | 变更 |
|---|---|---|
| v1 | 2026-07-07 | 初版，含 32 条规则 + 整体架构 |
| v2 | 2026-07-07 | 3 项优化：① 整体架构区分个人/团队双轨 ② memories/resources 三层职责 + 提取通路 ③ team-shared 下的记忆/资源/技能配置 |
