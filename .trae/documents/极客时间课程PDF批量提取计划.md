# 极客时间课程PDF批量提取计划

## 任务概述

将上传的32个.zip文件中的PDF课程稿提取为Markdown格式，完整保留原文内容。

## 当前状态

### 已上传文件（32个.zip）
- 位置：`c:\Users\admin\.trae-cn\attachments\`
- 内容：每个zip包含1个PDF文件（课程文字稿）
- 课程主题：Multi-Agent系统开发实战（01-32讲）

### 依赖检查
- ✅ pdfplumber 已安装
- ❌ PyMuPDF 未安装（需安装以支持图片提取）

## 执行计划

### Phase 1: 环境准备

1. **安装依赖**
   ```bash
   pip install PyMuPDF pdfplumber
   ```

2. **创建目录结构**
   - 输出目录：`12-学习笔记/05-极客时间-Multi-Agent系统开发实战/`
   - 临时目录：`c:\Users\admin\.trae-cn\work\69fdc453c0b4cb0f713680c3\pdf_extract_temp/`

### Phase 2: 批量解压

**策略**：并行解压所有zip文件

```powershell
$source = "c:\Users\admin\.trae-cn\attachments\*.zip"
$dest = "c:\Users\admin\.trae-cn\work\69fdc453c0b4cb0f713680c3\pdf_extract_temp"
Get-ChildItem $source | ForEach-Object {
    Expand-Archive -Path $_.FullName -DestinationPath $dest -Force
}
```

### Phase 3: PDF提取脚本

创建 `batch_pdf_extractor.py` 脚本，实现：
1. 遍历PDF文件列表
2. 使用PyMuPDF提取文本（保留格式）
3. 使用PyMuPDF提取图片
4. 生成Markdown文件（保留原文结构）

**脚本功能**：
- 提取PDF文本内容
- 提取页面中的图片（保存到assets/目录）
- 生成Markdown（保留标题层级、列表、表格）
- 每篇添加来源标注

### Phase 4: 批量处理

**并行策略**：4个文件并行处理

```
批次1: 01-08讲 → 并行处理
批次2: 09-16讲 → 并行处理
批次3: 17-24讲 → 并行处理
批次4: 25-32讲 → 并行处理
```

### Phase 5: 输出整理

**文件命名**：
- 格式：`XX｜课程标题.md`
- 示例：`01｜拨开迷雾：AI应用开发的四种架构范式.md`

**目录结构**：
```
12-学习笔记/05-极客时间-Multi-Agent系统开发实战/
├── 01｜拨开迷雾：AI应用开发的四种架构范式.md
├── 02｜解构智能体：Agent的解剖学与ReAct范式.md
├── ...
├── 32｜企业安全性：沙箱、权限网关与身份认证.md
└── assets/
    ├── 01-图片1.png
    ├── 02-图片2.png
    └── ...
```

## 质量保证

1. **完整提取**：保留原文所有文字内容
2. **格式保留**：Markdown标题层级、列表、代码块、表格
3. **图片提取**：提取PDF中所有图片并保存
4. **来源标注**：每篇底部标注来源信息

## 来源标注格式

```markdown
---
来源：极客时间《Multi-Agent系统开发实战》第XX讲
提取日期：2026-05-08
---
```

## 验证步骤

1. ✅ 验证所有32个PDF都已解压
2. ✅ 验证每个PDF都有对应的.md文件
3. ✅ 验证.md文件包含完整内容
4. ✅ 验证图片已提取到assets目录
5. ✅ 验证来源标注正确

## 执行顺序

1. 安装PyMuPDF
2. 创建输出目录结构
3. 创建批量提取脚本
4. 运行批量提取
5. 验证输出结果
6. 清理临时文件
