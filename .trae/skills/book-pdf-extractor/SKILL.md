---
name: "book-pdf-extractor"
description: "Extract book PDF content and split by chapters into markdown files. Handles both text-based and scanned (image-based) PDFs. Trigger: user wants to extract book content from PDF, split PDF by chapters, or process book PDFs."
---

# Book PDF Extractor

Extract full content from book PDFs and split into per-chapter markdown files.

## Capabilities

- **Text-based PDF**: Extract text via pdfplumber, detect chapter boundaries by TOC or heading patterns
- **Scanned PDF**: Render pages via PyMuPDF, OCR via EasyOCR (Chinese + English), then split by chapters
- **Auto-detect**: Try text extraction first; if empty, fall back to OCR
- **Chapter detection**: Parse TOC pages to identify chapter start pages, or scan for `第X章` patterns
- **Output**: One `.md` file per chapter, saved in the same folder as the PDF

## Dependencies

```bash
pip install pdfplumber PyMuPDF numpy easyocr
```

## Workflow

### Step 1: Detect PDF Type

```python
import pdfplumber

with pdfplumber.open(pdf_path) as pdf:
    sample_text = ""
    for i in range(min(5, len(pdf.pages))):
        text = pdf.pages[i].extract_text() or ""
        sample_text += text
    is_text_pdf = len(sample_text.strip()) > 100
```

### Step 2A: Text-based PDF Extraction

```python
import pdfplumber
import re, os

def extract_text_pdf(pdf_path, output_dir):
    with pdfplumber.open(pdf_path) as pdf:
        total = len(pdf.pages)
        all_text = {}
        for i, page in enumerate(pdf.pages):
            text = page.extract_text() or ""
            all_text[i] = text

    chapters = find_chapters_from_toc(all_text, total)
    if not chapters:
        chapters = find_chapters_by_pattern(all_text, total)

    create_chapter_files(all_text, chapters, total, output_dir)
```

### Step 2B: Scanned PDF Extraction (OCR)

```python
import fitz
import numpy as np
import easyocr
import json, os, re, time

def extract_scanned_pdf(pdf_path, output_dir):
    cache_file = os.path.join(output_dir, 'ocr_cache.json')
    cache = load_cache(cache_file)

    reader = easyocr.Reader(['ch_sim', 'en'], gpu=False)
    doc = fitz.open(pdf_path)
    total = len(doc)

    for i in range(total):
        key = str(i)
        if key in cache:
            continue

        page = doc[i]
        pix = page.get_pixmap(dpi=200)
        img = np.frombuffer(pix.samples, dtype=np.uint8).reshape(
            pix.height, pix.width, pix.n)
        if pix.n == 4:
            img = img[:, :, :3]

        results = reader.readtext(img)
        results_sorted = sorted(results, key=lambda x: x[0][0][1])
        text_lines = [text for _, text, conf in results_sorted if conf > 0.3]
        cache[key] = '\n'.join(text_lines)

        if (i + 1) % 10 == 0:
            save_cache(cache_file, cache)
            print(f'  Progress: {i+1}/{total}')

    save_cache(cache_file, cache)
    doc.close()
    return cache
```

### Step 3: Chapter Detection

**Method A: Parse TOC pages** (preferred for scanned PDFs)

Read the TOC pages (usually first 10-30 pages) and look for lines like:
```
第1章 SaaS基础知识 ...... 3
第2章 产品经理素养 ...... 23
```

Extract chapter titles and their page numbers to determine chapter boundaries.

**Method B: Pattern matching**

```python
chapter_pattern = re.compile(r'^(第[一二三四五六七八九十百零\d]+章)\s*(.*)')
```

Scan each page's first few lines. If a match is found, mark it as a chapter start.

**Important**: For scanned PDFs, OCR may detect page headers/footers as chapter titles. Always verify by checking:
1. The match appears as a prominent heading (large text, centered)
2. Not on every page (rules out running headers)
3. Cross-reference with TOC pages when available

### Step 4: Create Chapter Files

```python
def create_chapter_files(cache, chapters, total_pages, output_dir):
    for title, start, end in chapters:
        parts = []
        for pg in range(start, end):
            key = str(pg)
            if key in cache and cache[key].strip():
                parts.append(cache[key])

        content = '\n\n'.join(parts)
        safe_title = re.sub(r'[<>:"/\\|?*]', '', title)
        outpath = os.path.join(output_dir, f'{safe_title}.md')
        with open(outpath, 'w', encoding='utf-8') as f:
            f.write(f'# {title}\n\n{content}')
```

## Chapter Definition Format

```python
chapters = [
    ('前言与推荐序', 0, 16),       # (title, start_page_0indexed, end_page_exclusive)
    ('自序', 17, 20),
    ('目录', 21, 28),
    ('第01章-基础知识', 29, 50),
    ('第02章-核心技能', 51, 82),
    # ...
]
```

## Cache Management

For OCR processing (which can take 10-60 minutes), always use a JSON cache file:
- Save progress every 10 pages
- Resume from cache on restart
- Delete cache after chapter files are created (optional)

## Error Handling

- Empty pages: Skip silently, don't include in output
- OCR low confidence: Filter with `conf > 0.3` threshold
- Encoding issues: Always use `encoding='utf-8'`
- Large PDFs: Process at 200 DPI for OCR balance of speed/accuracy

## Usage Example

User says: "提取这本书的PDF内容，按章节分文档"

1. Ask user for PDF path
2. Detect PDF type (text vs scanned)
3. Extract text (direct or OCR)
4. Find TOC / chapter boundaries
5. Create per-chapter `.md` files in the PDF's directory
6. Report results with file list and char counts
