#!/usr/bin/env python3
"""
PDF内容提取脚本（文字层可用）
使用 pdfplumber 提取文字内容
"""

import pdfplumber
import sys
import json
import os

def extract_text_from_pdf(pdf_path, start_page=0, end_page=None):
    """
    从PDF提取文字内容
    
    Args:
        pdf_path: PDF文件路径
        start_page: 开始页码（从0开始）
        end_page: 结束页码（None表示到最后一页）
    
    Returns:
        dict: {
            'pages': list of page content,
            'metadata': dict
        }
    """
    try:
        with pdfplumber.open(pdf_path) as pdf:
            total_pages = len(pdf.pages)
            
            if end_page is None:
                end_page = total_pages
            
            # 确保页码范围有效
            start_page = max(0, min(start_page, total_pages - 1))
            end_page = max(start_page + 1, min(end_page, total_pages))
            
            pages_content = []
            
            for i in range(start_page, end_page):
                page = pdf.pages[i]
                text = page.extract_text()
                
                # 提取图片信息
                images = []
                for img in page.images:
                    images.append({
                        'x0': img.get('x0'),
                        'y0': img.get('y0'),
                        'x1': img.get('x1'),
                        'y1': img.get('y1'),
                        'width': img.get('width'),
                        'height': img.get('height')
                    })
                
                pages_content.append({
                    'page_number': i + 1,
                    'text': text.strip() if text else '',
                    'images_count': len(images),
                    'images': images[:5] if images else [],  # 只保留前5个图片信息
                    'width': page.width,
                    'height': page.height
                })
            
            return {
                'pdf_path': pdf_path,
                'total_pages': total_pages,
                'extracted_pages': len(pages_content),
                'start_page': start_page + 1,
                'end_page': end_page,
                'pages': pages_content,
                'metadata': {
                    'extractor': 'pdfplumber',
                    'timestamp': datetime.now().isoformat()
                }
            }
    
    except Exception as e:
        return {
            'error': str(e),
            'pdf_path': pdf_path
        }

def save_extracted_content(content, output_dir, batch_name):
    """
    保存提取的内容到文件
    
    Args:
        content: 提取的内容
        output_dir: 输出目录
        batch_name: 批次名称（如 'batch_1-50'）
    """
    os.makedirs(output_dir, exist_ok=True)
    
    # 保存JSON格式
    json_path = os.path.join(output_dir, f'{batch_name}.json')
    with open(json_path, 'w', encoding='utf-8') as f:
        json.dump(content, f, indent=2, ensure_ascii=False)
    
    # 保存纯文本格式
    text_path = os.path.join(output_dir, f'{batch_name}.txt')
    with open(text_path, 'w', encoding='utf-8') as f:
        for page in content.get('pages', []):
            f.write(f"\n{'='*60}\n")
            f.write(f"第 {page['page_number']} 页\n")
            f.write(f"{'='*60}\n\n")
            f.write(page['text'])
            f.write("\n")
    
    return {
        'json_path': json_path,
        'text_path': text_path
    }

if __name__ == '__main__':
    from datetime import datetime
    
    if len(sys.argv) < 2:
        print("Usage: python pdf_extractor.py <pdf_path> [start_page] [end_page]")
        sys.exit(1)
    
    pdf_path = sys.argv[1]
    start_page = int(sys.argv[2]) if len(sys.argv) > 2 else 0
    end_page = int(sys.argv[3]) if len(sys.argv) > 3 else None
    
    result = extract_text_from_pdf(pdf_path, start_page, end_page)
    print(json.dumps(result, indent=2, ensure_ascii=False))