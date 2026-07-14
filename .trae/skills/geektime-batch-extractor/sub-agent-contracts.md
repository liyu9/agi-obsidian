# Sub-Agent 契约定义

> 本文件为 geektime-batch-extractor 的参考文档，定义每种 sub_agent 的输入/输出契约。

## 通用规则

- 所有 sub_agent 工作目录为 skill 的 `scripts/` 目录
- 所有输出为 stdout JSON，解析时以最后一行 `}` 为准
- 异常时 `exit code = 1`，错误信息在 stdout JSON 的 `error` 字段
- sub_agent 之间无共享状态，不写共享文件

---

## 提取 sub_agent（extract-single.js）

**职责：** 提取单篇文章内容、下载图片、生成 Markdown、内建校验

**输入：**
```
node extract-single.js <articleId> "<saveDir>" "<cacheDir>"
```

| 参数 | 类型 | 说明 |
|------|------|------|
| articleId | string | 文章 ID（URL 中的数字部分） |
| saveDir | string | 最终输出目录（绝对路径） |
| cacheDir | string | 原始数据缓存目录（绝对路径） |

**输出 JSON：**

成功：
```json
{
  "ok": true,
  "id": "942438",
  "title": "开篇词 | 数据给你一双看透本质的眼睛",
  "validated": true,
  "chars": 5234,
  "images": 3,
  "blocks": 15
}
```

成功但校验失败：
```json
{
  "ok": true,
  "id": "942438",
  "title": "开篇词",
  "validated": false,
  "chars": 5234,
  "images": 3,
  "blocks": 15,
  "fails": ["代码块未闭合: ``` 3 次"]
}
```

失败：
```json
{
  "ok": false,
  "id": "942438",
  "error": "Page not found"
}
```

| error 值 | 含义 | 主 Agent 应对 |
|----------|------|-------------|
| `Page not found` | 标签页未打开 | 记录失败，继续 |
| `paywall` | 付费墙/未登录 | 记录失败，提示用户 |
| `no content` | 页面结构异常 | 记录失败，可重试 |

**约束：**
- 需要浏览器（对应标签页必须打开）
- 图片下载到 cacheDir，复制到 saveDir
- article-raw.json 保存到 cacheDir

**超时：** 120 秒

---

## 校验 sub_agent（validate-lib.js）

**职责：** 校验 Markdown 文件格式和质量

**输入：**
```
node validate-lib.js --json "<mdFile>"
```

| 参数 | 类型 | 说明 |
|------|------|------|
| mdFile | string | Markdown 文件绝对路径 |

**输出 JSON：**

通过：
```json
{
  "pass": true,
  "errors": 0,
  "warnings": 1,
  "fails": [],
  "details": [
    {"level": "PASS", "msg": "长度: 5234 chars"},
    {"level": "WARN", "msg": "远程图片未下载: 1"}
  ],
  "chars": 5234,
  "bold": 12,
  "inlineCode": 8,
  "file": "d:\\...\\开篇词.md"
}
```

失败：
```json
{
  "pass": false,
  "errors": 2,
  "warnings": 1,
  "fails": ["代码块未闭合: ``` 3 次", "空代码块: 1 处"],
  "details": [...],
  "chars": 5234,
  "file": "d:\\...\\开篇词.md"
}
```

**约束：**
- 不需要浏览器
- 纯文件操作，只读不写
- 只报告问题，不自动修复

**超时：** 30 秒

---

## 修复 sub_agent（regen.js）

**职责：** 从缓存重新生成 Markdown

**输入：**
```
node regen.js <articleId> "<saveDir>" "<cacheDir>"
```

| 参数 | 类型 | 说明 |
|------|------|------|
| articleId | string | 文章 ID |
| saveDir | string | 最终输出目录 |
| cacheDir | string | 原始数据缓存目录（含 article-raw.json） |

**输出 JSON：**

成功：
```json
{
  "ok": true,
  "id": "942438",
  "title": "开篇词",
  "validated": true,
  "chars": 5234
}
```

失败：
```json
{
  "ok": false,
  "id": "942438",
  "error": "No cached data"
}
```

| error 值 | 含义 | 主 Agent 应对 |
|----------|------|-------------|
| `No cached data` | cacheDir 中无缓存文件 | 标记需重新提取 |

**约束：**
- 不需要浏览器
- 从 cacheDir 读取缓存，图片缺失时从 cacheDir 复制到 saveDir
- 覆盖 saveDir 中的旧 MD 文件

**超时：** 30 秒

---

## 主 Agent 汇总逻辑

每轮 sub_agent 全部返回后，主 Agent 汇总：

```json
{
  "round": 2,
  "extracted": [
    {"id": "942440", "title": "...", "ok": true, "validated": true},
    {"id": "942441", "title": "...", "ok": true, "validated": false, "fails": ["..."]},
    {"id": "942442", "title": "...", "ok": false, "error": "Page not found"}
  ],
  "needsFix": ["942441"],
  "needsReextract": ["942442"],
  "progress": "12/39"
}
```
