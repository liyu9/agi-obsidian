# 33｜项目实战 5：系统加固你的 XiaoPaw 本地工作助手

> 来源：极客时间《企业级多智能体设计实战》
> 当前播放：33｜项目实战 5：系统加固你的 XiaoPaw 本地工作助手
> 提取日期：2026-06-02
> 原文长度：15572 字

---

欢迎回来！

本课是我们整个第二大篇章——工程篇的最后一节。上节课我们把安全的三层防御——沙箱、权限网关、身份认证——在独立的 demo 环境里全部跑通了。32 课结尾我说过一句话：**下一节课，我们把这三层全部装到 XiaoPaw 上。**

今天就是兑现承诺的时刻。

![图片](assets/260602-135-图片1.png)

回忆一下，22 课我们做了一个带记忆的 XiaoPaw，集成了第 17 课的工具、后面的三层记忆。但那时候的 XiaoPaw，说白了还是在"裸奔"——它禁不住 prompt 注入，可能出现无限循环，可能被攻击者穿越路径，而且一切都不可观测。今天我们要让它变成什么样呢？**戴上可观测性的面罩、穿上可靠性的装甲、举起安全性的盾牌**——这样才能真正放到生产环境里去用。

先看效果，再看改了什么，然后逐层拆解设计——**全程业务代码 0 行修改**。

---

## 一、效果先行：加固后的 XiaoPaw 长什么样？

我们不讲概念，直接看效果。

### 正常对话的 Langfuse 全链路追踪

打开 Langfuse，切到 Tracing 视图。每一个请求就是一条 trace。你也可以切到 Observation 视图，这样每一个 span 就直接铺开展示。我们还是按 trace 视图来看。

用户发送"帮我搜索一下 Python 3.13 有什么新特性"，XiaoPaw 回复完成。打开 Langfuse Traces 列表：

![图片](assets/260602-136-图片2.png)

同一个 sessionId 的两轮对话自动归到一条会话时间线。这里面还能看到各种统计——trace 数量、成本统计，后面如果接入计费就都可以做。展开第二轮（搜索那条）：

![图片](assets/260602-137-图片3.png)

一个真正的请求进来以后，它是以一条树状的 trace 结构呈现的。你能看到：一个 input 进去后，到具体 tool 的执行，每一次给模型的调用（input 是什么）、调用完后去调了什么 skill（skill_loader 启动了 sub-crew）、sub-crew 里的提示词、执行结果、调用的工具——全都一目了然。

比如测试记忆功能：请求进去后，模型判断需要调 memory_save skill，skill_loader 启动 sub-crew，sub-crew 里先读当前用户档案（file read），再写入新的信息（file write），完成 task 返回。整个过程在 Langfuse 里都是清晰的树状结构。

三层结构对应 30 课的事件体系：`BEFORE_LLM` → generation-create / `BEFORE_TOOL_CALL` → span-create / `SESSION_END` → session_end span。不需要在 Agent 代码里写一行埋点——全是 `hooks.yaml` 里声明的 handler 自动干的。

### 攻击被拦截时，Langfuse 里长什么样

现在试几条攻击消息。

**路径穿越**——“导出数据到 `../../etc/passwd`”。直接在执行工具的时候就被发现并拦截：

![图片](assets/260602-138-图片4.png)

**跨用户信息查询**——试图读取其他用户的数据，权限网关拦截。

打开 Langfuse，被拦截的请求同样有完整 trace：

![图片](assets/260602-139-图片5.png)

**被拦截的请求和正常请求一样有完整证据链**——你永远知道发生了什么，包括那些被挡下来的。这也是可观测性的价值所在：你可以从里面发现问题，并且去修改你的提示词或 skill 的描述。

与此同时，`security_audit.jsonl` 追加一行：

```json
{"timestamp":"2026-04-25T14:23:11Z","event":"DENY","strategy":"sandbox_guard","reason":"PATH_TRAVERSAL","input":"../../etc/passwd"}
```

这就是 30-32 课三层加固装到 XiaoPaw 上的效果。下面看是怎么做到的。

---

## 二、改动全景：四课积累，一次接线

底层还是我们 22 课的 XiaoPaw with memory。但在这个里面，我们新增了 700 多行不算注释的代码——这些代码几乎都放在了 hook 的那个文件夹，就是我们之前学习的那个

