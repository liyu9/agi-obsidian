import fitz
import numpy as np
import time
import os
import json
import re
import easyocr

PDF_PATH = r'd:\360MoveData\Users\admin\Desktop\AgiP\AGI-obsidian\PM书籍\SaaS产品经理从菜鸟到专家\SaaS产品经理从菜鸟到专家.pdf'
OUTPUT_DIR = r'd:\360MoveData\Users\admin\Desktop\AgiP\AGI-obsidian\PM书籍\SaaS产品经理从菜鸟到专家'
CACHE_FILE = os.path.join(OUTPUT_DIR, 'ocr_cache.json')
START_TIME = time.time()

def load_cache():
    if os.path.exists(CACHE_FILE):
        with open(CACHE_FILE, 'r', encoding='utf-8') as f:
            return json.load(f)
    return {}

def save_cache(cache):
    with open(CACHE_FILE, 'w', encoding='utf-8') as f:
        json.dump(cache, f, ensure_ascii=False, indent=2)

def ocr_pages(doc, reader, start_page, end_page, cache):
    for i in range(start_page, end_page):
        page_key = str(i)
        if page_key in cache:
            continue

        page = doc[i]
        pix = page.get_pixmap(dpi=200)
        img = np.frombuffer(pix.samples, dtype=np.uint8).reshape(pix.height, pix.width, pix.n)
        if pix.n == 4:
            img = img[:, :, :3]

        results = reader.readtext(img)
        results_sorted = sorted(results, key=lambda x: x[0][0][1])
        text_lines = [text for _, text, conf in results_sorted if conf > 0.3]

        cache[page_key] = '\n'.join(text_lines)

        if (i - start_page + 1) % 10 == 0:
            save_cache(cache)
            elapsed = time.time() - START_TIME
            done = i - start_page + 1
            total_todo = end_page - start_page
            print(f'  Progress: {done}/{total_todo} pages ({elapsed:.0f}s)')

    save_cache(cache)

def find_chapters(cache, total_pages):
    chapter_pattern = re.compile(r'^(第[一二三四五六七八九十百零\d]+[章节篇部分])\s*(.*)')
    chapters = []

    for i in range(total_pages):
        page_key = str(i)
        if page_key not in cache:
            continue
        text = cache[page_key]
        lines = text.split('\n')
        for line in lines:
            line = line.strip()
            m = chapter_pattern.match(line)
            if m:
                chapters.append((i, line))
                break

    return chapters

def create_chapter_files(cache, chapters, total_pages, output_dir):
    if not chapters:
        print('No chapters found!')
        return

    all_sections = []

    front_end = chapters[0][0]
    if front_end > 0:
        all_sections.append(('前言与目录', 0, front_end))

    for idx, (page, title) in enumerate(chapters):
        if idx + 1 < len(chapters):
            end = chapters[idx + 1][0]
        else:
            end = total_pages
        all_sections.append((title, page, end))

    for title, start, end in all_sections:
        content_parts = []
        for pg in range(start, end):
            page_key = str(pg)
            if page_key in cache and cache[page_key].strip():
                content_parts.append(cache[page_key])

        full_content = '\n\n'.join(content_parts)
        safe_title = re.sub(r'[<>:"/\\|?*]', '', title)
        outpath = os.path.join(output_dir, f'{safe_title}.md')
        with open(outpath, 'w', encoding='utf-8') as f:
            f.write(f'# {title}\n\n{full_content}')
        print(f'Created: {safe_title}.md ({len(full_content)} chars, pages {start+1}-{end})')

if __name__ == '__main__':
    print('Initializing EasyOCR...')
    reader = easyocr.Reader(['ch_sim', 'en'], gpu=False)

    print('Opening PDF...')
    doc = fitz.open(PDF_PATH)
    total = len(doc)
    print(f'Total pages: {total}')

    print('Loading cache...')
    cache = load_cache()
    cached_count = len(cache)
    print(f'Cached pages: {cached_count}/{total}')

    if cached_count < total:
        print(f'OCR processing {total - cached_count} pages...')
        ocr_pages(doc, reader, 0, total, cache)
        print('OCR complete!')

    print('Finding chapters...')
    chapters = find_chapters(cache, total)
    print(f'Found {len(chapters)} chapter markers:')
    for pg, title in chapters:
        print(f'  Page {pg+1}: {title}')

    print('Creating chapter files...')
    create_chapter_files(cache, chapters, total, OUTPUT_DIR)

    doc.close()
    elapsed = time.time() - START_TIME
    print(f'\nAll done! Total time: {elapsed:.0f}s')
