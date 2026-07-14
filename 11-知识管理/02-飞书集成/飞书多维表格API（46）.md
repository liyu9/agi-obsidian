# 创建多维表格

在指定文件夹中创建一个多维表格，包含一个空白的数据表。

要基于模板创建多维表格，可先获取模板多维表格 `app_token` 作为文件 token，再调用[复制文件](https://open.feishu.cn/document/uAjLw4CM/ukTMukTMukTM/reference/drive-v1/file/copy)接口创建多维表格。

## 请求

|基本||
|---|---|
|HTTP URL|https://open.feishu.cn/open-apis/bitable/v1/apps|
|HTTP Method|POST|
|接口频率限制|[20 次/分钟](https://open.feishu.cn/document/ukTMukTMukTM/uUzN04SN3QjL1cDN)|
|支持的应用类型|自建应用<br><br>商店应用|
|权限要求 <br><br>开启任一权限即可|创建多维表格<br><br>查看、评论、编辑和管理多维表格|

# 复制多维表格

复制一个多维表格，可以指定复制到某个有权限的文件夹下。

当多维表格记录数超 50,000 条可复制上限时，仅可复制多维表格结构。

## 前提条件

调用此接口前，请确保当前调用身份（tenant_access_token 或 user_access_token）已有多维表格和目标文件夹的阅读、编辑等文档权限，否则接口将返回 HTTP 403 或 400 状态码。了解更多，参考[如何为应用或用户开通云文档权限](https://open.feishu.cn/document/ukTMukTMukTM/uczNzUjL3czM14yN3MTN#16c6475a)。

## 请求

|基本||
|---|---|
|HTTP URL|https://open.feishu.cn/open-apis/bitable/v1/apps/:app_token/copy|
|HTTP Method|POST|
|接口频率限制|[20 次/分钟](https://open.feishu.cn/document/ukTMukTMukTM/uUzN04SN3QjL1cDN)|
|支持的应用类型|自建应用<br><br>商店应用|
|权限要求 <br><br>开启任一权限即可|复制多维表格<br><br>查看、评论、编辑和管理多维表格|

# 获取多维表格元数据

获取指定多维表格的元数据信息，包括多维表格名称、多维表格版本号、多维表格是否开启高级权限等。

## 请求

|基本||
|---|---|
|HTTP URL|https://open.feishu.cn/open-apis/bitable/v1/apps/:app_token|
|HTTP Method|GET|
|接口频率限制|[20 次/秒](https://open.feishu.cn/document/ukTMukTMukTM/uUzN04SN3QjL1cDN)|
|支持的应用类型|自建应用<br><br>商店应用|
|权限要求 <br><br>开启任一权限即可|获取多维表格信息<br><br>查看、评论、编辑和管理多维表格<br><br>查看、评论和导出多维表格|

# 更新多维表格元数据

更新多维表格元数据，包括多维表格的名称、是否开启高级权限。

## 注意事项

- 在线文档和电子表格中嵌入的多维表格、知识库中的多维表格不支持开启高级权限。
- 此接口非原子操作，先修改多维表格名称，后开关高级权限，可能存在部分成功的情况。

## 请求

|基本||
|---|---|
|HTTP URL|https://open.feishu.cn/open-apis/bitable/v1/apps/:app_token|
|HTTP Method|PUT|
|接口频率限制|[10 次/秒](https://open.feishu.cn/document/ukTMukTMukTM/uUzN04SN3QjL1cDN)|
|支持的应用类型|自建应用<br><br>商店应用|
|权限要求 <br><br>开启任一权限即可|更新多维表格<br><br>查看、评论、编辑和管理多维表格|

# 新增一个数据表

新增一个数据表，支持传入数据表名称、视图名称和字段。

## 前提条件

调用此接口前，请确保当前调用身份（tenant_access_token 或 user_access_token）已有多维表格的编辑等文档权限，否则接口将返回 HTTP 403 或 400 状态码。了解更多，参考[如何为应用或用户开通文档权限](https://open.feishu.cn/document/ukTMukTMukTM/uczNzUjL3czM14yN3MTN#16c6475a)。

## 使用限制

每个多维表格中，数据表与仪表盘的总数量上限为 100。

## 请求

|基本||
|---|---|
|HTTP URL|https://open.feishu.cn/open-apis/bitable/v1/apps/:app_token/tables|
|HTTP Method|POST|
|接口频率限制|[10 次/秒](https://open.feishu.cn/document/ukTMukTMukTM/uUzN04SN3QjL1cDN)|
|支持的应用类型|自建应用<br><br>商店应用|
|权限要求 <br><br>开启任一权限即可|新增数据表<br><br>查看、评论、编辑和管理多维表格|

# 新增多个数据表

新增多个数据表，仅可指定数据表名称。

## 前提条件

调用此接口前，请确保当前调用身份（tenant_access_token 或 user_access_token）已有多维表格的编辑等文档权限，否则接口将返回 HTTP 403 或 400 状态码。了解更多，参考[如何为应用或用户开通文档权限](https://open.feishu.cn/document/ukTMukTMukTM/uczNzUjL3czM14yN3MTN#16c6475a)。

## 使用限制

每个多维表格中，数据表与仪表盘的总数量上限为 100。

## 请求

|基本||
|---|---|
|HTTP URL|https://open.feishu.cn/open-apis/bitable/v1/apps/:app_token/tables/batch_create|
|HTTP Method|POST|
|接口频率限制|[10 次/秒](https://open.feishu.cn/document/ukTMukTMukTM/uUzN04SN3QjL1cDN)|
|支持的应用类型|自建应用<br><br>商店应用|
|权限要求 <br><br>开启任一权限即可|新增数据表<br><br>查看、评论、编辑和管理多维表格|
|字段权限要求|该接口返回体中存在下列敏感字段，仅当开启对应的权限后才会返回；如果无需获取这些字段，则不建议申请<br><br>获取用户 user ID<br><br>仅自建应用|

# 更新数据表

## 请求

|基本||
|---|---|
|HTTP URL|https://open.feishu.cn/open-apis/bitable/v1/apps/:app_token/tables/:table_id|
|HTTP Method|PATCH|
|接口频率限制|[10 次/秒](https://open.feishu.cn/document/ukTMukTMukTM/uUzN04SN3QjL1cDN)|
|支持的应用类型|自建应用<br><br>商店应用|
|权限要求 <br><br>开启任一权限即可|更新数据表<br><br>查看、评论、编辑和管理多维表格|

# 列出数据表

列出多维表格中的所有数据表，包括其 ID、版本号和名称。

## 请求

|基本||
|---|---|
|HTTP URL|https://open.feishu.cn/open-apis/bitable/v1/apps/:app_token/tables|
|HTTP Method|GET|
|接口频率限制|[20 次/秒](https://open.feishu.cn/document/ukTMukTMukTM/uUzN04SN3QjL1cDN)|
|支持的应用类型|自建应用<br><br>商店应用|
|权限要求 <br><br>开启任一权限即可|获取数据表信息<br><br>查看、评论、编辑和管理多维表格<br><br>查看、评论和导出多维表格|

# 删除一个数据表

通过 app_token 和 table_id 删除指定的多维表格数据表。

## 注意事项

如果多维表格中只剩最后一张数据表，则不允许被删除。

## 请求

|基本||
|---|---|
|HTTP URL|https://open.feishu.cn/open-apis/bitable/v1/apps/:app_token/tables/:table_id|
|HTTP Method|DELETE|
|接口频率限制|[10 次/秒](https://open.feishu.cn/document/ukTMukTMukTM/uUzN04SN3QjL1cDN)|
|支持的应用类型|自建应用<br><br>商店应用|
|权限要求 <br><br>开启任一权限即可|删除数据表<br><br>查看、评论、编辑和管理多维表格|

# 删除多个数据表

通过 app_token 和 table_id 删除多个数据表。

## 注意事项

如果多维表格中只剩最后一张数据表，则不允许被删除。

## 请求

|基本||
|---|---|
|HTTP URL|https://open.feishu.cn/open-apis/bitable/v1/apps/:app_token/tables/batch_delete|
|HTTP Method|POST|
|接口频率限制|[10 次/秒](https://open.feishu.cn/document/ukTMukTMukTM/uUzN04SN3QjL1cDN)|
|支持的应用类型|自建应用<br><br>商店应用|
|权限要求 <br><br>开启任一权限即可|删除数据表<br><br>查看、评论、编辑和管理多维表格|

# 新增视图

在多维表格数据表中新增一个视图，可指定视图类型，包括表格视图、看板视图、画册视图、甘特视图和表单视图。

## 使用限制

视图最大支持数量为 200，包括公共视图、锁定视图和个人视图。因此个人在多维表格中看到的视图数量可能仅是部分视图。

## 请求

|基本||
|---|---|
|HTTP URL|https://open.feishu.cn/open-apis/bitable/v1/apps/:app_token/tables/:table_id/views|
|HTTP Method|POST|
|接口频率限制|[10 次/秒](https://open.feishu.cn/document/ukTMukTMukTM/uUzN04SN3QjL1cDN)|
|支持的应用类型|自建应用<br><br>商店应用|
|权限要求 <br><br>开启任一权限即可|新增、更新、删除视图<br><br>查看、评论、编辑和管理多维表格|

# 更新视图

视图最大支持数量为 200，包括公共视图、锁定视图和个人视图。因此个人在多维表格中看到的视图数量可能仅是部分视图。

## 请求

|基本||
|---|---|
|HTTP URL|https://open.feishu.cn/open-apis/bitable/v1/apps/:app_token/tables/:table_id/views/:view_id|
|HTTP Method|PATCH|
|接口频率限制|[10 次/秒](https://open.feishu.cn/document/ukTMukTMukTM/uUzN04SN3QjL1cDN)|
|支持的应用类型|自建应用<br><br>商店应用|
|权限要求 <br><br>开启任一权限即可|新增、更新、删除视图<br><br>查看、评论、编辑和管理多维表格|

# 列出视图

获取多维表格数据表中的所有视图。

## 请求

|基本||
|---|---|
|HTTP URL|https://open.feishu.cn/open-apis/bitable/v1/apps/:app_token/tables/:table_id/views|
|HTTP Method|GET|
|接口频率限制|[20 次/秒](https://open.feishu.cn/document/ukTMukTMukTM/uUzN04SN3QjL1cDN)|
|支持的应用类型|自建应用<br><br>商店应用|
|权限要求 <br><br>开启任一权限即可|检索视图<br><br>查看、评论、编辑和管理多维表格<br><br>查看、评论和导出多维表格|
|字段权限要求|该接口返回体中存在下列敏感字段，仅当开启对应的权限后才会返回；如果无需获取这些字段，则不建议申请<br><br>获取用户 user ID<br><br>仅自建应用|

# 获取视图

根据视图 ID 获取现有视图信息，包括视图名称、类型、属性等。
## 请求

|基本||
|---|---|
|HTTP URL|https://open.feishu.cn/open-apis/bitable/v1/apps/:app_token/tables/:table_id/views/:view_id|
|HTTP Method|GET|
|接口频率限制|[20 次/秒](https://open.feishu.cn/document/ukTMukTMukTM/uUzN04SN3QjL1cDN)|
|支持的应用类型|自建应用<br><br>商店应用|
|权限要求 <br><br>开启任一权限即可|检索视图<br><br>查看、评论、编辑和管理多维表格<br><br>查看、评论和导出多维表格|

# 删除视图
通过 app_token、table_id 和 view_id，删除多维表格数据表中的指定视图。


## 请求

|基本||
|---|---|
|HTTP URL|https://open.feishu.cn/open-apis/bitable/v1/apps/:app_token/tables/:table_id/views/:view_id|
|HTTP Method|DELETE|
|接口频率限制|[10 次/秒](https://open.feishu.cn/document/ukTMukTMukTM/uUzN04SN3QjL1cDN)|
|支持的应用类型|自建应用<br><br>商店应用|
|权限要求 <br><br>开启任一权限即可|新增、更新、删除视图<br><br>查看、评论、编辑和管理多维表格|

# 新增记录

在多维表格数据表中新增一条记录。

## 前提条件

调用此接口前，请确保当前调用身份（tenant_access_token 或 user_access_token）已有多维表格的编辑等文档权限，否则接口将返回 HTTP 403 或 400 状态码。了解更多，参考[如何为应用或用户开通文档权限](https://open.feishu.cn/document/ukTMukTMukTM/uczNzUjL3czM14yN3MTN#16c6475a)。

## 注意事项

从其它数据源同步的数据表，不支持对记录进行增加、删除、和修改操作。

## 请求

|基本||
|---|---|
|HTTP URL|https://open.feishu.cn/open-apis/bitable/v1/apps/:app_token/tables/:table_id/records|
|HTTP Method|POST|
|接口频率限制|[50 次/秒](https://open.feishu.cn/document/ukTMukTMukTM/uUzN04SN3QjL1cDN)|
|支持的应用类型|自建应用<br><br>商店应用|
|权限要求 <br><br>开启任一权限即可|新增记录<br><br>查看、评论、编辑和管理多维表格|
|字段权限要求|该接口返回体中存在下列敏感字段，仅当开启对应的权限后才会返回；如果无需获取这些字段，则不建议申请<br><br>获取用户基本信息<br><br>获取用户 user ID<br><br>仅自建应用<br><br>以应用身份访问通讯录<br><br>历史版本<br><br>读取通讯录<br><br>历史版本<br><br>以应用身份读取通讯录<br><br>历史版本|

# 更新记录

## 前提条件

调用此接口前，请确保当前调用身份（tenant_access_token 或 user_access_token）已有多维表格的编辑等文档权限，否则接口将返回 HTTP 403 或 400 状态码。了解更多，参考[如何为应用或用户开通文档权限](https://open.feishu.cn/document/ukTMukTMukTM/uczNzUjL3czM14yN3MTN#16c6475a)。

## 注意事项

- 从其它数据源同步的数据表，不支持对记录进行增加、删除、和修改操作。
- 更新记录为增量更新，仅更新传入的字段。如果想对记录中的某个字段值置空，可将字段设为 null，例如：

`   {    "fields": {      "文本字段": null    }  }     `

## 请求

|基本||
|---|---|
|HTTP URL|https://open.feishu.cn/open-apis/bitable/v1/apps/:app_token/tables/:table_id/records/:record_id|
|HTTP Method|PUT|
|接口频率限制|[50 次/秒](https://open.feishu.cn/document/ukTMukTMukTM/uUzN04SN3QjL1cDN)|
|支持的应用类型|自建应用<br><br>商店应用|
|权限要求 <br><br>开启任一权限即可|更新记录<br><br>查看、评论、编辑和管理多维表格|
|字段权限要求|该接口返回体中存在下列敏感字段，仅当开启对应的权限后才会返回；如果无需获取这些字段，则不建议申请<br><br>获取用户基本信息<br><br>获取用户 user ID<br><br>仅自建应用<br><br>以应用身份访问通讯录<br><br>历史版本<br><br>读取通讯录<br><br>历史版本<br><br>以应用身份读取通讯录<br><br>历史版本|

# 查询记录

该接口用于查询数据表中的现有记录，单次最多查询 500 行记录，支持分页获取。
## 请求

|基本||
|---|---|
|HTTP URL|https://open.feishu.cn/open-apis/bitable/v1/apps/:app_token/tables/:table_id/records/search|
|HTTP Method|POST|
|接口频率限制|[20 次/秒](https://open.feishu.cn/document/ukTMukTMukTM/uUzN04SN3QjL1cDN)|
|支持的应用类型|自建应用<br><br>商店应用|
|权限要求 <br><br>开启任一权限即可|根据条件搜索记录<br><br>查看、评论、编辑和管理多维表格<br><br>查看、评论和导出多维表格|
|字段权限要求|该接口返回体中存在下列敏感字段，仅当开启对应的权限后才会返回；如果无需获取这些字段，则不建议申请<br><br>获取用户基本信息<br><br>获取用户 user ID<br><br>仅自建应用<br><br>以应用身份访问通讯录<br><br>历史版本<br><br>读取通讯录<br><br>历史版本<br><br>以应用身份读取通讯录<br><br>历史版本|

# 删除记录
删除多维表格数据表中的一条记录。

## 前提条件

调用此接口前，请确保当前调用身份（tenant_access_token 或 user_access_token）已有多维表格的编辑等文档权限，否则接口将返回 HTTP 403 或 400 状态码。了解更多，参考[如何为应用或用户开通文档权限](https://open.feishu.cn/document/ukTMukTMukTM/uczNzUjL3czM14yN3MTN#16c6475a)。

## 注意事项

从其它数据源同步的数据表，不支持对记录进行增加、删除、和修改操作。

## 请求

|基本||
|---|---|
|HTTP URL|https://open.feishu.cn/open-apis/bitable/v1/apps/:app_token/tables/:table_id/records/:record_id|
|HTTP Method|DELETE|
|接口频率限制|[50 次/秒](https://open.feishu.cn/document/ukTMukTMukTM/uUzN04SN3QjL1cDN)|
|支持的应用类型|自建应用<br><br>商店应用|
|权限要求 <br><br>开启任一权限即可|删除记录<br><br>查看、评论、编辑和管理多维表格|

# 新增多条记录

在多维表格数据表中新增多条记录，单次调用最多新增 1,000 条记录。

## 前提条件

调用此接口前，请确保当前调用身份（tenant_access_token 或 user_access_token）已有多维表格的编辑等文档权限，否则接口将返回 HTTP 403 或 400 状态码。了解更多，参考[如何为应用或用户开通文档权限](https://open.feishu.cn/document/ukTMukTMukTM/uczNzUjL3czM14yN3MTN#16c6475a)。

## 注意事项

从其它数据源同步的数据表，不支持对记录进行增加、删除、和修改操作。

## 请求

|基本||
|---|---|
|HTTP URL|https://open.feishu.cn/open-apis/bitable/v1/apps/:app_token/tables/:table_id/records/batch_create|
|HTTP Method|POST|
|接口频率限制|[50 次/秒](https://open.feishu.cn/document/ukTMukTMukTM/uUzN04SN3QjL1cDN)|
|支持的应用类型|自建应用<br><br>商店应用|
|权限要求 <br><br>开启任一权限即可|新增记录<br><br>查看、评论、编辑和管理多维表格|
|字段权限要求|该接口返回体中存在下列敏感字段，仅当开启对应的权限后才会返回；如果无需获取这些字段，则不建议申请<br><br>获取用户基本信息<br><br>获取用户 user ID<br><br>仅自建应用<br><br>以应用身份访问通讯录<br><br>历史版本<br><br>读取通讯录<br><br>历史版本<br><br>以应用身份读取通讯录<br><br>历史版本|

# 更新多条记录

更新数据表中的多条记录，单次调用最多更新 1,000 条记录。

## 前提条件

调用此接口前，请确保当前调用身份（tenant_access_token 或 user_access_token）已有多维表格的编辑等文档权限，否则接口将返回 HTTP 403 或 400 状态码。了解更多，参考[如何为应用或用户开通文档权限](https://open.feishu.cn/document/ukTMukTMukTM/uczNzUjL3czM14yN3MTN#16c6475a)。

## 注意事项

从其它数据源同步的数据表，不支持对记录进行增加、删除、和修改操作。

## 请求

|基本||
|---|---|
|HTTP URL|https://open.feishu.cn/open-apis/bitable/v1/apps/:app_token/tables/:table_id/records/batch_update|
|HTTP Method|POST|
|接口频率限制|[50 次/秒](https://open.feishu.cn/document/ukTMukTMukTM/uUzN04SN3QjL1cDN)|
|支持的应用类型|自建应用<br><br>商店应用|
|权限要求 <br><br>开启任一权限即可|更新记录<br><br>查看、评论、编辑和管理多维表格|
|字段权限要求|该接口返回体中存在下列敏感字段，仅当开启对应的权限后才会返回；如果无需获取这些字段，则不建议申请<br><br>获取用户基本信息<br><br>获取用户 user ID<br><br>仅自建应用<br><br>以应用身份访问通讯录<br><br>历史版本<br><br>读取通讯录<br><br>历史版本<br><br>以应用身份读取通讯录<br><br>历史版本|

# 批量获取记录

通过多个记录 ID 查询记录信息。该接口最多支持查询 100 条记录。

## 注意事项

若多维表格开启了高级权限，你需确保调用身份拥有多维表格的可管理权限，否则可能出现调用成功但返回数据为空的情况。了解具体步骤，参考[如何为应用或用户开通文档权限](https://open.feishu.cn/document/ukTMukTMukTM/uczNzUjL3czM14yN3MTN#16c6475a)。

## 请求

|基本||
|---|---|
|HTTP URL|https://open.feishu.cn/open-apis/bitable/v1/apps/:app_token/tables/:table_id/records/batch_get|
|HTTP Method|POST|
|接口频率限制|[20 次/秒](https://open.feishu.cn/document/ukTMukTMukTM/uUzN04SN3QjL1cDN)|
|支持的应用类型|自建应用<br><br>商店应用|
|权限要求 <br><br>开启任一权限即可|检索特定记录<br><br>查看、评论、编辑和管理多维表格<br><br>查看、评论和导出多维表格|
|字段权限要求|该接口返回体中存在下列敏感字段，仅当开启对应的权限后才会返回；如果无需获取这些字段，则不建议申请<br><br>获取用户基本信息<br><br>以应用身份访问通讯录<br><br>历史版本<br><br>读取通讯录<br><br>历史版本<br><br>以应用身份读取通讯录<br><br>历史版本|

# 删除多条记录

删除多维表格数据表中现有的多条记录。

## 前提条件

调用此接口前，请确保当前调用身份（tenant_access_token 或 user_access_token）已有多维表格的编辑等文档权限，否则接口将返回 HTTP 403 或 400 状态码。了解更多，参考[如何为应用或用户开通文档权限](https://open.feishu.cn/document/ukTMukTMukTM/uczNzUjL3czM14yN3MTN#16c6475a)。

## 注意事项

- 从其它数据源同步的数据表，不支持开发者对记录进行增加、删除、和修改操作。
- 单次调用中最多删除 500 条记录。

## 请求

|基本||
|---|---|
|HTTP URL|https://open.feishu.cn/open-apis/bitable/v1/apps/:app_token/tables/:table_id/records/batch_delete|
|HTTP Method|POST|
|接口频率限制|[50 次/秒](https://open.feishu.cn/document/ukTMukTMukTM/uUzN04SN3QjL1cDN)|
|支持的应用类型|自建应用<br><br>商店应用|
|权限要求 <br><br>开启任一权限即可|删除记录<br><br>查看、评论、编辑和管理多维表格|

# 新增字段

在多维表格数据表中新增一个字段。

## 前提条件

调用此接口前，请确保当前调用身份（tenant_access_token 或 user_access_token）已有多维表格的编辑等文档权限，否则接口将返回 HTTP 403 或 400 状态码。了解更多，参考[如何为应用或用户开通文档权限](https://open.feishu.cn/document/ukTMukTMukTM/uczNzUjL3czM14yN3MTN#16c6475a)。

## 请求

|基本||
|---|---|
|HTTP URL|https://open.feishu.cn/open-apis/bitable/v1/apps/:app_token/tables/:table_id/fields|
|HTTP Method|POST|
|接口频率限制|[10 次/秒](https://open.feishu.cn/document/ukTMukTMukTM/uUzN04SN3QjL1cDN)|
|支持的应用类型|自建应用<br><br>商店应用|
|权限要求 <br><br>开启任一权限即可|新增字段<br><br>查看、评论、编辑和管理多维表格|

# 更新字段

在多维表格数据表中更新一个字段。更新字段时为全量更新，property 等字段会被完全覆盖。

## 前提条件

调用此接口前，请确保当前调用身份（tenant_access_token 或 user_access_token）已有多维表格的编辑等文档权限，否则接口将返回 HTTP 403 或 400 状态码。了解更多，参考[如何为应用或用户开通文档权限](https://open.feishu.cn/document/ukTMukTMukTM/uczNzUjL3czM14yN3MTN#16c6475a)。

## 请求

|基本||
|---|---|
|HTTP URL|https://open.feishu.cn/open-apis/bitable/v1/apps/:app_token/tables/:table_id/fields/:field_id|
|HTTP Method|PUT|
|接口频率限制|[10 次/秒](https://open.feishu.cn/document/ukTMukTMukTM/uUzN04SN3QjL1cDN)|
|支持的应用类型|自建应用<br><br>商店应用|
|权限要求 <br><br>开启任一权限即可|更新字段<br><br>查看、评论、编辑和管理多维表格|

# 列出字段

获取多维表格数据表中的的所有字段。

## 请求

|基本||
|---|---|
|HTTP URL|https://open.feishu.cn/open-apis/bitable/v1/apps/:app_token/tables/:table_id/fields|
|HTTP Method|GET|
|接口频率限制|[20 次/秒](https://open.feishu.cn/document/ukTMukTMukTM/uUzN04SN3QjL1cDN)|
|支持的应用类型|自建应用<br><br>商店应用|
|权限要求 <br><br>开启任一权限即可|获取字段信息<br><br>查看、评论、编辑和管理多维表格<br><br>查看、评论和导出多维表格|

# 删除字段

删除多维表格数据表中的一个字段。

## 请求

|基本||
|---|---|
|HTTP URL|https://open.feishu.cn/open-apis/bitable/v1/apps/:app_token/tables/:table_id/fields/:field_id|
|HTTP Method|DELETE|
|接口频率限制|[10 次/秒](https://open.feishu.cn/document/ukTMukTMukTM/uUzN04SN3QjL1cDN)|
|支持的应用类型|自建应用<br><br>商店应用|
|权限要求 <br><br>开启任一权限即可|删除字段<br><br>查看、评论、编辑和管理多维表格|

# 创建字段编组

该接口用于为多维表格数据表的字段创建编组。创建字段编组后，字段将被组织到该编组中，便于多维表格的数据管理

#### 业务使用场景

适用于多维表格字段较多，需要分类管理字段的场景

## 请求

|基本||
|---|---|
|HTTP URL|https://open.feishu.cn/open-apis/bitable/v1/apps/:app_token/tables/:table_id/field_groups|
|HTTP Method|POST|
|接口频率限制|[10 次/秒](https://open.feishu.cn/document/ukTMukTMukTM/uUzN04SN3QjL1cDN)|
|支持的应用类型|自建应用<br><br>商店应用|
|权限要求|创建字段编组|

# 复制仪表盘

基于现有仪表盘复制出新的仪表盘。

## 前提条件

调用此接口前，请确保当前调用身份（tenant_access_token 或 user_access_token）已有原多维表格的阅读权限，否则接口将返回 HTTP 403 或 400 状态码。了解更多，参考[如何为应用或用户开通文档权限](https://open.feishu.cn/document/ukTMukTMukTM/uczNzUjL3czM14yN3MTN#16c6475a)。

## 请求

|基本||
|---|---|
|HTTP URL|https://open.feishu.cn/open-apis/bitable/v1/apps/:app_token/dashboards/:block_id/copy|
|HTTP Method|POST|
|接口频率限制|[10 次/秒](https://open.feishu.cn/document/ukTMukTMukTM/uUzN04SN3QjL1cDN)|
|支持的应用类型|自建应用<br><br>商店应用|
|权限要求 <br><br>开启任一权限即可|复制仪表盘<br><br>查看、评论、编辑和管理多维表格|

# 列出仪表盘

获取多维表格中的所有仪表盘。

## 前提条件

调用此接口前，请确保当前调用身份（tenant_access_token 或 user_access_token）已有多维表格的阅读等文档权限，否则接口将返回 HTTP 403 或 400 状态码。了解更多，参考[如何为应用或用户开通文档权限](https://open.feishu.cn/document/ukTMukTMukTM/uczNzUjL3czM14yN3MTN#16c6475a)。

## 请求

|基本||
|---|---|
|HTTP URL|https://open.feishu.cn/open-apis/bitable/v1/apps/:app_token/dashboards|
|HTTP Method|GET|
|接口频率限制|[20 次/秒](https://open.feishu.cn/document/ukTMukTMukTM/uUzN04SN3QjL1cDN)|
|支持的应用类型|自建应用<br><br>商店应用|
|权限要求 <br><br>开启任一权限即可|获取仪表盘信息<br><br>查看、评论、编辑和管理多维表格<br><br>查看、评论和导出多维表格|

# 更新表单元数据

更新表单视图中的元数据，包括表单名称、描述、是否共享等。

表单视图是多维表格的一种视图类型。每个表单都有唯一标识 `form_id`，即当前视图的 `view_id`。

## 请求

|基本||
|---|---|
|HTTP URL|https://open.feishu.cn/open-apis/bitable/v1/apps/:app_token/tables/:table_id/forms/:form_id|
|HTTP Method|PATCH|
|接口频率限制|[10 次/秒](https://open.feishu.cn/document/ukTMukTMukTM/uUzN04SN3QjL1cDN)|
|支持的应用类型|自建应用<br><br>商店应用|
|权限要求 <br><br>开启任一权限即可|更新表单数据<br><br>查看、评论、编辑和管理多维表格|

# 获取表单元数据

获取表单的所有元数据，包括表单名称、描述、是否共享等。

表单视图是多维表格的一种视图类型。每个表单都有唯一标识 `form_id`，即当前视图的 `view_id`。

## 请求

|基本||
|---|---|
|HTTP URL|https://open.feishu.cn/open-apis/bitable/v1/apps/:app_token/tables/:table_id/forms/:form_id|
|HTTP Method|GET|
|接口频率限制|[20 次/秒](https://open.feishu.cn/document/ukTMukTMukTM/uUzN04SN3QjL1cDN)|
|支持的应用类型|自建应用<br><br>商店应用|
|权限要求 <br><br>开启任一权限即可|获取表单数据<br><br>查看、评论、编辑和管理多维表格<br><br>查看、评论和导出多维表格|

# 更新表单问题

更新表单中的问题项。

表单视图是多维表格的一种视图类型。每个表单都有唯一标识 `form_id`，即当前视图的 `view_id`。

## 请求

|基本||
|---|---|
|HTTP URL|https://open.feishu.cn/open-apis/bitable/v1/apps/:app_token/tables/:table_id/forms/:form_id/fields/:field_id|
|HTTP Method|PATCH|
|接口频率限制|[10 次/秒](https://open.feishu.cn/document/ukTMukTMukTM/uUzN04SN3QjL1cDN)|
|支持的应用类型|自建应用<br><br>商店应用|
|权限要求 <br><br>开启任一权限即可|更新表单数据<br><br>查看、评论、编辑和管理多维表格|

# 列出表单问题

列出表单中的所有问题项。

表单视图是多维表格的一种视图类型。每个表单都有唯一标识 `form_id`，即当前视图的 `view_id`。

## 请求

|基本||
|---|---|
|HTTP URL|https://open.feishu.cn/open-apis/bitable/v1/apps/:app_token/tables/:table_id/forms/:form_id/fields|
|HTTP Method|GET|
|接口频率限制|[20 次/秒](https://open.feishu.cn/document/ukTMukTMukTM/uUzN04SN3QjL1cDN)|
|支持的应用类型|自建应用<br><br>商店应用|
|权限要求 <br><br>开启任一权限即可|获取表单数据<br><br>查看、评论、编辑和管理多维表格<br><br>查看、评论和导出多维表格|

# 新增自定义角色

新增多维表格高级权限中自定义的角色。

相较于旧版接口，新版自定义角色接口支持高级权限 2.0 版本新增的权限点位，包括更精细的行级别权限控制、多维表格的复制、导出点位的控制等。

## 前提条件

要调用自定义角色相关接口，你需确保多维表格已开启高级权限。你可通过[更新多维表格元数据](https://open.feishu.cn/document/uAjLw4CM/ukTMukTMukTM/reference/bitable-v1/app/update)接口开启高级权限。

## 请求

|基本||
|---|---|
|HTTP URL|https://open.feishu.cn/open-apis/base/v2/apps/:app_token/roles|
|HTTP Method|POST|
|接口频率限制|[10 次/秒](https://open.feishu.cn/document/ukTMukTMukTM/uUzN04SN3QjL1cDN)|
|支持的应用类型|自建应用<br><br>商店应用|
|权限要求|新增自定义角色|

# 更新自定义角色

更新多维表格高级权限中自定义的角色。

相较于旧版接口，新版自定义角色接口支持高级权限 2.0 版本新增的权限点位，包括更精细的行级别权限控制、多维表格的复制、导出点位的控制等。

更新自定义角色为增量更新，仅对传值的字段进行更新，不传值则不更新。

## 前提条件

要调用自定义角色相关接口，你需确保多维表格已开启高级权限。你可通过[更新多维表格元数据](https://open.feishu.cn/document/uAjLw4CM/ukTMukTMukTM/reference/bitable-v1/app/update)接口开启高级权限。

## 请求

|基本||
|---|---|
|HTTP URL|https://open.feishu.cn/open-apis/base/v2/apps/:app_token/roles/:role_id|
|HTTP Method|PUT|
|接口频率限制|[10 次/秒](https://open.feishu.cn/document/ukTMukTMukTM/uUzN04SN3QjL1cDN)|
|支持的应用类型|自建应用<br><br>商店应用|
|权限要求|更新自定义角色|

# 列出自定义角色

列出多维表格高级权限中用户自定义的角色。

相较于旧版接口，新版自定义角色接口支持高级权限 2.0 版本新增的权限点位，包括更精细的行级别权限控制、多维表格的复制、导出点位的控制等。

## 前提条件

要调用自定义角色相关接口，你需确保多维表格已开启高级权限。你可通过[更新多维表格元数据](https://open.feishu.cn/document/uAjLw4CM/ukTMukTMukTM/reference/bitable-v1/app/update)接口开启高级权限。

## 请求

|基本||
|---|---|
|HTTP URL|https://open.feishu.cn/open-apis/base/v2/apps/:app_token/roles|
|HTTP Method|GET|
|接口频率限制|[20 次/秒](https://open.feishu.cn/document/ukTMukTMukTM/uUzN04SN3QjL1cDN)|
|支持的应用类型|自建应用<br><br>商店应用|
|权限要求|查询自定义角色|

# 删除自定义角色

删除多维表格高级权限中自定义的角色。

## 前提条件

要调用自定义角色相关接口，你需确保多维表格已开启高级权限。你可通过[更新多维表格元数据](https://open.feishu.cn/document/uAjLw4CM/ukTMukTMukTM/reference/bitable-v1/app/update)接口开启高级权限。

## 请求

|基本||
|---|---|
|HTTP URL|https://open.feishu.cn/open-apis/bitable/v1/apps/:app_token/roles/:role_id|
|HTTP Method|DELETE|
|接口频率限制|[10 次/秒](https://open.feishu.cn/document/ukTMukTMukTM/uUzN04SN3QjL1cDN)|
|支持的应用类型|自建应用<br><br>商店应用|
|权限要求 <br><br>开启任一权限即可|删除自定义角色<br><br>查看、评论、编辑和管理多维表格|

# 新增协作者

新增多维表格高级权限中自定义角色的协作者。

## 前提条件

要调用协作者相关接口，你需确保多维表格已开启高级权限并设置了自定义角色。你可通过[更新多维表格元数据](https://open.feishu.cn/document/uAjLw4CM/ukTMukTMukTM/reference/bitable-v1/app/update)接口开启高级权限，通过[新增自定义角色](https://open.feishu.cn/document/uAjLw4CM/ukTMukTMukTM/reference/bitable-v1/app-role/create)接口设置自定义角色。

## 请求

|基本||
|---|---|
|HTTP URL|https://open.feishu.cn/open-apis/bitable/v1/apps/:app_token/roles/:role_id/members|
|HTTP Method|POST|
|接口频率限制|[10 次/秒](https://open.feishu.cn/document/ukTMukTMukTM/uUzN04SN3QjL1cDN)|
|支持的应用类型|自建应用<br><br>商店应用|
|权限要求 <br><br>开启任一权限即可|新增协作者<br><br>查看、评论、编辑和管理多维表格|

# 批量新增协作者

批量新增多维表格高级权限中自定义角色的协作者。

## 前提条件

要调用协作者相关接口，你需确保多维表格已开启高级权限并设置了自定义角色。你可通过[更新多维表格元数据](https://open.feishu.cn/document/uAjLw4CM/ukTMukTMukTM/reference/bitable-v1/app/update)接口开启高级权限，通过[新增自定义角色](https://open.feishu.cn/document/uAjLw4CM/ukTMukTMukTM/reference/bitable-v1/app-role/create)接口设置自定义角色。

## 请求

|基本||
|---|---|
|HTTP URL|https://open.feishu.cn/open-apis/bitable/v1/apps/:app_token/roles/:role_id/members/batch_create|
|HTTP Method|POST|
|接口频率限制|[10 次/秒](https://open.feishu.cn/document/ukTMukTMukTM/uUzN04SN3QjL1cDN)|
|支持的应用类型|自建应用<br><br>商店应用|
|权限要求 <br><br>开启任一权限即可|新增协作者<br><br>查看、评论、编辑和管理多维表格|

# 列出协作者

列出多维表格高级权限中自定义角色的协作者。

## 前提条件

要调用协作者相关接口，你需确保多维表格已开启高级权限并设置了自定义角色。你可通过[更新多维表格元数据](https://open.feishu.cn/document/uAjLw4CM/ukTMukTMukTM/reference/bitable-v1/app/update)接口开启高级权限，通过[新增自定义角色](https://open.feishu.cn/document/uAjLw4CM/ukTMukTMukTM/reference/bitable-v1/app-role/create)接口设置自定义角色。

## 请求

|基本||
|---|---|
|HTTP URL|https://open.feishu.cn/open-apis/bitable/v1/apps/:app_token/roles/:role_id/members|
|HTTP Method|GET|
|接口频率限制|[20 次/秒](https://open.feishu.cn/document/ukTMukTMukTM/uUzN04SN3QjL1cDN)|
|支持的应用类型|自建应用<br><br>商店应用|
|权限要求 <br><br>开启任一权限即可|列出协作者<br><br>查看、评论、编辑和管理多维表格<br><br>查看、评论和导出多维表格|

# 删除协作者

删除多维表格高级权限中自定义角色的协作者。

## 前提条件

要调用协作者相关接口，你需确保多维表格已开启高级权限并设置了自定义角色。你可通过[更新多维表格元数据](https://open.feishu.cn/document/uAjLw4CM/ukTMukTMukTM/reference/bitable-v1/app/update)接口开启高级权限，通过[新增自定义角色](https://open.feishu.cn/document/uAjLw4CM/ukTMukTMukTM/reference/bitable-v1/app-role/create)接口设置自定义角色。

## 请求

|基本||
|---|---|
|HTTP URL|https://open.feishu.cn/open-apis/bitable/v1/apps/:app_token/roles/:role_id/members/:member_id|
|HTTP Method|DELETE|
|接口频率限制|[10 次/秒](https://open.feishu.cn/document/ukTMukTMukTM/uUzN04SN3QjL1cDN)|
|支持的应用类型|自建应用<br><br>商店应用|
|权限要求 <br><br>开启任一权限即可|删除协作者<br><br>查看、评论、编辑和管理多维表格|

# 批量删除协作者

删除多维表格高级权限中自定义角色的协作者。

## 前提条件

要调用协作者相关接口，你需确保多维表格已开启高级权限并设置了自定义角色。你可通过[更新多维表格元数据](https://open.feishu.cn/document/uAjLw4CM/ukTMukTMukTM/reference/bitable-v1/app/update)接口开启高级权限，通过[新增自定义角色](https://open.feishu.cn/document/uAjLw4CM/ukTMukTMukTM/reference/bitable-v1/app-role/create)接口设置自定义角色。

## 请求

|基本||
|---|---|
|HTTP URL|https://open.feishu.cn/open-apis/bitable/v1/apps/:app_token/roles/:role_id/members/batch_delete|
|HTTP Method|POST|
|接口频率限制|[10 次/秒](https://open.feishu.cn/document/ukTMukTMukTM/uUzN04SN3QjL1cDN)|
|支持的应用类型|自建应用<br><br>商店应用|
|权限要求 <br><br>开启任一权限即可|删除协作者<br><br>查看、评论、编辑和管理多维表格|

# 列出自动化流程

该接口用于列出多维表格的自动化流程。

## 请求

|基本||
|---|---|
|HTTP URL|https://open.feishu.cn/open-apis/bitable/v1/apps/:app_token/workflows|
|HTTP Method|GET|
|接口频率限制|[20 次/秒](https://open.feishu.cn/document/ukTMukTMukTM/uUzN04SN3QjL1cDN)|
|支持的应用类型|自建应用<br><br>商店应用|
|权限要求 <br><br>开启任一权限即可|查看自动化流程/工作流<br><br>查看、评论、编辑和管理多维表格<br><br>查看、评论和导出多维表格|

# 更新自动化流程状态

开启或关闭自动化流程。

## 请求

|基本||
|---|---|
|HTTP URL|https://open.feishu.cn/open-apis/bitable/v1/apps/:app_token/workflows/:workflow_id|
|HTTP Method|PUT|
|接口频率限制|[10 次/秒](https://open.feishu.cn/document/ukTMukTMukTM/uUzN04SN3QjL1cDN)|
|支持的应用类型|自建应用<br><br>商店应用|
|权限要求 <br><br>开启任一权限即可|更新自动化流程/工作流状态<br><br>查看、评论、编辑和管理多维表格|

# 列出工作流

此接口用于返回多维表格中所有工作流，多维表格管理员可通过此接口来管理表中的工作流

## 请求

|基本||
|---|---|
|HTTP URL|https://open.feishu.cn/open-apis/bitable/v1/apps/:app_token/block_workflows|
|HTTP Method|GET|
|接口频率限制|[20 次/分钟](https://open.feishu.cn/document/ukTMukTMukTM/uUzN04SN3QjL1cDN)|
|支持的应用类型|自建应用<br><br>商店应用|
|权限要求 <br><br>开启任一权限即可|查看自动化流程/工作流<br><br>查看、评论、编辑和管理多维表格|