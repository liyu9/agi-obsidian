# 多维表格 & 伙伴云 API 调研报告

---

## 一、飞书多维表格（Bitable）API

### 1.1 接口概览

| 接口 | 方法 | URL | 说明 |
|---|---|---|---|
| **查询记录** | POST | `/bitable/v1/apps/{app_token}/tables/{table_id}/records/search` | 推荐使用 |
| 列出记录 | GET | `/bitable/v1/apps/{app_token}/tables/{table_id}/records` | 历史接口（不推荐） |
| 获取单条记录 | GET | `/bitable/v1/apps/{app_token}/tables/{table_id}/records/{record_id}` | - |
| 创建记录 | POST | `/bitable/v1/apps/{app_token}/tables/{table_id}/records` | - |
| 更新记录 | PUT | `/bitable/v1/apps/{app_token}/tables/{table_id}/records/{record_id}` | - |
| 删除记录 | DELETE | `/bitable/v1/apps/{app_token}/tables/{table_id}/records/{record_id}` | - |
| 批量创建 | POST | `/bitable/v1/apps/{app_token}/tables/{table_id}/records/batch_create` | - |
| 批量删除 | DELETE | `/bitable/v1/apps/{app_token}/tables/{table_id}/records/batch_delete` | - |

### 1.2 数据获取能力

| 限制项 | 值 |
|---|---|
| 单次最大返回 | **500 条** |
| 单表记录总数 | **20,000 条** |
| API 频率限制 | 20 次/秒 |
| 单次添加最大 | 500 条 |

### 1.3 筛选参数（filter）

**请求体结构**：

```json
{
  "filter": {
    "conjunction": "and",
    "conditions": [
      {
        "field_name": "状态",
        "operator": "is",
        "value": ["进行中"]
      },
      {
        "field_name": "销售额",
        "operator": "isGreater",
        "value": ["10000"]
      }
    ]
  }
}
```

**支持的操作符**：

| 操作符 | 适用字段 | 说明 |
|---|---|---|
| `is` | 文本、数字、选项、日期 | 等于 |
| `isNot` | 文本、数字、选项 | 不等于 |
| `contains` | 文本 | 包含 |
| `doesNotContain` | 文本 | 不包含 |
| `isEmpty` | 所有字段 | 为空 |
| `isNotEmpty` | 所有字段 | 不为空 |
| `isGreater` | 数字 | 大于 |
| `isGreaterEqual` | 数字 | 大于等于 |
| `isLess` | 数字 | 小于 |
| `isLessEqual` | 数字 | 小于等于 |

**不支持筛选的字段**：人员、关联字段、公式

### 1.4 分页机制

| 参数 | 说明 |
|---|---|
| `page_size` | 单次返回条数（最大500） |
| `page_token` | 分页令牌（首次不传，后续从响应获取） |
| `has_more` | 响应字段，表示是否还有更多数据 |

**Python 分页示例**：

```python
def fetch_all_records(app_token, table_id, token, filter_params=None):
    all_records = []
    page_token = None
    
    while True:
        params = {"page_size": 500}
        if page_token:
            params["page_token"] = page_token
        if filter_params:
            params["filter"] = filter_params
            
        resp = requests.get(url, headers=headers, params=params)
        data = resp.json()
        
        all_records.extend(data["data"]["items"])
        
        if not data["data"].get("has_more"):
            break
        page_token = data["data"]["page_token"]
    
    return all_records
```

### 1.5 精确查询示例（避免数据爆炸）

```python
params = {
    "filter": {
        "conjunction": "and",
        "conditions": [
            {"field_name": "订单号", "operator": "is", "value": ["ORD-2024-001"]}
        ]
    },
    "field_names": ["订单号", "客户名", "金额"],  # 只返回需要的字段
    "page_size": 10
}
```

---

## 二、伙伴云 API

### 2.1 接口概览

| 接口 | 方法 | URL | 说明 |
|---|---|---|---|
| **查询数据列表** | POST | `/openapi/v1/item/list` | ✅ 推荐使用（已验证） |
| ~~查询数据列表~~ | ~~POST~~ | ~~`/openapi/v1/item/search`~~ | ❌ 错误端点 |
| 获取数据详情 | GET | `/openapi/v1/item/{item_id}` | - |
| 创建数据 | POST | `/openapi/v1/item` | - |
| 更新数据 | PUT | `/openapi/v1/item/{item_id}` | - |
| 删除数据 | DELETE | `/openapi/v1/item/{item_id}` | - |
| 批量创建 | POST | `/openapi/v1/item/batch` | - |
| 批量更新 | PUT | `/openapi/v1/item/batch` | - |
| 批量删除 | DELETE | `/openapi/v1/item/batch` | - |