`hook_framework/` 和 `shared_hooks/`。而实际上，底层框架的改动可能就只有 6 行，业务代码没有任何改动。

![图片](assets/260602-140-图片6.png)

就是在我们整个骨架上加上了 hook 的架构，加了一大堆 hook handler，然后在一个配置文件中把它配起来——就可以让整个 XiaoPaw 很好地集成 30 课的可观测性、31 课的可靠性、32 课的安全限制。

>
> 💡 课程说明：本节代码已同步至 GitHub 仓库 xiaopaw-v2，详见仓库 README 的"课堂代码演示学习指南"部分。
>

### 按课来看贡献

**30 课：Hook 骨架 + 可观测层（303 行）**

| 文件 | 职责 |
| --- | --- |
| hook_framework/registry.py | HookRegistry 引擎、EventType（7 种）、HookContext（只读）、GuardrailDeny |
| hook_framework/crew_adapter.py | 把 CrewAI 的回调（@before_tool_use / step_callback）桥接到 5+2 事件体系 |
| hook_framework/loader.py | YAML 解析、两层加载、deps 依赖注入 |
| shared_hooks/structured_log.py | 每个 Hook 事件写一行 JSON 到 stderr |
| shared_hooks/langfuse_trace.py | Langfuse 全链路追踪——trace 树构建、session 复用、sub-crew 连接、强制 flush |

这五个文件搭起了两件事：一是"事件发生时怎么分发"（HookRegistry），二是"怎么把事件变成 Langfuse 里一棵有层次的 trace 树"（langfuse_trace）。

**31 课：可靠性策略层（147 行）**

| 文件 | 职责 | 挂载事件 |
| --- | --- | --- |
| shared_hooks/cost_guard.py | 实时累计 token 成本；超预算则 GuardrailDeny | BEFORE_TOOL_CALL（拦截）+ AFTER_TURN（算账） |
| shared_hooks/loop_detector.py | 对工具调用输出和 Agent 输出做 MD5 哈希去重；连续 N 次相同则判定循环并 deny | AFTER_TOOL_CALL + AFTER_TURN |
| shared_hooks/retry_tracker.py | 纯观测：记录工具连续失败次数和重试成功率；只打 WARNING，不 deny | AFTER_TOOL_CALL |

31 课还验证了 `pending_deny` 模式——因为 CrewAI 会吞掉 `@before_tool_use` 里的异常，需要把 GuardrailDeny 存起来，等 `step_callback` 这个安全出口再重抛。

**32 课：安全策略层（249 行）**

| 文件 | 职责 | 挂载事件 |
| --- | --- | --- |
| shared_hooks/sandbox_guard.py | 4 组正则（路径穿越、危险命令、Shell 注入、Prompt 注入）+ NFKC 归一化 + 迭代 URL 解码；命中则 GuardrailDeny | BEFORE_TOOL_CALL |
| shared_hooks/permission_gate.py | 从 YAML 读取工具权限矩阵（deny/warn/allow），按 routing_key 判断调用方是否有权限 | BEFORE_TOOL_CALL |
| shared_hooks/audit_logger.py | 把每次 GuardrailDeny 写入 append-only JSONL 审计日志；SESSION_END 时写入本次会话的安全摘要 | SESSION_END |

32 课还引入了 `deps` 注入机制——sandbox_guard 和 permission_gate 共享同一个 audit_logger 实例，审计记录不会分散。

**33 课：接线 + 启动（6 行改动 + 1 个新文件）**

今天的工作只有两件事：

`shared_hooks/hooks.yaml`（今天新写）：把上面所有 handler 声明进来，配好执行顺序，注入 deps。这是今天唯一新写的实质性文件。

`xiaopaw/runner.py`（+4 行）：创建 adapter → pre-flight 检查（对用户原始输入提前触发 BEFORE_TOOL_CALL）→ 兜底 catch GuardrailDeny → cleanup 触发 SESSION_END。

`xiaopaw/agents/main_crew.py`（+2 处）：把 adapter 传给 CrewAI 的 step_callback 和 task_callback。

**总计：新增 699 行，改动 6 行，业务代码 0 行修改。** 这不是运气，是 30 课建骨架时就确立的设计原则：加固层通过事件分发接入，不修改 Agent 执行逻辑。

---

## 三、代码演示学习指南：四站路线

