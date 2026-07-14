# MRD → PRD 多智能体框架设计 v1（待确认）

> 课程依据：极客时间《企业级多智能体设计实战》第 23–29 课（组织 Agent 篇）
> 设计目标：用户输入 MRD（市场需求文档） → 多智能体协作产出结构化 PRD（产品需求文档）
> 输出范围：方法论层（流程 / 角色 / 协作协议 / 人类介入点），不含工程实现

---

## 0. 设计依据摘要（来自课程）

| 课程 | 核心思想 | 本框架的引用 |
|------|---------|------------|
| L23 Orchestrator 范式 | 主 Agent 调度 + 子 Agent 执行；以任务为视角动态派发；Task 对象精准传参；结果只传路径不传内容 | 整体架构：主 Agent 拆 MRD → 派子 Agent → 收回产物路径 |
| L24 数字员工团队 | 通用 Agent 三崩溃（记忆污染 / 技能稀释 / 无法定向进化），必须专业化；人类从"中间商"变"老板" | 子 Agent 按 MRD 处理阶段专业化（不是"通才 PM"）；人类只在三个介入点出现 |
| L25 团队角色体系 | 三维隔离判断法（记忆 / 技能 / 决策偏好）决定角色是否独立；四层框架（Role Charter / Soul / Memory / Skills）定义角色 | 用三维判断法确定 2-3 个子 Agent 边界；每个角色配四层框架 |
| L26 任务链与信息传递 | 共享工作区（结构化 + Owner 唯一）+ 邮箱（结构化消息 + 三态状态机） | `shared/` 工作区 + `mailboxes/` 邮箱协议 |
| L27 Human as 甲方 | 人只和 Manager 沟通；三个介入点：需求澄清 / 设计确认 / 异常兜底 | 主 Agent = Manager；人在 MRD 澄清、PRD 终稿、异常三类场景介入 |
| L34 需求挖掘 | AI 适用性评估表 5 维度打分 | 在立项时跑一遍 25 分制评估 |
| L35 产品原型 | Who / What / How good 三问 + GT 同步设计 | 模板化 PRD 字段即 I/O；GT = 历史优质 PRD 样本 |

---

## 1. 整体架构：1 主 + 3 子

```
                    ┌─────────────────────┐
                    │   Human（甲方）      │
                    │   3 个介入点         │
                    └──────────┬──────────┘
                               │ 只与 Manager 对话
                               ▼
        ┌────────────────────────────────────────┐
        │   Manager（主 Agent / 调度者）          │
        │   工具：read_mrd / spawn_sub_agent /    │
        │        read_artifact / notify_human     │
        │   无写工具、绝不写 PRD 内容              │
        └──────────┬─────────────┬───────────────┘
                   │ spawn       │ spawn
       ┌───────────▼──────┐ ┌────▼─────────────┐ ┌──────────────────┐
       │ ① MRD 结构化 Agent │ │ ② PRD 撰写 Agent  │ │ ③ PRD 质检 Agent  │
       │   拆解 / 澄清 /    │ │  按模板写 8 大     │ │  校验完整性 /      │
       │   输出需求条目表    │ │  章节 / 标注缺口   │ │  一致性 / 风险    │
       └───────────┬──────┘ └────┬─────────────┘ └────────┬─────────┘
                   │ 产出         │ 产出                    │ 产出
                   ▼              ▼                        ▼
              mrd_breakdown.md  prd_draft.md          qa_report.md
              (共享工作区)       (共享工作区)            (共享工作区)
```

### 1.1 为什么是 1 + 3 而不是更多

- 课程反模式 #4：拍脑袋加 Agent 误差乘法放大；有效 Agent 上限 2-3 个
- 课程 BP-2：先跑单 Agent，有明确收益再扩
- 实际 PRD 生产链路：拆需求 → 写文档 → 审文档，**三个阶段、三种决策偏好**，刚好对应三个子 Agent
- 未来若要扩展（如加"竞品分析 Agent""用户故事细化 Agent"），按三维判断法过一遍再决定

