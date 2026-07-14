

以下为飞书多维表格 bitable-v1 版本的 API 列表，按照飞书开放平台官方文档的左侧目录顺序整理，所有内容均来自官方文档，已在API名称后新增**作用**字段，标注每个API的官方用途说明。

<hr />

## 一、多维表格（Base）相关 API

按官方文档目录顺序排列：

| API 名称    | 作用                                                   | 请求方式 | 接口地址                                                    | 权限要求（满足其一即可）                                         | 支持的访问凭证                                 | 支持的应用类型   |
| --------- | ---------------------------------------------------- | ---- | ------------------------------------------------------- | ---------------------------------------------------- | --------------------------------------- | --------- |
| 创建多维表格    | 创建一个全新的多维表格应用（Base），生成唯一的app_token标识，可自定义Base的基础配置信息 | POST | <code>/open-apis/bitable/v1/apps</code>                 | 创建多维表格的权限                                            | tenant_access_token / user_access_token | 自建应用、商店应用 |
| 复制多维表格    | 复制指定app_token的多维表格，生成一个全新的多维表格副本，保留原表的结构与配置          | POST | <code>/open-apis/bitable/v1/apps/:app_token/copy</code> | 查看、评论、编辑和管理多维表格                                      | tenant_access_token / user_access_token | 自建应用、商店应用 |
| 获取多维表格元数据 | 查询指定多维表格的基础元数据信息，获取Base的名称、描述、创建时间等核心属性              | GET  | <code>/open-apis/bitable/v1/apps/:app_token</code>      | 1. 获取多维表格信息<br>2. 查看、评论、编辑和管理多维表格<br>3. 查看、评论和导出多维表格 | tenant_access_token / user_access_token | 自建应用、商店应用 |
| 更新多维表格元数据 | 修改指定多维表格的元数据信息，可更新Base的名称、描述等相关属性配置                  | PUT  | <code>/open-apis/bitable/v1/apps/:app_token</code>      | 查看、评论、编辑和管理多维表格                                      | tenant_access_token / user_access_token | 自建应用、商店应用 |

<hr />

## 二、数据表（Table）相关 API

按官方文档目录顺序排列：

|API 名称|作用|请求方式|接口地址|权限要求（满足其一即可）|支持的访问凭证|支持的应用类型|
|---|---|---|---|---|---|---|
|新增一个数据表|在指定多维表格中创建单个数据表，可自定义表名、默认字段等配置，生成唯一的table_id|POST|<code>/open-apis/bitable/v1/apps/:app_token/tables</code>|查看、评论、编辑和管理多维表格|tenant_access_token / user_access_token|自建应用、商店应用|
|新增多个数据表|在指定多维表格中批量创建多个数据表，仅可指定数据表名称等基础信息|POST|<code>/open-apis/bitable/v1/apps/:app_token/tables/batch_create</code>|查看、评论、编辑和管理多维表格|tenant_access_token / user_access_token|自建应用、商店应用|
|更新数据表|修改指定数据表的基础配置信息，可更新数据表名称等相关属性|PUT|<code>/open-apis/bitable/v1/apps/:app_token/tables/:table_id</code>|查看、评论、编辑和管理多维表格|tenant_access_token / user_access_token|自建应用、商店应用|
|列出数据表|查询指定多维表格下的所有数据表清单，获取各数据表的table_id、名称、字段配置等基础信息|GET|<code>/open-apis/bitable/v1/apps/:app_token/tables</code>|1. 查看、评论、导出多维表格<br>2. 查看、评论、编辑和管理多维表格|tenant_access_token / user_access_token|自建应用、商店应用|
|删除一个数据表|删除指定多维表格中的单个数据表，会同步删除该表内的所有数据与配置|DELETE|<code>/open-apis/bitable/v1/apps/:app_token/tables/:table_id</code>|查看、评论、编辑和管理多维表格|tenant_access_token / user_access_token|自建应用、商店应用|
|删除多个数据表|在指定多维表格中批量删除多个数据表，会同步删除对应表内的所有数据与配置|POST|<code>/open-apis/bitable/v1/apps/:app_token/tables/batch_delete</code>|查看、评论、编辑和管理多维表格|tenant_access_token / user_access_token|自建应用、商店应用|