在看核心架构之前，先说说这套代码应该怎么学。README 里有一个"课堂代码演示学习指南"，我把学习路径分成了四站。

**第一站：回顾 17 课基础能力**

从 `runner.py` 进去——把每一个消息给到一个 main_crew 去执行，main_crew 在调用 skill 时通过 skill_loader 启动自己的 sub-crew 去执行。这就是我们基础的能力。

**第二站：回顾 22 课三层记忆**

Bootstrap（冷启动指令）、File Memory（用户档案读写）、pgvector 向量库检索历史消息——全都在这里集成。包括 sub-crew 如何续接上下文，如何用 sub 的方式去执行。

**第三站：启动环境**

本次的启动比较费劲。你需要起好几个容器：

- OCI 运行沙箱：XiaoPaw 本身执行工具用的安全沙箱
- PostgreSQL 容器：记忆需要的数据库
- Langfuse Docker：可观测性（也可以使用 Langfuse 云端版）
- 飞书配置：我们的 XiaoPaw 连的是飞书入口

具体的命令和 docker-compose 文件都写好了，README 里有详细步骤。

**第四站：本课重点——Hook 加固层**

这就是我们今天的核心内容。首先看 `hook_framework/registry.py`（两套分发机制），然后看 `shared_hooks/hooks.yaml`（声明配置），最后看 `shared_hooks/langfuse_trace.py`（trace 树最复杂的部分）。

---

## 四、核心架构：HookRegistry 的两套机制

`HookRegistry` 是那根"零侵入"的骨干。Agent 代码对它毫无感知——它拦截 CrewAI 的回调，翻译成统一的事件体系，再交给各个 handler 处理。

![图片](assets/260602-141-图片7.png)

还记得吗？我们做了一个 HookRegistry。它的核心就是两套机制——一套是 `dispatch`（报警器），只进行操作不进行拦截；还有一种叫 `dispatch_gate`，可以拦截。我们直接看代码。

**第一种：**`dispatch()`**——报警器模式**

```python
# xiaopaw/hook_framework/registry.py
def dispatch(self, event_type: EventType, context: HookContext):
    for handler, _fail_closed in self._handlers[event_type]:
        try:
            handler(context)
        except Exception as e:
            print(f"handler error: {e}", file=sys.stderr)
            # 异常被吞掉，不影响后续 handler 和业务执行
```

所有异常被吞掉。这是**观测层**的需求：Langfuse 网络超时？写日志失败？观测系统绝对不能成为业务的单点故障。因为它是 dispatch，所以保持完全静默——顶多打一条日志，但不会影响前面 Agent 的执行。

**第二种：**`dispatch_gate()`**——保险丝模式**

```python
def dispatch_gate(self, event_type: EventType, context: HookContext):
    for handler, fail_closed in self._handlers[event_type]:
        try:
            handler(context)
        except GuardrailDeny:
            raise  # 只有这个异常能穿透   # 💡 核心点：第一个 deny 触发，链路中止
        except Exception as e:
            if fail_closed:
                raise GuardrailDeny(DenyReason.SANDBOX_VIOLATION, str(e)) from e
            print(f"handler error: {e}", file=sys.stderr)
```

跟 dispatch 的唯一区别就在这儿——一旦碰到问题，尤其是碰到安全 deny 类的问题，它会向上传播，打断整个 crew 的运行，让整个 XiaoPaw 返回一个安全相关的拒绝消息。

注意 `fail_closed` 参数：当安全 handler 自己崩溃时，`fail_closed=True` 意味着"安全组件坏了，默认拒绝"——宁可多拦一次让工程师来看。

还有一个容易忽略的细节：`HookContext` 是 `frozen=True` 的 dataclass，`tool_input` 和 `metadata` 转为 `MappingProxyType`（只读字典代理）。Handler 只能读数据，不能修改——防止一个 handler 篡改输入导致后续 handler 看到脏数据。

**两套机制 → 两段配置**

这两种分发模式直接映射到 `hooks.yaml` 的两段式结构：