### 1.2 串行/并发设计

| 阶段 | 子 Agent | 串行 / 并发 | 理由 |
|------|---------|------------|------|
| 0 | Manager 自读 MRD | — | 决定工作区结构和澄清问题，必须先有 |
| 1 | ① MRD 结构化 | 串行 | 输出是后续所有子 Agent 的输入契约 |
| 2 | ② PRD 撰写 | 串行 | 依赖阶段 1 的结构化清单 |
| 2.5 | **可选**：章节级并发 | 并发 | 8 大章节可拆分 2-3 个子任务并发（需有共享 outline） |
| 3 | ③ PRD 质检 | 串行 | 必须等 PRD 终稿 |
| 4 | Manager 验收 + 通知人 | 串行 | 独立验收，反馈回 ② |

---

## 2. 协作协议：共享工作区 + 邮箱

### 2.1 共享工作区结构（Manager 初始化时按需创建）

```
workspace/shared/
├── input/                      # MRD 原始输入（Human 写 / Manager 读）
│   └── mrd.md
├── breakdown/                  # ① MRD 结构化 Agent 写入
│   ├── requirements_list.md    # 功能需求清单（ID / 描述 / 优先级 / 验收点）
│   ├── non_functional.md       # 非功能需求（性能 / 安全 / 合规）
│   ├── open_questions.md       # 待澄清问题
│   └── glossary.md             # 业务术语表
├── prd/                        # ② PRD 撰写 Agent 写入
│   ├── outline.md              # 大纲（先于正文，便于人类 checkpoint）
│   └── prd_draft.md            # PRD 终稿
├── qa/                         # ③ PRD 质检 Agent 写入
│   └── qa_report.md            # 完整性 / 一致性 / 风险报告
├── delivery/                   # Manager 验收后归档
│   └── prd_final.md
└── mailboxes/                  # 邮箱（每个角色一个 json）
    ├── manager.json
    ├── mrd_struct.json
    ├── prd_writer.json
    ├── prd_qa.json
    └── human.json
```

**Owner 唯一原则**（课程 BP-2）：
- `input/mrd.md` → Human
- `breakdown/*` → ① MRD 结构化 Agent
- `prd/*` → ② PRD 撰写 Agent
- `qa/*` → ③ PRD 质检 Agent
- `delivery/*` → Manager
- 其他角色只有读权限，不允许写（通过 SOP + 工具权限双重约束）

### 2.2 邮箱消息结构

```json
{
  "id": "msg-xxxx",
  "from": "manager | mrd_struct | prd_writer | prd_qa | human",
  "to": "<role>",
  "type": "task_assign | task_done | needs_clarify | checkpoint_request | error_alert",
  "subject": "...",
  "content": "路径引用 + 关键摘要，不复制文档全文",
  "timestamp": "ISO8601",
  "status": "unread | in_progress | done",
  "processing_since": "ISO8601 or null"
}
```

**三态状态机**（unread → in_progress → done），配套 Watchdog 重置超时 in_progress 消息（参考课程 3.4 节）。

### 2.3 同步通知 + 后台轮询

- 主 Agent 派发后立即触发对应子 Agent 启动（同步通知）
- 子 Agent 各有定时任务兜底（每 10 分钟扫一次邮箱）

---

## 3. 三个子 Agent：四层框架定义

### 3.1 用三维隔离判断法验证 3 个角色的独立性

| 维度 | ① MRD 结构化 | ② PRD 撰写 | ③ PRD 质检 | 结论 |
|------|------------|-----------|-----------|------|
| 记忆数据 | MRD 拆解方法论、需求 ID 规范 | PRD 模板库、历史优秀 PRD 样本、章节套路 | 质检 checklist、历史缺陷模式 | 完全不同 |
| 技能体系 | 需求分析 / 用例拆解 / 业务建模 | 文档写作 / 用户故事 / 流程图 / 原型说明 | 合规审查 / 一致性核对 / 风险评估 | 完全不同 |
| 决策偏好 | "拆得细、问得全、不放过模糊点" | "结构清晰、可读性强、对下游友好" | "挑剔、质疑、找漏洞" | 完全不同（一个偏拆、一个偏写、一个偏审） |

