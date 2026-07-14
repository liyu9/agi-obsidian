# 领域参考文件模板

为具体数据域编写参考文档时使用。

```markdown
# [DOMAIN_NAME] 相关表

## 业务背景
[2–3句话说明该领域覆盖范围]

## 关键表

### [表名]
**位置**：`[project.dataset.table]`  
**说明**：[表内容、适用场景]  
**主键**：[列名]  
**更新频率**：[日/小时/实时]

| 列名 | 类型 | 说明 | 备注 |
|--------|------|-------------|-------|
| [column] | [TYPE] | [DESCRIPTION] | |

## 关键指标

| 指标 | 定义 | 公式 | 注意 |
|--------|------------|-------|-------|
| [METRIC] | [DEFINITION] | `[FORMULA]` | |

## 示例查询

### [查询用途]
```sql
SELECT [columns]
FROM [table]
WHERE [filters]
GROUP BY [grouping]
```

## 常见坑

1. **[坑1]**：[说明]  
   - 错误：`[错误写法]`  
   - 正确：`[推荐写法]`
```

## 建议拆分的领域文件

- `revenue.md` — 计费、订阅、ARR
- `users.md` — 账号、用户属性
- `product.md` — 功能使用、事件
- `growth.md` — DAU/MAU、留存
