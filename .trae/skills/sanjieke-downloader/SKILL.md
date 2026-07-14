---
name: "sanjieke-downloader"
description: "三节课课程下载器，自动下载视频和文字稿。触发：用户说下载三节课课程、获取课程视频/文稿。"
---

# 三节课课程下载器

从三节课平台下载课程视频和文字稿。

## 功能

- 🎬 下载视频（m3u8加密流，自动解密合并）
- 📝 下载文字稿（从VTT字幕提取，智能标点分段）
- 📁 自动按课程/章节目录结构整理
- 🔄 断点续传（已下载文件跳过）

## 输出目录结构

```
下载目录/
└── 三节课/
    └── 课程名称/
        ├── 视频/
        │   ├── 课程介绍/
        │   │   └── 课程介绍.mp4
        │   ├── 第一章 xxx/
        │   │   └── 第一章 xxx.mp4
        │   ├── 01_第二章 xxx/
        │   │   ├── 本章导入.mp4
        │   │   ├── 第一节 xxx.mp4
        │   │   └── ...
        │   └── 02_第三章 xxx/
        │       └── ...
        └── 文字稿/
            ├── 课程介绍/
            │   └── 课程介绍.md
            ├── 第一章 xxx/
            │   └── 第一章 xxx.md
            ├── 01_第二章 xxx/
            │   ├── 本章导入.md
            │   ├── 第一节 xxx.md
            │   └── ...
            └── 02_第三章 xxx/
                └── ...
```

## 文字稿格式

- 每句自动添加标点符号（句号、逗号等）
- 每120字左右分一段，段落清晰易读
- 空行分隔段落，便于阅读

## 使用流程

### 第一步：获取JWT Token

```bash
node .trae/skills/sanjieke-downloader/scripts/get-cookie.cjs
```

或手动获取：
1. Chrome中打开三节课并登录
2. F12 → Application → Cookies → sanjieke.cn
3. 找到 `_sjk_jwt`，复制Value

### 第二步：下载课程

```bash
python .trae/skills/sanjieke-downloader/scripts/sjk_downloader.py \
    --cookie "完整cookie" \
    --url "https://www.sanjieke.cn/lesson/0/34009638/37275578" \
    --output "下载目录"
```

## 命令行参数

| 参数 | 说明 |
|------|------|
| `--cookie` | 完整浏览器cookie（自动提取jwt） |
| `--jwt` | JWT token |
| `--url` | 课程页面URL |
| `--course` | 课程ID |
| `--class` | 课堂ID（可选） |
| `--output` | 下载目录（默认当前目录） |

## 依赖

```bash
pip install requests pycryptodome loguru
```

## 脚本结构

```
sanjieke-downloader/
├── SKILL.md                    # 本文件
└── scripts/
    ├── sjk_downloader.py      # 核心下载器
    └── get-cookie.cjs        # 获取cookie脚本
```

## 触发条件

- 用户说"下载三节课课程"、"获取课程视频/文稿"
- 用户发送三节课课程链接
