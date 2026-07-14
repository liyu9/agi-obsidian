# 飞书多维表格 API 使用指南

> 本文档记录飞书多维表格 API 的完整使用方法，包含动态筛选条件构建、常见问题处理等。可供其他 Agent 或开发者快速参考。

---

## 一、基础配置

### 1.1 获取 Access Token

```python
import requests

APP_ID = "cli_xxxxxxxxxxxxxxx"
APP_SECRET = "xxxxxxxxxxxxxxxxxxxx"

def get_tenant_access_token():
    url = "https://open.feishu.cn/open-apis/auth/v3/tenant_access_token/internal"
    headers = {"Content-Type": "application/json"}
    data = {"app_id": APP_ID, "app_secret": APP_SECRET}
    
    response = requests.post(url, headers=headers, json=data)
    result = response.json()
    
    if result.get("code") == 0:
        return result.get("tenant_access_token")
    else:
        raise Exception(f"获取Token失败: {result}")
```

### 1.2 表格信息

| 字段 | 值 |
|---|---|
| APP_TOKEN | `SY2bwgD36iudpJk42a7cfIwQnPg` |
| TABLE_ID | `tbl5WSbuZY2Hq5Gc` |
| VIEW_ID | `vewGCGaV3O` |
| 主要字段 | 知识标题、知识内容 |

---

## 二、API 接口

### 2.1 查询记录（推荐）

**接口**：`POST /bitable/v1/apps/{app_token}/tables/{table_id}/records/search`

**请求示例**：
```python
import requests

def search_records(token, filter_config=None):
    url = "https://open.feishu.cn/open-apis/bitable/v1/apps/SY2bwgD36iudpJk42a7cfIwQnPg/tables/tbl5WSbuZY2Hq5Gc/records/search"
    
    headers = {
        "Authorization": f"Bearer {token}",
        "Content-Type": "application/json"
    }
    
    body = {
        "view_id": "vewGCGaV3O",
        "page_size": 100
    }
    
    if filter_config:
        body["filter"] = filter_config
    
    response = requests.post(url, headers=headers, json=body)
    result = response.json()
    
    if result.get("code") == 0:
        return result.get("data", {}).get("items", [])
    else:
        print(f"查询失败: {result}")
        return []
```

### 2.2 获取所有记录（分页）

```python
def get_all_records(token):
    all_records = []
    page_token = None
    
    while True:
        params = {"view_id": "vewGCGaV3O", "page_size": 500}
        if page_token:
            params["page_token"] = page_token
        
        url = "https://open.feishu.cn/open-apis/bitable/v1/apps/SY2bwgD36iudpJk42a7cfIwQnPg/tables/tbl5WSbuZY2Hq5Gc/records/search"
        headers = {"Authorization": f"Bearer {token}", "Content-Type": "application/json"}
        
        response = requests.post(url, headers=headers, json=params)
        result = response.json()
        
        if result.get("code") != 0:
            break
        
        items = result.get("data", {}).get("items", [])
        all_records.extend(items)
        
        if not result.get("data", {}).get("has_more"):
            break
        page_token = result.get("data", {}).get("page_token")
    
    return all_records
```

---

## 三、筛选条件构建（核心）

### 3.1 筛选语法规则

**重要**：飞书 API 对 `children` 结构有严格要求：
- `children` 中的每个元素**必须**是 `{conjunction: "or/and", conditions: [...]}` 结构
- 不能直接在 `children` 中放单个 condition 对象

### 3.2 筛选结构模板

```json
{
  "filter": {
    "conjunction": "and",
    "children": [
      {
        "conjunction": "or",
        "conditions": [
          {"field_name": "字段名1", "operator": "contains", "value": ["关键词1"]},
          {"field_name": "字段名1", "operator": "contains", "value": ["关键词2"]}
        ]
      },
      {
        "conjunction": "or",
        "conditions": [
          {"field_name": "字段名2", "operator": "contains", "value": ["关键词3"]}
        ]
      }
    ]
  }
}
```

**含义**：`字段名1 包含(关键词1 OR 关键词2) AND 字段名2 包含关键词3`

### 3.3 支持的操作符

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

---

## 四、动态筛选条件构建代码

### 4.1 通用构建函数

```javascript
/**
 * 动态构建飞书多维表格筛选条件
 * 
 * @param {object} input - 输入参数
 * @param {object} input.fieldKeywords - 字段关键词映射，格式：{字段名: [关键词数组]}
 * @returns {object} - 返回飞书 API 的 filter 结构
 * 
 * @example
 * buildFilter({
 *   "知识标题": ["投诉", "售后"],
 *   "知识内容": ["24", "48"]
 * })
 * // 返回: (标题 contains 投诉 OR 售后) AND (内容 contains 24 OR 48)
 */
function buildFilter(fieldKeywords) {
  const conditions = [];
  
  for (const [fieldName, keywords] of Object.entries(fieldKeywords)) {
    if (!keywords || keywords.length === 0) continue;
    
    if (keywords.length === 1) {
      // 单个关键词：直接添加
      conditions.push({
        conjunction: "or",
        conditions: [{
          field_name: fieldName,
          operator: "contains",
          value: [keywords[0]]
        }]
      });
    } else {
      // 多个关键词：用 OR 嵌套
      conditions.push({
        conjunction: "or",
        conditions: keywords.map(word => ({
          field_name: fieldName,
          operator: "contains",
          value: [word]
        }))
      });
    }
  }
  
  if (conditions.length === 0) {
    return null;
  }
  
  if (conditions.length === 1) {
    return { filter: conditions[0] };
  }
  
  return {
    filter: {
      conjunction: "and",
      children: conditions
    }
  };
}

// ===== Coze 代码节点入口 =====

module.exports = async function ({ fieldKeywords }) {
  try {
    const filterConfig = buildFilter(fieldKeywords || {});
    return filterConfig || { filter: null };
  } catch (error) {
    console.error('构建筛选条件失败:', error);
    return { filter: null };
  }
};
```

