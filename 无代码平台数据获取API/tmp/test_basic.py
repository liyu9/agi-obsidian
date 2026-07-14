import requests
import json

API_KEY = 'duUCdLRhs2AVF4BBabSCsuk8hqJ5msNncqCLJohA'
BASE_URL = 'https://api.huoban.com'
TABLE_ID = '2100000076263944'

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

print('测试1: 基础查询')
result = query_huoban(TABLE_ID)
print(f'返回类型: {type(result)}')
print(f'result: {result}')
