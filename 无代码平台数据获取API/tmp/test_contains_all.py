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
print('contains="牛" - 检查所有字段中哪里包含"牛"')
print('='*60)
filter_test = {'and': [{'field': FIELD_PRODUCT, 'query': {'contains': '牛'}}]}
result = query_huoban(TABLE_ID, filter_test)
items = result.get('data', {}).get('items', [])

print(f'总匹配数量: {len(items)}')
print()

# 检查第一个匹配的item
if items:
    item = items[0]
    fields = item['fields']

    print('检查第一条数据的所有字段:')
    print(f'title: {item.get("title", "")}')
    print()

    for field_id, value in fields.items():
        value_str = str(value)
        if '牛' in value_str:
            print(f'✅ 字段ID {field_id} 包含"牛":')
            if isinstance(value, dict):
                print(f'   {json.dumps(value, ensure_ascii=False)}')
            elif isinstance(value, list):
                print(f'   {json.dumps(value, ensure_ascii=False)}')
            else:
                print(f'   {value}')
            print()

    print('\n所有字段及其值:')
    for field_id, value in fields.items():
        if isinstance(value, dict):
            print(f'{field_id}: {json.dumps(value, ensure_ascii=False)[:100]}')
        elif isinstance(value, list):
            print(f'{field_id}: {json.dumps(value, ensure_ascii=False)[:100]}')
        else:
            print(f'{field_id}: {str(value)[:100]}')
