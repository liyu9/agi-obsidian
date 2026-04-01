# AGI知识框架维护 Skill - 验收清单

## 文件结构检查
- [x] `.trae/skills/agi-knowledge-maintainer/` 目录已创建
- [x] `SKILL.md` 文件存在于 skill 目录内

## SKILL.md 内容检查
- [x] frontmatter 包含 `name` 字段，值为 `agi-knowledge-maintainer`
- [x] frontmatter 包含 `description` 字段，200字符以内（约150字符）
- [x] `description` 包含功能描述和触发条件
- [x] 正文包含完整的执行流程说明
- [x] 正文包含图片资源处理规则（assets/ 目录、命名规范）
- [x] 正文包含文本保真度保护规则
- [x] 正文包含目录/文件变更控制流程
- [x] 正文包含更新记录格式说明

## 更新记录检查
- [x] `.trae/documents/知识框架更新记录.md` 已创建
- [x] 包含操作记录表格式
- [x] 包含变更文件列表格式
- [x] 包含每次更新的时间戳格式

## 防护机制检查
- [x] 图片必须放在模块 `assets/` 子目录
- [x] 文本摘要必须保留"核心原文"章节
- [x] 目录/文件变更必须先输出计划
- [x] 任何变更操作需要记录原因