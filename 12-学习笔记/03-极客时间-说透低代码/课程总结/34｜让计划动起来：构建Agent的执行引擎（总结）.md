# 34｜让计划动起来：构建Agent的执行引擎

> **核心主题**：为 Agent 接上"四肢"——执行引擎（Execution Engine），将 JSON 行动计划转化为实际的画布操作。

---

## 一、执行引擎的三大核心职责

| 职责 | 说明 |
|------|------|
| **计划解析** | 读取 JSON 计划，逐一遍历每个步骤 |
| **工具调度** | 根据 `tool_name` 字符串找到对应的 Python 函数并调用 |
| **上下文管理** | 保存每步结果 + 解析 `$steps.N.result.path` 引用，动态注入参数 |

### 执行流程

```
接收计划 → 循环遍历步骤 → [解析参数 → 调度工具 → 执行工具 → 保存结果] → 全部完成
```

---

## 二、核心机制一：工具注册表（Tool Registry）

### 问题

`tool_name` 只是字符串（如 `"createComponent"`） → 如何映射到 Python 函数？不能用 `if...elif`（每次新增工具都要改引擎代码）。

### 解决方案：字典映射

```python
tool_registry = {
    "createComponent": createComponent,
    "updateProperty": updateProperty,
}

# 动态调度
function_to_call = tool_registry[step['tool_name']]
function_to_call(**step['parameters'])
```

### 优势

| 特性 | 说明 |
|------|------|
| **数据驱动** | 字符串 → 函数对象的映射完全由数据（字典）驱动 |
| **开闭原则** | 增删改工具只需维护字典，引擎核心代码无需改动 |
| **可扩展** | 新工具只需在注册表中加一行 |

---

## 三、核心机制二：步骤间引用解析器

### 问题

参数中含 `$steps.0.result.id` → 执行时需替换为第0步的真实返回值。

### 实现思路

**递归遍历参数字典** → 发现匹配 `$steps.N.result.path` 的字符串 → 从历史结果中提取真实值 → 替换。

### 两个核心函数

| 函数 | 职责 |
|------|------|
| `_get_value_from_path(obj, path)` | 根据路径字符串（如 `result.id`）从对象中取值 |
| `_resolve_parameters(params, step_results)` | 递归遍历参数字典，替换所有引用 |

### 解析流程

```
参数字符串 "$steps.0.result.id"
  → 正则匹配提取: step_index=0, result_path="result.id"
  → 从 step_results[0] 取值
  → 替换为真实值（如 "new_form_root"）
```

**关键**：参数可能嵌套（`properties` 对象内部也可能含引用） → 必须**递归**解析。

---

## 四、执行引擎主类 `ExecutionEngine`

### 核心方法 `execute_plan()`

```python
class ExecutionEngine:
    def __init__(self, tool_registry):
        self.tool_registry = tool_registry

    def execute_plan(self, plan):
        step_results = []
        for i, step in enumerate(plan['plan']):
            # 1. 解析参数（处理 $steps 引用）
            resolved_params = self._resolve_parameters(step['parameters'], step_results)
            # 2. 动态调度工具
            tool_function = self.tool_registry[step['tool_name']]
            # 3. 执行并保存结果
            result = tool_function(**resolved_params)
            step_results.append(result)
```

### 循环内的三步结构

```
for 每个步骤:
  1. _resolve_parameters() → 解析 $steps 引用
  2. tool_registry[tool_name] → 获取函数
  3. tool_function(**resolved_params) → 执行 + 保存结果
```

---

## 五、端到端演练

**测试场景**：执行第33讲生成的"创建登录表单"计划

**执行日志**：

```
步骤 0: createComponent(parentId="root", componentType="Form")
  → 成功，返回 {id: "new_form_root"}

步骤 1: createComponent(parentId="$steps.0.result.id", ...)
  → 解析引用: "$steps.0.result.id" → "new_form_root"
  → createComponent(parentId="new_form_root", componentType="Text")
  → 成功

步骤 2: createComponent(parentId="$steps.0.result.id", ...)
  → 解析引用: "$steps.0.result.id" → "new_form_root"
  → createComponent(parentId="new_form_root", componentType="Button")
  → 成功
```

**结果**：抽象 JSON 计划 → 被执行引擎转化为具体的 UI 组件创建操作。

---

## 六、"观察-规划-执行"闭环形成

| 阶段 | 对应模块 | 能力 |
|------|---------|------|
| **观察** | 观察工具集（第31讲） | 感知画布状态 |
| **规划** | 规划器（第32-33讲） | 分解复杂目标为行动计划 |
| **执行** | 执行引擎（本讲） | 逐步执行计划，处理步骤依赖 |

**局限**：当前引擎假设每步都成功 → 现实中可能遇到网络超时、组件不存在等异常 → 引出第35讲：错误处理与自我修正。

---
来源：极客时间《说透低代码》第34讲
链接：https://time.geekbang.org/column/article/934827
日期：2026-05-18
