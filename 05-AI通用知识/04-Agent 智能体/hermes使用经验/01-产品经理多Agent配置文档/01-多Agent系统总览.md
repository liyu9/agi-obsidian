# 产品经理多 Agent 配置总览

## 系统目标

基于 Hermes Agent，构建产品经理专属的 AI Agent 系统。支持两种使用模式：**独立模式**（直接对话）和**协作模式**（多Agent流水线）。

> **注意**：以下所有 Profile 名是本机的配置，不是框架内置。Hermes 没有默认的 Profile 名单。

## 两种使用模式

### 模式一：独立模式

产品经理直接与 `agent-pm` 对话，获得 AI 产品设计指导。适合快速咨询、方案验证、知识查询。

```
产品经理 ──▶ agent-pm（独立 Agent 产品经理）
              ├── SOUL.md + MEMORY.md + USER.md
              ├── 模型：Claude Sonnet 4
              ├── 知识：智能体设计 + Prompt工程 + 工作流编排
              └── 工具：web-search, file-operations, code-execution
```

### 模式二：协作模式

复杂任务通过 coordinator 拆解，多 Agent 流水线协作完成。适合需求调研、方案输出、技术审查等结构化任务。

```
┌─────────────────────────────────────────────────┐
│                    用户输入                       │
└───────────────────┬─────────────────────────────┘
                    │
        ┌───────────▼───────────┐
        │   coordinator          │  角色: kanban-orchestrator
        │   分解 · 分配 · 整合    │  模型: M2.7-highspeed
        └─┬─────┬───────┬─────┬─┘
          │     │       │     │
   ┌──────▼─┐┌──▼────┐┌─▼─────┐┌▼──────────┐
   │analyst ││planner││advisor││ai-pm      │
   │需求分析 ││方案生成││编程顾问││AI产品经理  │
   └────────┘└───────┘└───────┘└───────────┘
```

## 全部 Agent 一览

| # | Profile 名 | 模式 | 角色类型 | 核心职责 | 配置文件 |
|---|-----------|------|---------|---------|---------|
| 1 | `agent-pm` | 独立+协作 | standalone/kanban-worker | 智能体架构设计、工作流编排、Prompt工程 | [07-Agent产品经理配置指南.md](07-Agent产品经理配置指南.md) |
| 2 | `coordinator` | 协作 | kanban-orchestrator | 分解目标、分配任务、监控进度、整合结果 | [02-SOUL-coordinator.md](02-SOUL-coordinator.md) |
| 3 | `analyst` | 协作 | kanban-worker | 需求收集、用户调研、需求拆解、优先级排序 | [03-SOUL-analyst.md](03-SOUL-analyst.md) |
| 4 | `ai-pm` | 协作 | kanban-worker | 分析需求中AI功能、判断技术路线、标记Agent适用性（由coordinator决定是否触发agent-pm） | [06-SOUL-ai-pm.md](06-SOUL-ai-pm.md) |
| 5 | `planner` | 协作 | kanban-worker | 技术方案、实施计划、架构设计、风险评估 | [04-SOUL-planner.md](04-SOUL-planner.md) |
| 6 | `advisor` | 协作 | kanban-worker | 编程指导、代码审查、技术选型、最佳实践 | [05-SOUL-advisor.md](05-SOUL-advisor.md) |

### 两个产品经理 Agent 的配合关系

`ai-pm` 和 `agent-pm` 是**接力配合**关系，不是独立并列：

```
ai-pm（AI产品经理）                    agent-pm（Agent产品经理）
┌──────────────────┐                  ┌──────────────────┐
│ 分析需求中的AI部分  │ ──适合Agent──▶ │ 设计Agent方案      │
│ 判断技术路线       │                  │ 智能体架构+工作流   │
│ RAG/Agent/微调选型 │                  │ Prompt+工具设计    │
└──────────────────┘                  └──────────────────┘
       │                                      │
       └── 不适合Agent ──▶ 走RAG/微调等路线     │
```

