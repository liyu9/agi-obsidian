#!/usr/bin/env python3
"""
PDF类型检测脚本
检测PDF是文字层可用还是扫描件
"""

import pdfplumber
import sys
import json

def detect_pdf_type(pdf_path):
    """
    检测PDF类型
    
    Args:
        pdf_path: PDF文件路径
    
    Returns:
        dict: {
            'type': 'text' or 'scanned',
            'has_text_layer': bool,
            'sample_pages': list,
            'recommendation': str
        }
    """
    try:
        with pdfplumber.open(pdf_path) as pdf:
            # 检测前5页
            sample_pages = []
            text_found = 0
            
            for i in range(min(5, len(pdf.pages))):
                page = pdf.pages[i]
                text = page.extract_text()
                
                if text and len(text.strip()) > 50:
                    text_found += 1
                    sample_pages.append({
                        'page': i + 1,
                        'text_length': len(text.strip()),
                        'has_text': True
                    })
                else:
                    sample_pages.append({
                        'page': i + 1,
                        'text_length': 0,
                        'has_text': False
                    })
            
            # 判断类型
            if text_found >= 3:
                pdf_type = 'text'
                recommendation = '使用 pdfplumber 提取文字内容'
            else:
                pdf_type = 'scanned'
                recommendation = '使用 EasyOCR 进行 OCR 识别'
            
            return {
                'type': pdf_type,
                'has_text_layer': text_found >= 3,
                'total_pages': len(pdf.pages),
                'sample_pages': sample_pages,
                'recommendation': recommendation
            }
    
    except Exception as e:
        return {
            'error': str(e),
            'type': 'unknown',
            'recommendation': '请检查PDF文件是否损坏'
        }

if __name__ == '__main__':
    if len(sys.argv) < 2:
        print("Usage: python pdf_detector.py <pdf_path>")
        sys.exit(1)
    
    result = detect_pdf_type(sys.argv[1])
    print(json.dumps(result, indent=2, ensure_ascii=False))