# Skill 设计模式参考手册

> 本文档整理自公网调研（Claude Agent Skills 官方文档、GitHub 仓库、AI Agent 编排模式研究），作为 Skill 设计的参考指南。

---

## 一、Skill 设计模式

### 1.1 渐进式披露（Progressive Disclosure）

**来源：** [Claude Agent Skills 官方文档](https://docs.claude.com/en/docs/agents-and-tools/agent-skills/overview)

Skill 内容分三层加载，避免一次性消耗上下文窗口：

```
Level 1: frontmatter name + description
         → 始终加载，用于触发匹配
         → 控制在 200 字以内

Level 2: SKILL.md 正文
         → 触发后才加载
         → 核心流程、规则、脚本说明

Level 3: 额外参考文件（references/、troubleshooting.md 等）
         → 按需加载，Agent 自行判断是否读取
         → 容量无上限
```

**设计原则：** 像入职手册组织——先看目录，再看章节，最后查附录。

---

### 1.2 多阶段工作流（Multi-Stage Workflow）

**适用：** 批量数据处理、复杂业务流程

```
阶段A: 环境检测   → 前置条件校验
阶段B: 初始化     → 生成清单 + 创建目录
阶段C: 核心处理   → 流水线并行执行
阶段D: 收尾清理   → 用户确认 + 整理输出
```

**关键约束：**
- 每个阶段有明确的输入/输出/前置条件
- 禁止跨阶段跳跃
- 关键节点需用户确认
- 每个阶段有具体产出物

---

### 1.3 Sub-Agent 编排模式

#### Swarm（蜂群）模式

**来源：** [subagent.developersdigest.tech](https://subagent.developersdigest.tech/patterns)

```
┌─ Worker 1 ─┐
Task ──► │ Worker 2  │ ──► Merge
         └─ Worker N ─┘
```

- Worker 之间不能通信（无共享状态）
- 资源使用随 Worker 数量线性增长
- 适用：批量分类、多文件分析、大规模数据处理

#### Supervisor（监督者）模式

```
         ┌─ Specialist A ─┐
Task ──► Supervisor ──┼─ Specialist B ─┼──► Result
         └─ Specialist C ─┘
```

- Supervisor 负责分解、委派、审查、综合
- Specialist 只做一件事
- 适用：复杂项目需要多种专业技能

#### Pipeline（流水线）模式

```
Task ──► Stage 1 ──► Stage 2 ──► Stage 3 ──► Result
```

- 每阶段专业化处理
- 总延迟 = 各阶段之和
- 适用：研究→起草→编辑→发布等多阶段内容处理

#### Map-Reduce 模式

```
Input → Split → ┌─ Map 1 ─┐
                 │ Map 2   │ → Reduce → Result
                 └─ Map N ─┘
```

- 并行 map 处理独立块，reduce 聚合
- 适用：大规模数据分析、批量内容生成

---

### 1.4 分批确认（Batch-Confirm）

**适用：** 大规模内容处理（50+ 项）

```
大任务 → 按 N 项/批分组
  → 每批执行前输出"处理计划"
  → 用户确认后执行
  → 执行完汇报结果
  → 下一批
```

**关键设计：**
- 固定批次大小
- 每批有独立的确认机制
- 进度可追踪

---

### 1.5 防护规则（Guard Rails）

**适用：** 所有涉及文件系统操作的 Skill

**五层防护体系（参考 agi-knowledge-maintainer）：**

```
Layer 1: 图片资源管控   → 统一命名、相对路径
Layer 2: 文本保真度保护 → 禁止过度概括，保留核心原文
Layer 3: 目录变更控制   → 增删必须先输出计划
Layer 4: 文件变更控制   → 新建/删除/移动必须记录原因
Layer 5: 结构完整性     → 不得在指定范围外创建目录
```

**标注规范：**
- ❌ 禁止行为
- ✅ 推荐行为

---

### 1.6 决策树路由（Decision Tree Routing）

**适用：** 复杂条件分支场景

```
用户任务 → 条件A？
    ├─ Yes → 路径A
    └─ No  → 条件B？
        ├─ Yes → 路径B
        └─ No  → 默认路径
```

**设计要点：**
- 用 ASCII 树形结构明确分支逻辑
- 每个分支有具体操作指令
- 内置常见陷阱警告

---

### 1.7 黑盒脚本调用（Black-Box Script）

**适用：** 集成外部工具/脚本

```
原则：
1. 先 --help 或 --version 确认脚本可用
2. 不读源码，只看接口
3. 输入输出格式明确
4. 错误通过 exit code + stderr 传递
```

---

### 1.8 异步子代理架构（Async Subagent）

**来源：** [LangChain Deep Agents SDK (2026.04)](https://github.com/kejun/blogpost/blob/main/2026-04-09-ai-agent-async-subagent-orchestration.md)

**核心设计原则：**
- Orchestrator-Subagent 分层：主代理负责任务分解，子代理专注领域执行
- 异步并发执行：独立子任务并行处理
- 领域上下文隔离：每个子代理拥有独立的工具和记忆空间

**性能对比：**
```
串行: Task → Tool A(120s) → Tool B(120s) → Tool C(120s) = 360s
并行: Task → [A + B + C 并发] = ~120s（提升 67%）
```

**任务分解规则：**
- 可并行的：独立数据获取、同构批量操作
- 必须串行的：有数据依赖的处理步骤

---

### 1.9 Sub-Agent 契约模式（Agent Contract）

**来源：** [Dispatching Parallel Agents](https://claudeskills.club/skills/dispatching-parallel-agents-by-donellmccoy)

每个 Sub-Agent 应定义：

```
1. Specific scope    → 处理范围（哪些文件/数据）
2. Clear goal        → 成功标准（通过什么条件算完成）
3. Constraints       → 约束条件（不能做什么）
4. Expected output   → 输出格式（JSON Schema）
5. Timeout           → 超时策略（多久算失败）
6. Retry             → 重试策略（失败后怎么办）
```

---

## 二、优秀案例

### 2.1 Claude 官方 PDF Skill

**来源：** [github.com/anthropics/skills](https://github.com/anthropics/skills/tree/main/document-skills/pdf)

```
pdf/
├── SKILL.md          # 核心指令（~200行）
├── reference.md      # API 参考（按需加载）
└── forms.md          # 表单填写指南（按需加载）
```

**亮点：**
- 渐进式披露的经典实现
- 核心指令精简，细节按需加载
- 为 Claude 的文档编辑能力提供底层支撑

---

### 2.2 Dispatching Parallel Agents

**来源：** [claudeskills.club](https://claudeskills.club/skills/dispatching-parallel-agents-by-donellmccoy)

**场景：** 多个不相关的测试文件同时失败

**设计：**
```
1. 按失败文件分组（独立域）
2. 每个 Agent 处理一个文件
3. 每个 Agent 获得：范围 + 目标 + 约束 + 预期输出
4. 并行执行
5. Review + 集成
```

**关键决策树：**
```
多个失败？
├─ Yes → 是否独立？
│   ├─ Yes → 可并行？→ 并行派发
│   └─ No  → 单 Agent 处理
└─ No  → 单 Agent 处理
```

---

### 2.3 Claude Code Custom Agent Design

**来源：** [github.com/melodic-software/claude-code-plugins](https://github.com/melodic-software/claude-code-plugins/blob/main/plugins/tac/skills/custom-agent-design/SKILL.md)

**7 步设计流程：**

```
Step 1: 定义 Agent 目的（2-3句话）
Step 2: 选择模型（Haiku/Sonnet/Opus）
Step 3: 设计 System Prompt（Override vs Append）
Step 4: 配置工具访问（白名单/黑名单）
Step 5: 添加治理（Hooks，可选）
Step 6: 选择部署形式（Script/REPL/API/Multi-Agent）
Step 7: 创建配置（ClaudeAgentOptions）
```

---

### 2.4 Microsoft AI Agent 编排模式

**来源：** [learn.microsoft.com](https://learn.microsoft.com/en-us/azure/architecture/ai-ml/guide/ai-agent-design-patterns)

**复杂度光谱：**

| 级别 | 描述 | 适用场景 |
|------|------|---------|
| Direct Model Call | 单次 LLM 调用 | 分类、摘要、翻译 |
| Single Agent + Tools | 一个 Agent + 多工具 | 单领域查询+工具调用 |
| Multi-Agent Orchestration | 多个专业 Agent 协作 | 复杂跨领域任务 |

**选择原则：** 用满足需求的最低复杂度方案。

---

### 2.5 LangChain Deep Agents

**来源：** [LangChain 2026.04 发布](https://github.com/kejun/blogpost/blob/main/2026-04-09-ai-agent-async-subagent-orchestration.md)

**生产级性能数据：**

| 场景 | 串行耗时 | 并发目标 | 提升 |
|------|---------|---------|------|
| 多源数据聚合分析 | 45-90s | 15-25s | ~67% |
| 跨 API 信息验证 | 30-60s | 10-15s | ~75% |
| 批量内容生成 | 120-300s | 40-80s | ~73% |
| 复杂代码审查 | 60-120s | 20-35s | ~71% |

**错误恢复设计：**
```
单个子代理失败 → 不影响整体
  → 记录失败任务
  → 继续处理其他任务
  → 最终统一重试失败任务
```

---

## 三、SKILL.md 编写规范

### 3.1 Frontmatter 规范

```yaml
---
name: "skill-name"          # 必填，小写+连字符
description: "..."           # 必填，功能描述+触发条件，200字以内
---
```

**description 写法对比：**

| 质量 | 示例 |
|------|------|
| ❌ 弱 | "帮助提取极客时间文章" |
| ✅ 强 | "从极客时间批量获取课程文档。通过CDP连接Chrome，并行提取文本图片，保存为Markdown。触发：批量提取/获取极客时间课程" |

强 description 包含：**具体能力 + 触发条件 + 边界**

### 3.2 正文结构规范

```markdown
# Skill 标题

## 前置条件        → 运行环境、依赖、用户准备
## 脚本说明        → 文件清单、用途、参数
## 硬性规则        → ❌/✅ 标注的约束
## 完整流程        → 分阶段，每阶段有输入/输出
## 质量标准        → 检查项、级别（FAIL/WARN）、标准
## 异常处理        → 异常→处理方式的映射表
## 触发条件        → 关键词、意图、URL 模式
```

### 3.3 文件组织规范

```
skill-name/
├── SKILL.md              # 必填，核心指令（建议 < 150 行）
├── scripts/              # 可选，执行脚本
├── todolist-template.md  # 可选，TodoWrite 模板
├── troubleshooting.md    # 可选，异常处理参考
└── references/           # 可选，深层参考文档
```

---

## 四、参考资源

| 资源 | URL | 说明 |
|------|-----|------|
| Claude Agent Skills 官方文档 | https://docs.claude.com/en/docs/agents-and-tools/agent-skills/overview | 官方 Skill 架构说明，渐进式披露核心文档 |
| Claude Skill 编写指南 | https://claude.com/blog/how-to-create-skills-key-steps-limitations-and-examples | 5步创建法，description 写法最佳实践 |
| Agent Skills 工程博客 | https://claude.com/blog/equipping-agents-for-the-real-world-with-agent-skills | Anthropic 工程团队的设计思路 |
| Sub-Agent 编排模式大全 | https://subagent.developersdigest.tech/patterns | 12种编排模式对比（Swarm/Pipeline/Supervisor/Map-Reduce 等） |
| Microsoft AI Agent 设计模式 | https://learn.microsoft.com/en-us/azure/architecture/ai-ml/guide/ai-agent-design-patterns | 企业级 Agent 编排模式，复杂度光谱 |
| Dispatching Parallel Agents | https://claudeskills.club/skills/dispatching-parallel-agents-by-donellmccoy | 并行 Agent 派发的实用 Skill 案例 |
| Claude Code Custom Agent Design | https://github.com/melodic-software/claude-code-plugins | 7步 Agent 设计流程 |
| LangChain Deep Agents 异步子代理 | https://github.com/kejun/blogpost/blob/main/2026-04-09-ai-agent-async-subagent-orchestration.md | 生产级异步子代理架构分析，含性能数据 |
| Claude Code Skill Creator 模板 | https://github.com/anthropics/skills/tree/main/skill-creator | 官方 Skill 创建模板 |
| Semantic Kernel 并发编排 | https://learn.microsoft.com/en-us/semantic-kernel/Frameworks/agent/agent-orchestration/concurrent | 企业级 Agent 并发编排实现 |
| CrewAI 多 Agent 框架 | https://github.com/crewAIInc/crewAI | Role/Task/Tool 三层抽象，最接近 sub-agent 编排 |
| AutoGen 多 Agent 对话 | https://github.com/microsoft/autogen | 微软多 Agent 对话框架，GroupChat 模式 |
| OpenAI Agents SDK | https://github.com/openai/openai-agents-python | 最新 Agent 编排范式，Handoff 模式 |
