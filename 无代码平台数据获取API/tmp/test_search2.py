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

# 查看 contains 匹配到的数据，检查商品名称字段
print('='*60)
print('contains="牛" 匹配到的所有数据')
print('='*60)
filter_contains = {'and': [{'field': FIELD_PRODUCT, 'query': {'contains': '牛'}}]}
result_contains = query_huoban(TABLE_ID, filter_contains)
items_contains = result_contains.get('data', {}).get('items', [])
print(f'总匹配数量: {len(items_contains)}')
print()

print('商品名称包含"牛"的数据:')
count1 = 0
for item in items_contains:
    name = item['fields'].get(FIELD_PRODUCT, '')
    if '牛' in str(name):
        count1 += 1
        print(f'  {count1}. {name}')

print()
print('='*60)
print('in=["牛"] 匹配到的数据（只匹配商品名称）')
print('='*60)
filter_in = {'and': [{'field': FIELD_PRODUCT, 'query': {'in': ['牛']}}]}
result_in = query_huoban(TABLE_ID, filter_in)
items_in = result_in.get('data', {}).get('items', [])
print(f'总匹配数量: {len(items_in)}')
for item in items_in:
    name = item['fields'].get(FIELD_PRODUCT, '')
    print(f'  - {name}')
