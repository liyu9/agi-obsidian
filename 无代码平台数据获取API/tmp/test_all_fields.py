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
print('检查 "松木蛋卷桌大号1.2m" 的所有字段')
print('='*60)
filter_test = {'and': [{'field': FIELD_PRODUCT, 'query': {'contains': '牛'}}]}
result = query_huoban(TABLE_ID, filter_test)
items = result.get('data', {}).get('items', [])

# 找 "松木蛋卷桌大号1.2m"
for item in items:
    title = item.get('title', '')
    if '松木蛋卷桌' in title:
        print(f'title: {title}')
        print()

        fields = item['fields']
        print(f'共 {len(fields)} 个字段:')
        print()

        for field_id, value in fields.items():
            value_str = json.dumps(value, ensure_ascii=False)
            if '牛' in value_str:
                print(f'✅ {field_id}: {value_str[:300]}')
            else:
                print(f'   {field_id}: {value_str[:100]}')
        break