<hr />

## 三、视图（View）相关 API

按官方文档目录顺序排列：

|API 名称|作用|请求方式|接口地址|权限要求（满足其一即可）|支持的访问凭证|支持的应用类型|
|---|---|---|---|---|---|---|
|新增视图|在指定数据表中创建新的视图，可自定义视图类型、筛选条件、排序规则等配置|POST|<code>/open-apis/bitable/v1/apps/:app_token/tables/:table_id/views</code>|查看、评论、编辑和管理多维表格|tenant_access_token / user_access_token|自建应用、商店应用|
|更新视图|修改指定视图的基础配置，可更新视图名称、筛选条件、排序规则、显示字段等属性|PUT|<code>/open-apis/bitable/v1/apps/:app_token/tables/:table_id/views/:view_id</code>|查看、评论、编辑和管理多维表格|tenant_access_token / user_access_token|自建应用、商店应用|
|列出视图|查询指定数据表下的所有视图清单，获取各视图的view_id、名称、类型等基础信息|GET|<code>/open-apis/bitable/v1/apps/:app_token/tables/:table_id/views</code>|1. 查看、评论、导出多维表格<br>2. 查看、评论、编辑和管理多维表格|tenant_access_token / user_access_token|自建应用、商店应用|
|获取视图|查询指定视图的详细配置信息，获取视图的筛选条件、排序规则、显示字段等完整属性|GET|<code>/open-apis/bitable/v1/apps/:app_token/tables/:table_id/views/:view_id</code>|1. 查看、评论、导出多维表格<br>2. 查看、评论、编辑和管理多维表格|tenant_access_token / user_access_token|自建应用、商店应用|
|删除视图|删除指定数据表中的单个视图，不会影响数据表内的原始记录数据|DELETE|<code>/open-apis/bitable/v1/apps/:app_token/tables/:table_id/views/:view_id</code>|查看、评论、编辑和管理多维表格|tenant_access_token / user_access_token|自建应用、商店应用|

<hr />

## 四、记录（Record）相关 API

按官方文档目录顺序排列：

| API 名称 | 作用                                               | 请求方式   | 接口地址                                                                                     | 权限要求（满足其一即可）                          | 支持的访问凭证                                 | 支持的应用类型   |
| ------ | ------------------------------------------------ | ------ | ---------------------------------------------------------------------------------------- | ------------------------------------- | --------------------------------------- | --------- |
| 列出记录   | 查询指定数据表中的记录列表，支持分页、筛选、排序，获取多条记录的字段内容             | GET    | <code>/open-apis/bitable/v1/apps/:app_token/tables/:table_id/records</code>              | 1. 查看、评论、导出多维表格<br>2. 查看、评论、编辑和管理多维表格 | tenant_access_token / user_access_token | 自建应用、商店应用 |
| 获取单条记录 | 查询指定数据表中单条记录的详细信息，获取该记录所有字段的完整内容                 | GET    | <code>/open-apis/bitable/v1/apps/:app_token/tables/:table_id/records/:record_id</code>   | 1. 查看、评论、导出多维表格<br>2. 查看、评论、编辑和管理多维表格 | tenant_access_token / user_access_token | 自建应用、商店应用 |
| 创建单条记录 | 在指定数据表中新增一条记录，可自定义各字段的内容，生成唯一的record_id          | POST   | <code>/open-apis/bitable/v1/apps/:app_token/tables/:table_id/records</code>              | 查看、评论、编辑和管理多维表格                       | tenant_access_token / user_access_token | 自建应用、商店应用 |
| 批量创建记录 | 在指定数据表中批量新增多条记录，单次最多可处理1000条记录，执行结果为全成功或全失败      | POST   | <code>/open-apis/bitable/v1/apps/:app_token/tables/:table_id/records/batch_create</code> | 查看、评论、编辑和管理多维表格                       | tenant_access_token / user_access_token | 自建应用、商店应用 |
| 更新单条记录 | 修改指定数据表中单条记录的字段内容，可更新指定字段的数值                     | PUT    | <code>/open-apis/bitable/v1/apps/:app_token/tables/:table_id/records/:record_id</code>   | 查看、评论、编辑和管理多维表格                       | tenant_access_token / user_access_token | 自建应用、商店应用 |
| 批量更新记录 | 在指定数据表中批量修改多条记录的字段内容，单次最多可处理1000条记录，执行结果为全成功或全失败 | POST   | <code>/open-apis/bitable/v1/apps/:app_token/tables/:table_id/records/batch_update</code> | 查看、评论、编辑和管理多维表格                       | tenant_access_token / user_access_token | 自建应用、商店应用 |
| 删除单条记录 | 删除指定数据表中的单条记录，会永久清除该条记录的所有内容                     | DELETE | <code>/open-apis/bitable/v1/apps/:app_token/tables/:table_id/records/:record_id</code>   | 查看、评论、编辑和管理多维表格                       | tenant_access_token / user_access_token | 自建应用、商店应用 |
| 批量删除记录 | 在指定数据表中批量删除多条记录，单次最多可处理1000条记录，执行结果为全成功或全失败      | POST   | <code>/open-apis/bitable/v1/apps/:app_token/tables/:table_id/records/batch_delete</code> | 查看、评论、编辑和管理多维表格                       | tenant_access_token / user_access_token | 自建应用、商店应用 |

