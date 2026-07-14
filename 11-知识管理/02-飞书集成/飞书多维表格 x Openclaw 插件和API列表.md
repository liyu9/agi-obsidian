# 飞书 OpenClaw 插件 Skill - 工具 - Action-API 精准对应表

## 前置校验说明

1. 所有**API 官方标准名称**100% 沿用你提供的《飞书多维表格 API.md》文档里的官方命名，无任何自定义命名
2. 所有对应关系经过三重校验：匹配 SKILL.md 官方工具 / Action 定义 → 匹配你提供的 API 文档的名称 / 路径 / 方法 → 匹配飞书开放平台官方规范
3. 严格遵循「一个 Action → 一个官方 API」的一对一映射，无模糊、无混淆，可直接对照使用

---

## 核心总览

飞书官方`feishu-bitable` Skill 共包含**5 大官方工具**，对应**28 个官方 Action**，精准映射你提供的 API 文档里的**28 个官方标准 API**，完整对应关系如下：

---

## 一、工具 1：feishu_bitable_app（多维表格应用管理工具）

### 核心定位：管理多维表格顶层应用（App/Base）的全生命周期

表格

|官方工具名称|官方 Action 名称|飞书官方 API 标准名称|API 请求信息|核心功能|
|:--|:--|:--|:--|:--|
|feishu_bitable_app|create|创建多维表格|POST /apps|创建全新的多维表格应用，支持指定存放文件夹|
|feishu_bitable_app|get|获取多维表格元数据|GET /apps/:app_token|获取指定多维表格的名称、版本号、高级权限状态等元数据|
|feishu_bitable_app|copy|复制多维表格|POST /apps/:app_token/copy|复制指定多维表格，生成全新副本，支持指定目标文件夹|
|feishu_bitable_app|update|更新多维表格元数据|PUT /apps/:app_token|更新多维表格名称，开启 / 关闭高级权限|

---

## 二、工具 2：feishu_bitable_app_table（数据表管理工具）

### 核心定位：管理多维表格内的数据表（子表）的全生命周期

表格

|官方工具名称|官方 Action 名称|飞书官方 API 标准名称|API 请求信息|核心功能|
|:--|:--|:--|:--|:--|
|feishu_bitable_app_table|create|新增一个数据表|POST /apps/:app_token/tables|新建单个数据表，支持创建时一次性定义字段结构|
|feishu_bitable_app_table|batch_create|新增多个数据表|POST /apps/:app_token/tables/batch_create|批量新建多个数据表，仅支持指定数据表名称|
|feishu_bitable_app_table|list|列出数据表|GET /apps/:app_token/tables|列出多维表格内的所有数据表，返回表 ID、名称、版本号|
|feishu_bitable_app_table|update|更新数据表|PATCH /apps/:app_token/tables/:table_id|更新数据表名称|
|feishu_bitable_app_table|delete|删除一个数据表|DELETE /apps/:app_token/tables/:table_id|删除单个指定数据表（仅剩最后一张表时禁止删除）|
|feishu_bitable_app_table|batch_delete|删除多个数据表|POST /apps/:app_token/tables/batch_delete|批量删除多个数据表（仅剩最后一张表时禁止删除）|

---

## 三、工具 3：feishu_bitable_app_table_field（字段管理工具）

### 核心定位：管理数据表内的字段（列），SKILL 强制要求写记录前必须调用本工具校验字段格式

表格

|官方工具名称|官方 Action 名称|飞书官方 API 标准名称|API 请求信息|核心功能|
|:--|:--|:--|:--|:--|
|feishu_bitable_app_table_field|list|列出字段|GET /apps/:app_token/tables/:table_id/fields|列出数据表的所有字段，返回字段 ID、名称、类型、属性配置|
|feishu_bitable_app_table_field|create|新增字段|POST /apps/:app_token/tables/:table_id/fields|新建单个字段，支持全量 27 种字段类型，可配置字段属性|
|feishu_bitable_app_table_field|update|更新字段|PUT /apps/:app_token/tables/:table_id/fields/:field_id|更新指定字段的名称、类型、属性配置|
|feishu_bitable_app_table_field|delete|删除字段|DELETE /apps/:app_token/tables/:table_id/fields/:field_id|删除指定字段|

---

## 四、工具 4：feishu_bitable_app_table_record（记录管理工具）

### 核心定位：管理数据表内的记录（行数据），是 Skill 的核心高频工具，对应 SKILL.md 里 80% 的核心场景

表格

