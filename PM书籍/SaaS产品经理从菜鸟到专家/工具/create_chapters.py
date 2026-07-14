import os, re, json, glob

output_dir = r'd:\360MoveData\Users\admin\Desktop\AgiP\AGI-obsidian\PM书籍\SaaS产品经理从菜鸟到专家'
cache_file = os.path.join(output_dir, 'ocr_cache.json')

with open(cache_file, 'r', encoding='utf-8') as f:
    cache = json.load(f)

for old_file in glob.glob(os.path.join(output_dir, '第*章*.md')):
    os.remove(old_file)
    print(f'Deleted: {os.path.basename(old_file)}')
for old_file in glob.glob(os.path.join(output_dir, '前言与目录.md')):
    os.remove(old_file)
    print(f'Deleted: {os.path.basename(old_file)}')

chapters = [
    ('前言与推荐序', 0, 16),
    ('自序', 17, 20),
    ('目录', 21, 28),
    ('第01章-SaaS基础知识', 29, 50),
    ('第02章-SaaS产品经理的6大素养', 51, 82),
    ('第03章-SaaS产品经理的5大技能', 83, 130),
    ('第04章-从0到1规划一款SaaS标准化产品', 131, 162),
    ('第05章-SaaS战略分析', 163, 244),
]

for title, start, end in chapters:
    content_parts = []
    for pg in range(start, end):
        key = str(pg)
        if key in cache and cache[key].strip():
            content_parts.append(cache[key])

    full_content = '\n\n'.join(content_parts)
    safe_title = re.sub(r'[<>:"/\\|?*]', '', title)
    outpath = os.path.join(output_dir, f'{safe_title}.md')
    with open(outpath, 'w', encoding='utf-8') as f:
        f.write(f'# {title}\n\n{full_content}')
    char_count = len(full_content)
    print(f'Created: {safe_title}.md ({char_count} chars, pages {start+1}-{end})')

print('\nDone!')