```yaml
# shared_hooks/hooks.yaml
# ── 观测层（dispatch，fire-and-forget）────────────
hooks:
  BEFORE_TOOL_CALL:
    - handler: structured_log.before_tool_handler
    - handler: langfuse_trace.before_tool_handler
  # ... 其他事件
 
# ── 策略层（dispatch_gate，GuardrailDeny 可穿透）──
strategies:
  - name: audit_logger
    class: audit_logger.SecurityAuditLogger
  - name: sandbox_guard
    class: sandbox_guard.SandboxGuard
    deps:
      audit: audit_logger
    hooks:
      BEFORE_TOOL_CALL: before_tool_handler
  - name: permission_gate
    class: permission_gate.PermissionGate
    deps:
      audit: audit_logger
    hooks:
      BEFORE_TOOL_CALL: before_tool_handler
  # ... 其他策略
```

上半段 `hooks:` → `dispatch()`，崩了不影响业务。下半段 `strategies:` → `dispatch_gate()`，deny 能真正阻断。

大家可以看到，hooks 段里都是纯观测的——一个写本地 log，一个写 Langfuse trace，都是做可观测性的。策略段里才有安全策略（sandbox）、权限策略（permission_gate）、成本控制（cost_guard）、循环检测（loop_detector）这些东西。

---

## 五、执行顺序：声明顺序就是执行顺序

`hooks.yaml` 里每一行的位置都有意义——**声明顺序决定实例化顺序，实例化顺序决定执行顺序**。

![图片](assets/260602-142-图片8.png)

这个顺序是需要被设计的。下面是 `BEFORE_TOOL_CALL` 触发时的完整执行链：

```plain
BEFORE_TOOL_CALL（dispatch_gate）
  1. structured_log.before_tool_handler    ← 观测层（hooks 段）
  2. langfuse_trace.before_tool_handler    ← 观测层（hooks 段）
  3. sandbox_guard.before_tool_handler     ← 安全层（strategies 段，fail_closed）
  4. permission_gate.before_tool_handler   ← 访问控制（strategies 段，fail_closed）
  5. cost_guard.before_tool_handler        ← 预算检查（strategies 段）
```

以及 `AFTER_TURN`（每轮结算）：

```plain
AFTER_TURN（dispatch_gate）
  1. structured_log.after_turn_handler     ← 观测
  2. langfuse_trace.after_turn_handler     ← 观测
  3. cost_guard.after_turn_handler         ← 算账（必须在 loop_detector 前）
  4. loop_detector.after_turn_handler      ← 循环检测（可能 deny）
```

整个顺序应该是：**首先观测→然后安全→最后成本**。为什么？

因为你要保证观测的记录全都被先记下来。一旦后面被拦掉、被 deny 掉、抛出异常以后，如果还没有观测，你会恰恰记录不到最关键的信息。所以一定是先观测，观测之后再做安全防护——拦截沙箱的东西、拦截权限的东西。然后最后再做成本相关的检查，防止成本计算因为前面 deny 了而没有执行，影响后面的运行。

这个顺序有三条关键约束，每条都有具体后果。

---

### 约束一：观测段必须整体先于策略段

**问题：** 观测 handler 和策略 handler 都注册在 `BEFORE_TOOL_CALL`。`dispatch_gate` 遇到 `GuardrailDeny` 立即中止迭代——如果策略先执行并拒绝，后面的 handler 全部跳过。

**不解决的后果：** 攻击者发来路径穿越，SandboxGuard 拦截，但 Langfuse 没机会记录。被攻击的日志反而是最需要有记录的——结果 Langfuse 里什么都看不到。

**怎么解决的：** `HookLoader` 硬编码 `_load_hooks_section()` 先于 `_load_strategies_section()` 执行，所有事件的观测 handler 都注册在策略 handler 之前。这不是约定，是代码强制。

```python
# xiaopaw/hook_framework/loader.py
def load_from_directory(self, hooks_dir: Path, ...):
    self._load_hooks_section(config, hooks_dir, layer_name, fail_closed_names)    # ← 先执行
    self._load_strategies_section(config, hooks_dir, layer_name, fail_closed_names)  # ← 后执行
```

即使 SandboxGuard 在步骤 3 触发 deny，步骤 1、2 已经执行完毕，Langfuse 里有这次调用的记录，并且 `after_tool_handler` 还会额外标记 `guardrail_deny: True`，给 Langfuse 加上被拦截的标记。

---

### 约束二：audit_logger 必须在 strategies 段中排第一

