import requests
import json

API_KEY = 'duUCdLRhs2AVF4BBabSCsuk8hqJ5msNncqCLJohA'
BASE_URL = 'https://api.huoban.com'
TABLE_ID = '2100000076263944'
FIELD_PRODUCT = '2200000604356149'
FIELD_STOCK = '2200000604355434'
WAREHOUSE_FIELD = '2200000604356157'
WAREHOUSE_ID = '2300019805958457'

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
print('验证: 数值字段操作符')
print('='*60)

# gt测试
print('\n1. gt (大于100)')
result = query_huoban(TABLE_ID, {'and': [{'field': FIELD_STOCK, 'query': {'gt': 100}}]})
items = result.get('data', {}).get('items', [])
print(f'gt=100: {len(items)}条, 库存值: {[i["fields"].get(FIELD_STOCK) for i in items[:5]]}')

# gte测试
print('\n2. gte (大于等于100)')
result = query_huoban(TABLE_ID, {'and': [{'field': FIELD_STOCK, 'query': {'gte': 100}}]})
items = result.get('data', {}).get('items', [])
print(f'gte=100: {len(items)}条')

# lt测试
print('\n3. lt (小于100)')
result = query_huoban(TABLE_ID, {'and': [{'field': FIELD_STOCK, 'query': {'lt': 100}}]})
items = result.get('data', {}).get('items', [])
print(f'lt=100: {len(items)}条, 库存值: {[i["fields"].get(FIELD_STOCK) for i in items[:5]]}')

# lte测试
print('\n4. lte (小于等于100)')
result = query_huoban(TABLE_ID, {'and': [{'field': FIELD_STOCK, 'query': {'lte': 100}}]})
items = result.get('data', {}).get('items', [])
print(f'lte=100: {len(items)}条')

print('\n' + '='*60)
print('验证: 嵌套AND+OR条件')
print('='*60)

# AND + OR嵌套
print('\n5. AND + OR嵌套')
filter_nested = {
    'and': [
        {'or': [{'field': FIELD_PRODUCT, 'query': {'in': ['牛', '饼干']}}]},
        {'field': WAREHOUSE_FIELD, 'query': {'eq': [WAREHOUSE_ID]}}
    ]
}
result = query_huoban(TABLE_ID, filter_nested)
items = result.get('data', {}).get('items', [])
print(f'(名称包含牛或饼干) AND (一号仓库): {len(items)}条')
for item in items[:3]:
    name = item['fields'].get(FIELD_PRODUCT)
    print(f'  - {name}')
