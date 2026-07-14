import requests

APP_ID = "cli_a9154bd01c3a5bdb"
APP_SECRET = "H4cut9LP9T9xKShp5VJMEcRMug4qdlLy"
APP_TOKEN = "SY2bwgD36iudpJk42a7cfIwQnPg"
TABLE_ID = "tbl5WSbuZY2Hq5Gc"
VIEW_ID = "vewGCGaV3O"

def get_token():
    url = "https://open.feishu.cn/open-apis/auth/v3/tenant_access_token/internal"
    response = requests.post(url, json={"app_id": APP_ID, "app_secret": APP_SECRET})
    return response.json().get("tenant_access_token")

def test(name, filter_config):
    url = f"https://open.feishu.cn/open-apis/bitable/v1/apps/{APP_TOKEN}/tables/{TABLE_ID}/records/search"
    headers = {"Authorization": f"Bearer {get_token()}", "Content-Type": "application/json"}
    response = requests.post(url, headers=headers, json={"view_id": VIEW_ID, "filter": filter_config})
    result = response.json()
    if result.get("code") == 0:
        count = len(result.get("data", {}).get("items", []))
        print(f"✅ {name}: {count}条")
    else:
        print(f"❌ {name}: {result.get('msg')}")

token = get_token()

# 测试1: children 里直接放 condition（错误写法）
test("children直接放condition", {
    "conjunction": "and",
    "children": [
        {"field_name": "知识标题", "operator": "contains", "value": ["客户"]},
        {"field_name": "知识内容", "operator": "contains", "value": ["24"]}
    ]
})

# 测试2: children 里全部用 conjunction + conditions（正确写法）
test("children全部用conjunction+conditions", {
    "conjunction": "and",
    "children": [
        {"conjunction": "or", "conditions": [{"field_name": "知识标题", "operator": "contains", "value": ["客户"]}]},
        {"conjunction": "or", "conditions": [{"field_name": "知识内容", "operator": "contains", "value": ["24"]}]}
    ]
})

# 测试3: 用 conditions（不用children）正确写法
test("conditions直接写", {
    "conjunction": "and",
    "conditions": [
        {"field_name": "知识标题", "operator": "contains", "value": ["客户"]},
        {"field_name": "知识内容", "operator": "contains", "value": ["24"]}
    ]
})