**问题：** `sandbox_guard` 和 `permission_gate` 声明了 `deps: {audit: audit_logger}`——它们需要共享同一个 `SecurityAuditLogger` 实例来写审计日志。`HookLoader` 按声明顺序实例化，如果 `audit_logger` 还没被实例化就去查 deps，返回 `None`。

**不解决的后果：** `SandboxGuard.__init__(audit=None)` 被调用，运行时调用 `self.audit.log(...)` 时 `AttributeError`。而 `sandbox_guard` 是 `fail_closed=True`——安全组件自己崩了，等同于拒绝所有请求。系统完全瘫痪，每一条消息都返回"安全策略拦截"。

陷阱在于：`HookLoader` 在 deps 找不到时只打 WARNING，不崩溃（fail-open 设计，开发友好）。实际的爆炸发生在 `SandboxGuard` 内部第一次调用 `audit` 时，而且是 fail_closed 的爆炸——把所有请求都拒掉，最难排查。

**怎么解决的：** `hooks.yaml` 的 strategies 段中，`audit_logger` 声明在第一位。

```yaml
strategies:
  - name: audit_logger       # ← 必须第一个，被后面的 deps 依赖
    class: audit_logger.SecurityAuditLogger
  - name: sandbox_guard
    deps:
      audit: audit_logger    # ← 引用已实例化的 audit_logger
  - name: permission_gate
    deps:
      audit: audit_logger    # ← 同一个实例，不是新建
 
---

```

### 约束三：cost_guard 必须先于 loop_detector（AFTER_TURN）

**问题：** `AFTER_TURN` 触发时，`cost_guard` 负责算账（把这轮的 token 成本累积进去），`loop_detector` 负责检测是否循环（可能抛 `GuardrailDeny`）。`dispatch_gate` 遇到 deny 立即中止，cost_guard 被跳过。

**不解决的后果：** 循环场景是高消耗场景——Agent 在重复调用工具，偏偏是最需要准确计费的情况。但因为 loop_detector 先触发了 deny，cost_guard 永远没机会运行。时间长了，`cost_guard` 的预算计算严重偏低，"1 美元预算"可能实际已经花了 3 美元。

**怎么解决的：** `hooks.yaml` 的 strategies 段中，`cost_guard` 声明在 `loop_detector` 前面。AFTER_TURN 的执行顺序是先算账再检测，即使 loop_detector 触发 deny，cost_guard 的账已经记下来了。

---

## 六、Trace 树：从事件到完整树形结构

刚才大家看到了 Langfuse 里那棵清晰的 trace 树。现在最有意思的一个问题来了：**这么多零散的 hook 节点上面的东西，是怎么穿成这棵树的？**

![图片](assets/260602-143-图片9.png)

这里有五个关键机制。

### 机制一：多轮对话如何留在同一棵树

**问题：** 一次对话有多轮消息。Langfuse 里怎么让 Turn 1 和 Turn 2 归属同一条 trace，而不是变成两棵独立的树？

**怎么解决的：** `trace_id = session_id`，不使用随机 UUID。`trace-create` 在 Langfuse 里是 upsert 操作——相同 ID 的第二次调用是更新，不是新建。

```python
# shared_hooks/langfuse_trace.py
def _get_trace_id(ctx) -> str:
    trace_id = _ext_trace_id_var.get("-")
    if trace_id == "-":
        trace_id = ctx.session_id   # ← 用 session_id 作为 trace_id
    return trace_id or ""
```

每轮有自己的 root span（`session-{sid}`），但都挂在同一个 trace 下。用对话 ID 作为 trace ID，这样就能保证所有对话都在一棵树里面。

---

### 机制二：Sub-crew 如何自动挂到父 trace

**问题：** 主 Agent 调用一个 skill，skill 内部启动 sub-crew，sub-crew 运行在 `ThreadPoolExecutor` 的子线程里。子线程怎么知道自己的 parent span ID？

这个非常关键。因为 sub-crew 本身在启动一个 agent loop 的时候，它本身是没有前面的任何信息的。

**怎么解决的：** `skill_loader.py` 中用一个专门的 ContextVar 机制把 trace 信息传递给 sub-crew：

