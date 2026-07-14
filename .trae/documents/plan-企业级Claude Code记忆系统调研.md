# 企业级 Claude Code 记忆系统调研补充 —— 实施计划（v2）

## Summary（摘要）

新建一份调研补充文档，聚焦"云端多 Agent 平台（每个 Docker 内独立 Agent + RAG）如何用 OpenViking 建立短期/长期记忆能力"。

- **产出物**：一份独立 Markdown 文档，与现有 `智能体集成OpenViking报告.md` 并列
- **文档定位**：调研 + 方案参考，聚焦**记忆模型 & Agent 集成差异**这两块核心；部署/运维/成本等次要话题合并到一个轻量章节，保持调研维度但不深展开
- **重要澄清（v2）**：由于每个 Docker 内是独立的 Agent + RAG，**无需在 OpenViking 层做多租户**（每个容器天然隔离），因此原 Plan 中的多租户/RBAC/API Key 章节降级或删除

---

## Current State Analysis（当前状态分析，v2 修正）

### 已有资产
- `d:\360MoveData\Users\admin\Desktop\AgiP\AGI-obsidian\智能体集成OpenViking报告.md`
  - Claude Code × OpenViking 集成细节（Hooks / MCP 双通道、7 Hooks、9 MCP 工具、L0/L1/L2 分层、LLM + Embedding + VLM 三类模型的作用）

### 缺口分析（v2 修正 —— 剔除非重点）

| 维度 | 当前是否覆盖 | 本次调研需补充 | 优先级 |
|---|---|---|---|
| Claude Code 集成机制 | ✅ 已覆盖 | 复用引用即可 | 引用 |
| **OpenClaw 集成** | ❌ 未覆盖 | 需补充（Context Engine 插件形式） | **重点** |
| **Hermes 集成** | ❌ 未覆盖 | 需补充（Built-in Provider 形式） | **重点** |
| **短期 vs 长期记忆边界** | 部分覆盖 | 需明确"晋升 promotion 规则" | **重点** |
| **未来新 Agent 扩展范式** | ❌ 未覆盖 | 需补充（MCP + SDK 通用接入路径） | **重点** |
| 多租户/RBAC/API Key | — | **降级删除**（Docker 已天然隔离，无需 OV 层多租户） | 剔除 |
| Docker/Helm 部署 | — | **降级到轻量章节**（本次不深展开） | 次要 |
| 规模化/成本/监控/灰度/回滚/迁移/风险 | — | **合并到"其他工程维度"一章**，每维度一段话 | 次要 |

---

## Proposed Changes（提议的变更，v2）

### 变更 1：新建调研补充文档

**文件**：`d:\360MoveData\Users\admin\Desktop\AgiP\AGI-obsidian\企业级Claude Code记忆系统调研.md`

**为什么**：与已有的 `智能体集成OpenViking报告.md`（逐产品集成手册）互补 —— 后者回答"某个 Agent 怎么接"，本文档回答"企业多 Agent 平台如何用 OpenViking 建立记忆能力"，聚焦**记忆模型设计 + 多 Agent 集成差异**

**如何写**：按下方精简后的 8 章骨架撰写；每章明确写"事实来源"；不编撰无来源数据

### 变更 2：文档章节骨架（v2 精简版）