<hr />

## 五、字段（Field）相关 API

按官方文档目录顺序排列：

|API 名称|作用|请求方式|接口地址|权限要求（满足其一即可）|支持的访问凭证|支持的应用类型|
|---|---|---|---|---|---|---|
|列出字段|查询指定数据表中的所有字段清单，获取各字段的field_id、名称、类型、配置等基础信息|GET|<code>/open-apis/bitable/v1/apps/:app_token/tables/:table_id/fields</code>|1. 查看、评论、导出多维表格<br>2. 查看、评论、编辑和管理多维表格|tenant_access_token / user_access_token|自建应用、商店应用|
|创建字段|在指定数据表中新增一个字段，可自定义字段名称、类型、格式等相关配置，生成唯一的field_id|POST|<code>/open-apis/bitable/v1/apps/:app_token/tables/:table_id/fields</code>|查看、评论、编辑和管理多维表格|tenant_access_token / user_access_token|自建应用、商店应用|
|更新字段|修改指定字段的基础配置，可更新字段名称、类型、格式、属性等相关设置|PUT|<code>/open-apis/bitable/v1/apps/:app_token/tables/:table_id/fields/:field_id</code>|查看、评论、编辑和管理多维表格|tenant_access_token / user_access_token|自建应用、商店应用|
|删除字段|删除指定数据表中的单个字段，会同步清除该字段下所有记录的对应内容|DELETE|<code>/open-apis/bitable/v1/apps/:app_token/tables/:table_id/fields/:field_id</code>|查看、评论、编辑和管理多维表格|tenant_access_token / user_access_token|自建应用、商店应用|

<hr />

## 六、自定义角色（Custom Role）相关 API

按官方文档目录顺序排列：

|API 名称|作用|请求方式|接口地址|权限要求（满足其一即可）|支持的访问凭证|支持的应用类型|
|---|---|---|---|---|---|---|
|列出自定义角色|查询指定多维表格中的所有自定义角色清单，获取各角色的role_id、名称、权限配置等信息|GET|<code>/open-apis/bitable/v1/apps/:app_token/roles</code>|查看、评论、编辑和管理多维表格|tenant_access_token / user_access_token|自建应用、商店应用|
|添加自定义角色|在指定多维表格中新增自定义角色，可自定义角色的名称、数据权限、操作权限等配置|POST|<code>/open-apis/bitable/v1/apps/:app_token/roles/:role_id</code>|查看、评论、编辑和管理多维表格|tenant_access_token / user_access_token|自建应用、商店应用|
|更新自定义角色|修改指定自定义角色的权限配置，可更新角色的名称、数据操作权限等相关设置|PUT|<code>/open-apis/bitable/v1/apps/:app_token/roles/:role_id</code>|查看、评论、编辑和管理多维表格|tenant_access_token / user_access_token|自建应用、商店应用|
|删除自定义角色|删除指定多维表格中的自定义角色，会同步移除该角色下所有协作者的对应权限|DELETE|<code>/open-apis/bitable/v1/apps/:app_token/roles/:role_id</code>|查看、评论、编辑和管理多维表格|tenant_access_token / user_access_token|自建应用、商店应用|