```python
# xiaopaw/tools/skill_loader.py
def _get_langfuse_parent_span_id() -> str:
    """从 span stack 栈顶拿到当前 skill_loader 自己的 span ID"""
    stack = _span_stack_var.get(())
    if stack:
        return stack[-1][0]    # 栈顶的 span_id
    return _root_span_id_var.get("")
 
def _reset_langfuse_contextvars(parent_span_id: str = "") -> None:
    """在子线程中：保留 trace_id，重置其他 ContextVar"""
    _root_span_id_var.set(parent_span_id)   # ← 子 span 挂在父 skill span 下
    _gen_id_var.set("")
    _gen_count_var.set(0)
    _tool_count_var.set(0)
    _span_stack_var.set(())
    _closed_spans_var.set({})
    # 注意：不重置 _trace_id_var —— 子线程必须留在同一棵 trace 树
```

整个流程分七步：

1. parent_span_id = _get_langfuse_parent_span_id() — 在主线程快照 parent span
2. ctx = contextvars.copy_context() — 浅拷贝所有 ContextVar
3. pool.submit(ctx.run, _run_with_cleanup) — 提交到 ThreadPoolExecutor
4. 子线程中 ctx.run() 激活拷贝的 ContextVar
5. _reset_langfuse_contextvars(parent_span_id) — 选择性重置（保留 trace_id）
6. Sub-Crew 运行：每次 LLM 调用自动成为父 skill span 的子节点
7. finally: _flush_langfuse_subcrew() — 清理孤儿 span + flush

Python 的 `copy_context()` 在创建子线程时，把当前线程的所有 ContextVar 值完整拷贝过去。所以 sub-crew 的 `BEFORE_LLM` 触发时，`_get_gen_parent_id()` 读到的是经过重置后的 `_root_span_id_var`——正是那个 `tool-skill_name` span。Sub-crew 的 LLM 调用自动成为父 skill span 的子节点，不需要任何显式传参。

---

### 机制三：Span 栈保证嵌套工具调用的父子关系

**问题：** 工具可以嵌套调用（主 skill → sub-crew → sub-skill）。某一时刻可能有多个 span 同时处于 open 状态。新开的 span 应该挂在哪个父节点下？

**怎么解决的：** `_span_stack_var` 是一个不可变元组模拟的栈（方便 ContextVar 传播）：

- BEFORE_TOOL_CALL：把新 span 的 (span_id, tool_name, turn_number, tool_input) 压栈
- AFTER_TOOL_CALL：从栈里弹出对应的 span，关闭它
- 新的 span 或 generation 的 parent = 栈顶 span ID

嵌套调用时，后压入的先弹出（LIFO），天然匹配嵌套结构。

```python
# 压栈（BEFORE_TOOL_CALL）
old_stack = _span_stack_var.get(())
_span_stack_var.set((*old_stack, (span_id, ctx.tool_name, ctx.turn_number, tool_input)))
 
# 弹栈（AFTER_TOOL_CALL）
for i in range(len(stack) - 1, -1, -1):
    if (stack[i][1], stack[i][2]) == (ctx.tool_name, ctx.turn_number):
        matched_span_id = stack[i][0]
        stack = stack[:i] + stack[i+1:]     # 从元组中移除
        break
 
---
```

### 机制四：Generation 先写后更新

**问题：** LLM 调用在 `BEFORE_LLM` 时知道开始了，但什么时候结束？系统里没有 `AFTER_LLM` 事件。

**怎么解决的：** Generation 的生命周期跨越两个事件点：

1. BEFORE_LLM：generation-create（有 start_time 和 input prompt，无 output）
2. Generation 在以下时机被关闭： 下一次 BEFORE_LLM：Agent 拿到工具结果后再次调用 LLM，此时关闭上一个 generation，并从 prompt_messages 里找出工具结果，补全对应 tool span 的 output AFTER_TURN：本轮最后一次 LLM 调用，在 after_turn_handler 里关闭

```python
# before_llm_handler：处理前一个 generation
prev_gen_id = _gen_id_var.get("")
if prev_gen_id:
    tool_results = _extract_recent_tool_results(ctx.metadata.get("prompt_messages", []))
    # ... 匹配并关闭 tool span，关闭 generation
    _enqueue(IngestionEvent_GenerationUpdate(..., end_time=_now()))
 
---
```

### 机制五：强制 flush 保证用户可见性

**问题：** Langfuse SDK 把事件放在内存 buffer 里，攒够再批量发送。用户收到 XiaoPaw 的回复后立刻打开 Langfuse，buffer 还没发出去，trace 一片空白。

