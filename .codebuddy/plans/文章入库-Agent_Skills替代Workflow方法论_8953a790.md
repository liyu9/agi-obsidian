---
name: 文章入库-Agent Skills替代Workflow方法论
overview: 将宝玉博客文章《Agent Skills替代Workflow方法论》入库到知识库，包含完整正文和7张配图
todos:
  - id: create-assets-dir
    content: 创建 assets 目录
    status: completed
  - id: download-images
    content: 下载7张图片到 assets 目录
    status: completed
    dependencies:
      - create-assets-dir
  - id: create-doc
    content: 创建 Markdown 文档并按原文位置插入图片
    status: completed
    dependencies:
      - download-images
  - id: verify-result
    content: 验证文档和图片完整性
    status: completed
    dependencies:
      - create-doc
---

## 任务概述

将宝玉的博客文章《Agent Skills替代Workflow方法论》入库到AGI知识框架。

## 核心需求

- **目标路径**: `06-AI落地实践/05-Agent应用/Agent Skills替代Workflow方法论.md`
- **图片目录**: `06-AI落地实践/05-Agent应用/assets/`
- **内容保留**: 核心内容100%保留 + 辅助内容选择性保留
- **图片处理**: 7张图片按原文位置插入

## 内容处理策略

1. 保留全部正文（约3000字）
2. 保留全部标题层级（H1 + 6个H2）
3. 图片按原文出现顺序插入对应位置
4. 添加来源元信息（作者、日期、URL）

## 技术方案

使用本地文件操作完成文档入库：

- **文档创建**: 使用 write_file 创建 Markdown 文件
- **图片下载**: 使用 curl/Invoke-WebRequest 下载图片到 assets 目录
- **目录创建**: 使用 PowerShell 创建 assets 目录

## 文件结构

```
06-AI落地实践/05-Agent应用/
├── Agent Skills替代Workflow方法论.md  # [NEW] 主文档
└── assets/                              # [NEW] 图片目录
    ├── cover.png                        # 封面图
    ├── illustration-01.png              # Skills模块化组合
    ├── illustration-02.png              # Workflow的舒适区与局限
    ├── illustration-03.png              # 文件链式流转
    ├── illustration-04.png              # Subagent并行工作
    ├── illustration-05.png              # Skills自我进化
    └── illustration-06.png              # 僵化Workflow vs活的Skill
```

## 图片位置映射

| 图片 | 原文位置 |
| --- | --- |
| cover.png | 文章开头（标题后） |
| illustration-02.png | "Workflow编排的舒适区"章节后 |
| illustration-01.png | "Agent+Skills的降维打击"章节内 |
| illustration-03.png | "第三步：存储"章节后 |
| illustration-04.png | "第四步：分摊"章节后 |
| illustration-05.png | "第五步：迭代"章节后 |
| illustration-06.png | "可进化优势"章节后 |


## Agent Extensions

### Skill

- **browser-automation**
- Purpose: 使用 agent-browser 获取文章完整内容和图片URL
- Expected outcome: 已完成，获取了完整正文和7张图片URL