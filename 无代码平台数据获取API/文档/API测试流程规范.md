# API 测试流程规范

> 本文档定义了从需求分析到 API 实际测试的完整工作流程。Agent 可据此流程独立完成 API 能力验证。

---

## 一、流程概览

```
┌─────────────────────────────────────────────────────────────────┐
│                        API 测试流程                              │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  1. 获取信息 ──→ 2. 分析需求 ──→ 3. 设计用例 ──→ 4. 执行测试  │
│       │                │                │                │       │
│       ▼                ▼                ▼                ▼       │
│   • App配置      • 理解筛选逻辑    • 设计测试场景    • 编写脚本  │
│   • 表格结构     • 确定字段        • 覆盖边界情况    • 调用API  │
│   • 字段信息     • 确定操作符      • 准备测试数据    • 验证结果  │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## 二、详细流程

### 阶段1：获取信息

#### 1.1 获取基础配置

需要获取以下信息：

| 信息 | 来源 | 示例 |
|---|---|---|
| App ID | 飞书开放平台 → 应用 → 凭证与基础信息 | `cli_a9154bd01c3a5bdb` |
| App Secret | 同上 | `H4cut9LP9T9xKShp5VJMEcRMug4qdlLy` |
| APP Token | 多维表格 URL 或 API | `SY2bwgD36iudpJk42a7cfIwQnPg` |
| TABLE ID | 多维表格 URL 或 API | `tbl5WSbuZY2Hq5Gc` |
| VIEW ID | 多维表格 URL 或 API | `vewGCGaV3O` |

#### 1.2 获取表格结构

**方法1**：通过 API 获取字段列表

```python
import requests

def get_table_fields(token, app_token, table_id):
    url = f"https://open.feishu.cn/open-apis/bitable/v1/apps/{app_token}/tables/{table_id}/fields"
    headers = {"Authorization": f"Bearer {token}"}
    response = requests.get(url, headers=headers)
    return response.json()
```

**方法2**：通过 URL 分析
```
https://xxx.feishu.cn/wiki/SY2bwgD36iudpJk42a7cfIwQnPg?table=tbl5WSbuZY2Hq5Gc&view=vewGCGaV3O
                                      └─ APP_TOKEN ─┘   └─ TABLE_ID ─┘  └─ VIEW_ID ─┘
```

#### 1.3 获取样本数据

先调用 API 获取部分数据，了解字段内容和数据格式：

```python
def get_sample_records(token, app_token, table_id, view_id, limit=10):
    url = f"https://open.feishu.cn/open-apis/bitable/v1/apps/{app_token}/tables/{table_id}/records/search"
    headers = {"Authorization": f"Bearer {token}", "Content-Type": "application/json"}
    
    body = {"view_id": view_id, "page_size": limit}
    response = requests.post(url, headers=headers, json=body)
    
    if response.json().get("code") == 0:
        return response.json().get("data", {}).get("items", [])
    return []
```

---

### 阶段2：分析需求

#### 2.1 理解筛选逻辑

用户需求通常包含以下信息：

| 逻辑 | 说明 | 示例 |
|---|---|---|
| **字段** | 在哪些字段中搜索 | 知识标题、知识内容 |
| **关键词** | 用户输入的搜索词 | "投诉 售后" |
| **分隔符** | 多关键词如何分隔 | 空格表示 OR |
| **关系** | 字段之间是 AND 还是 OR | 标题 AND 内容 |

#### 2.2 解析需求格式

用户输入格式示例：

```
标题[投诉 售后] 内容[24 48]
```

**解析规则**：
- `[]` 内的词用**空格**分隔，表示 **OR** 关系
- 不同 `[]` 之间表示 **AND** 关系

**解析结果**：
```
(标题 contains "投诉" OR 标题 contains "售后")
AND
(内容 contains "24" OR 内容 contains "48")
```

#### 2.3 确定操作符

| 搜索类型 | 操作符 | 说明 |
|---|---|---|
| 包含 | `contains` | 模糊匹配 |
| 等于 | `is` | 精准匹配 |
| 不等于 | `isNot` | 排除 |
| 为空 | `isEmpty` | 空值检查 |
| 不为空 | `isNotEmpty` | 非空检查 |

---

### 阶段3：设计测试用例

#### 3.1 测试用例设计原则

| 原则 | 说明 |
|---|---|
| **覆盖核心场景** | 确保主要功能可用 |
| **覆盖边界情况** | 空值、特殊字符、大数据量 |
| **包含正例和反例** | 有匹配和无匹配的情况 |
| **加入干扰数据** | 不相关的数据验证筛选准确性 |

#### 3.2 测试用例模板

```markdown
### 测试N：场景描述

**格式**：`字段1[关键词1 关键词2] 字段2[关键词3 关键词4]`

**筛选条件**：
- 字段1 contains "关键词1" OR "关键词2"
- 字段2 contains "关键词3" OR "关键词4"
- 字段1 AND 字段2

**预期结果**：命中 N 条数据

**目的**：验证 xxx 功能
```

#### 3.3 测试用例示例

```markdown
### 测试1：多字段 OR + 多字段 OR

**格式**：`标题[投诉 客户] 内容[24 小时]`