**怎么解决的：** `after_turn_handler` 末尾强制调用 `_flush_batch()`，以 50 个事件为一批发送到 Langfuse API：

```plain
AFTER_TOOL_CALL（数据入 buffer）
→ AFTER_TURN（关闭最后的 gen/span）
→ _flush_batch()（把 buffer 全部推送到 Langfuse）
→ sender.send(reply)（用户收到回复）
```

flush 发生在 `send(reply)` 之前。用户拿到回复的同时，Langfuse 里已经有完整数据。Langfuse 本身有缓存机制，为了让你能实时看到它有一个强制 flush 的机制——这样你执行完了就能在 Langfuse 里看到整个数据。

---

## 课程总结

30 课搭骨架，31 课加可靠性，32 课加安全，33 课写一个 `hooks.yaml`，改 6 行现有代码——XiaoPaw 穿上了装甲，而业务逻辑没动一行。

这不是巧合，是 30 课一开始就确立的设计原则在发挥作用：加固通过事件分发接入，不碰 Agent 执行路径。三条执行顺序约束、五个 Trace 树构建机制，是这套设计在实战中留下的工程细节。

![图片](assets/260602-144-图片10.png)

到这里，模块五"企业级加固"四课全部完结：30 课**看得见**（5+2 事件体系 + Langfuse 全链路）→ 31 课**控得住**（dispatch_gate + 循环 / 成本 / 重试三策略）→ 32 课**防得了**（沙箱 + 权限网关 + 审计）→ 33 课**装上去**（699 行新增，业务 0 行修改）。

经过了一整轮工程篇章的洗礼——不知道大家对于所有这些代码消化了多少，或者真的运行了多少，哪怕是让 AI 帮你看了多少。这些东西是你的基础，不要光了解概念。在真正动手的时候，你才会发现有各种各样的问题，那个时候可以想到回来我的课上看看代码，把里面具体的点运用到你的项目里面去。希望整个工程篇能够帮助到大家。

工程篇到此结束了。但还没有完——我们还有第三篇章，也就是企业落地篇。在企业落地篇里，我会带着大家从一个真正项目的完整生命周期出发：从需求到产品，到评测，到开发和 CI/CD，到线上监控，到数据飞轮，到最终让整个团队适应这样的工作模式。篇章三不会有太多代码——说实话篇章二的代码量已经非常大了，一般视频课程很少有这么大量的代码。篇章三更多是方法论和整体设计，但它真的是在企业落地中一套比较好的 SOP，去把一个项目跑起来。

>
> 下节课预告： 能力有了，记忆有了，护甲也穿上了——但 XiaoPaw 是你自己用的工具。如果要推到更多人面前呢？下一节课，我们进入企业落地篇，从需求边界开始——如何用"AI 适用性评估表"识别高 ROI 场景。 我们下节课见！
>

---

## 课末学习活动

**费曼检验：** 用一句话向没学过这门课的同事解释——为什么给 XiaoPaw 加安全加固不需要改业务代码？

**思考题 1（主动回忆）：** `dispatch()` 和 `dispatch_gate()` 的本质区别是什么？为什么观测层用前者、策略层用后者？（提示：从"异常是否传播"和"业务是否中断"两个维度思考。）

**思考题 2（顺序推理）：** 如果你把 `hooks.yaml` 里的 `audit_logger` 移到 `sandbox_guard` 后面，会发生什么？为什么 HookLoader 的 WARNING 不足以提醒你这是个严重问题？

**思考题 3（知识迁移）：** Trace 树的 `trace_id = session_id` 设计，你能想到它的局限性吗？什么情况下这个设计会导致问题？（提示：思考一个用户同时开启两个浏览器 tab 的场景。）

**思考题 4（交错练习——模块五回顾）：** 以下四个概念分别来自哪一课？它们之间是什么关系？

- GuardrailDeny 异常（30 课定义）
- dispatch_gate() 方法（30 课实现）
- fail_closed 语义（30 课设计）
- hooks.yaml 执行顺序（33 课接线）

（提示：它们共同构成了"策略层如何可靠地拒绝请求"这个问题的完整答案。）

欢迎在评论区分享你的真实案例，我们下一讲见！
---

来源：极客时间《企业级多智能体设计实战》
提取日期：2026-06-02
