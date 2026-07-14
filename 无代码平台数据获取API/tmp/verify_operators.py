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
print('验证1: nin 操作符 - 不包含')
print('='*60)
# nin: 匹配不包含"牛"的数据
filter_nin = {'and': [{'field': FIELD_PRODUCT, 'query': {'nin': ['牛', '饼干']}}]}
result = query_huoban(TABLE_ID, filter_nin)
items = result.get('data', {}).get('items', [])
print(f'查询条件: nin=["牛", "饼干"]')
print(f'匹配数量: {len(items)}')
for item in items[:5]:
    name = item['fields'].get(FIELD_PRODUCT, '')
    print(f'  - {name}')
print()

print('='*60)
print('验证2: ne 操作符 - 不等于')
print('='*60)
# ne: 匹配不等于"红烧牛肉面"的数据
filter_ne = {'and': [{'field': FIELD_PRODUCT, 'query': {'ne': '红烧牛肉面'}}]}
result = query_huoban(TABLE_ID, filter_ne)
items = result.get('data', {}).get('items', [])
print(f'查询条件: ne="红烧牛肉面"')
print(f'匹配数量: {len(items)}')
has_niuxiang = any('牛肉' in item['fields'].get(FIELD_PRODUCT, '') for item in items)
print(f'结果中是否包含"牛肉": {"❌ 是" if has_niuxiang else "✅ 否"}')
if items:
    print(f'前3条: {[item["fields"].get(FIELD_PRODUCT, "") for item in items[:3]]}')
print()

print('='*60)
print('验证3: em 操作符 - 为空')
print('='*60)
# em: 匹配商品名称为空的字段
filter_em = {'and': [{'field': FIELD_PRODUCT, 'query': {'em': True}}]}
result = query_huoban(TABLE_ID, filter_em)
print(f'查询条件: em=true')
print(f'返回结果: {result}')
print()

print('='*60)
print('验证4: nem 操作符 - 不为空')
print('='*60)
# nem: 匹配商品名称不为空
filter_nem = {'and': [{'field': FIELD_PRODUCT, 'query': {'nem': True}}]}
result = query_huoban(TABLE_ID, filter_nem)
items = result.get('data', {}).get('items', [])
print(f'查询条件: nem=true')
print(f'匹配数量: {len(items)}')
print()

print('='*60)
print('验证5: order 排序功能')
print('='*60)
# order: 按创建时间排序
order_by = {
    "field_id": "created_on",
    "type": "desc"
}
result = query_huoban(TABLE_ID, order=order_by, limit=5)
items = result.get('data', {}).get('items', [])
print(f'查询条件: order by created_on desc')
print(f'匹配数量: {len(items)}')
if result.get('code') != 0:
    print(f'❌ 排序失败: {result.get("message")}')
else:
    print(f'✅ 排序成功')
    for item in items[:3]:
        title = item.get('title', '')
        created = item.get('created_on', '')
        print(f'  - {title} (创建时间: {created})')
print()

print('='*60)
print('验证6: nin 实际效果')
print('='*60)
# nin 实际匹配什么？
filter_nin2 = {'and': [{'field': FIELD_PRODUCT, 'query': {'nin': ['牛肉']}}]}
result = query_huoban(TABLE_ID, filter_nin2)
items = result.get('data', {}).get('items', [])
print(f'查询条件: nin=["牛肉"]')
print(f'匹配数量: {len(items)}')
has_rouniu = any('牛肉' in item['fields'].get(FIELD_PRODUCT, '') for item in items)
print(f'结果中是否还包含"牛肉": {"❌ 是" if has_rouniu else "✅ 否"}')
print(f'前5条: {[item["fields"].get(FIELD_PRODUCT, "")[:10] for item in items[:5]]}')
