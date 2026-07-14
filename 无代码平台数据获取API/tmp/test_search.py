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

# 测试1: eq - 精确匹配单个字
print('='*60)
print('测试1: eq - 精确匹配')
print('='*60)
filter_eq = {'and': [{'field': FIELD_PRODUCT, 'query': {'eq': '牛'}}]}
result_eq = query_huoban(TABLE_ID, filter_eq)
items_eq = result_eq.get('data', {}).get('items', [])
print(f'查询条件: eq="牛"')
print(f'匹配数量: {len(items_eq)}')
for item in items_eq[:3]:
    name = item['fields'].get(FIELD_PRODUCT, '')
    print(f'  - {name}')
print()

# 测试2: eq - 精确匹配完整值
print('='*60)
print('测试2: eq - 精确匹配完整值')
print('='*60)
filter_eq2 = {'and': [{'field': FIELD_PRODUCT, 'query': {'eq': '红烧牛肉面'}}]}
result_eq2 = query_huoban(TABLE_ID, filter_eq2)
items_eq2 = result_eq2.get('data', {}).get('items', [])
print(f'查询条件: eq="红烧牛肉面"')
print(f'匹配数量: {len(items_eq2)}')
for item in items_eq2[:3]:
    name = item['fields'].get(FIELD_PRODUCT, '')
    print(f'  - {name}')
print()

# 测试3: in - 包含多个值
print('='*60)
print('测试3: in - 包含多个值')
print('='*60)
filter_in = {'and': [{'field': FIELD_PRODUCT, 'query': {'in': ['牛', '饼干', '糖']}}]}
result_in = query_huoban(TABLE_ID, filter_in)
items_in = result_in.get('data', {}).get('items', [])
print('查询条件: in=["牛", "饼干", "糖"]')
print(f'匹配数量: {len(items_in)}')
for item in items_in[:5]:
    name = item['fields'].get(FIELD_PRODUCT, '')
    print(f'  - {name}')
print()

# 测试4: contains - 包含子串
print('='*60)
print('测试4: contains - 包含子串')
print('='*60)
filter_contains = {'and': [{'field': FIELD_PRODUCT, 'query': {'contains': '牛'}}]}
result_contains = query_huoban(TABLE_ID, filter_contains)
items_contains = result_contains.get('data', {}).get('items', [])
print('查询条件: contains="牛"')
print(f'匹配数量: {len(items_contains)}')
for item in items_contains[:5]:
    name = item['fields'].get(FIELD_PRODUCT, '')
    print(f'  - {name}')