```
1. 背景与目标
   1.1 公司现状（2000 人 / 云端多 Agent / 每 Docker = 独立 Agent + RAG）
   1.2 现有栈（Claude Code / OpenClaw / Hermes 已在跑）
   1.3 记忆能力缺口（无跨会话记忆 / 无跨 Agent 复用 / 无长期偏好沉淀）
   1.4 建设目标 & 非目标
   1.5 成功标准（LOCOMO 完成率 ↑ / Token ↓ / 用户可感知）

2. 需求与约束
   2.1 功能需求（短期 + 长期记忆 / 支持多类 Agent）
   2.2 非功能需求（P99 延迟 / 可用性 / 成本可控）
   2.3 部署约束（每 Docker 天然隔离，无需外挂多租户）
   2.4 生态约束（未来新 Agent 一键接入）

3. OpenViking 能力评估
   3.1 核心定位（Context Database，文件系统范式）
   3.2 命名空间模型（viking://resources/user/agent/session）
   3.3 短期 / 中期 / 长期记忆的载体机制（pending / archive / memories+skills）
   3.4 存储后端（本地 / S3）
   3.5 与 Mem0 / SuperMemory / 自建 Markdown 的对比（LOCOMO 数据）

4. 【重点】记忆模型设计
   4.1 层次总览
       - 短期：OV Session 的 pending 队列
       - 中期：archive（LLM Function Calling 7 sections 结构化）
       - 长期：memories（preferences / events / cases）+ skills
   4.2 短期记忆
       - 载体、驻留条件（pending token < 20000）
       - Recall 时机：UserPromptSubmit 每轮
   4.3 长期记忆
       - 载体：viking://user/<space>/memories/{preferences,events,cases} + skills
       - 生成：LLM Function Calling 抽取（Working Memory v2, 7 sections）
       - Recall：跨会话语义检索（Embedding 相似度）
   4.4 短期 → 长期晋升（Promotion）规则
       - 触发：pending token ≥ 20000 或 PreCompact/SessionEnd/SubagentStop
       - 处理：LLM 判类别 → Function Calling 结构化 → Embedding 向量化 → 落 viking://
   4.5 Schema（category / abstract / overview / body / embedding / peer_id）
   4.6 遗忘策略（MCP forget / archive 归档 / 会话结束）
   4.7 分层加载（L0/L1/L2）与 Token 节省策略

5. 【重点】Agent 集成方案
   5.1 统一范式：环境变量 + Hooks/Plugin/Provider 三种接入形态
   5.2 Claude Code 集成
       - 引用现有报告《智能体集成OpenViking报告.md》第二部分
       - 简要复述：7 Hooks + 9 MCP 工具
   5.3 OpenClaw 集成
       - 官方 openclaw-plugin（Context Engine 插件）
       - 主动式调用（Agent 循环内主动 recall/capture）
   5.4 Hermes 集成
       - 内置 OpenViking Provider（原生支持，无需外挂）
   5.5 三者集成差异对比矩阵
       | 维度 | Claude Code | OpenClaw | Hermes |
       | 接入形式 | Hooks + MCP | Plugin (Context Engine) | Built-in Provider |
       | 触发机制 | Claude Code 生命周期回调 | Agent 循环主动调用 | Provider 层自动 |
       | 记忆写入 | Stop Hook 自动 | Agent afterInteraction | Provider 自动 |
       | 记忆检索 | UserPromptSubmit 自动 | Agent beforeInteraction | Provider 自动 |
       | LOCOMO 完成率 | 80.32% | 82.08% | 82.26% |
       | 改造成本 | 装插件即可 | 装插件即可 | 零改造 |
   5.6 未来新 Agent 扩展指引
       - 路径 A：装 MCP 客户端 → 调用 OV Server 的 /mcp 端点
       - 路径 B：用 Python SDK 直接调用 ov.sync_openviking()
       - 路径 C：仿 Claude Code plugin 写 Hook 脚本

6. 【重点】记忆写入 & 检索的完整交互流程
   6.1 数据流：写入路径
       Agent 完成一轮回答 → Hook/Plugin 捕获 → 清洗结构化 → 
       addMessage 到 OV Session → pending 累积 → commit → 
       LLM 抽取 → Embedding → 落 viking://
   6.2 数据流：检索路径
       用户 prompt → Hook 捕获 → search /api/v1/search/find → 
       rank + dedupe + budget → 注入 <openviking-context> → Agent 生成回答
   6.3 短期/长期融合的推理效果说明
   6.4 特性开关（OPENVIKING_MEMORY_ENABLED / BYPASS_SESSION）

7. 【次要】其他工程维度（合并章节，每维度一段话即可）
   7.1 部署形态
       - 每个 Agent Docker 内独立跑 openviking-server + Agent 二进制
       - 存储后端：容器内本地卷 or 挂载 S3
       - 参考：官方 docker-compose.yml + Helm chart
   7.2 多租户与隔离
       - Docker 已天然隔离 → OV 层无需额外多租户设计
       - 若单 Docker 内需区分子 Agent，用 peer_id 隔离即可
   7.3 规模化与成本
       - 2000 人 × 30% 活跃 ≈ 600 DAU，人均 20 轮/日
       - Token 增量：Recall 注入 ~300token/轮 + Capture 抽取 ~4000token/轮
       - 存储增量：约人均 100MB/年（原文+向量）
       - 优化杠杆：RECALL_PREFER_ABSTRACT / 冷热分层
   7.4 可观测性
       - 指标：Recall 命中率、P99 延迟、commit 成功率
       - 日志：cc-hooks.log + OV Server access log
       - Statusline：用户端可见的实时状态
   7.5 灰度、发布、回滚
       - 灰度：OPENVIKING_MEMORY_ENABLED 特性开关 + BYPASS_SESSION_PATTERNS
       - 回滚：环境变量置 0 立即生效
   7.6 迁移与实施路线
       - Stage 1：单 Agent 类型试点（Claude Code）
       - Stage 2：扩展到 OpenClaw / Hermes
       - Stage 3：全 Agent 类型 + 未来新 Agent
   7.7 风险与开放问题
       - AGPL-3.0 许可对企业产品的影响（需法务确认）
       - LLM 抽取失败的兜底
       - 敏感代码/PII 入库风险

8. 附录
   8.1 关键配置样例（ov.conf 模板）
   8.2 环境变量速查表（OPENVIKING_* 全量）
   8.3 术语表
   8.4 参考资料（现有报告、官方仓库、LOCOMO、插件源码）
```

