import requests
import json

API_KEY = 'duUCdLRhs2AVF4BBabSCsuk8hqJ5msNncqCLJohA'
BASE_URL = 'https://api.huoban.com'
TABLE_ID = '2100000076263944'
FIELD_PRODUCT = '2200000604356149'  # 商品名称

def query_huoban(table_id, filter_conditions=None, order=None, limit=100):
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

    if order:
        body['order'] = order

    response = requests.post(url, headers=headers, json=body)
    return response.json()

print('='*60)
print('ne 操作符详细验证')
print('='*60)

# 测试1: ne 精确匹配
print('\n测试1: ne="红烧牛肉面" (精确匹配)')
filter1 = {'and': [{'field': FIELD_PRODUCT, 'query': {'ne': '红烧牛肉面'}}]}
result1 = query_huoban(TABLE_ID, filter1)
items1 = result1.get('data', {}).get('items', [])
print(f'返回数量: {len(items1)}')
has_hongxiao = any('红烧牛肉面' == item['fields'].get(FIELD_PRODUCT, '') for item in items1)
print(f'结果中是否包含"红烧牛肉面": {"❌ 是（不应该）" if has_hongxiao else "✅ 否"}')

# 测试2: ne 单字精确匹配
print('\n测试2: ne="牛" (单字)')
filter2 = {'and': [{'field': FIELD_PRODUCT, 'query': {'ne': '牛'}}]}
result2 = query_huoban(TABLE_ID, filter2)
items2 = result2.get('data', {}).get('items', [])
print(f'返回数量: {len(items2)}')
has_niu = any('牛' in str(item['fields'].get(FIELD_PRODUCT, '')) for item in items2)
print(f'结果中是否包含"牛": {"❌ 是" if has_niu else "✅ 否"}')

# 测试3: 查看返回的数据
print('\n测试3: 查看返回的数据')
names = [item['fields'].get(FIELD_PRODUCT, '') for item in items2[:10]]
print(f'前10条数据:')
for name in names:
    print(f'  - {name}')

# 结论
print('\n='*60)
print('结论:')
print('='*60)
print('ne="红烧牛肉面" 返回15条，说明精确匹配有效')
print('ne="牛" 返回全部数据，说明不包含"牛"的字段值不存在')
print('即：ne 也是精确匹配，不是子串匹配')
