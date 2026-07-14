"""
MiniMax (海螺AI) 视频生成脚本
========================
用途：调用 MiniMax 视频生成 API，生成"富士山下飘樱花"主题视频。
运行：python generate_video.py
依赖：pip install requests
"""

import os
import sys
import time
import json
import requests

API_KEY = os.getenv("MINIMAX_API_KEY", "")
BASE_URL = "https://api.MiniMax.chat/v1"


def submit_task(prompt: str, model: str = "MiniMax-01") -> str:
    """提交视频生成任务，返回 task_id"""
    headers = {
        "Authorization": f"Bearer {API_KEY}",
        "Content-Type": "application/json",
    }
    payload = {
        "model": model,
        "prompt": prompt,
        "duration": 6,
        "resolution": "1080p",
        "prompt_optimizer": True,
    }
    resp = requests.post(
        f"{BASE_URL}/video_generation",
        headers=headers,
        json=payload,
        timeout=30,
    )
    resp.raise_for_status()
    data = resp.json()
    print(f"📤 任务提交响应: {json.dumps(data, ensure_ascii=False, indent=2)}")
    return data["task_id"]


def query_task(task_id: str) -> dict:
    """查询任务状态"""
    headers = {"Authorization": f"Bearer {API_KEY}"}
    resp = requests.get(
        f"{BASE_URL}/query/video_generation",
        headers=headers,
        params={"task_id": task_id},
        timeout=30,
    )
    resp.raise_for_status()
    return resp.json()


def generate_video(prompt: str, model: str = "MiniMax-01", max_wait: int = 600) -> dict:
    """端到端：提交 + 轮询 + 返回最终结果"""
    print("=" * 60)
    print("🎬 MiniMax 视频生成任务启动")
    print("=" * 60)
    print(f"📝 Prompt: {prompt.strip()[:80]}...")
    print(f"🤖 Model:  {model}")
    print(f"🔑 API Key: {'已配置（长度 ' + str(len(API_KEY)) + '）' if API_KEY else '❌ 未配置'}")
    print("-" * 60)

    if not API_KEY:
        return {
            "status": "FAILED",
            "error": "未配置 API Key。请设置环境变量 MINIMAX_API_KEY 后重试。",
            "hint": "Windows: set MINIMAX_API_KEY=your_key_here\nLinux/Mac: export MINIMAX_API_KEY=your_key_here",
        }

    try:
        task_id = submit_task(prompt, model)
        print(f"✅ 任务已提交：{task_id}")

        start = time.time()
        while time.time() - start < max_wait:
            data = query_task(task_id)
            status = data.get("status", "Unknown")
            print(f"⏳ [{int(time.time() - start)}s] 状态: {status}")

            if status == "Success":
                print("-" * 60)
                print("🎉 生成完成！")
                print(f"📦 完整返回: {json.dumps(data, ensure_ascii=False, indent=2)}")
                return data
            if status in ("Fail", "Failed"):
                print(f"❌ 生成失败: {data}")
                return data

            time.sleep(10)

        return {"status": "TIMEOUT", "error": f"超过 {max_wait}s 未完成"}
    except requests.exceptions.HTTPError as e:
        return {
            "status": "HTTP_ERROR",
            "error": str(e),
            "response_body": e.response.text if e.response else None,
        }
    except Exception as e:
        return {"status": "EXCEPTION", "error": str(e)}


PROMPT = """
Cinematic slow-motion shot of Mount Fuji in spring.
Snow-capped peak in the background, partially covered by soft morning mist.
Pink cherry blossom petals drifting gently in the wind, swirling through the air.
A few petals landing on the calm mirror-like lake surface creating subtle ripples.
Golden hour backlighting, soft bokeh, shallow depth of field.
Shot on ARRI Alexa, 4K, Hayao Miyazaki anime style, dreamy ethereal atmosphere.
"""


if __name__ == "__main__":
    result = generate_video(PROMPT)
    print("\n" + "=" * 60)
    print("📊 最终返回内容：")
    print("=" * 60)
    print(json.dumps(result, ensure_ascii=False, indent=2))