---

## Assumptions & Decisions（假设与决策，v2）

### v2 关键决策变化

1. **章节大幅精简**：从 v1 的 16 章 → v2 的 8 章
2. **删除多租户重点章节**：因每 Docker 天然隔离（用户澄清），OpenViking 层无需多租户设计；仅在 7.2 用一段话说明
3. **合并次要工程话题**：部署 / 规模化成本 / 监控 / 灰度 / 迁移 / 风险 → 全部合并到第 7 章「其他工程维度」，每个话题一段话
4. **保留三个重点章节**：
   - 第 4 章「记忆模型设计」（短期/长期/晋升/Schema/遗忘）
   - 第 5 章「Agent 集成方案」（Claude Code / OpenClaw / Hermes 差异 + 新 Agent 扩展）
   - 第 6 章「记忆写入/检索完整交互流程」（数据流可视化）

### 已作决策（无需再问）

1. **产出物形态**：新建独立 Markdown 文档，路径 `d:\360MoveData\Users\admin\Desktop\AgiP\AGI-obsidian\企业级Claude Code记忆系统调研.md`；不改动已有的 `智能体集成OpenViking报告.md`
2. **记忆中间件**：锁定 OpenViking（已有多 Agent 生态天然对齐）
3. **多租户模型**：不做（每 Docker 已隔离，仅在容器内用 peer_id 区分子 Agent）
4. **短期 vs 长期边界**：以 OpenViking 内建的 pending → archive 阈值（20000 token）为分界
5. **规模假设**：2000 人 × 30% 活跃 = 600 DAU（可在正文按实际调整）

### 假设（在正文中显式声明）

- 每个 Docker 内的 OpenViking Server 独立运行，存储不跨容器共享
- 若未来需要跨 Agent/跨部门共享记忆，可在正文第 7.7 章列为开放问题
- LLM/Embedding 走火山引擎方舟服务

---

## Verification（验证步骤）

实施完成后按以下顺序自检：

1. **章节完整性**：8 章全部存在，重点章（第 4/5/6 章）内容充实，次要章（第 7 章）每维度一段话即可
2. **事实溯源**：每一处涉及 OpenViking 机制的描述必须有官方来源引用；无来源的数字标注「合理推算」
3. **对已有报告的引用**：第 5.2 节以引用形式指向 `智能体集成OpenViking报告.md`，不重复抄写
4. **多租户降级到位**：第 7.2 节只用一段话说明"Docker 已隔离，无需 OV 层多租户"，不做深入方案
5. **重点章节详实度**：第 4 章包含短期/长期/晋升/Schema 四大子块；第 5 章包含三者集成差异矩阵；第 6 章包含写入/检索双向数据流
6. **无时间点/日期**：全文不含"第几周""XX 月内完成"字样
7. **无编撰**：不出现任何未在官方仓库/官网/已有报告中出现过的机制、组件、配置项

---

## 参考资料

- 已有文档：`d:\360MoveData\Users\admin\Desktop\AgiP\AGI-obsidian\智能体集成OpenViking报告.md`
- OpenViking 官方仓库：https://github.com/volcengine/OpenViking
- OpenViking 官网：https://openviking.ai/
- Claude Code 插件源码：https://github.com/volcengine/OpenViking/tree/main/examples/claude-code-memory-plugin
