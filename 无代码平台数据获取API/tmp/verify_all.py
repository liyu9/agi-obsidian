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
print('验证1: 数值字段操作符 (gt/gte/lt/lte)')
print('='*60)

# 数值字段ID
FIELD_STOCK = '2200000604355434'  # 库存数量
FIELD_AVAILABLE = '2200000604355428'  # 可用数量

# 先查看数值字段的值
print('\n1.1 查看数值字段的值范围')
result = query_huoban(TABLE_ID)
items = result.get('data', {}).get('items', [])
stocks = []
for item in items:
    stock = item['fields'].get(FIELD_STOCK, 0)
    if stock:
        stocks.append(stock)
print(f'库存值: {sorted(stocks)[:10]}')
print(f'最小: {min(stocks)}, 最大: {max(stocks)}')

# 测试 gt
print('\n1.2 测试 gt (大于100)')
filter_gt = {'and': [{'field': FIELD_STOCK, 'query': {'gt': 100}}]}
result = query_huoban(TABLE_ID, filter_gt)
items = result.get('data', {}).get('items', [])
print(f'gt=100 返回: {len(items)} 条')
if items:
    stock_values = [item['fields'].get(FIELD_STOCK, 0) for item in items[:5]]
    print(f'前5条库存值: {stock_values}')

# 测试 gte
print('\n1.3 测试 gte (大于等于100)')
filter_gte = {'and': [{'field': FIELD_STOCK, 'query': {'gte': 100}}]}
result = query_huoban(TABLE_ID, filter_gte)
items = result.get('data', {}).get('items', [])
print(f'gte=100 返回: {len(items)} 条')
if items:
    stock_values = [item['fields'].get(FIELD_STOCK, 0) for item in items[:5]]
    print(f'前5条库存值: {stock_values}')

# 测试 lt
print('\n1.4 测试 lt (小于100)')
filter_lt = {'and': [{'field': FIELD_STOCK, 'query': {'lt': 100}}]}
result = query_huoban(TABLE_ID, filter_lt)
items = result.get('data', {}).get('items', [])
print(f'lt=100 返回: {len(items)} 条')
if items:
    stock_values = [item['fields'].get(FIELD_STOCK, 0) for item in items[:5]]
    print(f'前5条库存值: {stock_values}')

# 测试 lte
print('\n1.5 测试 lte (小于等于100)')
filter_lte = {'and': [{'field': FIELD_STOCK, 'query': {'lte': 100}}]}
result = query_huoban(TABLE_ID, filter_lte)
items = result.get('data', {}).get('items', [])
print(f'lte=100 返回: {len(items)} 条')
if items:
    stock_values = [item['fields'].get(FIELD_STOCK, 0) for item in items[:5]]
    print(f'前5条库存值: {stock_values}')

print('\n' + '='*60)
print('验证2: 嵌套AND+OR条件')
print('='*60)

# 测试 AND + OR 嵌套
print('\n2.1 测试 AND + OR 嵌套')
print('条件: (商品名称包含"牛" OR 商品名称包含"饼干") AND 仓库="一号仓库"')
WAREHOUSE_FIELD = '2200000604356157'
WAREHOUSE_ID = '2300019805958457'

filter_nested = {
    'and': [
        {
            'or': [
                {'field': FIELD_PRODUCT, 'query': {'in': ['牛', '饼干']}}
            ]
        },
        {'field': WAREHOUSE_FIELD, 'query': {'eq': [WAREHOUSE_ID]}}
    ]
}
result = query_huoban(TABLE_ID, filter_nested)
items = result.get('data', {}).get('items', [])
print(f'返回: {len(items)} 条')
for item in items[:5]:
    name = item['fields'].get(FIELD_PRODUCT, '')
    warehouse = item['fields'].get(WAREHOUSE_FIELD, {})
    warehouse_name = warehouse.get('title', '') if isinstance(warehouse, dict) else ''
    print(f'  - {name} | {warehouse_name}')

print('\n2.2 测试三层嵌套')
print('条件: (商品名称包含"牛" OR 商品名称包含"饼干") AND (仓库="一号仓库" OR 仓库="二号仓库")')
filter_deep_nested = {
    'and': [
        {
            'or': [
                {'field': FIELD_PRODUCT, 'query': {'in': ['牛', '饼干']}}
            ]
        },
        {
            'or': [
                {'field': WAREHOUSE_FIELD, 'query': {'eq': [WAREHOUSE_ID]}},
                # 假设二号仓库ID
                {'field': WAREHOUSE_FIELD, 'query': {'eq': ['2300019805958458']}}
            ]
        }
    ]
}
result = query_huoban(TABLE_ID, filter_deep_nested)
items = result.get('data', {}).get('items', [])
print(f'返回: {len(items)} 条')
for item in items[:5]:
    name = item['fields'].get(FIELD_PRODUCT, '')
    print(f'  - {name}')

print('\n' + '='*60)
print('验证3: 日期动态变量')
print('='*60)

print('\n3.1 测试 today')
filter_today = {'and': [{'field': 'created_on', 'query': {'eq': 'today'}}]}
result = query_huoban(TABLE_ID, filter_today)
print(f'eq=today 返回: {result}')

print('\n3.2 测试 this_week')
filter_week = {'and': [{'field': 'created_on', 'query': {'gte': 'this_week'}}]}
result = query_huoban(TABLE_ID, filter_week)
items = result.get('data', {}).get('items', [])
print(f'gte=this_week 返回: {len(items)} 条')

print('\n' + '='*60)
print('验证4: 别名机制')
print('='*60)

# 测试使用别名替代field_id
print('\n4.1 测试使用field_id vs 字段名')
# 当前使用的是field_id: 2200000604356149
print('field_id方式: 2200000604356149')
result = query_huoban(TABLE_ID, {'and': [{'field': FIELD_PRODUCT, 'query': {'eq': '红烧牛肉面'}}]})
items = result.get('data', {}).get('items', [])
print(f'使用field_id返回: {len(items)} 条')

print('\n4.2 尝试使用字段名替代field_id')
print('字段名方式: 商品名称')
result = query_huoban(TABLE_ID, {'and': [{'field': '商品名称', 'query': {'eq': '红烧牛肉面'}}]})
items = result.get('data', {}).get('items', [])
print(f'使用字段名返回: {len(items)} 条')
if result.get('code') != 0:
    print(f'❌ 字段名不生效: {result.get("message")}')
else:
    print(f'✅ 字段名生效')

print('\n' + '='*60)
print('验证5: 错误码测试')
print('='*60)

print('\n5.1 测试无效的table_id (应该触发3500002)')
result = query_huoban('99999999999999')
print(f'code: {result.get("code")}, message: {result.get("message")}')

print('\n5.2 测试无效的field_id (应该触发什么错误?)')
filter_invalid_field = {'and': [{'field': '999999999999', 'query': {'eq': 'test'}}]}
result = query_huoban(TABLE_ID, filter_invalid_field)
items = result.get('data', {}).get('items', [])
print(f'无效field_id返回: {len(items)} 条')
if result.get('code') != 0:
    print(f'code: {result.get("code")}, message: {result.get("message")}')
else:
    print(f'✅ 无效field_id被忽略，返回全部数据')

print('\n5.3 测试缺少必需参数')
result = query_huoban('')
print(f'空table_id返回: {result}')

print('\n' + '='*60)
print('总结')
print('='*60)
