# -*- encoding: utf-8 -*-
"""
三节课课程下载器

用法:
  python sjk_downloader.py --cookie "你的cookie" --url "课程URL"
  python sjk_downloader.py --jwt "jwt令牌" --course 34009638

输出目录结构:
  下载目录/
  └── 三节课/
      └── 课程名称/
          ├── 课程介绍/
          │   ├── 视频/xxx.mp4
          │   └── 文字稿/xxx.md
          ├── 01_第一章 xxx/
          │   ├── 视频/xxx.mp4
          │   └── 文字稿/xxx.md
          └── 02_第二章 xxx/
              ├── 视频/xxx.mp4
              └── 文字稿/xxx.md
"""

import os
import re
import sys
import json
import time
import argparse
import requests
from Crypto.Cipher import AES
from loguru import logger

logger.remove()
logger.add(sys.stderr, level="INFO")

BASE_URL = "https://web-api.sanjieke.cn/b-side/api/web"
session = requests.session()


def build_headers(jwt_token):
    return {
        "user-agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/148.0.0.0 Safari/537.36",
        "referer": "https://www.sanjieke.cn/",
        "origin": "https://www.sanjieke.cn",
        "sjk-apikey": "cDpJh7SuWGFZCFfSjvByc34PNSBrNVrB",
        "sjk-platform": "pc",
        "x-domain-prefix": "cos",
        "Authorization": f"Bearer {jwt_token}",
        "X-Requested-With": "XMLHttpRequest",
        "Accept": "application/json, text/plain, */*",
    }


def safe_filename(name):
    return re.sub(r'[\\/:*?"<>|\t]', '_', str(name)).strip()


def network_get(url, headers=None, rty=3):
    try:
        resp = session.get(url, headers=headers, timeout=15)
        resp.encoding = "utf8"
        return resp
    except Exception as e:
        if rty > 0:
            time.sleep(1)
            return network_get(url, headers=headers, rty=rty - 1)
        logger.warning(f"请求失败: {url} - {e}")
        return None


