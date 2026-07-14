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


def get_all_records(token):
    """获取所有记录"""
    all_records = []
    page_token = None

    while True:
        params = {"view_id": VIEW_ID, "page_size": 500}
        if page_token:
            params["page_token"] = page_token

        url = f"https://open.feishu.cn/open-apis/bitable/v1/apps/{APP_TOKEN}/tables/{TABLE_ID}/records/search"
        headers = {"Authorization": f"Bearer {token}", "Content-Type": "application/json"}

        response = requests.post(url, headers=headers, json=params)
        result = response.json()

        if result.get("code") != 0:
            print(f"获取记录失败: {result}")
            break

        items = result.get("data", {}).get("items", [])
        all_records.extend(items)

        if not result.get("data", {}).get("has_more"):
            break
        page_token = result.get("data", {}).get("page_token")

    return all_records


def search_with_filter(token, filter_config):
    """使用筛选条件查询"""
    url = f"https://open.feishu.cn/open-apis/bitable/v1/apps/{APP_TOKEN}/tables/{TABLE_ID}/records/search"
    headers = {"Authorization": f"Bearer {token}", "Content-Type": "application/json"}

    body = {
        "view_id": VIEW_ID,
        "filter": filter_config,
        "page_size": 100
    }

    response = requests.post(url, headers=headers, json=body)
    result = response.json()

    if result.get("code") == 0:
        return result.get("data", {}).get("items", [])
    else:
        print(f"  ⚠️  查询失败: {result.get('msg')}")
        return []


# 10个测试筛选条件
TEST_FILTERS = [
    {
        "name": "测试1",
        "description": "标题[投诉 客户] 内容[24 小时]",
        "filter": {
            "conjunction": "and",
            "children": [
                {
                    "conjunction": "or",
                    "conditions": [
                        {"field_name": "知识标题", "operator": "contains", "value": ["投诉"]},
                        {"field_name": "知识标题", "operator": "contains", "value": ["客户"]}
                    ]
                },
                {
                    "conjunction": "or",
                    "conditions": [
                        {"field_name": "知识内容", "operator": "contains", "value": ["24"]},
                        {"field_name": "知识内容", "operator": "contains", "value": ["小时"]}
                    ]
                }
            ]
        }
    },
    {
        "name": "测试2",
        "description": "标题[售后 订单] 内容[退款 取消]",
        "filter": {
            "conjunction": "and",
            "children": [
                {
                    "conjunction": "or",
                    "conditions": [
                        {"field_name": "知识标题", "operator": "contains", "value": ["售后"]},
                        {"field_name": "知识标题", "operator": "contains", "value": ["订单"]}
                    ]
                },
                {
                    "conjunction": "or",
                    "conditions": [
                        {"field_name": "知识内容", "operator": "contains", "value": ["退款"]},
                        {"field_name": "知识内容", "operator": "contains", "value": ["取消"]}
                    ]
                }
            ]
        }
    },
    {
        "name": "测试3",
        "description": "标题[流程 规范 说明] 内容[天内 工作日]",
        "filter": {
            "conjunction": "and",
            "children": [
                {
                    "conjunction": "or",
                    "conditions": [
                        {"field_name": "知识标题", "operator": "contains", "value": ["流程"]},
                        {"field_name": "知识标题", "operator": "contains", "value": ["规范"]},
                        {"field_name": "知识标题", "operator": "contains", "value": ["说明"]}
                    ]
                },
                {
                    "conjunction": "or",
                    "conditions": [
                        {"field_name": "知识内容", "operator": "contains", "value": ["天内"]},
                        {"field_name": "知识内容", "operator": "contains", "value": ["工作日"]}
                    ]
                }
            ]
        }
    },
    {
        "name": "测试4",
        "description": "标题[支付 优惠] 内容[失败 折扣]",
        "filter": {
            "conjunction": "and",
            "children": [
                {
                    "conjunction": "or",
                    "conditions": [
                        {"field_name": "知识标题", "operator": "contains", "value": ["支付"]},
                        {"field_name": "知识标题", "operator": "contains", "value": ["优惠"]}
                    ]
                },
                {
                    "conjunction": "or",
                    "conditions": [
                        {"field_name": "知识内容", "operator": "contains", "value": ["失败"]},
                        {"field_name": "知识内容", "operator": "contains", "value": ["折扣"]}
                    ]
                }
            ]
        }
    },
    {
        "name": "测试5",
        "description": "标题[客户] 内容[24 48 72]",
        "filter": {
            "conjunction": "and",
            "children": [
                {"conjunction": "or", "conditions": [{"field_name": "知识标题", "operator": "contains", "value": ["客户"]}]},
                {
                    "conjunction": "or",
                    "conditions": [
                        {"field_name": "知识内容", "operator": "contains", "value": ["24"]},
                        {"field_name": "知识内容", "operator": "contains", "value": ["48"]},
                        {"field_name": "知识内容", "operator": "contains", "value": ["72"]}
                    ]
                }
            ]
        }
    },
    {
        "name": "测试6",
        "description": "标题[员工 入职 指南] 内容[培训 熟悉]",
        "filter": {
            "conjunction": "and",
            "children": [
                {
                    "conjunction": "or",
                    "conditions": [
                        {"field_name": "知识标题", "operator": "contains", "value": ["员工"]},
                        {"field_name": "知识标题", "operator": "contains", "value": ["入职"]},
                        {"field_name": "知识标题", "operator": "contains", "value": ["指南"]}
                    ]
                },
                {
                    "conjunction": "or",
                    "conditions": [
                        {"field_name": "知识内容", "operator": "contains", "value": ["培训"]},
                        {"field_name": "知识内容", "operator": "contains", "value": ["熟悉"]}
                    ]
                }
            ]
        }
    },
    {
        "name": "测试7",
        "description": "标题[信息 保密] 内容[泄露 个人]",
        "filter": {
            "conjunction": "and",
            "children": [
                {
                    "conjunction": "or",
                    "conditions": [
                        {"field_name": "知识标题", "operator": "contains", "value": ["信息"]},
                        {"field_name": "知识标题", "operator": "contains", "value": ["保密"]}
                    ]
                },
                {
                    "conjunction": "or",
                    "conditions": [
                        {"field_name": "知识内容", "operator": "contains", "value": ["泄露"]},
                        {"field_name": "知识内容", "operator": "contains", "value": ["个人"]}
                    ]
                }
            ]
        }
    },
    {
        "name": "测试8",
        "description": "标题[发票 开具] 内容[7 电子 纸质]",
        "filter": {
            "conjunction": "and",
            "children": [
                {
                    "conjunction": "or",
                    "conditions": [
                        {"field_name": "知识标题", "operator": "contains", "value": ["发票"]},
                        {"field_name": "知识标题", "operator": "contains", "value": ["开具"]}
                    ]
                },
                {
                    "conjunction": "or",
                    "conditions": [
                        {"field_name": "知识内容", "operator": "contains", "value": ["7"]},
                        {"field_name": "知识内容", "operator": "contains", "value": ["电子"]},
                        {"field_name": "知识内容", "operator": "contains", "value": ["纸质"]}
                    ]
                }
            ]
        }
    },
    {
        "name": "测试9",
        "description": "标题[投诉 售后] 内容[1 24 48 72]",
        "filter": {
            "conjunction": "and",
            "children": [
                {
                    "conjunction": "or",
                    "conditions": [
                        {"field_name": "知识标题", "operator": "contains", "value": ["投诉"]},
                        {"field_name": "知识标题", "operator": "contains", "value": ["售后"]}
                    ]
                },
                {
                    "conjunction": "or",
                    "conditions": [
                        {"field_name": "知识内容", "operator": "contains", "value": ["1"]},
                        {"field_name": "知识内容", "operator": "contains", "value": ["24"]},
                        {"field_name": "知识内容", "operator": "contains", "value": ["48"]},
                        {"field_name": "知识内容", "operator": "contains", "value": ["72"]}
                    ]
                }
            ]
        }
    },
    {
        "name": "测试10",
        "description": "标题[处理 时效] 内容[24 方案 反馈]",
        "filter": {
            "conjunction": "and",
            "children": [
                {
                    "conjunction": "or",
                    "conditions": [
                        {"field_name": "知识标题", "operator": "contains", "value": ["处理"]},
                        {"field_name": "知识标题", "operator": "contains", "value": ["时效"]}
                    ]
                },
                {
                    "conjunction": "or",
                    "conditions": [
                        {"field_name": "知识内容", "operator": "contains", "value": ["24"]},
                        {"field_name": "知识内容", "operator": "contains", "value": ["方案"]},
                        {"field_name": "知识内容", "operator": "contains", "value": ["反馈"]}
                    ]
                }
            ]
        }
    }
]


