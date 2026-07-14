# SQL 方言参考

根据用户数据仓库，将对应小节纳入生成的技能文档。

---

## BigQuery

```markdown
## SQL 方言：BigQuery

- **表引用**：使用反引号：`project.dataset.table`
- **安全除法**：`SAFE_DIVIDE(a, b)` 在除零时返回 NULL 而非报错
- **日期函数**：
  - `DATE_TRUNC(date_col, MONTH)`
  - `DATE_SUB(date_col, INTERVAL 1 DAY)`
  - `DATE_DIFF(end_date, start_date, DAY)`
- **列排除**：`SELECT * EXCEPT(column_to_exclude)`
- **数组**：`UNNEST(array_column)` 展开
- **结构体**：点号访问 `struct_col.field_name`
- **时间戳**：`TIMESTAMP_TRUNC()`；默认 UTC
- **字符串匹配**：`LIKE`、`REGEXP_CONTAINS(col, r'pattern')`
```

---

## Snowflake

```markdown
## SQL 方言：Snowflake

- **表引用**：`DATABASE.SCHEMA.TABLE`；区分大小写列名用引号：`"Column_Name"`
- **安全除法**：`DIV0(a, b)` 返回 0，`DIV0NULL(a, b)` 返回 NULL
- **日期函数**：
  - `DATE_TRUNC('MONTH', date_col)`
  - `DATEADD(DAY, -1, date_col)`
  - `DATEDIFF(DAY, start_date, end_date)`
- **列排除**：`SELECT * EXCLUDE (column_to_exclude)`
- **数组**：`FLATTEN(array_column)` 展开，用 `value` 访问
- **VARIANT/JSON**：冒号路径 `variant_col:field_name`
```

---

## PostgreSQL / Redshift

```markdown
## SQL 方言：PostgreSQL/Redshift

- **表引用**：`schema.table`（习惯小写）
- **安全除法**：`NULLIF(b, 0)` 模式：`a / NULLIF(b, 0)`
- **日期函数**：
  - `DATE_TRUNC('month', date_col)`
  - `date_col - INTERVAL '1 day'`
- **字符串匹配**：`LIKE`、正则 `col ~ 'pattern'`
```

---

## Databricks / Spark SQL

```markdown
## SQL 方言：Databricks/Spark SQL

- **安全除法**：`NULLIF`：`a / NULLIF(b, 0)` 或 `TRY_DIVIDE(a, b)`
- **Delta特性**：`DESCRIBE HISTORY`、时间旅行 `VERSION AS OF`
- **数组**：`EXPLODE(array_column)` 展开
```

---

## 跨方言常用写法对照

| 操作 | BigQuery | Snowflake | PostgreSQL | Databricks |
|-----------|----------|-----------|------------|------------|
| 当前日期 | `CURRENT_DATE()` | `CURRENT_DATE()` | `CURRENT_DATE` | `CURRENT_DATE()` |
| 字符串拼接 | `CONCAT()` | `CONCAT()` | `CONCAT()` | `CONCAT()` |
| 空值合并 | `COALESCE()` | `COALESCE()` | `COALESCE()` | `COALESCE()` |
| 去重计数 | `COUNT(DISTINCT x)` | `COUNT(DISTINCT x)` | `COUNT(DISTINCT x)` | `COUNT(DISTINCT x)` |