### 4.2 Python 版本

```python
def build_filter(field_keywords: dict) -> dict:
    """
    动态构建飞书筛选条件
    
    Args:
        field_keywords: 字段关键词映射，格式：{"字段名": ["关键词1", "关键词2"]}
    
    Returns:
        飞书 API 的 filter 结构
    
    Example:
        build_filter({
            "知识标题": ["投诉", "售后"],
            "知识内容": ["24", "48"]
        })
    """
    conditions = []
    
    for field_name, keywords in field_keywords.items():
        if not keywords:
            continue
        
        if len(keywords) == 1:
            # 单个关键词
            conditions.append({
                "conjunction": "or",
                "conditions": [{
                    "field_name": field_name,
                    "operator": "contains",
                    "value": [keywords[0]]
                }]
            })
        else:
            # 多个关键词
            conditions.append({
                "conjunction": "or",
                "conditions": [
                    {
                        "field_name": field_name,
                        "operator": "contains",
                        "value": [word]
                    }
                    for word in keywords
                ]
            })
    
    if not conditions:
        return None
    
    if len(conditions) == 1:
        return {"filter": conditions[0]}
    
    return {
        "filter": {
            "conjunction": "and",
            "children": conditions
        }
    }
```

### 4.3 使用示例

**输入**：
```python
filter_config = build_filter({
    "知识标题": ["投诉", "售后"],
    "知识内容": ["24", "48"]
})
```

**输出**：
```json
{
  "filter": {
    "conjunction": "and",
    "children": [
      {
        "conjunction": "or",
        "conditions": [
          {"field_name": "知识标题", "operator": "contains", "value": ["投诉"]},
          {"field_name": "知识标题", "operator": "contains", "value": ["售后"]}
        ]
      },
      {
        "conjunction": "or",
        "conditions": [
          {"field_name": "知识内容", "operator": "contains", "value": ["24"]},
          {"field_name": "知识内容", "operator": "contains", "value": ["48"]}
        ]
      }
    ]
  }
}
```

---

## 五、完整查询示例

```python
import requests

# 配置
APP_ID = "cli_xxxxxxxxxxxxxxx"
APP_SECRET = "xxxxxxxxxxxxxxxxxxxx"
APP_TOKEN = "SY2bwgD36iudpJk42a7cfIwQnPg"
TABLE_ID = "tbl5WSbuZY2Hq5Gc"
VIEW_ID = "vewGCGaV3O"

def get_token():
    url = "https://open.feishu.cn/open-apis/auth/v3/tenant_access_token/internal"
    response = requests.post(url, json={"app_id": APP_ID, "app_secret": APP_SECRET})
    return response.json().get("tenant_access_token")

def query_knowledge(token, field_keywords: dict):
    """查询知识库"""
    url = f"https://open.feishu.cn/open-apis/bitable/v1/apps/{APP_TOKEN}/tables/{TABLE_ID}/records/search"
    headers = {"Authorization": f"Bearer {token}", "Content-Type": "application/json"}
    
    body = {"view_id": VIEW_ID, "page_size": 100}
    
    # 构建筛选条件
    filter_config = build_filter(field_keywords)
    if filter_config:
        body["filter"] = filter_config
    
    response = requests.post(url, headers=headers, json=body)
    result = response.json()
    
    if result.get("code") == 0:
        items = result.get("data", {}).get("items", [])
        print(f"查询成功，命中 {len(items)} 条数据:")
        for item in items:
            fields = item.get("fields", {})
            title = fields.get("知识标题", "")
            if isinstance(title, list) and len(title) > 0:
                title = title[0].get("text", "") if isinstance(title[0], dict) else title[0]
            print(f"  - {title}")
        return items
    else:
        print(f"查询失败: {result}")
        return []

# 使用
if __name__ == "__main__":
    token = get_token()
    
    # 查询知识标题包含"投诉"或"售后"，且知识内容包含"24"或"48"的记录
    results = query_knowledge(token, {
        "知识标题": ["投诉", "售后"],
        "知识内容": ["24", "48"]
    })
```

---

## 六、常见问题

### 6.1 错误码

| 错误码 | 说明 | 解决方案 |
|---|---|---|
| `1254302` | 无权限访问 | 在多维表格中给应用添加协作者权限 |
| `1254018` | Filter 格式错误 | 检查 filter 结构是否符合规范 |
| `field validation failed` | children 结构错误 | 确保 children 中每个元素都是 {conjunction, conditions} 结构 |

### 6.2 纯数字筛选

Q: 搜索 "1", "24" 等纯数字会失败吗？

A: **不会失败**，纯数字可以用。之前的错误是因为 `children` 结构写错了，不是数字的问题。

### 6.3 筛选条件过长

Q: 筛选条件超过 2000 字符怎么办？

A: 飞书限制 filter 不超过 2000 字符。如果关键词太多，可以：
1. 减少每个字段的关键词数量
2. 分多次查询后合并结果

---

## 七、字段类型说明

| 字段类型 | type值 | 说明 |
|---|---|---|
| 文本 | 1 | 富文本内容，API返回数组格式 |
| 数字 | 2 | 整数或浮点数 |
| 单选 | 3 | 预设选项中选择一个 |
| 多选 | 4 | 预设选项中选择多个 |
| 日期 | 5 | ISO8601 格式 |
| 复选框 | 7 | true/false |
| 人员 | 11 | 关联飞书用户 |
| 附件 | 17 | 文件token |