| | `ai-pm`（AI产品经理） | `agent-pm`（Agent产品经理） |
|---|---|---|
| 来源 | 《成为AGI产品经理》 | 《跟月影学前端智能体开发》 |
| 使用方式 | kanban-worker，由 coordinator 调度 | 独立对话 或 被 coordinator 调度 |
| 模型 | M2.7-highspeed | Claude Sonnet 4 |
| 职责 | 分析需求中涉及AI的功能，判断技术路线 | 当AI功能适合用Agent实现时，设计Agent方案 |
| 触发条件 | 需求涉及AI场景时触发 | ai-pm 判断适合Agent实现时触发 |
| 配置 | 仅 SOUL.md | SOUL + MEMORY + USER + config.yaml |

## 协作模式流水线

```
用户需求 ──▶ coordinator 分解任务
                │
                ├── Task 1 → analyst（需求分析）
                │
                ├── Task 2 → ai-pm（AI产品分析）  ← parents=[Task1]（仅AI场景）
                │     └── 输出：AI技术路线判断
                │          ├── 适合Agent → 触发 Task 2a
                │          └── 不适合Agent → 走RAG/微调等路线
                │
                ├── Task 2a → agent-pm（Agent方案设计） ← parents=[Task2]（仅ai-pm判断适合Agent时）
                │
                ├── Task 3 → planner（方案生成）  ← parents=[Task1/Task2/Task2a]
                │
                └── Task 4 → advisor（编程顾问审查） ← parents=[Task3]
                      │
                coordinator 整合所有结果 ──▶ 交付用户
```

> **ai-pm → agent-pm 接力规则**：ai-pm 完成分析后，在 metadata 中标注 `agent_applicable: true/false`。coordinator 根据此标记决定是否创建 agent-pm 任务。

## 上下文传递机制

| 通道 | 实现 | 说明 |
|------|------|------|
| 任务本体 | `kanban_create(title=..., body=..., assignee=...)` | coordinator 写入目标、背景、约束。返回 `{"task_id": "..."}` |
| 依赖链 | `kanban_create(parents=[t1, t2])` | 在创建时设置依赖，子任务在父任务 done 后自动 ready |
| 评论线程 | `kanban_comment(task_id=..., body=...)` | 人类反馈、Agent 间异步沟通 |
| 依赖链传递 | 上游 `kanban_complete(summary=...)` | 上游 summary 自动传递给下游 |
| 工作空间 | `dir:/absolute/path/workspace` | 共享文件。路径必须是绝对路径 |

## 通信规则

1. **coordinator → 子Agent**：通过 `kanban_create(assignee=...)` 创建任务。**必须先 `hermes profile list` 确认 assignee 存在**
2. **子Agent → coordinator**：`kanban_complete(summary=..., metadata=..., created_cards=[...])`。`created_cards` 幻觉门控
3. **子Agent → 子Agent**：依赖链传递，上游 summary → 下游输入
4. **人类 → 任意Agent**：`kanban_comment(task_id=..., body=...)`
5. **任意Agent → 人类**：`kanban_block(reason="...")` 阻塞等待

## 文件清单

### 配置文档（本目录）

| 文件 | 用途 |
|------|------|
| [02-SOUL-coordinator.md](02-SOUL-coordinator.md) | 协作模式主Agent |
| [03-SOUL-analyst.md](03-SOUL-analyst.md) | 需求分析 Agent |
| [04-SOUL-planner.md](04-SOUL-planner.md) | 方案生成 Agent |
| [05-SOUL-advisor.md](05-SOUL-advisor.md) | AI编程顾问 Agent |
| [06-SOUL-ai-pm.md](06-SOUL-ai-pm.md) | 协作模式 AI产品经理 |
| [07-Agent产品经理配置指南.md](07-Agent产品经理配置指南.md) | 独立模式 Agent产品经理（SOUL+MEMORY+USER+config） |
| [08-Kanban工作流配置指南.md](08-Kanban工作流配置指南.md) | 部署和运行指南 |

### 调研文档

| 文件 | 用途 |
|------|------|
| [01-Hermes多Agent协作机制调研.md](../02-调研文档/01-Hermes多Agent协作机制调研.md) | 机制深度调研报告 |

### 经验文档

| 文件 | 用途 |
|------|------|
| [01-使用经验记录.md](../03-经验文档/01-使用经验记录.md) | 使用过程记录和迭代经验 |
| [02-社区使用经验汇总.md](../03-经验文档/02-社区使用经验汇总.md) | 社区最佳实践和生态项目 |