def extract_title(fields):
    """提取标题（处理富文本格式）"""
    title = fields.get("知识标题", "")
    if isinstance(title, list) and len(title) > 0:
        first_item = title[0]
        if isinstance(first_item, dict) and "text" in first_item:
            return first_item["text"]
    return str(title)


def main():
    print("=" * 70)
    print("飞书多维表格筛选条件测试")
    print("=" * 70)

    # 1. 获取 Token
    print("\n[1/3] 获取 Access Token...")
    token = get_tenant_access_token()
    print(f"✅ Token 获取成功")

    # 2. 获取所有数据
    print("\n[2/3] 获取所有数据...")
    all_records = get_all_records(token)
    print(f"✅ 共获取 {len(all_records)} 条记录")

    # 3. 逐一测试筛选条件
    print("\n[3/3] 测试筛选条件...")
    print("=" * 70)

    results = {}

    for i, test in enumerate(TEST_FILTERS, 1):
        print(f"\n【{test['name']}】")
        print(f"  筛选条件: {test['description']}")

        items = search_with_filter(token, test['filter'])

        if items:
            print(f"  ✅ 命中 {len(items)} 条:")
            for j, item in enumerate(items, 1):
                title = extract_title(item.get("fields", {}))
                print(f"    {j}. {title}")
        else:
            print(f"  ❌ 未命中任何数据")

        results[test['name']] = {
            "description": test['description'],
            "count": len(items),
            "record_ids": [item.get("record_id") for item in items]
        }

    # 输出汇总
    print("\n" + "=" * 70)
    print("测试结果汇总")
    print("=" * 70)

    for name, result in results.items():
        status = "✅" if result["count"] > 0 else "❌"
        print(f"{status} {name}: {result['description']} → {result['count']} 条")

    # 保存结果
    output_file = "filter_test_results.json"
    with open(output_file, "w", encoding="utf-8") as f:
        json.dump({
            "total_records": len(all_records),
            "test_results": results
        }, f, ensure_ascii=False, indent=2)

    print(f"\n📁 完整结果已保存到: {output_file}")


if __name__ == "__main__":
    main()