class SanjiekeDownloader:
    def __init__(self, jwt_token, output_dir, skip_video=False):
        self.jwt = jwt_token
        self.headers = build_headers(jwt_token)
        self.output_dir = output_dir
        self.skip_video = skip_video
        os.makedirs(output_dir, exist_ok=True)

    def get_course_info(self, course_id):
        resp = network_get(f"{BASE_URL}/study/0/{course_id}/info", headers=self.headers)
        if not resp or resp.status_code != 200:
            logger.error(f"获取课程信息失败: {course_id}")
            return None
        data = resp.json()
        if data.get("code") != 200:
            logger.error(f"课程信息API错误: {data}")
            return None
        return data.get("data", {})

    def get_course_tree(self, course_id):
        resp = network_get(f"{BASE_URL}/study/0/{course_id}/content/tree", headers=self.headers)
        if not resp or resp.status_code != 200:
            logger.error(f"获取课程目录失败: {course_id}")
            return []
        data = resp.json()
        if data.get("code") != 200:
            logger.error(f"课程目录API错误: {data}")
            return []
        return data.get("data", {}).get("tree", [])

    def get_section_content(self, course_id, section_id):
        resp = network_get(f"{BASE_URL}/study/0/{course_id}/content/{section_id}", headers=self.headers)
        if not resp or resp.status_code != 200:
            return None
        data = resp.json()
        if data.get("code") != 200:
            return None
        return data.get("data", {})

    def save_transcript(self, text, save_path):
        with open(save_path, "w", encoding="utf-8") as f:
            f.write(text)
        logger.success(f"文稿保存: {save_path}")

    def _vtt_to_text(self, vtt_content):
        import re

        def parse_ts(ts):
            m = re.match(r'(\d+):(\d+):(\d+)\.(\d+)', ts.strip())
            if m:
                h, mi, s, ms = int(m.group(1)), int(m.group(2)), int(m.group(3)), int(m.group(4))
                return h * 3600 + mi * 60 + s + ms / 1000.0
            return 0.0

        lines = vtt_content.strip().split('\n')
        cues = []
        current_cue = {'text': '', 'end': 0}

        for line in lines:
            line = line.strip()
            if not line or line.startswith('WEBVTT') or line.startswith('NOTE'):
                continue
            if '-->' in line:
                ts_match = re.match(r'([\d:.]+)\s*-->\s*([\d:.]+)', line)
                if ts_match:
                    end_ts = parse_ts(ts_match.group(2))
                    if current_cue['text']:
                        cues.append(current_cue)
                    current_cue = {'text': '', 'end': end_ts}
                continue
            if re.match(r'^\d+$', line):
                continue
            if current_cue['text']:
                current_cue['text'] += line
            else:
                current_cue['text'] = line

        if current_cue['text']:
            cues.append(current_cue)

        if not cues:
            return ''

        sentences = []
        for cue in cues:
            text = cue['text'].strip()
            if not text:
                continue
            sentences.append(text)

        if not sentences:
            return ''

        formatted = self._format_text(sentences)
        return formatted

    def _format_text(self, sentences):
        result = []
        current_para = []
        current_len = 0
        para_max_len = 120

        for sent in sentences:
            sent = sent.strip()
            if not sent:
                continue

            if not sent.endswith(('。', '！', '？', '，', '、', '：', '；', '…', '.', '!', '?', ',', ';')):
                sent = sent + '。'

            if current_len + len(sent) > para_max_len and current_para:
                result.append(''.join(current_para))
                current_para = [sent]
                current_len = len(sent)
            else:
                current_para.append(sent)
                current_len += len(sent)

        if current_para:
            result.append(''.join(current_para))

        return '\n\n'.join(result)

    def _download_vtt(self, vtt_url):
        try:
            resp = session.get(vtt_url, headers={
                "user-agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
                "referer": "https://www.sanjieke.cn/"
            }, timeout=15)
            if resp.status_code == 200:
                try:
                    return resp.content.decode('utf-8')
                except Exception:
                    return resp.content.decode('utf-8', errors='ignore')
        except Exception as e:
            logger.warning(f"VTT下载失败: {vtt_url[:80]} - {e}")
        return None

    def _extract_transcript_from_vtt(self, vtt_content):
        text = self._vtt_to_text(vtt_content)
        if not text or len(text.strip()) < 50:
            return None
        return text

    def process_section(self, course_id, section_id, section_name, chapter_video_dir, chapter_text_dir, class_id):
        section_fn = safe_filename(section_name)
        os.makedirs(chapter_video_dir, exist_ok=True)
        os.makedirs(chapter_text_dir, exist_ok=True)
        logger.info(f"处理小节: {section_name}")

        content_data = self.get_section_content(course_id, section_id)
        if not content_data:
            logger.warning(f"小节内容获取失败: {section_name}")
            return

        nodes = content_data.get("nodes", [])
        for node in nodes:
            content_type = node.get("contentType", "")

            if content_type == "b-video":
                video_content = node.get("videoContent", {})
                resolutions = video_content.get("resolutionRatioObjList", [])
                m3u8_url = None
                for res in resolutions:
                    if not res.get("vipFlag", False):
                        m3u8_url = res.get("url")
                        break
                if not m3u8_url and resolutions:
                    m3u8_url = resolutions[-1].get("url")

                subtitles = video_content.get("subtitles", [])
                zh_text = None

                for sub in subtitles:
                    vtt_url = sub.get("url", "")
                    lang = sub.get("language", "")
                    if vtt_url and ('ZH' in lang or 'zh' in lang):
                        vtt_content = self._download_vtt(vtt_url)
                        if vtt_content:
                            text = self._extract_transcript_from_vtt(vtt_content)
                            if text:
                                zh_text = text
                                break

                if zh_text:
                    text_path = os.path.join(chapter_text_dir, f"{section_fn}.md")
                    self.save_transcript(zh_text, text_path)

                if m3u8_url and not self.skip_video:
                    video_path = os.path.join(chapter_video_dir, f"{section_fn}.mp4")
                    self._download_m3u8_video(m3u8_url, video_path)

            elif content_type in ("b-text", "b-rich-text"):
                html = node.get("htmlContent", "")
                if html and html.strip():
                    text_path = os.path.join(chapter_text_dir, f"{section_fn}.md")
                    if not os.path.exists(text_path):
                        text = self._html_to_text(html)
                        if text.strip():
                            self.save_transcript(text, text_path)

    def _download_m3u8_video(self, m3u8_url, save_path):
        if os.path.exists(save_path):
            logger.info(f"视频已存在，跳过: {save_path}")
            return True

        resp = network_get(m3u8_url, headers=self.headers)
        if not resp or resp.status_code != 200:
            logger.warning(f"获取m3u8失败: {m3u8_url[:80]}")
            return False

        m3u8_content = resp.text

        if "#EXT-X-STREAM-INF" in m3u8_content:
            for line in m3u8_content.split("\n"):
                line = line.strip()
                if line and not line.startswith("#"):
                    if not line.startswith("http"):
                        line = m3u8_url.rsplit("/", 1)[0] + "/" + line
                    resp = network_get(line, headers=self.headers)
                    if resp and resp.status_code == 200:
                        m3u8_content = resp.text
                        m3u8_url = line
                    break

        key_url = None
        ts_urls = []
        for line in m3u8_content.split("\n"):
            line = line.strip()
            if "EXT-X-KEY" in line and 'URI="' in line:
                key_url = line.split('URI="')[1].split('"')[0]
            elif line and not line.startswith("#"):
                if line.startswith("http"):
                    ts_urls.append(line)
                else:
                    ts_urls.append(m3u8_url.rsplit("/", 1)[0] + "/" + line)

        if not ts_urls:
            logger.warning(f"m3u8无TS分片")
            return False

        key = None
        cryptor = None
        if key_url:
            key_resp = network_get(key_url, headers=self.headers)
            if key_resp and len(key_resp.content) == 16:
                key = key_resp.content
                cryptor = AES.new(key, AES.MODE_CBC, key)

        tmp_dir = save_path + ".tmp"
        os.makedirs(tmp_dir, exist_ok=True)

        ts_files = []
        for i, ts_url in enumerate(ts_urls):
            ts_path = os.path.join(tmp_dir, f"{i:04d}.ts")
            ts_files.append(ts_path)
            try:
                ts_resp = session.get(ts_url, headers=self.headers, timeout=15)
                content = ts_resp.content
                if cryptor:
                    pad = 16 - len(content) % 16 if len(content) % 16 != 0 else 0
                    if pad:
                        content = content + b'\x00' * pad
                    content = cryptor.decrypt(content)
                with open(ts_path, "wb") as f:
                    f.write(content)
                logger.info(f"  TS {i + 1}/{len(ts_urls)}")
            except Exception as e:
                logger.warning(f"  TS下载失败 {i}: {e}")

        with open(save_path, "wb") as out:
            for ts_path in ts_files:
                if os.path.exists(ts_path):
                    with open(ts_path, "rb") as f:
                        out.write(f.read())

        for ts_path in ts_files:
            if os.path.exists(ts_path):
                os.remove(ts_path)
        try:
            os.rmdir(tmp_dir)
        except Exception:
            pass

        logger.success(f"视频下载完成: {save_path}")
        return True

    @staticmethod
    def _html_to_text(html):
        import re
        text = re.sub(r'<br\s*/?>', '\n', html)
        text = re.sub(r'<p[^>]*>', '\n', text)
        text = re.sub(r'</p>', '', text)
        text = re.sub(r'<[^>]+>', '', text)
        text = text.replace('&nbsp;', ' ')
        text = text.replace('&lt;', '<')
        text = text.replace('&gt;', '>')
        text = text.replace('&amp;', '&')
        return text.strip()

    def download_course(self, course_id, class_id=None):
        course_info = self.get_course_info(course_id)
        if not course_info:
            logger.error("无法获取课程信息，请检查JWT是否有效")
            return

        course_title = safe_filename(course_info.get("title", f"course_{course_id}"))
        sanjieke_dir = os.path.join(self.output_dir, "三节课")
        course_dir = os.path.join(sanjieke_dir, course_title)
        video_dir = os.path.join(course_dir, "视频")
        text_dir = os.path.join(course_dir, "文字稿")
        os.makedirs(video_dir, exist_ok=True)
        os.makedirs(text_dir, exist_ok=True)

        logger.info(f"开始下载课程: {course_title}")

        tree = self.get_course_tree(course_id)
        if not tree:
            logger.error("课程目录为空")
            return

        actual_class_id = class_id or str(course_info.get("classId", ""))
        logger.info(f"class_id: {actual_class_id}")

        chapter_idx = 0
        for node in tree:
            node_type = node.get("type", "")
            node_name = node.get("name", "unknown")
            node_id = node.get("nodeId", "")
            children = node.get("children") or []

            if node_type == "section":
                chapter_video_dir = os.path.join(video_dir, safe_filename(node_name))
                chapter_text_dir = os.path.join(text_dir, safe_filename(node_name))
                os.makedirs(chapter_video_dir, exist_ok=True)
                os.makedirs(chapter_text_dir, exist_ok=True)
                self.process_section(course_id, str(node_id), node_name, chapter_video_dir, chapter_text_dir, actual_class_id)
            elif node_type == "chapter":
                chapter_idx += 1
                chapter_name = f"{chapter_idx:02d}_{safe_filename(node_name)}"
                chapter_video_dir = os.path.join(video_dir, chapter_name)
                chapter_text_dir = os.path.join(text_dir, chapter_name)
                os.makedirs(chapter_video_dir, exist_ok=True)
                os.makedirs(chapter_text_dir, exist_ok=True)
                logger.info(f"章节: {node_name} ({len(children)}小节)")
                for section in children:
                    try:
                        self.process_section(
                            course_id,
                            str(section.get("nodeId", "")),
                            section.get("name", ""),
                            chapter_video_dir,
                            chapter_text_dir,
                            actual_class_id
                        )
                    except Exception as e:
                        logger.warning(f"小节处理异常: {section.get('name')} - {e}")
                    time.sleep(0.5)
            else:
                logger.info(f"跳过未知类型节点: {node_type} - {node_name}")

        logger.success(f"课程下载完成: {course_title}")


