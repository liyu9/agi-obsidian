# Kanban 工作流配置指南

> 基于 Hermes v0.13.0+ 实际机制，源码参考：[skills/devops/](https://github.com/NousResearch/hermes-agent/tree/main/skills/devops)

## 一、前置条件

- Hermes Agent v0.13.0+ 已安装
- 模型 API 密钥已配置（如 MiniMax）

## 二、创建 Profile

```bash
# 协作模式 Profile
hermes profile create coordinator
hermes profile create analyst
hermes profile create ai-pm
hermes profile create planner
hermes profile create advisor

# 独立模式 Profile
hermes profile create agent-pm

# 验证创建成功
hermes profile list
```

## 三、配置模型

```bash
hermes -p coordinator model    # 选 M2.7-highspeed
hermes -p analyst model        # 选 M2.7-highspeed
hermes -p ai-pm model          # 选 M2.7-highspeed
hermes -p planner model        # 选 M2.7-highspeed
hermes -p advisor model        # 选 M2.7-highspeed
hermes -p agent-pm model       # 选 Claude Sonnet 4
```

## 四、写入 SOUL.md

将各 Profile 的 SOUL.md 写入对应目录：

```bash
# SOUL.md 位置
~/.hermes/profiles/coordinator/SOUL.md
~/.hermes/profiles/analyst/SOUL.md
~/.hermes/profiles/ai-pm/SOUL.md
~/.hermes/profiles/planner/SOUL.md
~/.hermes/profiles/advisor/SOUL.md
~/.hermes/profiles/agent-pm/SOUL.md
```

SOUL.md 模板见：
- [02-SOUL-coordinator.md](02-SOUL-coordinator.md)
- [03-SOUL-analyst.md](03-SOUL-analyst.md)
- [04-SOUL-planner.md](04-SOUL-planner.md)
- [05-SOUL-advisor.md](05-SOUL-advisor.md)
- [06-SOUL-ai-pm.md](06-SOUL-ai-pm.md)
- [07-Agent产品经理配置指南.md](07-Agent产品经理配置指南.md)（agent-pm 的完整配置：SOUL+MEMORY+USER+config）

## 五、安装额外技能

kanban-orchestrator 和 kanban-worker 是 bundled 技能，dispatcher 在 spawn worker 时自动加载 `--skills kanban-worker`，无需手动安装。

如需额外技能：

```bash
hermes -p analyst skills install web-search summarize
hermes -p planner skills install web-search summarize
```

## 六、初始化看板

```bash
hermes -p coordinator kanban init
```

## 七、启动协作

```bash
coordinator chat
```

在 coordinator 的聊天中描述任务，coordinator 会自动：
1. `hermes profile list` 确认可用 Profile
2. 分解任务，用 `kanban_create(parents=[...])` 创建任务链
3. dispatcher 自动调度 worker

## 八、常见操作速查

| 操作 | 命令 |
|------|------|
| 查看 Profile 列表 | `hermes profile list` |
| 查看看板任务 | `hermes kanban list` |
| 查看任务详情 | `hermes kanban show <task_id>` |
| 手动创建任务 | `hermes kanban create "标题" --assignee <profile> --parent <parent_id>` |
| 回收卡住的任务 | `hermes kanban reclaim <task_id>` |
| 重新分配任务 | `hermes kanban reassign <task_id> <new-profile> --reclaim` |
| 解除阻塞 | `hermes kanban unblock <task_id>` |
| 跟踪任务日志 | `hermes kanban tail <task_id>` |
| 切换 Profile 模型 | `hermes -p <profile> model` |

## 九、故障恢复

当 worker 崩溃、幻觉或卡住时：

| 场景 | 操作 | 说明 |
|------|------|------|
| Worker 崩溃 | dispatcher 自动 reclaim | 任务回到 ready，另一个 worker 接手 |
| Worker 幻觉 | `created_cards` 门控自动拦截 | 虚假 task_id 会导致 complete 被拒绝 |
| Worker 卡住 | `hermes kanban reclaim <id>` | 手动回收，任务重置为 ready |
| 模型不适合 | `hermes kanban reassign <id> <profile> --reclaim` | 切换到更合适的 Profile |
| Profile 配置错误 | `hermes -p <profile> model` | 切换模型后 reclaim 重试 |
| 连续失败超阈值 | 任务标记 gave_up | 熔断保护，需要人工介入 |

## 十、验证清单

- [ ] `hermes profile list` 显示6个 Profile（coordinator, analyst, ai-pm, planner, advisor, agent-pm）
- [ ] coordinator 的 SOUL.md 包含"Step 0: 发现 Profile"步骤
- [ ] `kanban_create` 使用 `parents=[...]` 而非 `kanban_link`
- [ ] `kanban_block` 带 `reason="..."` 参数
- [ ] `kanban_complete` 包含 `created_cards=[...]`
- [ ] assignee 名称与 `hermes profile list` 输出一致
