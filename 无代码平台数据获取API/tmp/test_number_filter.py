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
    url = "https://open.feishu.cn/open-apis/auth/v3/tenant_access_token/internal"
    headers = {"Content-Type": "application/json"}
    data = {"app_id": APP_ID, "app_secret": APP_SECRET}
    response = requests.post(url, headers=headers, json=data)
    return response.json().get("tenant_access_token")


def test_filter(token, name, filter_config):
    """测试单个筛选条件"""
    url = f"https://open.feishu.cn/open-apis/bitable/v1/apps/{APP_TOKEN}/tables/{TABLE_ID}/records/search"
    headers = {"Authorization": f"Bearer {token}", "Content-Type": "application/json"}

    body = {
        "view_id": VIEW_ID,
        "filter": filter_config,
        "page_size": 100
    }

    response = requests.post(url, headers=headers, json=body)
    result = response.json()

    print(f"\n【{name}】")
    print(f"  Filter: {json.dumps(filter_config, ensure_ascii=False)}")

    if result.get("code") == 0:
        items = result.get("data", {}).get("items", [])
        print(f"  ✅ 成功: 命中 {len(items)} 条")
        return items
    else:
        print(f"  ❌ 失败: {result.get('msg')}")
        print(f"     完整错误: {result}")
        return None


def main():
    print("=" * 70)
    print("测试纯数字筛选")
    print("=" * 70)

    token = get_tenant_access_token()
    print(f"Token: {token[:20]}...")

    # 测试1: "24" 单独
    test_filter(token, "测试1: 纯数字 '24'", {
        "conjunction": "and",
        "conditions": [
            {"field_name": "知识内容", "operator": "contains", "value": ["24"]}
        ]
    })

    # 测试2: "1" 单独
    test_filter(token, "测试2: 纯数字 '1'", {
        "conjunction": "and",
        "conditions": [
            {"field_name": "知识内容", "operator": "contains", "value": ["1"]}
        ]
    })

    # 测试3: "7" 单独
    test_filter(token, "测试3: 纯数字 '7'", {
        "conjunction": "and",
        "conditions": [
            {"field_name": "知识内容", "operator": "contains", "value": ["7"]}
        ]
    })

    # 测试4: "24" 和 "1" 一起（OR）
    test_filter(token, "测试4: OR ['24', '1']", {
        "conjunction": "or",
        "conditions": [
            {"field_name": "知识内容", "operator": "contains", "value": ["24"]},
            {"field_name": "知识内容", "operator": "contains", "value": ["1"]}
        ]
    })

    # 测试5: 用 children 结构
    test_filter(token, "测试5: children OR ['24', '1']", {
        "conjunction": "and",
        "children": [
            {
                "conjunction": "or",
                "conditions": [
                    {"field_name": "知识内容", "operator": "contains", "value": ["24"]},
                    {"field_name": "知识内容", "operator": "contains", "value": ["1"]}
                ]
            }
        ]
    })

    # 测试6: 测试 "123" 纯数字
    test_filter(token, "测试6: 纯数字 '123'", {
        "conjunction": "and",
        "conditions": [
            {"field_name": "知识内容", "operator": "contains", "value": ["123"]}
        ]
    })

    # 测试7: 标题搜索纯数字 "1"
    test_filter(token, "测试7: 标题 纯数字 '1'", {
        "conjunction": "and",
        "conditions": [
            {"field_name": "知识标题", "operator": "contains", "value": ["1"]}
        ]
    })


if __name__ == "__main__":
    main()
