#!/usr/bin/env python3
"""
PDF OCR识别脚本（扫描件）
使用 EasyOCR 进行文字识别
"""

import sys
import json
import os
from PIL import Image
import pdf2image

try:
    import easyocr
except ImportError:
    print("Error: EasyOCR not installed. Run: pip install easyocr")
    sys.exit(1)

def ocr_pdf_pages(pdf_path, start_page=0, end_page=None, languages=['ch_sim', 'en']):
    """
    对PDF页面进行OCR识别
    
    Args:
        pdf_path: PDF文件路径
        start_page: 开始页码（从0开始）
        end_page: 结束页码
        languages: OCR语言列表
    
    Returns:
        dict: OCR结果
    """
    try:
        # 初始化OCR reader
        reader = easyocr.Reader(languages, gpu=False)  # CPU模式
        
        # 转换PDF为图片
        print(f"正在转换PDF页面为图片...")
        images = pdf2image.convert_from_path(
            pdf_path,
            first_page=start_page + 1,
            last_page=end_page if end_page else None,
            dpi=200  # 适当的DPI保证识别质量
        )
        
        pages_content = []
        
        for idx, image in enumerate(images):
            page_number = start_page + idx + 1
            print(f"正在OCR识别第 {page_number} 页...")
            
            # OCR识别
            results = reader.readtext(image)
            
            # 组织文字内容
            text_lines = []
            for (bbox, text, confidence) in results:
                if confidence > 0.5:  # 只保留置信度>0.5的结果
                    text_lines.append({
                        'text': text,
                        'confidence': confidence,
                        'bbox': bbox
                    })
            
            # 按位置排序（从上到下）
            text_lines.sort(key=lambda x: x['bbox'][0][1])
            
            # 合并文字
            full_text = '\n'.join([line['text'] for line in text_lines])
            
            pages_content.append({
                'page_number': page_number,
                'text': full_text,
                'ocr_lines': text_lines,
                'avg_confidence': sum([l['confidence'] for l in text_lines]) / len(text_lines) if text_lines else 0
            })
        
        return {
            'pdf_path': pdf_path,
            'total_pages_extracted': len(pages_content),
            'start_page': start_page + 1,
            'end_page': start_page + len(images),
            'pages': pages_content,
            'ocr_engine': 'EasyOCR',
            'languages': languages
        }
    
    except Exception as e:
        return {
            'error': str(e),
            'pdf_path': pdf_path
        }

if __name__ == '__main__':
    if len(sys.argv) < 2:
        print("Usage: python pdf_ocr.py <pdf_path> [start_page] [end_page]")
        print("Example: python pdf_ocr.py book.pdf 0 50")
        sys.exit(1)
    
    pdf_path = sys.argv[1]
    start_page = int(sys.argv[2]) if len(sys.argv) > 2 else 0
    end_page = int(sys.argv[3]) if len(sys.argv) > 3 else None
    
    # 默认支持中文和英文
    languages = ['ch_sim', 'en']
    
    result = ocr_pdf_pages(pdf_path, start_page, end_page, languages)
    print(json.dumps(result, indent=2, ensure_ascii=False))