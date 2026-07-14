# TodoWrite 清单模板

## 模板说明

Agent 在阶段1完成后，根据 article-list.json 的实际文章数量动态生成 TodoWrite 清单。
以下为模板结构，Agent 根据实际分组数量填充。

## 固定阶段项

```json
[
  {id:"env", content:"环境检测：Chrome端口+登录状态", status:"pending"},
  {id:"init", content:"初始化：创建目录+文章清单+原始数据目录", status:"pending"}
]
```

## 动态分组项（每3篇一组）

假设共 N 篇文章，分 M 组：

```json
[
  {id:"batch-1", content:"轮次1：提取文章1-3（3个sub_agent并行）", status:"pending"},
  {id:"val-1", content:"轮次1：校验文章1-3", status:"pending"},

  {id:"batch-2", content:"轮次2：提取文章4-6", status:"pending"},
  {id:"val-2", content:"轮次2：校验文章4-6", status:"pending"},

  {id:"batch-3", content:"轮次3：提取文章7-9", status:"pending"},
  {id:"val-3", content:"轮次3：校验文章7-9", status:"pending"},

  "...按实际分组数量继续..."

  {id:"batch-M", content:"轮次M：提取文章X-N（最后一组）", status:"pending"},
  {id:"val-M", content:"轮次M：校验文章X-N", status:"pending"}
]
```

## 固定收尾项

```json
[
  {id:"fix", content:"全局修复：处理所有校验失败文章", status:"pending"},
  {id:"final", content:"最终校验：batch-validate全局检查", status:"pending"},
  {id:"confirm", content:"用户确认：检查所有文章", status:"pending"},
  {id:"clean", content:"清理缓存：删除原始数据目录", status:"pending"}
]
```

## 生成规则

1. 读取 article-list.json，统计文章总数 N
2. 每组 3 篇，计算组数 M = ceil(N / 3)
3. 为每组生成 batch-X 和 val-X 两项
4. batch-X 的 content 格式：`轮次X：提取文章A-B（C个sub_agent并行）`
5. 最后一组可能不足3篇，content 中写实际数量
6. 所有项初始 status 为 pending

## 质量要求（嵌入清单时附加说明）

- 每篇文章提取后自动内建校验，校验通过才算提取成功
- 校验 sub_agent 只报告问题，不自动修复
- 修复优先使用 regen.js（不需要浏览器）
- 提取 sub_agent 和校验 sub_agent 可并行执行
- 每轮结束后主 Agent 统一汇总结果
