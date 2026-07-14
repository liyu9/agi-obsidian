# OpenSpec 使用说明

> **来源**: [GitHub: Fission-AI/OpenSpec](https://github.com/Fission-AI/OpenSpec)
> **验证日期**: 2026-05-20
> **定位**: Claude Code 规范驱动开发（SDD）框架，与 Spec-Kit、Kiro 同属 SDD 工具体系

---

## 一、OpenSpec 是什么

OpenSpec 是一个轻量级 **规范驱动开发（SDD）开源框架**，专为 Claude Code 等 AI 编码工具设计。

核心一句话：**在写任何代码之前，先和 AI 就"要做什么"达成明确一致，把一致记录成结构化的 Living Spec（活的规范），作为整个开发过程的单一事实来源。**

### 解决的核心痛点

| 痛点 | OpenSpec 的解法 |
|------|-----------------|
| AI 自由发挥、偏离需求 | 提案阶段强制定义 In Scope / Out of Scope |
| 决策藏在聊天记录里 | 所有决策沉淀为 Markdown 文件（proposal.md、spec.md、tasks.md） |
| 长任务中途中断 | 规范文件持久化在磁盘上，跨会话可续跑 |
| 规范与代码不同步 | Archive 阶段自动将 Delta Specs 合并回主规范 |

### 与 SDD 方法论的关系

SDD 四步闭环：**定规范 → AI执行 → 人验证 → 迭代规范**

OpenSpec 是这个方法论的工具化落地：

| SDD 步骤 | OpenSpec 对应 |
|----------|---------------|
| 定规范 | `/opsx:propose` 生成 proposal.md + spec.md |
| AI 执行 | `/opsx:apply` 按 tasks.md 执行 |
| 人验证 | 人工审核每个阶段的制品 |
| 迭代规范 | `/opsx:archive` 合并 Delta Specs 到主规范 |

---

## 二、安装与初始化

### 安装

```bash
npm install -g @fission-ai/openspec@latest
```

### 项目初始化

```bash
cd /path/to/project
openspec init --tools claude
```

`--tools claude` 是必选参数，配置 OpenSpec 使用 Claude Code 的斜杠命令接口。

### 生成的目录结构

```
openspec/
├── project.md           # 项目整体规范（约定、技术栈、原则）
├── AGENTS.md            # AI 助手指令
├── specs/               # 主规范（当前系统"是什么"）
│   └── {capability}/
│       ├── spec.md      # 需求与场景
│       └── design.md    # 技术方案（可选）
├── changes/             # 变更提案（"应该改什么"）
│   ├── {change-id}/
│   │   ├── proposal.md  # 背景、目标、影响
│   │   ├── tasks.md     # 实现任务清单
│   │   ├── design.md    # 技术决策（可选）
│   │   └── specs/       # Delta 变更
│   │       └── {capability}/
│   │           └── spec.md
│   └── archive/         # 已归档的变更
│       └── YYYY-MM-DD-{change-id}/
```

核心概念：**两套并行目录**
- `specs/` — 当前系统"是什么"（Canonical Specs）
- `changes/` — "应该改什么"（Change Proposals）

---

## 三、核心命令

### 命令总览

| 命令 | 作用 | 阶段 |
|------|------|------|
| `/opsx:onboard` | 初始化项目元数据（技术栈、类型、约定） | 首次使用 |
| `/opsx:new <name>` | 创建空的变更目录 | 创建变更 |
| `/opsx:propose <desc>` | 一键生成完整提案（proposal + specs + tasks） | 创建变更 |
| `/opsx:ff` | 快速前进：一次性生成所有规划制品 | 创建变更 |
| `/opsx:apply <id>` | 按 tasks.md 执行实现 | 实现 |
| `/opsx:archive <id>` | 归档变更，合并 Delta Specs | 归档 |

### 何时需要提案，何时可以跳过

**需要提案**：
- 新功能或新能力
- 破坏性变更（API、数据库 schema、行为）
- 架构或模式变更
- 性能优化（改变行为的）
- 安全模式更新

**可以跳过**：
- Bug 修复（恢复预期行为）
- 拼写、格式、注释
- 非破坏性依赖更新
- 纯配置变更
- 为已有行为补充测试

---

## 四、三阶段工作流详解

### 阶段 1：创建变更（Proposal）

#### 快速模式：`/opsx:propose`

```
/opsx:propose 给 Todo 应用增加任务优先级功能
```

AI 自动生成：
- `proposal.md` — 背景、目标、范围、影响分析
- `specs/{capability}/spec.md` — Delta 变更（ADDED/MODIFIED/REMOVED）
- `tasks.md` — 带复选框的实现任务清单

#### 扩展模式：分步推进

```
/opsx:new add-task-priority     # 只创建空目录
# 手动或用 AI 逐步填充每个制品
```

#### Spec Delta 格式

Delta 用特殊标记区分操作类型：

```markdown
## ADDED Requirements

### Requirement: Task Priority
Tasks MUST have a priority level.

#### Scenario: Set priority on creation
- **WHEN** a new task is created
- **THEN** a priority field is available (low/medium/high)
```

```markdown
## MODIFIED Requirements

### Requirement: Task List Display
Task list MUST show priority indicator.

#### Scenario: Priority badge displayed
- **WHEN** task list is loaded
- **THEN** each task shows its priority level
```

```markdown
## REMOVED Requirements

### Requirement: Default Sort
The default alphabetical sort is removed.
```

### 阶段 2：执行实现（Apply）

```
/opsx:apply add-task-priority
```

AI 严格按 `tasks.md` 的任务清单逐步执行：
- 每完成一个任务勾选一个复选框
- 遇到决策点会暂停等待人类确认
- 所有任务完成后进行验证

### 阶段 3：归档（Archive）

```
/opsx:archive add-task-priority
```

- 将变更目录移到 `changes/archive/YYYY-MM-DD-{change-id}/`
- Delta Specs 自动合并到 `specs/` 主规范
- 生成变更总结报告

---

## 五、与其他 SDD 工具的对比

| 维度 | CLAUDE.md + Skills | Spec-Kit | OpenSpec |
|------|-------------------|----------|----------|
| **定位** | 全局规范 + 任务操作手册 | 结构化规范文件 | 变更生命周期管理 |
| **工作流** | 手动闭环 | Phase-based（constitution → specify → plan → tasks → implement） | Change-based（propose → apply → archive） |
| **归档** | 无内置归档 | 无明确归档步骤 | 内置 `/opsx:archive` |
| **命令前缀** | 自动加载 | `/speckit.*` | `/opsx:*` |
| **适合场景** | 个人项目、3人以内 | 团队协作 | 个人到团队均可 |
| **Delta 管理** | 手动维护 | 手动维护 | 自动 Delta Specs |

选工具原则：**够用就好。** 个人项目用 CLAUDE.md + Skills，团队项目加 Spec-Kit 或 OpenSpec。

---

## 六、实战示例

### 示例：给已有项目新增"费用报销"模块

```
# 1. 创建提案
/opsx:propose 在现有 FastAPI 项目中新增费用报销申请与审批模块。
主要功能包括：
- 员工提交报销申请（金额、类别、事由）
- 多级审批流程（直属领导 → 财务）
- 审批状态流转（待审批、已通过、已拒绝）
- 个人报销记录查询

In Scope：申请、审批、查询
Out of Scope：发票OCR、批量审批、导出Excel
```

```
# 2. 审核提案
# 人工检查 proposal.md 和 specs/ 中的 Delta
# 确认 In Scope / Out of Scope 是否合理
```

```
# 3. 执行
/opsx:apply expense-reimbursement
```

```
# 4. 归档
/opsx:archive expense-reimbursement
```

---

## 七、注意事项

1. **必须用交互模式**：`/opsx:*` 命令需要在 Claude Code 的交互模式下执行，不能在 headless 模式
2. **提案是合同**：proposal.md 不是需求列表，而是你和 AI 之间的正式协议，写清楚 In Scope / Out of Scope
3. **不要跳过审核**：复杂任务一定要分步推进，每个制品审核后再进入下一步
4. **规范先行于代码**：代码是规范的产物，不是反过来
5. **CLAUDE.md 保持精简**：OpenSpec 的规范放 `openspec/` 目录，不要全塞进 CLAUDE.md

---

## 参考来源

- [GitHub: Fission-AI/OpenSpec](https://github.com/Fission-AI/OpenSpec)
- [DeepWiki: OpenSpec Workflow](https://deepwiki.com/guyskk/claude-code-config-switcher/6-openspec-workflow)
- [DeepWiki: OpenSpec Integration](https://deepwiki.com/win4r/claude-code-clawdbot-skill/6.2-openspec-integration)
- [腾讯云: Claude Code 进阶必学：OpenSpec 规范驱动开发完整指南](https://developer.cloud.tencent.com/article/2668311)
- [DataCamp: Spec-Driven Development with Claude Code](https://www.datacamp.com/tutorial/spec-driven-development-with-claude-code)
- [日本开发者实践: Claude Code と OpenSpec を採用した仕様駆動開発](https://blog.amay077.net/posts/2026-02-01-18-05-47/)
