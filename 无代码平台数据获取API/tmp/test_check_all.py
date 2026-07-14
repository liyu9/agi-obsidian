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
print('contains="牛" - 检查所有数据的title字段')
print('='*60)
filter_test = {'and': [{'field': FIELD_PRODUCT, 'query': {'contains': '牛'}}]}
result = query_huoban(TABLE_ID, filter_test)
items = result.get('data', {}).get('items', [])

print(f'总匹配数量: {len(items)}')
print()

# 检查所有数据的title
print('所有匹配的title:')
for i, item in enumerate(items, 1):
    title = item.get('title', '')
    has_niu = '牛' in title
    print(f'{i}. {"✅" if has_niu else "❌"} {title}')

print()
print('='*60)
print('结论:')
print('='*60)

title_with_niu = sum(1 for item in items if '牛' in str(item.get('title', '')))
print(f'title包含"牛"的数量: {title_with_niu}/{len(items)}')
