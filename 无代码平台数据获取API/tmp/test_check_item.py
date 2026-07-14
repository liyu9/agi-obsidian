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
print('contains="牛" - 检查其他数据是否有隐藏的"牛"')
print('='*60)
filter_test = {'and': [{'field': FIELD_PRODUCT, 'query': {'contains': '牛'}}]}
result = query_huoban(TABLE_ID, filter_test)
items = result.get('data', {}).get('items', [])

# 检查第12条：速冻水饺500g/袋
item = items[11]  # 第12条
print(f'检查第12条数据: {item.get("title")}')
print()

fields = item['fields']
for field_id, value in fields.items():
    value_str = str(value)
    if '牛' in value_str or '饺' in value_str:
        print(f'✅ 字段 {field_id} 包含 "牛" 或 "饺":')
        print(f'   {json.dumps(value, ensure_ascii=False)}')
        print()