**三维都显著差异 → 三个独立角色成立。** 符合课程三维判断法。

### 3.2 子 Agent ①：MRD 结构化 Agent

| 层次 | 内容 |
|------|------|
| **Role Charter** | 职责：把 MRD 拆为可追踪的需求条目；不写 PRD 正文，不评估方案可行性<br>不负责：PRD 章节写作（→ ②）、需求优先级业务决策（→ Human） |
| **Soul（决策偏好）** | "宁可多问，不要漏拆；遇到模糊词先列问题、不擅自补全"<br>**NEVER**：① 不写 PRD；② 不改 MRD 原意；③ 不跳过开放问题直接给方案 |
| **Memory** | `breakdown_history.md`：历史 MRD 拆解经验；`domain_patterns.md`：行业拆解套路 |
| **Skills** | 需求拆解 SOP、INVEST 检查法、用户故事模板、术语抽取方法 |

### 3.3 子 Agent ②：PRD 撰写 Agent

| 层次 | 内容 |
|------|------|
| **Role Charter** | 职责：按模板写 8 大章节 PRD；标注信息缺口<br>不负责：需求拆解（→ ①）、质检（→ ③）、业务决策（→ Human） |
| **Soul（决策偏好）** | "结构 > 文采；条款可执行 > 描述漂亮；不确定就标注[TBD]而不是补"<br>**NEVER**：① 不自行补充未确认的需求；② 不省略验收标准；③ 不写模糊词"可能 / 大概" |
| **Memory** | `prd_templates.md`：标准 8 章节模板；`sample_prds.md`：历史高质量 PRD 样本（GT 来源） |
| **Skills** | PRD 写作 SOP、用户故事书写、流程图描述、验收标准 Given/When/Then、原型标注规范 |

**PRD 模板（8 大章节）**：
1. 背景与目标（来自 MRD）
2. 名词解释与范围
3. 用户与场景
4. 功能需求（带需求 ID，关联 ① 产出）
5. 非功能需求
6. 业务流程
7. 验收标准
8. 风险与待澄清

### 3.4 子 Agent ③：PRD 质检 Agent

| 层次 | 内容 |
|------|------|
| **Role Charter** | 职责：完整性 / 一致性 / 可执行性 / 风险审查<br>不负责：写 PRD / 改 PRD（只出报告）；需求拆解（→ ①） |
| **Soul（决策偏好）** | "找茬视角；宁可误报不要漏报；质疑一切模糊条款"<br>**NEVER**：① 不改 PRD 内容；② 不替 PRD 撰写者做决策；③ 不放过未标[TBD]的空洞描述 |
| **Memory** | `qa_checklist.md`：完整质检 checklist；`defect_patterns.md`：历史 PRD 常见缺陷模式 |
| **Skills** | 完整性检查、跨章节一致性核对、验收标准 SMART 校验、风险识别 checklist |

**质检报告结构**：
- 完整性：8 章节是否齐全 / 每章节必要子项是否齐全
- 一致性：需求 ID 跨章节引用是否对齐 / 术语表与正文是否一致
- 可执行性：每条功能需求是否可写测试用例 / 验收标准是否可验证
- 风险：模糊条款 / 缺失依赖 / 范围蔓延信号

---

## 4. Manager（主 Agent）

| 层次 | 内容 |
|------|------|
| **Role Charter** | 调度者 / 验收者：读 MRD、建工作区、派子 Agent、验产物、通知人<br>**绝不写任何业务文档**（PRD、质检报告） |
| **Soul（决策偏好）** | "全局视野、不下场、严验收"<br>**NEVER**：① 不写 PRD；② 不替 Human 做业务决策；③ 不跳过验收；④ 接收任何子 Agent 产物前必须独立读原文 |
| **Memory** | `sop_prd_team.md`：PRD 团队 SOP（阶段 0-4 流转规则）<br>`team_roster.md`：当前子 Agent 名册与职责 |
| **Skills** | 工具：read_mrd / spawn_sub_agent / read_artifact / notify_human / send_mail |

