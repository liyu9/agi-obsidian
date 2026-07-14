# PRD生成 Agent 集群设计方案

> 基于《企业级多智能体设计实战》L01/L03/L19/L23/L25/L26/L27/L30/L31方法论 + 《决胜B端》解决方案设计框架，覆盖 0-1 / 1-n 双场景。
>
> 两个 Agent 集群分开设计，共享同一套治理层（Bootstrap、Hook、共享工作区、可靠性策略、人类介入协议）。

---

## 目录

- [一、0-1 场景 PRD 生成 Agent 集群](#一0-1-场景-prd-生成-agent-集群)
  - [1.1 架构骨架](#11-架构骨架)
  - [1.2 角色清单（7个Agent）](#12-角色清单7个agent)
  - [1.3 每个Agent详细配置](#13-每个agent详细配置)
    - [Manager](#manager)
    - [Arch Designer（串行前置）](#arch-designer串行前置)
    - [5个Writer（并行派发）](#5个writer并行派发)
    - [Reviewer（独立验收）](#reviewer独立验收)
  - [1.4 协作流程（端到端）](#14-协作流程端到端)
  - [1.5 三层处理事项](#15-三层处理事项)
    - [架构层](#架构层)
    - [Agent设计层](#agent设计层)
    - [上下文管理层](#上下文管理层)
  - [1.6 设计亮点](#16-设计亮点)
  - [1.7 上线效果预估](#17-上线效果预估)
- [二、1-N 场景 PRD 生成 Agent 集群](#二1-n-场景-prd-生成-agent-集群)
  - [2.1 架构骨架](#21-架构骨架)
  - [2.2 角色清单（8个节点 = 5代码 + 3单Agent + 1Manager）](#22-角色清单8个节点--5代码--3单agent--1manager)
  - [2.3 每个Agent/节点详细配置](#23-每个agent节点详细配置)
    - [Manager](#manager-1)
    - [InfoCollector（仅收集）](#infocollector仅收集)
    - [Validator（仅校验）](#validator仅校验)
    - [AssetLibrarian（仅检索+标注）](#assetlibrarian仅检索标注)
    - [ConflictDetector（仅冲突分析）](#conflictdetector仅冲突分析)
    - [PRDWriter（单次+多轮优化）](#prdwriter单次多轮优化)
    - [Reviewer（独立验收）](#reviewer独立验收-1)
    - [代码节点（4个，零LLM成本）](#代码节点4个零llm成本)
  - [2.4 协作流程（端到端管线）](#24-协作流程端到端管线)
  - [2.5 三层处理事项](#25-三层处理事项)
    - [架构层](#架构层-1)
    - [Agent设计层](#agent设计层-1)
    - [上下文管理层](#上下文管理层-1)
  - [2.6 设计亮点](#26-设计亮点)
  - [2.7 上线效果预估](#27-上线效果预估)
- [三、两个集群的关系](#三两个集群的关系)

---

## 一、0-1 场景 PRD 生成 Agent 集群

> **场景定位**：从0到1构建新产品/新模块。输入为非结构化MRD文本（含市场分析、用户分析、竞争分析、产品规划），输出为标准化PRD文档（5大模块）。
>
> **架构范式**：Orchestrator 范式（主Agent+子Agent）——业务熵高、并行价值大、流程可标准化。

### 1.1 架构骨架

```
┌──────────────────────────────────────────────────────────────────┐
│                    0-1 PRD生成 Agent 集群                          │
└──────────────────────────────────────────────────────────────────┘
                          │
        ┌─────────────────▼─────────────────┐
        │  Manager（Orchestrator，常驻）     │
        │  · Bootstrap 4件套 + SOP as Skill │
        │  · 工具：spawn×2 / FileRead / 邮箱 │
        │  · NEVER：亲自写PRD/跳过澄清/跳过验收│
        └────┬────────────────────┬─────────┘
             │                    │
   ┌─────────▼────────┐  ┌────────▼─────────┐
   │ 子Agent集群A     │  │ 子Agent集群B      │
   │（5个Writer并行） │  │（独立验收）        │
   │ 串行前置：       │  │ Reviewer（质量）  │
   │ · Arch Designer │  │                   │
   └─────────┬────────┘  └────────┬─────────┘
             │                    │
   ┌─────────▼────────────────────▼─────────┐
   │       共享工作区 + 邮箱 + Hook框架       │
   │  needs/ arch/ writers/ review/ archive/ │
   │  mailboxes/  hooks.yaml  bootstrap/     │
   └──────────────────────────────────────────┘
                          │
        ┌─────────────────┼─────────────────┐
        │                 │                 │
   ┌────▼─────┐  ┌────────▼────────┐  ┌─────▼──────┐
   │ LLM网关   │  │ 知识库（RAG）   │  │ 对象存储    │
   │ 三级模型   │  │ 历史PRD+模板库  │  │ 归档库      │
   └──────────┘  └────────────────┘  └────────────┘
```

### 1.2 角色清单（7个Agent）

| # | 角色 | 类型 | 持久化 | 核心职责 |
|---|------|------|--------|---------|
| 1 | Manager | 主Agent | ✅ 跨session | 需求澄清、SOP调度、子Agent派发、Reviewer调度、归档 |
| 2 | Arch Designer | 子Agent | ❌ 任务级 | 产出 `api_spec.md`（共享规范，必须先于Writer） |
| 3 | Product Writer | 子Agent | ❌ 任务级 | 生成"产品概述"模块 |
| 4 | Feature Writer | 子Agent | ❌ 任务级 | 生成"功能规格"模块 |
| 5 | Flow Writer | 子Agent | ❌ 任务级 | 生成"流程设计"模块（含Mermaid） |
| 6 | Data Writer | 子Agent | ❌ 任务级 | 生成"数据流建模"模块 |
| 7 | Page Writer | 子Agent | ❌ 任务级 | 生成"页面规格"模块 |
| 8 | Reviewer | 子Agent | ✅ 评审标准库 | 独立验收5个Writer产物，输出质量分+打回原因 |

> 实际5个Writer是同一Agent的5个实例化变体（共用soul+skills，参数化role/instruction），避免过度分化。

### 1.3 每个Agent详细配置

#### Manager

```yaml
agent_id: manager_0to1
role: 0-1场景PRD项目经理
goal: 把MRD转成通过验收的标准化PRD

soul:
  backstory: |
    你是资深B端产品总监，擅长拆解非结构化需求。
    你的工具只够做"派任务+读文件+发邮件"，不亲自写PRD。
  decision_style: 全局协调、风险前置、零容忍返工
  NEVER:
    - 亲自写PRD任何模块
    - 跳过需求澄清环节
    - 跳过独立Reviewer直接交付
    - 修改原始MRD内容
    - 接受无验收标准的需求
  边界: 无写工具（FileWriter/Bash均无）

memory:
  workspace: workspace/manager_0to1/
  files: [soul.md, agent.md(团队名册+SOP), user.md, memory.md]
  硬上限: memory.md ≤ 200行（200行触发自治理）

tools:
  - SpawnSubAgent（串行派发）
  - SpawnParallel（并行派发5个Writer）
  - FileRead
  - MailboxReader / MailboxWriter

llm: qwen3-max           # 规划+验收用大模型
max_iter: 30             # 防止失控
hooks: [CostGuard budget=2.0, LoopDetector threshold=3]
```

#### Arch Designer（串行前置）

```yaml
agent_id: arch_designer
role: 架构设计师
goal: 基于MRD产出共享api_spec.md，定义前后端字段、接口、数据结构

soul:
  NEVER:
    - 写产品概述/页面规格（那是Writer的活）
    - 输出非Mermaid或非Markdown的可视化
  输出约束:
    - 必须包含: 数据模型表、接口清单、字段定义、命名约定
    - 风格: 与历史项目一致（从memory_index读）

tools: [FileWriter, MermaidRenderer, MemoryIndexReader]
llm: qwen3-plus
max_iter: 15
output: workspace/0to1/arch/api_spec.md（主Agent只收路径）
```

#### 5个Writer（并行派发）

```yaml
agent_id: prd_writer_{product|feature|flow|data|page}
role_template: "{module}产品专家"
goal: 基于api_spec.md生成{module}模块的结构化PRD

soul:
  NEVER:
    - 修改api_spec.md
    - 在职责外输出内容（如Product Writer不画Mermaid流程图）
    - 跳过模板字段直接写正文
  输入白名单:
    - api_spec.md（必读）
    - 上游Writer产物摘要（仅本批次需要依赖的）
    - 本角色的历史产出（用于风格一致）

tools: [FileWriter, TemplateRenderer, MermaidRenderer（仅flow/data）]
llm: qwen3-plus（写作用中等模型）
max_iter: 12
output:
  - Product → workspace/0to1/writers/product_overview.md
  - Feature → workspace/0to1/writers/feature_spec.md
  - Flow   → workspace/0to1/writers/flow_design.md
  - Data   → workspace/0to1/writers/data_model.md
  - Page   → workspace/0to1/writers/page_spec.md
  # ⚠️ 只返回路径，不返回内容给主Agent
```

#### Reviewer（独立验收）

```yaml
agent_id: reviewer_0to1
role: PRD质量审核员
goal: 客观评估PRD质量，分级反馈

soul:
  NEVER:
    - 直接修改PRD
    - 接触Writer的执行历史（仅读产物文件）
  决策偏好: 严苛型，先看产出、不看过程

评测维度:
  完整性: 8要素覆盖度（0-25分）
  规范性: 模板匹配度（0-25分）
  可执行性: 字段精度、流程可落地（0-25分）
  一致性: 术语/接口与api_spec对齐（0-25分）

tools: [FileRead, TemplateChecker, MermaidValidator]
llm: qwen3-max（验收用大模型，避免放水）
output: 
  { total_score, 必改项[], 建议项[], verdict: pass/reject, reason }
```

### 1.4 协作流程（端到端）

```
0. Bootstrap阶段
   Manager加载 soul/user/agent(团队名册+SOP)/memory_index 四件套
   ↓
1. 需求澄清（人类介入点1）
   Manager用四维框架（目标/边界/约束/风险）主动发问
   落 requirements.md → 人类签字画押
   ↓
2. 串行：MRD预处理（代码节点，不进LLM）
   提取结构化字段 → field_extraction.json
   ↓
3. 串行：Arch Designer
   spawn_sub_agent(arch_designer) → 产出 api_spec.md
   # 必须先于Writer，避免5个Writer风格/接口冲突
   ↓
4. 并行：5个Writer
   spawn_parallel([product, feature, flow, data, page])
   共享 api_spec.md，互不感知各自上下文
   每个Writer独立Crew，完全隔离
   ↓
5. Reviewer独立验收
   spawn_sub_agent(reviewer) → 输出评分
   ① 评分≥80：进入归档
   ② 评分60-80：打回指定Writer重写（指明必改项）
   ③ 评分<60：返回Arch Designer重做
   # 打回上限3次，超出走人类介入
   ↓
6. 人类Checkpoint（人类介入点2）
   Manager发"checkpoint_request"邮件 → 人类确认
   ↓
7. 归档（代码节点 + Manager调度）
   · XML→Markdown统一化（代码节点）
   · 写入 archive/ 目录
   · 提取元数据更新 memory_index
   · 反馈给人类"PRD已交付"
   ↓
8. 异常兜底（人类介入点3）
   任何GuardrailDeny触发 → 写human.json → 等待人类接管
```

### 1.5 三层处理事项

#### 架构层

| 事项 | 设计 | 课程依据 |
|------|------|---------|
| 范式选择 | Orchestrator（业务熵高、并行有价值） | L01 阿什比定律 |
| 编排机制 | SOP as Skill注入Manager backstory，LLM动态决定串/并行 | L23 |
| 通信协议 | 共享工作区（状态）+ 邮箱（事件），FileLock原子写 | L26 |
| 共享规范前置 | Arch Designer先于Writer产出api_spec.md | L23 AP-3 |
| 验收独立 | Reviewer不接触Writer执行日志，独立Crew独立上下文 | L23 BP-1 |
| 工具权限 | Manager无写工具；Writer只写自己输出目录 | L25 |
| 可靠性三件套 | RetryTracker + LoopDetector + CostGuard | L31 |
| 异常终止 | kill switch + max_iter=30 + $2预算三重护栏 | L31 AP-1 |
| 错误传播 | GuardrailDeny经pending_deny绕过CrewAI异常吞噬 | L31 |

#### Agent设计层

| 事项 | 设计 | 课程依据 |
|------|------|---------|
| 角色边界 | 5个Writer是同一Agent的5个参数化变体（避免过度分化） | L25 三维判断法 |
| 四层框架 | 每角色 soul/agent(Charter)/memory/skills 物理隔离 | L25 |
| NEVER清单 | 每角色soul明文禁止，LLM决策前自查 | L25 BP-1 |
| 独立记忆 | 角色按agent_id物理目录隔离 | L25 BP-2 |
| 信息传递 | Writer只接收api_spec.md+上游摘要，不接收Manager全局历史 | L23 |
| 工具最小化 | Manager 3类工具、Writer 3类、Reviewer 3类 | L25 |
| 角色行为规范 | agent.md含"我负责/我不负责"边界表 | L25 |
| 模型分级 | Manager/Reviewer=qwen3-max、Writer/Arch=qwen3-plus | L19 BP-4 |
| 自我进化 | 每次kickoff后写复盘到agent.md，下次启动自动生效 | L25 |
| 渐进式披露 | memory_index ≤ 200行，详情子目录化 | L20/L21 |

#### 上下文管理层

| 事项 | 设计 | 课程依据 |
|------|------|---------|
| Bootstrap四件套 | soul+user_profile+agent_rules+memory_index四标签注入 | L19 |
| 记忆加载 | 仅加载"导航骨架"（索引>全文） | L19 |
| 200行硬上限 | memory.md超200行触发Agent自治理 | L19 BP-1 |
| 剪枝 | @before_llm_call按轮数清空旧Tool Result | L19 |
| 压缩阈值 | 30-45%主动触发 | L19 BP-2 |
| 切割边界 | 按user消息边界切，保护tool_call配对 | L19 AP-4 |
| 分块摘要 | chunk_tokens≈2000，避免单条消息压缩丢语义 | L19 AP-5 |
| 小模型摘要 | 摘要用qwen3-turbo，对话用qwen3-max/plus | L19 BP-4 |
| 压缩前持久化 | _raw.jsonl append-only，lossless | L19 BP-3 |
| 文件传书 | Writer只返回路径不返回内容，避免Manager上下文爆炸 | L23 |
| 背景隔离 | Writer不接收Manager历史，防止Context Poisoning | L03/L23 |
| 共享规范显式传 | api_spec.md显式路径传入每个Writer | L23 BP-4 |
| 压缩用system角色 | 摘要放role=system（语义：背景信息），不放user | L19 |

### 1.6 设计亮点

1. **Orchestrator+5个Writer并行**：相比串行5步节省约60%时间（最慢Writer的时间即总时间）
2. **Arch Designer串行前置**：解决5个Writer并行写"接口命名/字段定义"冲突的反模式
3. **Reviewer独立验收**：Galileo+ PwC数据，7倍质量差距（70% vs 10%）
4. **Writer参数化变体**：避免"5个角色≠5个数字员工"的过度分化，共享soul/skill降低维护成本
5. **Manager零写工具**：架构保证而非LLM自律，从源头杜绝Manager越界
6. **Bootstrap+SOP双注入**：Manager既有"我是谁"也有"这次该怎么做"
7. **人类三介入点闭环**：前端澄清、中端Checkpoint、后端兜底

### 1.7 上线效果预估

| 指标 | 基线（资深PM手工） | 上线后 | 提升 |
|------|------------------|--------|------|
| 单份PRD产出耗时 | 3-5天 | 1-2小时 | **80%↓** |
| 一次评审通过率 | ~40% | ≥75% | **1.9×** |
| 5大模块一致性 | 经常术语/字段不统一 | 100%对齐api_spec | — |
| 单份PRD Token成本 | — | <$0.5（围栏+分级） | — |
| PM产能（人均月产出） | 4-6份 | 20-30份 | **4-5×** |
| 团队SOP遵循度 | ~50% | 100%（代码强制） | — |

> **一句话总结**：0-1集群把"3-5天的PRD苦力活"压缩到"1-2小时的Review+微调"，PM从"文档工人"升级为"业务决策者"。

---

## 二、1-N 场景 PRD 生成 Agent 集群

> **场景定位**：存量产品/系统改造。输入为新功能开发/存量优化/Bug修复的标准化需求，输出为兼容已有资产、不冲突、可执行的标准化PRD。
>
> **架构范式**：Workflow + 节点化Agent（业务熵中、流程固定、强调稳定）。少量单点Agent（信息收集、资产检索、冲突检测），节点间用结构化消息而非自由prompt。

### 2.1 架构骨架

```
┌──────────────────────────────────────────────────────────────────┐
│                    1-N PRD生成 Agent 集群                          │
└──────────────────────────────────────────────────────────────────┘
                          │
        ┌─────────────────▼─────────────────┐
        │  Manager（流程编排，类Orchestrator）│
        │  · Bootstrap + 场景分流SOP         │
        │  · 工具：spawn/file_read/邮箱/调用代码节点│
        │  · NEVER：跳过校验/跳过冲突检测/无限优化│
        └────┬────────────────────┬─────────┘
             │                    │
   ┌─────────▼────────┐  ┌────────▼─────────┐
   │ 代码节点层        │  │ 单点Agent层      │
   │ (Workflow)       │  │ (ReAct单Agent)   │
   │ · 场景分流器     │  │ · InfoCollector  │
   │ · 模板加载器     │  │ · Validator      │
   │ · 标准化校验器   │  │ · AssetLibrarian │
   │ · 归档器         │  │ · ConflictDetector│
   └─────────┬────────┘  │ · PRDWriter      │
             │           │ · Reviewer       │
             │           └────────┬─────────┘
             │                    │
   ┌─────────▼────────────────────▼─────────┐
   │       共享工作区 + 邮箱 + Hook框架       │
   │  增量于0-1集群的workspace，并新增        │
   │  needs/ templates/ assets/ archive/    │
   └──────────────────────────────────────────┘
                          │
        ┌─────────────────┼─────────────────┐
        │                 │                 │
   ┌────▼─────┐  ┌────────▼────────┐  ┌─────▼──────┐
   │ 资产向量库 │  │ 历史PRD库（来自0-1│  │ 模板库     │
   │ (RAG)     │  │ 集群归档）       │  │ 三类SOP    │
   └──────────┘  └────────────────┘  └────────────┘
```

### 2.2 角色清单（8个节点 = 5代码 + 3单Agent + 1Manager）

| # | 节点 | 类型 | 角色 | 核心职责 |
|---|------|------|------|---------|
| 1 | Manager | 主Agent | 流程编排 | 场景分流、调度代码节点和单Agent、Reviewer验收、归档 |
| 2 | 场景分流器 | 代码节点 | 路由器 | 接收"新功能/存量优化/Bug"分类，决定后续SOP路径 |
| 3 | 模板加载器 | 代码节点 | 配置 | 按场景加载对应需求模板，**不进LLM** |
| 4 | InfoCollector | 单Agent | 信息收集员 | 引导用户填写模板，**仅收集、不校验** |
| 5 | Validator | 单Agent | 标准化校验员 | 校验完整性，失败回InfoCollector，**不做其他处理** |
| 6 | AssetLibrarian | 单Agent | 资产管理员 | RAG检索存量资产+标注，**仅检索+输出，不分析** |
| 7 | ConflictDetector | 单Agent | 冲突检测员 | 需求vs存量冲突分析+多方案输出，**不修改** |
| 8 | PRDWriter | 单Agent | PRD撰写 | 生成PRD，**单次生成+多轮优化上限3** |
| 9 | Reviewer | 单Agent | 独立验收 | 客观评分+打回 |
| 10 | 归档器 | 代码节点 | 持久化 | 写文件+更新memory_index+元数据 |

> "1个节点只做1件事，零耦合"——7步线性流程的极简原则在Agent设计上的落地。

### 2.3 每个Agent/节点详细配置

#### Manager

```yaml
agent_id: manager_1ton
role: 1-N场景PRD项目经理
goal: 把存量改造需求转成无冲突、可执行的标准化PRD

soul:
  backstory: |
    你是存量系统改造专家，擅长规避冲突、最大化复用。
    你的工作流是"7步管线"，每步都是单一职责的独立节点。
  decision_style: 严格按SOP、强校验、严防冲突、收敛导向
  NEVER:
    - 跳过Validator直接进入检索
    - 跳过ConflictDetector直接生成PRD
    - 优化超过3轮（必须人工介入或终止）
    - 修改标准化需求
    - 跳过Reviewer直接归档
  边界: 无写工具

memory:
  workspace: workspace/manager_1ton/
  files: [soul.md, agent.md(三类场景SOP), user.md, memory.md]
  三类SOP:
    new_feature: 新功能SOP（含模块边界）
    optimization: 存量优化SOP（含存量资产强制检索）
    bugfix: Bug修复SOP（含最小变更原则）
  硬上限: memory.md ≤ 200行

tools:
  - SpawnSubAgent（调用单Agent）
  - CallCodeNode（调用代码节点）
  - FileRead
  - MailboxReader / MailboxWriter

llm: qwen3-max
max_iter: 25
hooks: [CostGuard budget=1.5, LoopDetector threshold=3]
```

#### InfoCollector（仅收集）

```yaml
agent_id: info_collector
role: 信息收集员
goal: 引导用户按模板填全需求

soul:
  NEVER:
    - 校验用户输入（那是Validator的活）
    - 修改模板字段
    - 主动给建议（避免污染）
  工作模式: 严格按模板逐字段提问；用户答完即收

tools: [FormRenderer, FieldHint]
llm: qwen3-turbo（小模型即可，机械式工作）
max_iter: 5
output: 标准化需求JSON（结构化，非自由文本）
```

#### Validator（仅校验）

```yaml
agent_id: validator
role: 标准化校验员
goal: 校验需求完整度，输出标准化或打回

soul:
  NEVER:
    - 修改用户填的内容
    - 做内容质量判断（只看"有没有"，不看"对不对"）
  校验规则:
    必填字段: 全部非空
    字段格式: 类型/长度/枚举合规
    模板版本: 与当前SOP匹配

tools: [JsonSchemaValidator]
llm: qwen3-turbo（机械校验，无需大模型）
output:
  pass: {标准化需求JSON} → 下游AssetLibrarian
  fail: {缺失字段列表, 错误位置} → 回InfoCollector
```

#### AssetLibrarian（仅检索+标注）

```yaml
agent_id: asset_librarian_1ton
role: 资产管理员
goal: 按标准化需求精准检索存量业务资产

soul:
  NEVER:
    - 做内容分析或逻辑判断
    - 改写或合并检索结果
    - 输出未标注来源的结论
  输出格式: 严格列表
    { asset_id, 名称, 类型, 摘要, 路径, 相关度分, 来源chunk_id }

tools: [VectorSearch, BM25Search, MetadataQuery, AssetRanker]
memory: 检索模式索引（哪些查询→哪些资产）
output: 资产列表（结构化清单，不输出自由文本分析）
```

#### ConflictDetector（仅冲突分析）

```yaml
agent_id: conflict_detector
role: 冲突检测员
goal: 检测需求与存量资产的冲突，输出多方案

soul:
  NEVER:
    - 修改任何文档
    - 单方面下结论（必须给≥2个方案）
  决策偏好: 保守型，倾向"复用现有而非新建"
  
冲突类型:
  - 字段冲突（同名不同义/同义不同名）
  - 流程冲突（新增流程与已有流程重复）
  - 数据冲突（数据模型不一致）
  - 接口冲突（接口定义矛盾）

tools: [FileRead, AssetRead, GraphQuery]
output: 结构化冲突报告
  { 位置, 冲突类型, 严重度, 方案A(复用), 方案B(新建), 推荐, 依据 }
```

#### PRDWriter（单次+多轮优化）

```yaml
agent_id: prd_writer_1ton
role: PRD撰写员
goal: 基于标准化需求+资产清单+冲突方案，生成标准化PRD

soul:
  NEVER:
    - 修改上游需求
    - 忽略ConflictDetector的方案推荐
    - 在3轮优化后继续

tools: [FileWriter, TemplateRenderer, MermaidRenderer, AssetCiter]
llm: qwen3-plus
max_iter: 
  - 单次生成: 10
  - 优化轮: 每轮5，最多3轮
output: workspace/1ton/output/prd.md

多轮优化收敛条件:
  - 满足任一: Reviewer评分≥80 / 已优化3轮 / Reviewer连续两轮无新意见
  - 满足任一即停: 评分<60连续2轮 / 检测到循环
```

#### Reviewer（独立验收）

```yaml
agent_id: reviewer_1ton
role: 1-N场景质量审核
goal: 评估PRD质量+冲突解决度+资产复用度

评测维度:
  完整性: 8要素覆盖（0-20）
  一致性: 与存量资产命名/接口对齐（0-20）
  冲突解决: 每个冲突点都有方案+选择依据（0-20）
  资产复用: 引用存量资产的比例（0-20）
  可执行性: 字段精度、流程可落地（0-20）

llm: qwen3-max
output: {total_score, 必改项[], 建议项[], verdict}
```

#### 代码节点（4个，零LLM成本）

```yaml
场景分流器:
  输入: 用户一句话需求
  实现: 关键词+LLM分类（新功能/存量优化/Bug）
  输出: {scene_type, sop_id}

模板加载器:
  输入: sop_id
  实现: 查表+文件读取
  输出: 模板JSON（字段定义、必填项、示例）

归档器:
  输入: 最终PRD + 元数据
  实现: 文件写入 + memory_index更新
  输出: {prd_path, archive_id, asset_refs[]}
```

### 2.4 协作流程（端到端管线）

```
0. Bootstrap
   Manager加载 soul+三类SOP+memory_index
   ↓
1. 场景分流（代码节点）
   用户输入 → 场景分流器 → {新功能/存量优化/Bug} → 加载对应SOP
   ↓
2. 模板加载（代码节点）
   按SOP加载模板 → 输出字段定义
   ↓
3. 信息收集（InfoCollector）
   引导用户填写 → 输出原始JSON
   ↓
4. 标准化校验（Validator）
   pass → 步骤5
   fail → 回步骤3（最多3次回退，否则人工介入）
   ↓
5. 资产检索（AssetLibrarian）
   RAG检索存量资产 → 输出结构化清单
   ↓
6. 冲突检测（ConflictDetector）
   需求 vs 资产 → 输出多方案冲突报告
   ↓
7. PRD生成（PRDWriter）
   整合需求+资产+方案 → 单次生成
   ↓
8. 多轮优化（PRDWriter + Reviewer）
   轮询：Writer改 → Reviewer评 → 直到收敛
   收敛条件: 评分≥80 / 已3轮 / 连续两轮无新意见
   ↓
9. 人类Checkpoint（人类介入点2）
   Manager发邮件 → 人类确认
   ↓
10. 归档（代码节点）
    写文件 + 更新memory_index + 资产引用记录
    ↓
11. 异常兜底（人类介入点3）
    任何GuardrailDeny → human.json
```

### 2.5 三层处理事项

#### 架构层

| 事项 | 设计 | 课程依据 |
|------|------|---------|
| 范式选择 | Workflow + 节点化Agent（业务熵中、流程固定） | L01 |
| 编排机制 | Manager按SOP严格串行调度，节点间用结构化JSON | L26 |
| 代码节点优先 | 4个无LLM节点（分流/加载/校验/归档）降本 | L01/L19 |
| 单点Agent | 6个ReAct Agent，各管一段，零上下文共享 | L03 |
| 通信协议 | 共享工作区 + 邮箱，FileLock原子写 | L26 |
| 可靠性策略 | RetryTracker + LoopDetector + CostGuard | L31 |
| 异常终止 | 校验3次未过、优化3轮未收敛、kill switch | L31 AP-1 |
| 错误传播 | pending_deny模式 | L31 |
| 资产库复用 | 0-1集群的归档 = 1-n集群的资产库（数据飞轮） | L39 |

#### Agent设计层

| 事项 | 设计 | 课程依据 |
|------|------|---------|
| 单一职责 | "1个节点只做1件事"——InfoCollector不校验、Validator不改、AssetLibrarian不分析 | L25 |
| 严格NEVER清单 | 每Agent明文禁止，LLM决策前自查 | L25 BP-1 |
| 独立记忆 | 角色按agent_id物理目录隔离 | L25 BP-2 |
| 三类SOP分流 | new_feature/optimization/bugfix走不同管线 | L01 |
| 工具最小化 | InfoCollector 2类、Validator 1类、Librarian 4类 | L25 |
| 模型分级 | 机械类用turbo（分流/校验/收集），创作类用plus/max | L19 BP-4 |
| 收敛机制 | 多轮优化有"评分/轮数/重复"三重收敛 | L31 |
| 自我进化 | kickoff后写复盘到agent.md | L25 |
| 渐进式披露 | 资产库检索按需召回，不全量灌入 | L20/L21 |

#### 上下文管理层

| 事项 | 设计 | 课程依据 |
|------|------|---------|
| Bootstrap四件套 | soul+user+agent(三类SOP)+memory_index | L19 |
| 200行硬上限 | memory.md超200行触发自治理 | L19 BP-1 |
| 节点间传JSON | 不用自由文本，用结构化消息，避免LLM解析误差 | L26 |
| 资产检索分块 | RAG按chunk返回，不返回整个文档 | L21 |
| 资产检索防爆 | 资产清单只入Librarian的上下文，不进Manager | L23 |
| 多轮优化上下文清理 | 每轮优化kickoff前清空历史Tool Result | L19 |
| 小模型摘要 | Librarian/InfoCollector/Validator用turbo | L19 BP-4 |
| 压缩前持久化 | 归档前先flush到_raw.jsonl | L19 BP-3 |
| 切割边界 | 按user消息边界切，保护tool_call配对 | L19 AP-4 |
| 背景隔离 | AssetLibrarian不接收Manager的冲突上下文 | L03/L23 |

### 2.6 设计亮点

1. **"1个节点只做1件事"**：借鉴1-N原始设计思想，但用单点Agent实现而非Workflow节点——既保留简单性又获得LLM灵活性
2. **代码节点降本40%**：4个无LLM节点（分流/加载/校验/归档）只占10%成本，承担40%工作量
3. **三类SOP分流**：避免"通才崩溃"——新功能/存量优化/Bug的SOP和模板完全不同
4. **RAG防爆设计**：资产检索只入Librarian上下文，不污染Manager和Writer
5. **多轮优化三重收敛**：评分/轮数/重复——避免"无限优化"烧光预算
6. **零耦合可独立升级**：每个Agent的soul/skill可独立迭代，互不影响
7. **数据飞轮天然闭环**：1-n产出的PRD归档 = 1-n的资产库增量 = 后续1-n的检索素材
8. **3次回退上限**：校验/优化都有收敛机制，避免"对着错误需求无限返工"

### 2.7 上线效果预估

| 指标 | 基线（PM手工+研发沟通） | 上线后 | 提升 |
|------|----------------------|--------|------|
| 单份改造PRD产出 | 2-3天 | 2-3小时 | **70%↓** |
| 需求-存量冲突一次发现率 | ~30% | ≥85% | **2.8×** |
| 资产复用率 | ~40%（靠人记得） | ≥75%（RAG强制） | **1.9×** |
| 多轮返工次数 | 平均2-3次 | ≤1次 | **2-3×** |
| 单份PRD Token成本 | — | <$0.4 | — |
| 校验失误导致返工 | ~20% | <5% | **4×** |

> **一句话总结**：1-N集群把"2-3天的存量改造PRD+跨团队扯皮"压缩到"2-3小时的自动化管线+人工微调"，冲突检出率从30%飙升到85%。

---

## 三、两个集群的关系

```
        ┌───────────────────────────────┐
        │   共享基础设施层（共用）         │
        │  · Bootstrap四件套规范          │
        │  · Hook框架（6事件+策略）       │
        │  · 共享工作区+邮箱协议          │
        │  · 可靠性策略（Retry/Loop/Cost）│
        │  · 人类介入点协议              │
        │  · 评测体系（共享指标库）       │
        └─────────────┬─────────────────┘
                      │
        ┌─────────────┴─────────────┐
        │                           │
   ┌────▼────────────┐    ┌──────────▼────────┐
   │  0-1集群         │    │  1-N集群           │
   │  · Orchestrator │    │  · Workflow+单点  │
   │  · 5个Writer并行 │    │  · 6个Agent串行   │
   │  · Arch串行前置  │    │  · 4个代码节点    │
   │  · 1个Reviewer  │    │  · 1个Reviewer    │
   │                  │    │  · 资产RAG        │
   └────────┬─────────┘    └────────┬─────────┘
            │                       │
            │   归档库 ◄───────────  │
            │   (0-1产出的PRD        │
            │    = 1-n的资产)        │
            └───────────────────────┘
```

**关键设计**：

- 共用治理层、差异化业务层——避免"两个系统两份代码"
- 0-1的归档 = 1-n的资产库（数据飞轮 L39），让1-n越用越准
- 0-1和1-n的Manager可互相调用：1-n的Manager遇到"需要先做新架构"时可委托0-1的Manager派Arch Designer
- 两个集群的SOP都通过Skill管理，改业务不改代码
