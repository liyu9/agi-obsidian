import requests
import json

# 伙伴云 API 配置
API_KEY = "duUCdLRhs2AVF4BBabSCsuk8hqJ5msNncqCLJohA"

# 表配置
TABLE_ID = "2100000076263944"  # 从URL获取: https://app.huoban.com/tables/2100000076263944
VIEW_ID = "3500000066135175"  # 从URL获取: ?viewId=3500000066135175

# 基础URL
BASE_URL = "https://api.huoban.com"


def list_tables(api_key, space_id=None):
    """获取表格列表"""
    url = f"{BASE_URL}/openapi/v1/table/list"

    headers = {
        "Open-Authorization": f"Bearer {api_key}",
        "Content-Type": "application/json"
    }

    body = {}
    if space_id:
        body["space_id"] = space_id

    print(f"\n请求URL: {url}")
    print(f"请求Body: {json.dumps(body, ensure_ascii=False)}")

    response = requests.post(url, headers=headers, json=body)
    return response.json()


def search_records(api_key, table_id, filter_conditions=None, limit=100, offset=0, view_id=None, with_field_config=0):
    """查询伙伴云数据"""
    url = f"{BASE_URL}/openapi/v1/item/list"

    headers = {
        "Open-Authorization": f"Bearer {api_key}",
        "Content-Type": "application/json"
    }

    body = {
        "table_id": table_id,
        "limit": limit,
        "offset": offset,
        "with_field_config": with_field_config
    }

    # 添加视图ID
    if view_id:
        body["view_id"] = view_id

    # 添加筛选条件
    if filter_conditions:
        body["filter"] = filter_conditions

    print(f"\n请求URL: {url}")
    print(f"请求Body: {json.dumps(body, ensure_ascii=False)}")

    response = requests.post(url, headers=headers, json=body)
    return response.json()


def build_filter(conditions):
    """
    构建筛选条件

    conditions: list of tuples - [(字段名, ["值1", "值2"]), ...]
    返回: filter对象
    """
    and_conditions = []
    for field_name, values in conditions:
        # 使用 in 操作符匹配多个值
        and_conditions.append({
            "field": field_name,
            "query": {"in": values}
        })

    return {"and": and_conditions}


def main():
    print("=" * 60)
    print("伙伴云数据查询")
    print("=" * 60)

    if API_KEY == "YOUR_HUOBAN_API_KEY":
        print("\n❌ 错误：请先配置你的 API Key")
        print("   修改 API_KEY 变量为你的实际伙伴云 API Key")
        return

    print(f"\n表ID: {TABLE_ID}")
    print(f"视图ID: {VIEW_ID}")

    # 第一步：获取表格列表，确认表ID
    print("\n[步骤1] 获取表格列表...")
    tables_result = list_tables(API_KEY)
    print("\n表格列表返回：")
    print(json.dumps(tables_result, ensure_ascii=False, indent=2)[:2000])

    # 第二步：添加筛选条件查询数据
    print("\n[步骤2] 应用筛选条件...")
    filter_conditions = {
        "and": [
            {
                "field": "2200000604356149",  # 商品名称
                "query": {
                    "in": ["牛", "饼干", "糖"]
                }
            },
            {
                "field": "2200000604356157",  # 仓库
                "query": {
                    "eq": ["2300019805958457"]  # 一号仓库的item_id
                }
            }
        ]
    }

    print("筛选条件:")
    print("  - 商品名称 in [牛, 饼干, 糖]")
    print("  - 仓库 = 一号仓库")
    print()

    result = search_records(API_KEY, TABLE_ID, filter_conditions, view_id=VIEW_ID)

    # 输出原始返回
    print("\n原始返回数据：")
    print(json.dumps(result, ensure_ascii=False, indent=2)[:2000])

    # 输出结果
    print("\n" + "=" * 60)
    print("查询结果")
    print("=" * 60)

    if result.get("code") != 0:
        print(f"\n❌ 查询失败: {result.get('message', result)}")
        return

    # 关键字段ID映射（从API返回中发现）
    field_mapping = {
        "2200000604356149": "商品名称",
        "2200000604356150": "规格",
        "2200000604356157": "仓库",
        "1192001103000000": "仓库编号",
        "2200000604355434": "库存数量",
        "2200000604355428": "可用数量",
        "2200000604356154": "安全库存",
        "2200000604356155": "最大库存"
    }

    items = result.get("data", {}).get("items", [])
    total = result.get("data", {}).get("total", 0)

    print(f"\n✅ 查询成功！共返回 {len(items)} 条数据")

    print("\n" + "-" * 80)
    print(f"{'序号':<6} {'商品名称':<15} {'规格':<12} {'仓库':<10} {'库存':<8} {'可用':<8}")
    print("-" * 80)

    for i, item in enumerate(items, 1):
        fields = item.get("fields", {})

        product_name = fields.get("2200000604356149", "")
        spec = fields.get("2200000604356150", "")
        warehouse = fields.get("2200000604356157", {})
        if isinstance(warehouse, dict):
            warehouse_name = warehouse.get("title", "")
        elif isinstance(warehouse, list) and len(warehouse) > 0:
            warehouse_name = warehouse[0].get("title", "") if isinstance(warehouse[0], dict) else str(warehouse[0])
        else:
            warehouse_name = str(warehouse) if warehouse else ""
        stock = fields.get("2200000604355434", 0)
        available = fields.get("2200000604355428", 0)

        print(f"{i:<6} {product_name:<15} {spec:<12} {warehouse_name:<10} {stock:<8} {available:<8}")

    print("=" * 80)

    # 保存完整结果
    output_file = "huoban_query_result.json"
    with open(output_file, "w", encoding="utf-8") as f:
        json.dump(result, f, ensure_ascii=False, indent=2)
    print(f"\n📁 完整结果已保存到: {output_file}")


if __name__ == "__main__":
    main()