**核心 SOP（注入 backstory）**：

```
阶段 0：初始化
  - 读 MRD（mrd.md）
  - 初始化 shared/ 工作区 + 邮箱
  - 检查 mrd.md 是否完整；若不完整，向 human 发 needs_clarify 邮件

阶段 1：派 ① MRD 结构化
  - spawn ①，给定 input 路径 + 产出路径 + 截止时间
  - 等待 task_done，read 产物（breakdown/*），验收 → 不通过则 reject ＋ 重派

阶段 2：派 ② PRD 撰写
  - spawn ②，给定 breakdown 路径 + PRD 模板 + GT 样本路径
  - 等待 task_done，read prd_draft.md
  - 若 ② 标注 [TBD] 多于阈值，向 human 发 checkpoint_request（设计确认）

阶段 3：派 ③ PRD 质检
  - spawn ③，给定 prd 路径 + 质检 checklist
  - 等待 task_done，读 qa_report.md
  - 不通过：合并质报 → 重新派 ② 修订（最多 3 轮）
  - 通过：归档到 delivery/prd_final.md

阶段 4：通知 Human 验收
  - 发 checkpoint_request 到 human.json
  - 收到确认 → 整个任务 done
  - 收到拒绝 → 带 human_feedback 重新派 ②

异常兜底：
  - 任一子 Agent 超过 3 轮 reject / 超时 / 崩溃 → 发 error_alert 到 human.json
```

---

## 5. Human（甲方）介入点

只和 Manager 对话（单一接口原则），三个介入点：

| # | 介入点 | 触发条件 | Human 动作 | 响应 |
|---|--------|---------|-----------|------|
| 1 | 需求澄清 | MRD 缺失关键信息（用户、目标、边界、约束 4 维） | 在 `open_questions.md` 补全或回复邮件 | Manager 收到后继续 |
| 2 | 设计确认 | PRD 中 [TBD] > 阈值 / 出现多解需求 / 关键设计抉择 | 读 PRD 终稿 → confirm / reject + feedback | 确认 → 归档；拒绝 → 重派 ② |
| 3 | 异常兜底 | 子 Agent 失败 ≥ 3 轮 / 超时 / 崩溃 / 出现高风险条款 | 决定 rescue / abandon / 调整方向 | Manager 收到指令继续 |

**不在介入点内**（Agent 完全自主）：
- 工作区初始化
- 子 Agent 选择
- 章节内部结构调整
- 验收标准措辞优化

---

## 6. 任务示例（端到端走查）

**输入**：`shared/input/mrd.md`（一份 SaaS "客户分级标签"功能的 MRD，约 3 页）

**期望产出**：`shared/delivery/prd_final.md`（8 章节完整 PRD，质检通过，Human 确认）

**预期时序**：
```
T+0     Human 投递 MRD
T+5min  Manager 读完 MRD，识别 3 处模糊，邮件 human 澄清
T+30min Human 回复澄清
T+35min Manager 派 ① MRD 结构化
T+50min ① 产出 breakdown（47 条功能需求 / 8 条非功能 / 5 个开放问题）
T+52min Manager 验收通过，派 ② PRD 撰写
T+2h    ② 产出 prd_draft.md（8 章节，3 处 [TBD]）
T+2h05  Manager 发 checkpoint 给 Human
T+3h    Human 确认（2 处 TBD 接受 / 1 处需补充）
T+3h05  Manager 重新派 ② 补完
T+3h30 ② 修订完
T+3h32 Manager 派 ③ PRD 质检
T+4h    ③ 产出 qa_report（完整 / 一致 / 可执行：pass；风险：2 条）
T+4h05 Manager 通知 Human 终稿
T+5h    Human 确认 → 归档
```

