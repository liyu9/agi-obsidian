# 计划：生成 Coze 导入文件 + 搭建手册

## 问题理解
基于 `/workspace/扣子AI客服详细设计方案.md`（14 个节点的 AI 客服对话流），生成：
1. **Coze DSL 导入文件**（YAML 格式，打包为 Zip）— 可直接导入 Coze 平台
2. **搭建操作手册**（Markdown）— 补充说明，指导手动调整和配置

## 研究结论
- Coze 官方导入格式为 **Zip 压缩包**，内含 `MANIFEST.yml` + `workfile/*.yaml`
- DSL 格式为 YAML，包含 `schema_version`、`name`、`mode`（chatflow）、`nodes`、`edges`
- 节点类型映射：start / conversation_history_list / code / llm / condition / knowledge / output / plugin / end
- 变量引用格式：`{ "path": "output_field", "ref_node": "node_id" }`
- 条件分支边使用 `source_port` 字段区分不同分支

## 实施步骤

### Step 1: 创建 Coze DSL YAML 文件
- 文件：`/data/user/work/coze_chatflow.yaml`
- 包含 14 个节点的完整定义（N1-N10 + N_cache + N4.5 + N7.5 + N_progress）
- 包含所有 edges（含条件分支的 source_port）
- 包含所有 Prompt、代码、参数配置

### Step 2: 创建 MANIFEST.yml
- 文件：`/data/user/work/MANIFEST.yml`
- 工作流名称、描述、图标等元信息

### Step 3: 打包为 Zip
- 将 YAML 文件打包为 `企业AI Agent客服应用-Coze导入文件.zip`
- 保存到 `/workspace/`

### Step 4: 创建搭建操作手册
- 文件：`/workspace/企业AI Agent客服应用 - Coze搭建手册.md`
- 内容：
  - 导入步骤（如何上传 Zip）
  - 导入后需手动配置的项目（知识库绑定、插件 URL、模型选择）
  - 各节点配置截图指引（文字描述）
  - 测试验证步骤
  - 常见问题排查

### Step 5: 验证
- 检查 YAML 语法正确性
- 检查所有节点 ID 引用一致
- 检查所有 edges 的 source/target 正确