### 2.2 认证方式（重要！）

```python
headers = {
    "Open-Authorization": f"Bearer {API_KEY}",  # 注意：是Open-Authorization，不是Authorization
    "Content-Type": "application/json"
}
```

### 2.3 数据获取能力

| 限制项 | 值 |
|---|---|
| 单次最大返回 | **100 条**（默认20） |
| API 频率限制 | 10 次/秒（单个API Key） |
| 分页方式 | offset偏移量 |
| 频率控制 | 另根据版本套餐限制每分钟调用次数 |

### 2.4 筛选参数（filter）- 详细说明

#### 基础语法

```json
{
  "filter": {
    "and": [
      {"field": "字段ID", "query": {"操作符": "值"}}
    ]
  }
}
```

#### 支持的操作符

| 操作符 | 适用字段 | 说明 | 示例 | 验证状态 |
|--------|---------|------|------|---------|
| `eq` | 全部 | 等于（精确匹配） | `{"eq": "红烧牛肉面"}` | ✅ 已验证 |
| `ne` | 全部 | 不等于（精确匹配） | `{"ne": "禁用"}` | ✅ 已验证 |
| `in` | 文本、选项、关联 | 包含多个值（OR，**支持子串匹配**）✅推荐 | `{"in": ["牛", "饼干"]}` | ✅ 已验证 |
| `nin` | 文本、选项 | 不包含（精确匹配） | `{"nin": ["过期"]}` | ✅ 已验证 |
| `gt` | 数字、日期 | 大于 | `{"gt": 100}` | ⚠️ 未验证 |
| `gte` | 数字、日期 | 大于等于 | `{"gte": 50}` | ⚠️ 未验证 |
| `lt` | 数字、日期 | 小于 | `{"lt": 100}` | ⚠️ 未验证 |
| `lte` | 数字、日期 | 小于等于 | `{"lte": 50}` | ⚠️ 未验证 |
| `em` | 全部 | 为空 | `{"em": true}` | ✅ 已验证 |
| `nem` | 全部 | 不为空 | `{"nem": true}` | ✅ 已验证 |

> ✅ **实际测试验证结论**：
> - **eq** = 精确匹配完整值（如 `eq="红烧牛肉面"` ✅，但 `eq="牛"` ❌ 不匹配）
> - **ne** = 精确匹配完整值（如 `ne="红烧牛肉面"` ✅ 排除该值）
> - **in** = 子串匹配（如 `in=["牛"]` 匹配"五香牛肉干"、"红烧牛肉面" ✅）
> - **nin** = 精确匹配完整值（如 `nin=["牛"]` ✅ 排除包含"牛"的数据）
> - **em/nem** = 空值判断 ✅
> - **order** = 排序功能 ✅ 已验证
>
> ⚠️ **待验证**：gt/gte/lt/lte 数值比较操作符

#### 关联字段筛选（重要！）

**关联字段（如仓库）需要使用关联记录的item_id**：

```json
// 正确：使用item_id
{"field": "仓库", "query": {"eq": ["2300019805958457"]}}

// 错误：使用显示名称
{"field": "仓库", "query": {"eq": ["一号仓库"]}}  // ❌ 不生效
```

#### 日期动态变量

```json
{"field": "创建日期", "query": {"eq": "today"}}
{"field": "创建日期", "query": {"gte": "this_week"}}
```

#### 逻辑组合

**AND条件**：
```json
{
  "filter": {
    "and": [
      {"field": "状态", "query": {"eq": ["启用"]}},
      {"field": "库存", "query": {"gt": 0}}
    ]
  }
}
```

**OR条件**：
```json
{
  "filter": {
    "or": [
      {"field": "类别", "query": {"eq": ["副食"]}},
      {"field": "类别", "query": {"eq": ["生鲜"]}}
    ]
  }
}
```

**嵌套条件**：
```json
{
  "filter": {
    "and": [
      {
        "or": [
          {"field": "名称", "query": {"contains": "牛"}},
          {"field": "名称", "query": {"contains": "饼干"}}
        ]
      },
      {"field": "仓库", "query": {"eq": ["2300019805958457"]}}
    ]
  }
}
```

### 2.5 排序与分页

```json
{
  "order": {
    "field_id": "created_on",
    "type": "desc"
  },
  "limit": 100,
  "offset": 0
}
```

| 参数 | 说明 |
|---|---|
| `order.field_id` | 排序字段ID或别名 |
| `order.type` | `asc`（正序）/ `desc`（倒序） |
| `limit` | 每页条数（默认20，最大100） |
| `offset` | 分页偏移量（默认0） |

