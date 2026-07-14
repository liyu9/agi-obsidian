提示词优化

|元素|内容|
|---|---|
|ROLE|飞书多维表格专家|
|TASK|详细介绍多维表格工具的功能、用法和最佳实践|
|FORMAT|工具列表 + 字段类型 + 使用场景 + 代码示例|
|CONTEXT|用户向前需要了解多维表格的完整能力|
|CONSTRAINTS|详细但不冗长，包含实际示例|

📖 飞书多维表格工具详解

一、核心定位

|项目|说明|
|---|---|
|技能名称|feishu-bitable|
|核心能力|创建、查询、编辑、管理飞书多维表格|
|字段类型|27 种|
|支持操作|CRUD 记录、批量操作、高级筛选、视图管理|

二、工具列表

1. 应用管理（App）

|工具|Action|功能|必填参数|
|---|---|---|---|
|feishu_bitable_app|create|创建多维表格|name|
|feishu_bitable_app|get|获取元数据|app_token|
|feishu_bitable_app|update|更新元数据|app_token|
|feishu_bitable_app|copy|复制多维表格|app_token|

2. 数据表管理（Table）

|工具|Action|功能|必填参数|
|---|---|---|---|
|feishu_bitable_app_table|create|创建数据表|app_token, name|
|feishu_bitable_app_table|list|列出所有数据表|app_token|
|feishu_bitable_app_table|update|更新数据表|app_token, table_id|
|feishu_bitable_app_table|delete|删除数据表|app_token, table_id|

3. 字段管理（Field）

|工具|Action|功能|必填参数|
|---|---|---|---|
|feishu_bitable_app_table_field|create|创建字段|app_token, table_id, field_name, type|
|feishu_bitable_app_table_field|list|列出所有字段|app_token, table_id|
|feishu_bitable_app_table_field|update|更新字段|app_token, table_id, field_id|
|feishu_bitable_app_table_field|delete|删除字段|app_token, table_id, field_id|

4. 记录管理（Record）

|工具|Action|功能|必填参数|
|---|---|---|---|
|feishu_bitable_app_table_record|create|新增记录|app_token, table_id, fields|
|feishu_bitable_app_table_record|list|查询记录|app_token, table_id|
|feishu_bitable_app_table_record|update|更新记录|app_token, table_id, record_id, fields|
|feishu_bitable_app_table_record|delete|删除记录|app_token, table_id, record_id|
|feishu_bitable_app_table_record|batch_create|批量创建|app_token, table_id, records (≤500)|

- 1/2

- 1
- 2

5. 视图管理（View）

|工具|Action|功能|必填参数|
|---|---|---|---|
|feishu_bitable_app_table_view|create|创建视图|app_token, table_id, view_name, view_type|
|feishu_bitable_app_table_view|list|列出视图|app_token, table_id|
|feishu_bitable_app_table_view|get|获取视图|app_token, table_id, view_id|
|feishu_bitable_app_table_view|update|更新视图|app_token, table_id, view_id|
|feishu_bitable_app_table_view|delete|删除视图|app_token, table_id, view_id|

三、字段类型对照表

|type|ui_type|字段类型|正确格式|
|---|---|---|---|
|1|Text|文本|"文本内容"|
|2|Number|数字|123 或 45.67|
|3|SingleSelect|单选|"选项名"|
|4|MultiSelect|多选|["选项1", "选项2"]|
|5|DateTime|日期|1674206443000（毫秒时间戳）|

- 1/4

- 1
- 2
- 3
- 4

四、核心使用场景

场景 1：查字段类型（必做第一步）

{

"action": "list",

"app_token": "S404b...",

"table_id": "tbl..."

}

  
返回：包含每个字段的 field_id、field_name、type、ui_type、property

场景 2：批量导入数据

{

"action": "batch_create",

"app_token": "S404b...",

"table_id": "tbl...",

"records": [

{

"fields": {

"客户名称": "Bytedance",

"负责人": [{"id": "ou_xxx"}],

"签约日期": 1674206443000,

"状态": "进行中"

}

},

{

"fields": {

"客户名称": "飞书",

"负责人": [{"id": "ou_yyy"}],

"签约日期": 1675416243000,

"状态": "已完成"

}

}

]

}

  
限制：最多 500 条记录

场景 3：筛选查询

{

"action": "list",

"app_token": "S404b...",

"table_id": "tbl...",

"filter": {

"conjunction": "and",

"conditions": [

{

"field_name": "状态",

"operator": "is",

"value": ["进行中"]

},

{

"field_name": "截止日期",

"operator": "isLess",

"value": ["ExactDate", "1740441600000"]

}

]

},

"sort": [

{

"field_name": "截止日期",

"desc": false

}

]

}

五、常见错误与排查

|错误码|错误现象|原因|解决方案|
|---|---|---|---|
|1254064|DatetimeFieldConvFail|日期格式错误|必须用毫秒时间戳|
|1254068|URLFieldConvFail|超链接格式错误|必须用对象 {text, link}|
|1254066|UserFieldConvFail|人员格式错误|必须传 [{id: "ou_xxx"}]|
|1254015|Field types do not match|字段值格式错误|先 list 字段，按类型构造|
|1254104|RecordAddOnceExceedLimit|批量超过 500 条|分批调用|

- 1/2

- 1
- 2

六、使用限制

|限制项|上限|
|---|---|
|数据表 + 仪表盘|100（单个 App）|
|记录数|20,000（单个数据表）|
|字段数|300（单个数据表）|
|视图数|200（单个数据表）|
|批量创建/更新/删除|500（单次 API 调用）|

七、最佳实践

1. 写记录前：先调用 field.list 获取字段类型
    

2. 日期字段：用毫秒时间戳，不用字符串
    

