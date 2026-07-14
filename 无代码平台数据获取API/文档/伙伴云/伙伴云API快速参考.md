# 伙伴云API快速参考

## 一、最常用代码模板

### 1.1 基础查询模板

```python
import requests
import json

API_KEY = "你的API_KEY"
BASE_URL = "https://api.huoban.com"

def query_huoban(table_id, filter_conditions=None, view_id=None, limit=100, offset=0):
    """查询伙伴云数据"""
    url = f"{BASE_URL}/openapi/v1/item/list"

    headers = {
        "Open-Authorization": f"Bearer {API_KEY}",
        "Content-Type": "application/json"
    }

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

# 使用示例
result = query_huoban("表ID")
print(result)
```

---

## 二、筛选条件速查表

### 2.1 常用筛选模式

| 场景 | 代码 | 说明 | 验证状态 |
|------|------|------|---------|
| **等于** | `{"field": "字段ID", "query": {"eq": ["完整值"]}}` | ✅ 精确匹配完整值 | ✅ 已验证 |
| **不等于** | `{"field": "字段ID", "query": {"ne": "值"}}` | ✅ 精确匹配完整值 | ✅ 已验证 |
| **包含多个值(OR)** | `{"field": "字段ID", "query": {"in": ["值1", "值2"]}}` | ✅ 支持子串匹配，推荐使用 | ✅ 已验证 |
| **不包含** | `{"field": "字段ID", "query": {"nin": ["值1", "值2"]}}` | ✅ 精确匹配完整值 | ✅ 已验证 |
| **大于** | `{"field": "字段ID", "query": {"gt": 100}}` | 数值比较 | ⚠️ 未验证 |
| **小于** | `{"field": "字段ID", "query": {"lt": 100}}` | 数值比较 | ⚠️ 未验证 |
| **范围** | `{"field": "字段ID", "query": {"gte": 50, "lte": 200}}` | 区间匹配 | ⚠️ 未验证 |
| **为空** | `{"field": "字段ID", "query": {"em": true}}` | ✅ 空值判断 | ✅ 已验证 |
| **不为空** | `{"field": "字段ID", "query": {"nem": true}}` | ✅ 非空判断 | ✅ 已验证 |

> ✅ **实际测试验证**：
> - **eq** = 精确匹配（如 `eq="红烧牛肉面"` ✅）
> - **ne** = 精确匹配（如 `ne="红烧牛肉面"` 排除该值 ✅）
> - **in** = 子串匹配（如 `in=["牛"]` 匹配 "五香牛肉干" ✅）
> - **nin** = 精确匹配（如 `nin=["牛"]` 排除包含"牛"的数据 ✅）
> - **em/nem** = 空值判断 ✅
> - ⚠️ gt/gte/lt/lte 未验证

> ❌ **不支持 contains**：伙伴云API文本字段不支持 `contains` 操作符

### 2.2 AND/OR组合

```python
# AND: 两个条件同时满足
{
    "and": [
        {"field": "状态", "query": {"eq": ["启用"]}},
        {"field": "库存", "query": {"gt": 0}}
    ]
}

# OR: 任一条件满足
{
    "or": [
        {"field": "类别", "query": {"eq": ["副食"]}},
        {"field": "类别", "query": {"eq": ["生鲜"]}}
    ]
}

# 嵌套: AND + OR
{
    "and": [
        {
            "or": [
                {"field": "名称", "query": {"contains": "牛"}},
                {"field": "名称", "query": {"contains": "饼干"}}
            ]
        },
        {"field": "仓库", "query": {"eq": ["仓库ID"]}}
    ]
}
```

---

## 三、特殊字段处理

### 3.1 关联字段（重要！）

```python
# 关联字段筛选 - 必须用item_id！
filter_conditions = {
    "and": [
        {"field": "仓库字段ID", "query": {"eq": ["2300019805958457"]}}
    ]
}

# 从返回数据中获取关联字段信息
result = query_huoban("表ID", limit=1)
sample = result["data"]["items"][0]
warehouse = sample["fields"]["仓库字段ID"]
# warehouse = {"item_id": "2300019805958457", "title": "一号仓库"}
print(warehouse["item_id"])  # 获取item_id
print(warehouse["title"])       # 获取显示名称
```

### 3.2 选项字段

```python
# 单选选项
filter_conditions = {
    "and": [
        {"field": "状态字段ID", "query": {"eq": ["1"]}}
    ]
}

# 多选选项（使用in）
filter_conditions = {
    "and": [
        {"field": "类别字段ID", "query": {"in": ["1", "2", "3"]}}
    ]
}
```

### 3.3 日期字段

```python
# 静态日期
filter_conditions = {
    "and": [
        {"field": "日期字段ID", "query": {"gte": "2024-01-01", "lt": "2025-01-01"}}
    ]
}

# 动态日期
filter_conditions = {
    "and": [
        {"field": "日期字段ID", "query": {"eq": "today"}}
    ]
}
```

---

## 四、实用函数库

### 4.1 分页获取所有数据

```python
def get_all_data(table_id, filter_conditions=None, view_id=None):
    """分页获取所有匹配数据"""
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

        if len(items) < limit:
            break

        offset += limit

    return all_items
```

### 4.2 发现字段ID