### 2.6 别名机制

伙伴云支持使用友好别名替代随机ID：

| 别名格式 | 说明 |
|---|---|
| `T::{表格别名}` | 表格ID |
| `F::{表格别名}.{字段别名}` | 字段ID |

**启用方式**：在Header中添加 `X-Huoban-Return-Alias-Space-Id: {space_id}`

### 2.7 实际验证的查询示例

#### 示例1：精确筛选 + 关联字段

**需求**：筛选商品名称包含[牛，饼干，糖] 且 仓库=一号仓库 的数据

```python
filter_conditions = {
    "and": [
        {
            "field": "2200000604356149",  # 商品名称
            "query": {"in": ["牛", "饼干", "糖"]}
        },
        {
            "field": "2200000604356157",  # 仓库（关联字段）
            "query": {"eq": ["2300019805958457"]}  # 一号仓库的item_id
        }
    ]
}

result = query_huoban("2100000076263944", filter_conditions)
```

**返回结果**：3条数据（五香牛肉干、苏打饼干、红烧牛肉面）

#### 示例2：库存预警

**需求**：筛选仓库=一号仓库 且 (库存<=安全库存 OR 可用<=安全库存) 的商品

```python
filter_conditions = {
    "and": [
        {"field": "2200000604356157", "query": {"eq": ["2300019805958457"]}},
        {
            "or": [
                {"field": "2200000604355434", "query": {"lte": "2200000604356154"}},
                {"field": "2200000604355428", "query": {"lte": "2200000604356154"}}
            ]
        }
    ]
}
```

---

## 三、对比总结

### 3.1 核心能力对比

| 特性 | 飞书多维表格 | 伙伴云 |
|---|---|---|
| **筛选参数** | `filter.conjunction/conditions` | `filter.and/or`（递归对象） |
| **排序语法** | `sort: ["字段 DESC"]` | `order.field_id` + `order.type` |
| **单次最大返回** | 500 条 | 100 条 |
| **分页方式** | page_token（游标） | offset（偏移） |
| **别名机制** | ❌ 不支持 | ✅ 支持 T::xxx / F::xxx |
| **记录总数限制** | 20,000 条/表 | 无明确限制 |
| **API频率限制** | 20次/秒 | 10次/秒 |

### 3.2 筛选语法对比

**飞书**：
```json
{
  "filter": {
    "conjunction": "and",
    "conditions": [
      {"field_name": "状态", "operator": "is", "value": ["进行中"]}
    ]
  }
}
```

**伙伴云**：
```json
{
  "filter": {
    "and": [
      {"field": "status", "query": {"eq": "active"}}
    ]
  }
}
```

### 3.3 大数据量处理策略

| 策略 | 飞书 | 伙伴云 |
|---|---|---|
| **精确筛选** | ✅ 使用 filter 精确匹配 | ✅ 使用 filter 精确匹配 |
| **限制字段** | ✅ `field_names` 参数 | ❌ 无此参数 |
| **限制返回数** | ✅ `page_size` | ✅ `limit` |
| **分页获取** | ✅ `page_token` 游标分页 | ✅ `offset` 偏移分页 |

---

## 四、避免"数据爆炸"最佳实践

### 4.1 核心原则

1. **先筛选，后获取**：始终使用 filter 精确筛选，不要先拉全量再内存过滤
2. **限制返回数量**：根据业务需求设置最小的 page_size/limit
3. **指定返回字段**：只请求需要的字段（飞书支持）
4. **利用排序**：配合排序获取最新/最旧的数据

### 4.2 飞书最佳实践

```python
# ✅ 推荐：精确筛选 + 限制字段
params = {
    "filter": {
        "conjunction": "and",
        "conditions": [
            {"field_name": "订单号", "operator": "is", "value": ["ORD-001"]}
        ]
    },
    "field_names": ["订单号", "客户名", "金额"],  # 只返回需要的字段
    "page_size": 10,
    "sort": ["创建时间 DESC"]
}

# ❌ 避免：一次性拉取大量数据
params = {"page_size": 500}  # 不要这样
```

### 4.3 伙伴云最佳实践

```python
# ✅ 推荐：精确筛选 + 限制条数
body = {
    "table_id": "T::orders",
    "filter": {
        "and": [
            {"field": "order_no", "query": {"eq": "ORD-001"}}
        ]
    },
    "order": {"field_id": "created_on", "type": "desc"},
    "limit": 10,
    "offset": 0
}

# ❌ 避免：一次性拉取大量数据
body = {"limit": 100}  # 不要这样
```
