import requests
import json

API_KEY = 'duUCdLRhs2AVF4BBabSCsuk8hqJ5msNncqCLJohA'
BASE_URL = 'https://api.huoban.com'
TABLE_ID = '2100000076263944'
FIELD_PRODUCT = '2200000604356149'

def query_huoban(table_id, filter_conditions=None, limit=100):
    url = f'{BASE_URL}/openapi/v1/item/list'
    headers = {
        'Open-Authorization': f'Bearer {API_KEY}',
        'Content-Type': 'application/json'
    }
    body = {
        'table_id': table_id,
        'limit': limit,
        'with_field_config': 0
    }
    if filter_conditions:
        body['filter'] = filter_conditions
    response = requests.post(url, headers=headers, json=body)
    return response.json()

print('='*60)
print('contains="牛" 匹配到的所有数据，检查各字段')
print('='*60)
filter_test = {'and': [{'field': FIELD_PRODUCT, 'query': {'contains': '牛'}}]}
result = query_huoban(TABLE_ID, filter_test)
items = result.get('data', {}).get('items', [])

print(f'总匹配数量: {len(items)}')
print()

for i, item in enumerate(items[:10], 1):
    fields = item['fields']
    print(f'\n【{i}】记录ID: {item.get("item_id")}')
    print(f'    title: {item.get("title", "")}')

    # 检查哪些字段包含"牛"
    matching_fields = []
    for field_id, value in fields.items():
        value_str = str(value)
        if '牛' in value_str:
            # 简化显示
            if len(value_str) > 50:
                value_str = value_str[:50] + '...'
            matching_fields.append(f'{field_id}: {value_str}')

    if matching_fields:
        print(f'    包含"牛"的字段:')
        for mf in matching_fields:
            print(f'      - {mf}')
    else:
        print(f'    ❌ 未找到包含"牛"的字段（奇怪！）')