**关键产物**：
- `breakdown/requirements_list.md`（47 条带 ID 的需求）
- `prd/prd_draft.md`（8 章节 PRD）
- `qa/qa_report.md`（质检报告）
- `delivery/prd_final.md`（交付件）

---

## 7. 关键设计决策与理由

| 决策 | 备选 | 选这条的理由 | 课程依据 |
|------|------|------------|---------|
| 1 主 + 3 子（不更多） | 5-6 子 Agent | BP-2：先跑通再加；误差 17 倍放大的反模式 | L23 / L25 |
| ③ 质检独立成角色 | 合并到 ② 自检 | 7 倍准确率差距；执行者不能自我评审 | L23 BP-1 |
| 阶段 1 串行（不做并发） | 拆需求与写 PRD 并行 | 共享契约（breakdown）必须在并发前确定 | L23 AP-3 |
| 子 Agent 用 Task 对象传路径不传全文 | 直接传文档内容 | 避免上下文膨胀；课程 BP-4 显式传递 | L23 关键设计 1+3 |
| Manager 无写工具 | 允许 Manager 写笔记 | 避免 Manager 下场污染验收独立性 | L23 推论 |
| 邮箱三态状态机 | read: bool 二态 | 崩溃恢复 / 补单机制 | L26 3.4 |
| human.json 二态 | 同样三态 | Human 不需要崩溃恢复 | L27 3.3 |
| 共享工作区用 Owner 唯一 | 多 Agent 共享读写 | MAST 研究 37% 失败源于所有权歧义 | L26 反模式二 |
| 子 Agent 写 ③ 报告但不改 PRD | 让 ③ 直接改 | Manager 才是最终验收方；③ 必须保持独立视角 | L25 反模式一 |
| 章节级"可选"并发 | 全程串行 | 大 PRD 8 章节顺序写慢；前提是有 outline | L23 关键设计 2 |

---

## 8. 风险与边界

| 风险 | 缓解 |
|------|------|
| Manager 规划失误导致全链放大 | SOP 中明确要求 Manager 在派 ① 之前必须做"自检"；未来加规划 Review 子 Agent |
| 子 Agent 越界（如 ② 改了 MRD） | SOP 中 NEVER 清单 + 工具层权限（② 写工具只允许写 `prd/`）双重约束 |
| 人类疲劳型确认（每个 TBD 都点 yes） | checkpoint 数量限制 + 高风险 TBD 单独标红 |
| GT 不足导致 PRD 模板僵化 | 50 条历史 PRD 样本（按 8 章节结构标注）作为 GT |
| 并发阶段冲突（章节级） | 必须先写 outline.md，outline 经 Manager 验收后并发才有意义 |

---

## 9. 待你确认的问题

请就以下 4 点给出反馈，再进入主-子 Agent 配置文档撰写：

1. **3 个子 Agent 划分是否合理？** 是否需要：
   - 合并 ① 和 ②（拆 + 写一体化，减少交接）？
   - 拆出独立的"用户故事细化 Agent"（在 ② 之后 / 之前）？
   - 增加"业务术语对齐 Agent"？

2. **章节级并发是否启用？** v1 留作"可选"，要不要默认开启？

3. **Human 介入点的 3 个够吗？** 是否要加"PRD 范围确认"（在派 ② 之前）？

4. **是否要纳入 GT 概念？** 即在派 ② 时把"历史优秀 PRD 样本"作为输入注入（参考 L35）。

---

## 10. 后续步骤

待你确认本设计稿后，我会：
- 输出每个子 Agent 的**主-子 Agent 配置文档**（含 prompt 模板、工具清单、NEVER 清单、sop_xxx.md 内容骨架）
- 输出 Manager 的**调度 SOP 详细脚本**（阶段 0-4 的判定树与 reject 理由模板）
- 输出**人类介入邮件模板**（needs_clarify / checkpoint_request / error_alert）
- 输出**质检 checklist**（③ 的 Skills 内容）
