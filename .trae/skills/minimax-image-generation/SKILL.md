---
name: minimax-image-generation
description: MiniMax图像生成API调用Skill，支持文生图、图生图等功能
version: 1.0
source: MiniMax API官方文档
trigger: 当用户需要生成图片时调用此Skill
---

# MiniMax 图像生成 Skill

## 概述

本Skill封装了MiniMax图像生成API的调用方式，支持文生图功能。

## API配置

```python
import base64
import requests
import os

# API配置
url = "https://api.minimaxi.com/v1/image_generation"
api_key = os.environ.get("MINIMAX_API_KEY")  # 建议使用环境变量存储API Key

headers = {"Authorization": f"Bearer {api_key}"}
```

## 文生图调用

```python
def generate_image(
    prompt: str,
    model: str = "image-01",
    aspect_ratio: str = "16:9",
    output_file: str = "output.jpeg"
):
    """生成图片
    
    Args:
        prompt: 图片描述提示词
        model: 模型名称，默认image-01
        aspect_ratio: 图片比例，支持"1:1", "16:9", "9:16", "4:3", "3:4"
        output_file: 输出文件名
    """
    payload = {
        "model": model,
        "prompt": prompt,
        "aspect_ratio": aspect_ratio,
        "response_format": "base64",
    }
    
    response = requests.post(url, headers=headers, json=payload)
    response.raise_for_status()
    
    images = response.json()["data"]["image_base64"]
    
    for i, img_base64 in enumerate(images):
        with open(f"output_{i}.jpeg", "wb") as f:
            f.write(base64.b64decode(img_base64))
    
    return output_file
```

## 使用示例

### 示例1: 生成风景图

```python
generate_image(
    prompt="men Dressing in white t shirt, full-body stand front view image :25, outdoor, Venice beach sign, full-body image, Los Angeles, Fashion photography of 90s, documentary, Film grain, photorealistic",
    aspect_ratio="16:9",
    output_file="beach_fashion.jpeg"
)
```

### 示例2: 生成头像

```python
generate_image(
    prompt="portrait photo of young woman, studio lighting, professional photography",
    aspect_ratio="1:1",
    output_file="portrait.jpeg"
)
```

### 示例3: 生成竖版图片

```python
generate_image(
    prompt="tall skyscraper architecture, urban cityscape, golden hour",
    aspect_ratio="9:16",
    output_file="skyscraper.jpeg"
)
```

## 提示词优化技巧

### ✅ 建议包含

| 类别 | 示例关键词 |
|------|-----------|
| 主题 | person, landscape, product, animal |
| 风格 | photorealistic, illustration, anime, oil painting |
| 细节 | full-body, close-up, wide shot, bird's eye view |
| 光线 | natural light, studio lighting, golden hour |
| 质量 | high quality, 4K, detailed, professional |

### ❌ 避免使用

- 模糊或矛盾描述
- 过长提示词（保持简洁）
- 版权敏感内容

## 支持的宽高比

| 比例 | 适用场景 |
|------|---------|
| 1:1 | 头像、社交媒体头像 |
| 16:9 | 横版图片、视频封面 |
| 9:16 | 竖版图片、故事封面 |
| 4:3 | 通用图片 |
| 3:4 | 人物肖像 |

## 错误处理

```python
def safe_generate_image(prompt: str, **kwargs):
    """带错误处理的图片生成"""
    try:
        return generate_image(prompt, **kwargs)
    except requests.exceptions.HTTPError as e:
        if e.response.status_code == 401:
            raise ValueError("API Key无效，请检查环境变量MINIMAX_API_KEY")
        elif e.response.status_code == 400:
            raise ValueError("请求参数错误，请检查prompt和参数")
        else:
            raise
    except requests.exceptions.RequestException as e:
        raise RuntimeError(f"网络请求失败: {e}")
```

## 环境变量配置

```bash
# 设置API Key
export MINIMAX_API_KEY="your_api_key_here"

# 或在Python中
os.environ["MINIMAX_API_KEY"] = "your_api_key_here"
```

## 模型说明

| 模型 | 说明 |
|------|------|
| image-01 | MiniMax最新图像生成模型，支持高质量文生图 |

---

**调用方式**: 当用户需要生成图片时，自动调用此Skill执行MiniMax图像生成。