**筛选条件**：
(标题 contains "投诉" OR 标题 contains "客户")
AND
(内容 contains "24" OR 内容 contains "小时")

**预期结果**：命中 N 条数据

**目的**：验证多字段多关键词的 OR/AND 组合
```

---

### 阶段4：执行测试

#### 4.1 编写测试脚本

```python
import requests
import json

# ===== 配置 =====
APP_ID = "cli_xxx"
APP_SECRET = "xxx"
APP_TOKEN = "xxx"
TABLE_ID = "xxx"
VIEW_ID = "xxx"

# ===== 工具函数 =====

def get_token():
    url = "https://open.feishu.cn/open-apis/auth/v3/tenant_access_token/internal"
    response = requests.post(url, json={"app_id": APP_ID, "app_secret": APP_SECRET})
    return response.json().get("tenant_access_token")

def test_filter(token, name, filter_config):
    """测试单个筛选条件"""
    url = f"https://open.feishu.cn/open-apis/bitable/v1/apps/{APP_TOKEN}/tables/{TABLE_ID}/records/search"
    headers = {"Authorization": f"Bearer {token}", "Content-Type": "application/json"}
    
    body = {"view_id": VIEW_ID, "filter": filter_config, "page_size": 100}
    response = requests.post(url, headers=headers, json=body)
    result = response.json()
    
    if result.get("code") == 0:
        items = result.get("data", {}).get("items", [])
        print(f"✅ {name}: {len(items)} 条")
        return items
    else:
        print(f"❌ {name}: {result.get('msg')}")
        return None

# ===== 测试用例 =====

TEST_FILTERS = [
    {
        "name": "测试1",
        "description": "标题[投诉 客户] 内容[24 小时]",
        "filter": {
            "conjunction": "and",
            "children": [
                {"conjunction": "or", "conditions": [
                    {"field_name": "知识标题", "operator": "contains", "value": ["投诉"]},
                    {"field_name": "知识标题", "operator": "contains", "value": ["客户"]}
                ]},
                {"conjunction": "or", "conditions": [
                    {"field_name": "知识内容", "operator": "contains", "value": ["24"]},
                    {"field_name": "知识内容", "operator": "contains", "value": ["小时"]}
                ]}
            ]
        }
    },
    # ... 更多测试用例
]

# ===== 执行测试 =====

def main():
    token = get_token()
    print("=" * 60)
    print("API 测试开始")
    print("=" * 60)
    
    for test in TEST_FILTERS:
        test_filter(token, test["name"], test["filter"])
    
    print("\n测试完成!")

if __name__ == "__main__":
    main()
```

#### 4.2 关键注意事项

| 注意事项 | 说明 |
|---|---|
| **children 结构** | 每个子元素必须是 `{conjunction, conditions}` 结构，不能直接放 condition |
| **value 格式** | 必须是数组 `["值"]`，即使只有一个值 |
| **field_name** | 使用字段的**显示名称**，不是字段 ID |
| **权限问题** | 如果报 `1254302`，需要给应用添加协作者权限 |

#### 4.3 运行脚本

```bash
python test_script.py
```

#### 4.4 验证结果

运行后检查：
1. ✅ 所有测试都成功（无报错）
2. ✅ 命中数量符合预期
3. ✅ 返回的数据确实匹配筛选条件

---

## 三、常见问题排查

### 问题1：权限不足

```
错误码：1254302
错误信息：Permission denied
解决：在多维表格中给应用添加协作者权限
```

### 问题2：children 结构错误

```
错误信息：field validation failed
原因：children 中直接放了 condition 对象
解决：确保 children 中每个元素是 {conjunction, conditions} 结构
```

### 问题3：筛选不生效

```
可能原因：
1. field_name 与实际字段名不一致
2. 操作符不支持该字段类型
3. value 格式错误

排查方法：
1. 先获取样本数据，确认字段名
2. 查看字段类型支持的的操作符
3. 检查 value 是否为数组格式
```

---

## 四、输出模板

### 测试结果汇总

```markdown
## 测试结果汇总

| 测试 | 筛选条件 | 预期 | 实际 | 状态 |
|---|---|---|---|---|
| 1 | xxx | N条 | N条 | ✅ |
| 2 | xxx | N条 | N条 | ✅ |
| 3 | xxx | N条 | N条 | ❌ |

**结论**：xxx 功能验证通过/存在问题
```

### 发现的限制

```markdown
## 发现的限制

1. **xxx 限制**：xxx
2. **xxx 限制**：xxx
```

---

## 五、Agent 执行检查清单

- [ ] 获取 App ID 和 App Secret
- [ ] 从 URL 或 API 获取 APP_TOKEN、TABLE_ID、VIEW_ID
- [ ] 获取表格字段列表，确认字段名
- [ ] 获取样本数据，了解数据格式
- [ ] 解析用户需求，确定筛选逻辑
- [ ] 设计测试用例（包含正例、反例、边界情况）
- [ ] 编写测试脚本
- [ ] 运行脚本，执行测试
- [ ] 验证结果是否符合预期
- [ ] 记录发现的问题和限制
- [ ] 输出测试报告
