# 伙伴云API使用指南

> 本文档记录伙伴云数据获取API的完整调用过程，包括认证方式、筛选条件、数据结构等核心信息。

---

## 一、基础配置

### 1.1 API认证

```python
import requests
import json

API_KEY = "你的API_KEY"
BASE_URL = "https://api.huoban.com"

headers = {
    "Open-Authorization": f"Bearer {API_KEY}",
    "Content-Type": "application/json"
}
```

**关键点**：
- 认证头名称是 `Open-Authorization`，不是 `Authorization`
- 值格式：`Bearer {API_KEY}`

### 1.2 基础查询函数

```python
def query_huoban(table_id, filter_conditions=None, view_id=None, limit=100, offset=0):
    """查询伙伴云数据"""
    url = f"{BASE_URL}/openapi/v1/item/list"

    body = {
        "table_id": table_id,
        "limit": limit,
        "offset": offset,
        "with_field_config": 0
    }

    if view_id:
        body["view_id"] = view_id

    if filter_conditions:
        body["filter"] = filter_conditions

    response = requests.post(url, headers=headers, json=body)
    return response.json()
```

---

## 二、筛选条件详解

### 2.1 筛选语法结构

```json
{
  "filter": {
    "and": [
      {"field": "字段ID", "query": {"操作符": "值"}}
    ]
  }
}
```

### 2.2 逻辑组合

#### AND条件
```json
{
  "filter": {
    "and": [
      {"field": "商品名称", "query": {"in": ["牛", "饼干", "糖"]}},
      {"field": "仓库", "query": {"eq": ["2300019805958457"]}}
    ]
  }
}
```

#### OR条件
```json
{
  "filter": {
    "or": [
      {"field": "状态", "query": {"eq": ["启用"]}},
      {"field": "状态", "query": {"eq": ["激活"]}}
    ]
  }
}
```

#### 嵌套条件
```json
{
  "filter": {
    "and": [
      {
        "or": [
          {"field": "商品名称", "query": {"in": ["牛", "饼干"]}}
        ]
      },
      {"field": "仓库", "query": {"eq": ["一号仓库"]}}
    ]
  }
}
```

### 2.3 操作符列表

| 操作符 | 适用字段类型 | 说明 | 示例 | 验证状态 |
|--------|-------------|------|------|---------|
| `eq` | 文本、数字、选项 | 等于（**精确匹配**） | `{"eq": "红烧牛肉面"}` | ✅ 已验证 |
| `ne` | 文本、数字、选项 | 不等于（**精确匹配**） | `{"ne": "禁用"}` | ✅ 已验证 |
| `in` | 文本、选项、关联 | 包含（多值OR，**支持子串匹配**）✅推荐 | `{"in": ["牛", "饼干"]}` | ✅ 已验证 |
| `nin` | 文本、选项 | 不包含（**精确匹配**） | `{"nin": ["过期"]}` | ✅ 已验证 |
| `gt` | 数字、日期 | 大于 | `{"gt": 100}` | ⚠️ 未验证 |
| `gte` | 数字、日期 | 大于等于 | `{"gte": "2024-01-01"}` | ⚠️ 未验证 |
| `lt` | 数字、日期 | 小于 | `{"lt": 100}` | ⚠️ 未验证 |
| `lte` | 数字、日期 | 小于等于 | `{"lte": "2024-12-31"}` | ⚠️ 未验证 |
| `em` | 全部字段 | 为空 | `{"em": true}` | ✅ 已验证 |
| `nem` | 全部字段 | 不为空 | `{"nem": true}` | ✅ 已验证 |

> ✅ **实际测试验证**：
> - **eq** = 精确匹配完整值（如 `eq="红烧牛肉面"` ✅，但 `eq="牛"` ❌ 不匹配）
> - **ne** = 精确匹配完整值（如 `ne="红烧牛肉面"` ✅ 排除该值，`ne="牛"` ❌ 不生效因为没有字段值等于"牛"）
> - **in** = 子串匹配，只搜索指定字段 ✅
> - **nin** = 精确匹配完整值（排除包含指定值的数据）✅
> - **em/nem** = 空值判断 ✅
> - **order** = 排序功能 ✅ 已验证