|官方工具名称|官方 Action 名称|飞书官方 API 标准名称|API 请求信息|核心功能|
|:--|:--|:--|:--|:--|
|feishu_bitable_app_table_record|list|查询记录|POST /apps/:app_token/tables/:table_id/records/search|按条件筛选 / 分页查询数据表内的记录，支持排序、指定返回字段|
|feishu_bitable_app_table_record|get|批量获取记录|POST /apps/:app_token/tables/:table_id/records/batch_get|通过记录 ID 批量获取指定记录的完整字段数据|
|feishu_bitable_app_table_record|create|新增记录|POST /apps/:app_token/tables/:table_id/records|新增单条记录，支持全量字段类型写入|
|feishu_bitable_app_table_record|batch_create|新增多条记录|POST /apps/:app_token/tables/:table_id/records/batch_create|批量新增多条记录，单次上限 500 条（SKILL 强制规范）|
|feishu_bitable_app_table_record|update|更新记录|PUT /apps/:app_token/tables/:table_id/records/:record_id|更新单条指定记录，支持增量更新仅指定字段|
|feishu_bitable_app_table_record|batch_update|更新多条记录|POST /apps/:app_token/tables/:table_id/records/batch_update|批量更新多条记录，单次上限 500 条|
|feishu_bitable_app_table_record|delete|删除记录|DELETE /apps/:app_token/tables/:table_id/records/:record_id|删除单条指定记录|
|feishu_bitable_app_table_record|batch_delete|删除多条记录|POST /apps/:app_token/tables/:table_id/records/batch_delete|批量删除多条记录，单次上限 500 条（用于删除新建表格默认空行）|

---

## 五、工具 5：feishu_bitable_app_table_view（视图管理工具）

### 核心定位：管理数据表内的视图，支持全类型视图的全生命周期操作

表格

|官方工具名称|官方 Action 名称|飞书官方 API 标准名称|API 请求信息|核心功能|
|:--|:--|:--|:--|:--|
|feishu_bitable_app_table_view|create|新增视图|POST /apps/:app_token/tables/:table_id/views|新建视图，支持表格、看板、画册、甘特图、表单全类型|
|feishu_bitable_app_table_view|list|列出视图|GET /apps/:app_token/tables/:table_id/views|列出数据表内的所有视图，返回视图 ID、名称、类型|
|feishu_bitable_app_table_view|get|获取视图|GET /apps/:app_token/tables/:table_id/views/:view_id|获取指定视图的详细配置，含筛选条件、排序规则|
|feishu_bitable_app_table_view|update|更新视图|PATCH /apps/:app_token/tables/:table_id/views/:view_id|更新视图名称、筛选条件、排序规则等配置|
|feishu_bitable_app_table_view|delete|删除视图|DELETE /apps/:app_token/tables/:table_id/views/:view_id|删除指定视图|

---

## 六、Skill 运行必需的辅助 API（官方标准名称完整对应）

除上述核心业务 API 外，Skill 正常运行必须依赖以下辅助 API，均来自你提供的官方文档体系：

表格

|辅助 API 官方标准名称|API 请求信息|对应 Skill 内的作用|
|:--|:--|:--|
|获取租户 access_token|POST /open-apis/auth/v3/tenant_access_token/internal/|调用所有业务 API 的前置鉴权，获取租户级访问凭证|
|获取用户 access_token|POST /open-apis/auth/v3/user_access_token/internal/|获取用户级访问凭证，实现以用户身份操作多维表格|
|批量获取用户 ID|POST /open-apis/contact/v3/users/batch_get_id|通过用户姓名 / 手机号获取 open_id，适配人员字段格式要求|
|上传素材|POST /open-apis/drive/v1/medias/upload_all|上传附件到飞书，获取 file_token，适配附件字段格式要求|
|获取表单元数据|GET /apps/:app_token/tables/:table_id/forms/:form_id|获取表单视图的基础配置，适配表单类型视图操作|
|更新表单元数据|PATCH /apps/:app_token/tables/:table_id/forms/:form_id|更新表单视图的名称、描述、共享状态|

---

## 七、未被 Skill 原生覆盖的 API 官方名称完整清单

以下为你提供的 API 文档中，未被`feishu-bitable` Skill 原生覆盖的 API，完整官方名称如下：

1. 创建字段编组
2. 复制仪表盘
3. 列出仪表盘
4. 更新表单问题
5. 列出表单问题
6. 新增自定义角色
7. 更新自定义角色
8. 列出自定义角色
9. 删除自定义角色
10. 新增协作者
11. 批量新增协作者
12. 列出协作者
13. 删除协作者
14. 批量删除协作者
15. 列出自动化流程
16. 更新自动化流程状态
17. 列出工作流