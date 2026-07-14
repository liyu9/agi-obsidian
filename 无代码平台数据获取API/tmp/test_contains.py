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
print('测试1: filter中使用contains，指定字段')
print('='*60)
filter_test1 = {'and': [{'field': FIELD_PRODUCT, 'query': {'contains': '牛'}}]}
result1 = query_huoban(TABLE_ID, filter_test1)
items1 = result1.get('data', {}).get('items', [])
print(f'查询条件: field="{FIELD_PRODUCT}", contains="牛"')
print(f'匹配数量: {len(items1)}')
for item in items1[:5]:
    name = item['fields'].get(FIELD_PRODUCT, '')
    print(f'  - {name}')
print()

print('='*60)
print('测试2: 查看包含"牛"的所有数据的商品名称字段')
print('='*60)
count = 0
for item in items1:
    name = item['fields'].get(FIELD_PRODUCT, '')
    # 检查商品名称是否真的包含"牛"
    if '牛' in str(name):
        count += 1
        if count <= 10:
            print(f'  {count}. 商品名称={name}')
print(f'实际商品名称包含"牛"的数量: {count}')
