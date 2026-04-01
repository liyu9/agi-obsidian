#!/usr/bin/env python3
"""
批次处理管理脚本
管理PDF的分批次提取（50页/批）
"""

import sys
import json
import os
from datetime import datetime

def calculate_batches(total_pages, batch_size=50):
    """
    计算批次划分
    
    Args:
        total_pages: 总页数
        batch_size: 每批次页数
    
    Returns:
        list: 批次列表
    """
    batches = []
    for i in range(0, total_pages, batch_size):
        start = i
        end = min(i + batch_size, total_pages)
        batch_num = i // batch_size + 1
        batches.append({
            'batch_number': batch_num,
            'start_page': start,
            'end_page': end,
            'page_count': end - start,
            'name': f'batch_{start+1}-{end}'
        })
    
    return batches

def generate_update_plan(pdf_path, pdf_type, total_pages, batch_size=50):
    """
    生成更新计划
    
    Args:
        pdf_path: PDF路径
        pdf_type: PDF类型（'text' or 'scanned'）
        total_pages: 总页数
        batch_size: 每批次页数
    
    Returns:
        dict: 更新计划
    """
    batches = calculate_batches(total_pages, batch_size)
    
    plan = {
        'pdf_path': pdf_path,
        'pdf_type': pdf_type,
        'total_pages': total_pages,
        'batch_size': batch_size,
        'total_batches': len(batches),
        'created_at': datetime.now().isoformat(),
        'batches': batches,
        'recommendation': {
            'extractor': 'pdfplumber' if pdf_type == 'text' else 'EasyOCR',
            'estimated_time': f'{len(batches) * 5} 分钟（预估）',
            'notes': '每批次处理前需用户确认'
        }
    }
    
    return plan

def save_plan(plan, output_dir):
    """
    保存更新计划
    
    Args:
        plan: 更新计划
        output_dir: 输出目录
    """
    os.makedirs(output_dir, exist_ok=True)
    
    plan_path = os.path.join(output_dir, 'update_plan.json')
    with open(plan_path, 'w', encoding='utf-8') as f:
        json.dump(plan, f, indent=2, ensure_ascii=False)
    
    # 生成Markdown格式的计划文档
    md_path = os.path.join(output_dir, 'update_plan.md')
    with open(md_path, 'w', encoding='utf-8') as f:
        f.write(f"# PDF知识提取更新计划\n\n")
        f.write(f"**PDF路径**: `{plan['pdf_path']}`\n\n")
        f.write(f"**PDF类型**: {plan['pdf_type']}\n\n")
        f.write(f"**总页数**: {plan['total_pages']} 页\n\n")
        f.write(f"**批次大小**: {plan['batch_size']} 页/批\n\n")
        f.write(f"**总批次**: {plan['total_batches']} 批\n\n")
        f.write(f"**推荐工具**: {plan['recommendation']['extractor']}\n\n")
        f.write(f"**预估时间**: {plan['recommendation']['estimated_time']}\n\n")
        f.write(f"---\n\n")
        f.write(f"## 批次详情\n\n")
        
        for batch in plan['batches']:
            f.write(f"### 批次 {batch['batch_number']}: {batch['name']}\n\n")
            f.write(f"- **页码范围**: 第 {batch['start_page']+1} - {batch['end_page']} 页\n")
            f.write(f"- **页数**: {batch['page_count']} 页\n")
            f.write(f"- **状态**: ⏳ 待处理\n\n")
        
        f.write(f"---\n\n")
        f.write(f"**生成时间**: {plan['created_at']}\n")
    
    return {
        'json_path': plan_path,
        'md_path': md_path
    }

if __name__ == '__main__':
    if len(sys.argv) < 3:
        print("Usage: python batch_processor.py <pdf_path> <total_pages> [pdf_type] [batch_size]")
        print("Example: python batch_processor.py book.pdf 300 text 50")
        sys.exit(1)
    
    pdf_path = sys.argv[1]
    total_pages = int(sys.argv[2])
    pdf_type = sys.argv[3] if len(sys.argv) > 3 else 'text'
    batch_size = int(sys.argv[4]) if len(sys.argv) > 4 else 50
    
    plan = generate_update_plan(pdf_path, pdf_type, total_pages, batch_size)
    
    # 输出到控制台
    print(json.dumps(plan, indent=2, ensure_ascii=False))