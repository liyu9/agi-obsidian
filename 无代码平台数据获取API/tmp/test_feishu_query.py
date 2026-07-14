import requests
import json

# 飞书应用配置
APP_ID = "cli_a9154bd01c3a5bdb"
APP_SECRET = "H4cut9LP9T9xKShp5VJMEcRMug4qdlLy"

# 多维表格配置
APP_TOKEN = "SY2bwgD36iudpJk42a7cfIwQnPg"
TABLE_ID = "tbl5WSbuZY2Hq5Gc"
VIEW_ID = "vewGCGaV3O"


def get_tenant_access_token():
    """获取 tenant_access_token"""
    url = "https://open.feishu.cn/open-apis/auth/v3/tenant_access_token/internal"
    headers = {"Content-Type": "application/json"}
    data = {"app_id": APP_ID, "app_secret": APP_SECRET}

    response = requests.post(url, headers=headers, json=data)
    result = response.json()

    if result.get("code") == 0:
        return result.get("tenant_access_token")
    else:
        raise Exception(f"获取Token失败: {result}")


def search_records(token):
    """查询多维表格数据"""
    url = f"https://open.feishu.cn/open-apis/bitable/v1/apps/{APP_TOKEN}/tables/{TABLE_ID}/records/search"

    headers = {
        "Authorization": f"Bearer {token}",
        "Content-Type": "application/json"
    }

    body = {
        "view_id": VIEW_ID,
        "filter": {
            "conjunction": "and",
            "children": [
                {
                    "conjunction": "or",
                    "conditions": [
                        {
                            "field_name": "知识内容",
                            "operator": "contains",
                            "value": ["客户诉求"]
                        },
                        {
                            "field_name": "知识内容",
                            "operator": "contains",
                            "value": ["24"]
                        }
                    ]
                },
                {
                    "conjunction": "or",
                    "conditions": [
                        {
                            "field_name": "知识标题",
                            "operator": "contains",
                            "value": ["投诉"]
                        },
                        {
                            "field_name": "知识标题",
                            "operator": "contains",
                            "value": ["售后"]
                        }
                    ]
                }
            ]
        },
        "page_size": 100
    }

    response = requests.post(url, headers=headers, json=body)
    return response.json()


def main():
    print("=" * 60)
    print("飞书多维表格数据查询")
    print("=" * 60)

    # 1. 获取 Token
    print("\n[1/2] 获取 Access Token...")
    token = get_tenant_access_token()
    print(f"✅ Token 获取成功: {token[:20]}...")

    # 2. 查询数据
    print("\n[2/2] 查询数据...")
    print("筛选条件:")
    print("  - 知识内容 contains [客户诉求, 24]")
    print("  - 知识标题 contains [投诉, 售后]")
    print()

    result = search_records(token)

    # 3. 输出结果
    print("=" * 60)
    print("查询结果")
    print("=" * 60)

    if result.get("code") == 0:
        items = result.get("data", {}).get("items", [])
        total = len(items)
        has_more = result.get("data", {}).get("has_more", False)

        print(f"\n✅ 查询成功！共返回 {total} 条数据")
        if has_more:
            print("⚠️  还有更多数据（可通过 page_token 分页获取）")

        print("\n" + "-" * 60)
        for i, item in enumerate(items, 1):
            record_id = item.get("record_id")
            fields = item.get("fields", {})
            title = fields.get("知识标题", "无标题")

            print(f"\n【{i}】记录ID: {record_id}")
            print(f"    知识标题: {title}")

            # 打印关键字段
            for field_name, field_value in fields.items():
                if field_name != "知识标题":
                    if isinstance(field_value, str) and len(field_value) > 100:
                        field_value = field_value[:100] + "..."
                    print(f"    {field_name}: {field_value}")

        print("\n" + "=" * 60)

        # 保存完整结果到文件
        output_file = "feishu_query_result.json"
        with open(output_file, "w", encoding="utf-8") as f:
            json.dump(result, f, ensure_ascii=False, indent=2)
        print(f"\n📁 完整结果已保存到: {output_file}")

    else:
        print(f"\n❌ 查询失败: {result}")


if __name__ == "__main__":
    main()