### 2.4 字段类型处理

#### 文本字段
```json
// 精确匹配
{"field": "商品名称", "query": {"eq": "红烧牛肉面"}}

// 包含多个可能值（OR关系，包含子串匹配）
{"field": "商品名称", "query": {"in": ["牛", "饼干", "糖"]}}

// 说明：in 操作符支持子串匹配
// 如：in=["牛"] 可以匹配 "五香牛肉干"、"红烧牛肉面"
```

#### 数字字段
```json
// 库存大于100
{"field": "库存数量", "query": {"gt": 100}}

// 安全库存在50-200之间
{"field": "安全库存", "query": {"gte": 50, "lte": 200}}
```

#### 日期字段
```json
// 创建日期在2024年
{"field": "创建日期", "query": {"gte": "2024-01-01", "lt": "2025-01-01"}}

// 动态日期：今天
{"field": "创建日期", "query": {"eq": "today"}}

// 动态日期：本周
{"field": "创建日期", "query": {"gte": "this_week"}}
```

#### 选项字段（单选）
```json
// 状态等于"启用"
{"field": "状态", "query": {"eq": ["1"]}}

// 状态为多个可能值
{"field": "状态", "query": {"in": ["1", "2"]}}
```

#### 关联字段（关键！）

**关联字段是伙伴云中最特殊的字段类型**，需要特别注意：

```json
// 仓库是关联字段，筛选时使用关联记录的item_id
{"field": "仓库", "query": {"eq": ["2300019805958457"]}}

// 如果仓库是列表类型关联
{"field": "仓库", "query": {"in": ["2300019805958457", "2300019805958458"]}}
```

**如何获取关联字段的item_id**：
```python
# 先查询一条数据，查看关联字段的结构
result = query_huoban("表ID")
sample_item = result["data"]["items"][0]
warehouse_field = sample_item["fields"]["仓库"]

# 输出结构示例
# {'item_id': '2300019805958457', 'title': '一号仓库'}
print(warehouse_field["item_id"])  # 获取item_id
print(warehouse_field["title"])      # 获取显示名称
```

---

## 三、完整代码示例

### 3.1 获取所有数据（带筛选）

```python
import requests
import json

API_KEY = "你的API_KEY"
BASE_URL = "https://api.huoban.com"
TABLE_ID = "表ID"

headers = {
    "Open-Authorization": f"Bearer {API_KEY}",
    "Content-Type": "application/json"
}

def query_huoban(table_id, filter_conditions=None, view_id=None, limit=100, offset=0):
    """查询伙伴云数据"""
    url = f"{BASE_URL}/openapi/v1/item/list"

    body = {
        "table_id": table_id,
        "limit": limit,
        "offset": offset,
        "with_field_config": 0
    }

    if view_id:
        body["view_id"] = view_id

    if filter_conditions:
        body["filter"] = filter_conditions

    response = requests.post(url, headers=headers, json=body)
    return response.json()

def get_all_data(table_id, filter_conditions=None, view_id=None):
    """分页获取所有数据"""
    all_items = []
    offset = 0
    limit = 100

    while True:
        result = query_huoban(table_id, filter_conditions, view_id, limit, offset)

        if result.get("code") != 0:
            print(f"查询失败: {result.get('message')}")
            break

        items = result.get("data", {}).get("items", [])

        if not items:
            break

        all_items.extend(items)
        offset += limit

        if len(items) < limit:
            break

    return all_items

# 示例：筛选一号仓库中名称包含牛、饼干、糖的商品
filter_conditions = {
    "and": [
        {
            "field": "商品名称字段ID",
            "query": {"in": ["牛", "饼干", "糖"]}
        },
        {
            "field": "仓库字段ID",
            "query": {"eq": ["仓库item_id"]}
        }
    ]
}

# 查询数据
result = query_huoban(TABLE_ID, filter_conditions)
print(f"查询成功，共 {len(result['data']['items'])} 条数据")

# 获取所有匹配的数据
all_data = get_all_data(TABLE_ID, filter_conditions)
print(f"共获取 {len(all_data)} 条数据")
```