def main():
    parser = argparse.ArgumentParser(description="三节课课程下载器")
    parser.add_argument("--jwt", help="三节课JWT token")
    parser.add_argument("--cookie", help="三节课登录cookie (自动提取jwt)")
    parser.add_argument("--url", help="课程页面URL")
    parser.add_argument("--course", help="课程ID")
    parser.add_argument("--class", dest="class_id", help="课堂ID")
    parser.add_argument("--output", default=".", help="下载目录 (默认当前目录)")
    parser.add_argument("--no-video", action="store_true", help="跳过视频下载，仅下载文字稿")
    args = parser.parse_args()

    jwt_token = args.jwt
    if not jwt_token and args.cookie:
        for item in args.cookie.split(";"):
            item = item.strip()
            if item.startswith("_sjk_jwt="):
                jwt_token = item.split("=", 1)[1]
                break
        if not jwt_token:
            logger.error("cookie中未找到 _sjk_jwt")
            sys.exit(1)

    if not jwt_token:
        logger.error("请提供 --jwt 或 --cookie 参数")
        sys.exit(1)

    course_id = None
    class_id = args.class_id

    if args.url:
        m = re.search(r'lesson/\d+/(\d+)/(\d+)', args.url)
        if m:
            course_id = m.group(1)
            class_id = m.group(2)
        else:
            logger.error("URL格式不正确")
            sys.exit(1)
    elif args.course:
        course_id = args.course
    else:
        logger.error("请提供 --url 或 --course 参数")
        sys.exit(1)

    dl = SanjiekeDownloader(jwt_token, os.path.abspath(args.output), skip_video=args.no_video)
    dl.download_course(course_id, class_id)


if __name__ == '__main__':
    main()