<hr />

## 七、协作者（Collaborator）相关 API

按官方文档目录顺序排列：

|API 名称|作用|请求方式|接口地址|权限要求（满足其一即可）|支持的访问凭证|支持的应用类型|
|---|---|---|---|---|---|---|
|列出角色协作者|查询指定自定义角色下的所有协作者清单，获取协作者的member_id、身份信息等内容|GET|<code>/open-apis/bitable/v1/apps/:app_token/roles/:role_id/members</code>|查看、评论、编辑和管理多维表格|tenant_access_token / user_access_token|自建应用、商店应用|
|添加角色协作者|为指定自定义角色添加协作者，将对应成员加入该角色，同步授予角色对应的权限|POST|<code>/open-apis/bitable/v1/apps/:app_token/roles/:role_id/members</code>|查看、评论、编辑和管理多维表格|tenant_access_token / user_access_token|自建应用、商店应用|
|删除角色协作者|移除指定自定义角色下的单个协作者，同步撤销该成员通过该角色获得的所有权限|DELETE|<code>/open-apis/bitable/v1/apps/:app_token/roles/:role_id/members/:member_id</code>|查看、评论、编辑和管理多维表格|tenant_access_token / user_access_token|自建应用、商店应用|

<hr />

## 八、数据看板（Dashboard）相关 API

按官方文档目录顺序排列：

|API 名称|作用|请求方式|接口地址|权限要求|支持的访问凭证|支持的应用类型|
|---|---|---|---|---|---|---|
|列出数据看板|查询指定多维表格中的所有数据看板清单，获取各看板的block_id、名称等基础信息|GET|<code>/open-apis/bitable/v1/apps/:app_token/dashboards</code>|查看、评论、编辑和管理多维表格|tenant_access_token / user_access_token|自建应用、商店应用|

<hr />

## 九、自动化工作流（Workflow）相关 API

按官方文档目录顺序排列：

|API 名称|作用|请求方式|接口地址|权限要求|支持的访问凭证|支持的应用类型|
|---|---|---|---|---|---|---|
|列出自动化工作流|查询指定多维表格中的所有自动化工作流清单，获取工作流的workflow_id、名称、状态等基础信息|GET|<code>/open-apis/bitable/v1/apps/:app_token/workflows</code>|查看、评论、编辑和管理多维表格|tenant_access_token / user_access_token|自建应用、商店应用|

<hr />

### 补充说明

1. 路径参数说明：<code>:app_token</code>、<code>:table_id</code>、<code>:view_id</code>、<code>:record_id</code>、<code>:field_id</code>、<code>:role_id</code>、<code>:member_id</code>为动态路径参数，需替换为实际的资源标识；
    
2. 应用类型说明：自建应用指企业自主开发的自定义应用，商店应用指飞书应用商店的第三方应用；
    
3. 权限前置要求：调用 API 前需确保应用是目标多维表格的所有者或协作者，否则会返回调用失败；
    
4. 批量操作限制：所有批量操作单次最多处理 1000 条记录，执行结果为全成功或全失败，无部分成功情况；
    
5. 写入操作约束：为保障服务稳定性，单个多维表格同一时间建议仅执行 1 次 API 写入操作；
    
6. 接口频率限制：部分接口有频率限制，如获取多维表格元数据接口的频率限制为 20 次 / 秒，具体限制以官方文档为准。