### 3.2 处理返回数据

```python
def process_items(items, field_mapping):
    """
    处理返回的数据，将字段ID转换为可读名称

    Args:
        items: API返回的数据列表
        field_mapping: 字段ID到字段名的映射字典

    Returns:
        处理后的数据列表
    """
    processed = []

    for item in items:
        record = {
            "item_id": item.get("item_id"),
            "title": item.get("title"),
            "fields": {}
        }

        fields = item.get("fields", {})

        for field_id, value in fields.items():
            field_name = field_mapping.get(field_id, field_id)

            # 处理关联字段
            if isinstance(value, dict) and "title" in value:
                record["fields"][field_name] = value.get("title")
            # 处理选项字段
            elif isinstance(value, list) and len(value) > 0:
                if isinstance(value[0], dict) and "name" in value[0]:
                    record["fields"][field_name] = [opt["name"] for opt in value]
                else:
                    record["fields"][field_name] = value
            else:
                record["fields"][field_name] = value

        processed.append(record)

    return processed

# 字段ID映射示例
field_mapping = {
    "2200000604356149": "商品名称",
    "2200000604356150": "规格",
    "2200000604356157": "仓库",
    "2200000604355434": "库存数量",
}

items = result["data"]["items"]
processed_data = process_items(items, field_mapping)

for record in processed_data:
    print(f"{record['item_id']}: {record['fields']['商品名称']}")
```

### 3.3 实际业务场景

#### 场景1：获取一号仓库的库存预警数据

```python
# 筛选条件：仓库=一号仓库 AND 库存 <= 安全库存
filter_conditions = {
    "and": [
        {"field": "仓库", "query": {"eq": ["2300019805958457"]}},
        {
            "or": [
                {"field": "库存数量", "query": {"lte": "安全库存"}},
                {"field": "可用数量", "query": {"lte": "安全库存"}}
            ]
        }
    ]
}

result = query_huoban("2100000076263944", filter_conditions)
items = result["data"]["items"]

print("库存预警商品：")
for item in items:
    name = item["fields"].get("商品名称", "")
    stock = item["fields"].get("库存数量", 0)
    safe = item["fields"].get("安全库存", 0)
    print(f"  {name}: 库存{stock} / 安全库存{safe}")
```

#### 场景2：按商品类别统计

```python
# 先获取所有数据
all_data = get_all_data("2100000076263944")

# 按类别统计
category_stats = {}
for item in all_data:
    fields = item["fields"]
    category = fields.get("类别", [{}])[0].get("name", "未分类")
    stock = fields.get("库存数量", 0)

    if category not in category_stats:
        category_stats[category] = {"count": 0, "total_stock": 0}

    category_stats[category]["count"] += 1
    category_stats[category]["total_stock"] += stock

print("类别统计：")
for category, stats in category_stats.items():
    print(f"  {category}: {stats['count']}种商品，总库存{stats['total_stock']}")
```

---

## 四、关键字段发现方法

### 4.1 获取表格所有字段

```python
def get_table_fields(table_id):
    """获取表格字段配置"""
    url = f"{BASE_URL}/openapi/v1/table/{table_id}"

    response = requests.get(url, headers=headers)
    return response.json()

# 返回的data中包含fields数组，每个字段有field_id和name
result = get_table_fields("2100000076263944")
fields = result["data"]["fields"]

for field in fields:
    print(f"{field['field_id']}: {field['name']} ({field['field_type']})")
```

### 4.2 从示例数据中发现字段ID

```python
# 查询一条数据，检查字段结构
result = query_huoban("2100000076263944", limit=1)
sample = result["data"]["items"][0]

print("字段ID映射：")
for field_id, value in sample["fields"].items():
    if isinstance(value, str) and len(value) < 50:
        display = value
    elif isinstance(value, dict):
        display = value.get("title", value.get("name", str(value)))
    elif isinstance(value, list) and len(value) > 0:
        display = str(value[0]) if len(value) <= 2 else f"{value[0]}, ..."
    else:
        display = str(value)[:50]

    print(f"  {field_id}: {display}")
```