```python
def discover_fields(table_id):
    """查询示例数据，发现字段ID"""
    result = query_huoban(table_id, limit=1)

    if result.get("code") != 0:
        print(f"查询失败: {result.get('message')}")
        return {}

    sample = result["data"]["items"][0]
    fields = sample.get("fields", {})

    print("\n字段ID映射：")
    for field_id, value in fields.items():
        # 简化显示值
        if isinstance(value, str):
            display = value[:30] + "..." if len(value) > 30 else value
        elif isinstance(value, dict):
            display = value.get("title", value.get("name", str(value)))
        elif isinstance(value, list):
            if len(value) == 0:
                display = "[]"
            elif isinstance(value[0], dict):
                display = value[0].get("title", value[0].get("name", str(value[0])))
                if len(value) > 1:
                    display += f" (+{len(value)-1})"
            else:
                display = str(value)
        else:
            display = str(value)

        print(f"  {field_id}: {display}")

    return fields

# 使用
discover_fields("表ID")
```

### 4.3 处理返回数据

```python
def process_items(items, field_mapping):
    """将字段ID转换为可读名称"""
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
```

---

## 五、常见错误处理

| 错误码 | 错误信息 | 解决方案 |
|--------|----------|----------|
| 100 | authentication failed | 检查API Key是否正确 |
| 3500002 | 数据不存在或已删除 | 确认table_id正确 |
| 502 | space_id missing | 可忽略，直接使用table_id查询 |
| 501 | unknown method | 检查API端点是否正确 |

```python
def safe_query(table_id, filter_conditions=None):
    """安全的查询函数，带错误处理"""
    result = query_huoban(table_id, filter_conditions)

    if result.get("code") == 0:
        items = result.get("data", {}).get("items", [])
        print(f"查询成功，共 {len(items)} 条数据")
        return items
    else:
        error_code = result.get("code")
        error_msg = result.get("message", "未知错误")

        if error_code == 100:
            print("❌ 认证失败，请检查API Key")
        elif error_code == 3500002:
            print("❌ 数据不存在，请检查table_id")
        else:
            print(f"❌ 查询失败 [{error_code}]: {error_msg}")

        return []
```

---

## 六、业务场景模板

### 6.1 库存预警

```python
# 筛选条件：仓库=指定仓库 AND (库存<=安全库存 OR 可用<=安全库存)
WAREHOUSE_ID = "仓库item_id"
FIELD_STOCK = "库存字段ID"
FIELD_AVAILABLE = "可用字段ID"
FIELD_SAFE = "安全库存字段ID"

filter_conditions = {
    "and": [
        {"field": "仓库字段ID", "query": {"eq": [WAREHOUSE_ID]}},
        {
            "or": [
                {"field": FIELD_STOCK, "query": {"lte": FIELD_SAFE}},
                {"field": FIELD_AVAILABLE, "query": {"lte": FIELD_SAFE}}
            ]
        }
    ]
}

items = get_all_data("表ID", filter_conditions)

print("库存预警商品：")
for item in items:
    fields = item["fields"]
    print(f"  {fields['商品名称']}: 库存{fields['库存']}/安全{fields['安全库存']}")
```

### 6.2 按类别统计

```python
all_data = get_all_data("表ID")

# 按类别统计
category_stats = {}
for item in all_data:
    fields = item["fields"]
    category = fields.get("类别", [{}])[0].get("name", "未分类")
    stock = fields.get("库存", 0)

    if category not in category_stats:
        category_stats[category] = {"count": 0, "total_stock": 0}

    category_stats[category]["count"] += 1
    category_stats[category]["total_stock"] += stock

print("类别统计：")
for category, stats in category_stats.items():
    print(f"  {category}: {stats['count']}种商品，总库存{stats['total_stock']}")
```

### 6.3 批量导出到Excel

```python
import pandas as pd

def export_to_excel(table_id, filter_conditions, field_mapping, output_file):
    """导出数据到Excel"""
    items = get_all_data(table_id, filter_conditions)
    processed = process_items(items, field_mapping)

    # 转换为DataFrame
    df_data = []
    for record in processed:
        row = {"item_id": record["item_id"], "title": record["title"]}
        row.update(record["fields"])
        df_data.append(row)

    df = pd.DataFrame(df_data)

    # 导出
    df.to_excel(output_file, index=False)
    print(f"✅ 已导出 {len(df)} 条数据到 {output_file}")

# 使用
field_mapping = {
    "2200000604356149": "商品名称",
    "2200000604356150": "规格",
    "2200000604355434": "库存",
    "2200000604355428": "可用"
}

export_to_excel("表ID", None, field_mapping, "output.xlsx")
```

---

## 七、快速命令

### 7.1 查看表结构
```python
discover_fields("表ID")
```

### 7.2 获取所有数据
```python
items = get_all_data("表ID")
```

### 7.3 带筛选查询
```python
filter_conditions = {"and": [{"field": "字段ID", "query": {"eq": ["值"]}}]}
items = get_all_data("表ID", filter_conditions)
```

### 7.4 处理数据
```python
field_mapping = {"字段ID": "可读名称"}
processed = process_items(items, field_mapping)
```

---

> 💡 **提示**：本卡片包含最常用的代码模板，如需完整文档请查看 [伙伴云API使用指南.md](./伙伴云API使用指南.md)