3. 人员字段：格式 [{id: "ou_xxx"}]
    

4. 批量操作：≤ 500 条，串行调用 + 延迟
    

5. 创建表时：清理默认表的空行
    

回复 前进: 

详细介绍多维表格工具

📖 飞书多维表格工具详解

一、核心定位

|项目|说明|
|---|---|
|技能名称|feishu-bitable|
|核心能力|创建、查询、编辑、管理飞书多维表格|
|字段类型|27 种|
|支持操作|CRUD 记录、批量操作、高级筛选、视图管理|

二、工具列表

1. 应用管理（App）

|工具|Action|功能|必填参数|
|---|---|---|---|
|feishu_bitable_app|create|创建多维表格|name|
|feishu_bitable_app|get|获取元数据|app_token|
|feishu_bitable_app|update|更新元数据|app_token|
|feishu_bitable_app|copy|复制多维表格|app_token|

2. 数据表管理（Table）

|工具|Action|功能|必填参数|
|---|---|---|---|
|feishu_bitable_app_table|create|创建数据表|app_token, name|
|feishu_bitable_app_table|list|列出所有数据表|app_token|
|feishu_bitable_app_table|update|更新数据表|app_token, table_id|
|feishu_bitable_app_table|delete|删除数据表|app_token, table_id|

3. 字段管理（Field）

|工具|Action|功能|必填参数|
|---|---|---|---|
|feishu_bitable_app_table_field|create|创建字段|app_token, table_id, field_name, type|
|feishu_bitable_app_table_field|list|列出所有字段|app_token, table_id|
|feishu_bitable_app_table_field|update|更新字段|app_token, table_id, field_id|
|feishu_bitable_app_table_field|delete|删除字段|app_token, table_id, field_id|

4. 记录管理（Record）

|工具|Action|功能|必填参数|
|---|---|---|---|
|feishu_bitable_app_table_record|create|新增记录|app_token, table_id, fields|
|feishu_bitable_app_table_record|list|查询记录|app_token, table_id|
|feishu_bitable_app_table_record|update|更新记录|app_token, table_id, record_id, fields|
|feishu_bitable_app_table_record|delete|删除记录|app_token, table_id, record_id|
|feishu_bitable_app_table_record|batch_create|批量创建|app_token, table_id, records (≤500)|

- 1/2

- 1
- 2

5. 视图管理（View）

|工具|Action|功能|必填参数|
|---|---|---|---|
|feishu_bitable_app_table_view|create|创建视图|app_token, table_id, view_name, view_type|
|feishu_bitable_app_table_view|list|列出视图|app_token, table_id|
|feishu_bitable_app_table_view|get|获取视图|app_token, table_id, view_id|
|feishu_bitable_app_table_view|update|更新视图|app_token, table_id, view_id|
|feishu_bitable_app_table_view|delete|删除视图|app_token, table_id, view_id|

三、字段类型对照表

|type|ui_type|字段类型|正确格式|
|---|---|---|---|
|1|Text|文本|"文本内容"|
|2|Number|数字|123 或 45.67|
|3|SingleSelect|单选|"选项名"|
|4|MultiSelect|多选|["选项1", "选项2"]|
|5|DateTime|日期|1674206443000（毫秒时间戳）|

- 1/4

- 1
- 2
- 3
- 4

四、核心使用场景

场景 1：查字段类型（必做第一步）

{

"action": "list",

"app_token": "S404b...",

"table_id": "tbl..."

}

  
返回：包含每个字段的 field_id、field_name、type、ui_type、property

场景 2：批量导入数据

{

"action": "batch_create",

"app_token": "S404b...",

"table_id": "tbl...",

"records": [

{

"fields": {

"客户名称": "Bytedance",

"负责人": [{"id": "ou_xxx"}],

"签约日期": 1674206443000,

"状态": "进行中"

}

},

{

"fields": {

"客户名称": "飞书",

"负责人": [{"id": "ou_yyy"}],

"签约日期": 1675416243000,

"状态": "已完成"

}

}

]

}

  
限制：最多 500 条记录

场景 3：筛选查询

{

"action": "list",

"app_token": "S404b...",

"table_id": "tbl...",

"filter": {

"conjunction": "and",

"conditions": [

{

"field_name": "状态",

"operator": "is",

"value": ["进行中"]

},

{

"field_name": "截止日期",

"operator": "isLess",

"value": ["ExactDate", "1740441600000"]

}

]

},

"sort": [

{

"field_name": "截止日期",

"desc": false

}

]

}

五、常见错误与排查

|错误码|错误现象|原因|解决方案|
|---|---|---|---|
|1254064|DatetimeFieldConvFail|日期格式错误|必须用毫秒时间戳|
|1254068|URLFieldConvFail|超链接格式错误|必须用对象 {text, link}|
|1254066|UserFieldConvFail|人员格式错误|必须传 [{id: "ou_xxx"}]|
|1254015|Field types do not match|字段值格式错误|先 list 字段，按类型构造|
|1254104|RecordAddOnceExceedLimit|批量超过 500 条|分批调用|

- 1/2

- 1
- 2

六、使用限制

|限制项|上限|
|---|---|
|数据表 + 仪表盘|100（单个 App）|
|记录数|20,000（单个数据表）|
|字段数|300（单个数据表）|
|视图数|200（单个数据表）|
|批量创建/更新/删除|500（单次 API 调用）|

七、最佳实践

1. 写记录前：先调用 field.list 获取字段类型
    

2. 日期字段：用毫秒时间戳，不用字符串
    

3. 人员字段：格式 [{id: "ou_xxx"}]
    

4. 批量操作：≤ 500 条，串行调用 + 延迟
    

5. 创建表时：清理默认表的空行