---

## 五、常见问题

### 5.1 认证失败

**错误**：`{"code": 100, "message": "authentication failed"}`

**原因**：
- API Key无效或已过期
- API Key未授权访问该工作区

**解决**：
- 在伙伴云后台检查API Key是否有效
- 确认API Key的授权范围包含目标工作区

### 5.2 数据不存在

**错误**：`{"code": 3500002, "message": "数据不存在或已删除"}`

**原因**：
- table_id错误
- 该表已被删除
- API Key没有访问权限

**解决**：
- 确认table_id正确
- 检查API Key权限

### 5.3 缺少space_id

**错误**：`{"code": 502, "message": "One of the parameters specified was missing or invalid. parameters name space_id"}`

**说明**：某些接口（如table/list）需要space_id参数

**解决**：
- 可以忽略此错误，直接使用table_id进行数据查询
- 或在伙伴云后台获取space_id

### 5.4 筛选条件不生效

**检查项**：
1. 确认字段ID正确
2. 对于关联字段，使用item_id而非显示名称
3. 检查操作符是否适用于该字段类型
4. 日期格式是否正确（如"2024-01-01"）

---

## 六、API限制

| 项目 | 限制 |
|------|------|
| 单次最大返回 | 100条（默认20） |
| API频率限制 | 10次/秒 |
| 分页方式 | offset偏移量 |

**大数据量处理**：
```python
def get_all_data_large(table_id, filter_conditions=None, view_id=None, max_records=10000):
    """分页获取大量数据"""
    all_items = []
    offset = 0
    limit = 100

    while offset < max_records:
        result = query_huoban(table_id, filter_conditions, view_id, limit, offset)

        if result.get("code") != 0:
            break

        items = result.get("data", {}).get("items", [])

        if not items:
            break

        all_items.extend(items)

        if len(items) < limit:
            break

        offset += limit

    return all_items
```

---

## 七、快速参考

### 7.1 最简查询
```python
result = query_huoban("表ID")
```

### 7.2 精确筛选
```python
filter_conditions = {
    "and": [
        {"field": "字段ID", "query": {"eq": ["值"]}}
    ]
}
result = query_huoban("表ID", filter_conditions)
```

### 7.3 模糊筛选
```python
filter_conditions = {
    "and": [
        {"field": "字段ID", "query": {"in": ["值1", "值2", "值3"]}}
    ]
}
```

### 7.4 数值范围
```python
filter_conditions = {
    "and": [
        {"field": "库存", "query": {"gt": 100, "lt": 500}}
    ]
}
```

---

## 八、实际案例

### 本次任务案例

**目标表**：商品库存表
**URL**：`https://app.huoban.com/tables/2100000076263944?viewId=3500000066135175`

**筛选条件**：
- 商品名称包含[牛，饼干，糖]
- 仓库=一号仓库

**实现代码**：
```python
# 字段ID映射
FIELD_PRODUCT_NAME = "2200000604356149"  # 商品名称
FIELD_WAREHOUSE = "2200000604356157"    # 仓库
WAREHOUSE_ID = "2300019805958457"       # 一号仓库item_id

filter_conditions = {
    "and": [
        {
            "field": FIELD_PRODUCT_NAME,
            "query": {"in": ["牛", "饼干", "糖"]}
        },
        {
            "field": FIELD_WAREHOUSE,
            "query": {"eq": [WAREHOUSE_ID]}
        }
    ]
}

result = query_huoban("2100000076263944", filter_conditions, "3500000066135175")
```

**返回结果**：
| 商品名称 | 规格 | 仓库 | 库存 | 可用 |
|----------|------|------|------|------|
| 五香牛肉干 | 200g/袋 | 一号仓库 | 95 | 95 |
| 苏打饼干 | 400g/盒 | 一号仓库 | 131 | 130 |
| 红烧牛肉面 | 桶装/12桶装 | 一号仓库 | 241 | 220 |

---

> 📝 **文档维护**：每次遇到新的API使用场景，请在本文档中补充相关代码和说明。
