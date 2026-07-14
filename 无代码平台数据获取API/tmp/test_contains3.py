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
print('contains="牛" 匹配到的所有数据，检查title字段')
print('='*60)
filter_test = {'and': [{'field': FIELD_PRODUCT, 'query': {'contains': '牛'}}]}
result = query_huoban(TABLE_ID, filter_test)
items = result.get('data', {}).get('items', [])

print(f'总匹配数量: {len(items)}')
print()

for i, item in enumerate(items[:10], 1):
    title = item.get('title', '')
    fields = item['fields']
    product_name = fields.get(FIELD_PRODUCT, '')

    title_has_niu = '牛' in str(title)
    product_has_niu = '牛' in str(product_name)

    print(f'【{i}】')
    print(f'    title: {title}')
    print(f'    title包含"牛": {"✅" if title_has_niu else "❌"}')
    print(f'    商品名称: {product_name}')
    print(f'    商品名称包含"牛": {"✅" if product_has_niu else "❌"}')
    print()
