"""业务字典：阶段、状态、预算类别、文件类型、字段来源。"""

STRATEGIES = [
    {"value": "flip", "label": "翻新转卖"},
    {"value": "new_build", "label": "新建"},
    {"value": "rental", "label": "持有出租"},
]

STAGES = [
    {"value": "lead", "label": "线索"},
    {"value": "active", "label": "在建"},
    {"value": "portfolio", "label": "已完成"},
]

SUBSTAGES = {
    "lead": [
        {"value": "new_lead", "label": "新线索"},
        {"value": "contacting", "label": "联系卖家"},
        {"value": "appointment", "label": "约看"},
        {"value": "offer_made", "label": "已出价"},
        {"value": "negotiating", "label": "谈判中"},
        {"value": "pending", "label": "待成交"},
    ],
    "active": [
        {"value": "construction", "label": "施工中"},
        {"value": "listing", "label": "挂牌中"},
    ],
    "portfolio": [
        {"value": "sold", "label": "已售出"},
        {"value": "held", "label": "持有"},
    ],
}

STATUSES = [
    {"value": "on_track", "label": "正常", "kind": "success"},
    {"value": "off_track", "label": "落后", "kind": "error"},
    {"value": "at_risk", "label": "有风险", "kind": "warning"},
    {"value": "hot_lead", "label": "热线索", "kind": "info"},
    {"value": "warm_lead", "label": "温线索", "kind": "pending"},
    {"value": "done", "label": "已完成", "kind": "success"},
]

BUDGET_CATEGORIES = [
    "拆除", "结构", "屋顶", "外立面", "门窗", "电", "水", "暖通", "保温与干墙",
    "地板", "厨房", "卫浴", "油漆", "景观", "许可与设计", "持有成本", "成交成本",
    "应急", "材料杂项", "其他",
]

FILE_TYPES = [
    {"value": "purchase_contract", "label": "购房合同", "stage": "买入"},
    {"value": "title_report", "label": "产权报告", "stage": "买入"},
    {"value": "inspection", "label": "检验报告", "stage": "买入"},
    {"value": "closing_statement", "label": "结算单", "stage": "买入"},
    {"value": "permit", "label": "许可证", "stage": "施工"},
    {"value": "contractor_contract", "label": "承包商合同", "stage": "施工"},
    {"value": "invoice", "label": "发票", "stage": "施工"},
    {"value": "change_order", "label": "变更单", "stage": "施工"},
    {"value": "drawing", "label": "图纸", "stage": "施工"},
    {"value": "listing_agreement", "label": "挂牌协议", "stage": "卖出"},
    {"value": "sale_closing", "label": "成交结算单", "stage": "卖出"},
    {"value": "loan_doc", "label": "贷款文件（loan doc）", "stage": "买入"},
    {"value": "seller_disclosure", "label": "卖方披露（seller disclosure）", "stage": "卖出"},
    {"value": "inspection_report", "label": "施工检查报告（inspection）", "stage": "施工"},
    {"value": "insurance", "label": "保险", "stage": "通用"},
    {"value": "report", "label": "报表", "stage": "通用"},
    {"value": "other", "label": "其他", "stage": "通用"},
]

SOURCES = [
    {"value": "manual", "label": "人工"},
    {"value": "public_record", "label": "公共记录"},
    {"value": "lark", "label": "Lark 迁入"},
    {"value": "model", "label": "模型估算"},
    {"value": "ai", "label": "AI 判断"},
]

# 房产字段：字段名 → 中文标签、类型
PROPERTY_FIELDS = [
    {"key": "property_type", "label": "房产类型", "type": "text"},
    {"key": "style", "label": "建筑风格", "type": "text"},
    {"key": "year_built", "label": "建造年份", "type": "int"},
    {"key": "sqft", "label": "建筑面积（平方英尺）", "type": "int"},
    {"key": "beds", "label": "卧室", "type": "int"},
    {"key": "baths_full", "label": "全卫", "type": "int"},
    {"key": "baths_half", "label": "半卫", "type": "int"},
    {"key": "stories", "label": "层数", "type": "int"},
    {"key": "garage_spaces", "label": "车位", "type": "int"},
    {"key": "basement", "label": "地下室", "type": "text"},
    {"key": "lot_sqft", "label": "地块面积（平方英尺）", "type": "int"},
    {"key": "land_use", "label": "土地用途", "type": "text"},
    {"key": "apn", "label": "地块号（APN）", "type": "text"},
    {"key": "avm_value", "label": "模型估值（美元）", "type": "int"},
    {"key": "list_price", "label": "挂牌价（美元）", "type": "int"},
    {"key": "annual_tax", "label": "年房产税（美元）", "type": "int"},
]

# 交易分析器的行业默认值（人工可改；以后用公司历史项目的实际值替换）
ANALYSIS_DEFAULTS = {
    "holding_months": 6,
    "financing": {"enabled": True, "down_pct": 20, "rate_pct": 7.0, "years": 30},
    "closing_pct": 1.5,          # 买入过户费占买入价
    "inspection": 500,
    "appraisal": 600,
    "selling_pct": 7.0,          # 中介佣金 + 卖方过户
    "insurance_pct_annual": 0.5, # 年保费占售价
    "utilities_by_sqft": [(1500, 250), (2500, 350), (99999, 450)],
    "rehab_tiers": {"light": 25, "medium": 45, "heavy": 75},   # $/sqft
    "rehab_shares": {"厨房": 0.22, "卫浴": 0.16, "地板": 0.10, "油漆": 0.08, "屋顶": 0.08, "电": 0.07,
                     "水": 0.06, "门窗": 0.06, "外立面": 0.05, "拆除": 0.04, "景观": 0.03, "应急": 0.05},
    "target_margin_pct": 20,   # 最高出价按目标利润率（利润 ÷ 总成本）反推
}

# ---------------- 人员与分工 ----------------
# 负责人代号来自业务负责人手写的流程；不写真名。“负责人”是看总览的人，只看不填。
PEOPLE = [
    {"code": "负责人", "label": "负责人", "role": "看总览、盯进度"},
    {"code": "A", "label": "A", "role": "买建筑材料、园丁"},
    {"code": "D", "label": "D", "role": "决策价格、签文件"},
    {"code": "J", "label": "J", "role": "筛选房源、贷款保险、agent、staging、上市"},
    {"code": "K", "label": "K", "role": "保险、水电网、seller disclosure"},
    {"code": "L", "label": "L", "role": "看房、量尺、参与决策"},
    {"code": "S", "label": "S", "role": "卖房文件"},
    {"code": "W", "label": "W", "role": "卖房文件"},
    {"code": "Z", "label": "Z", "role": "permit、inspection、final 检查"},
    {"code": "设计师", "label": "设计师", "role": "设计方案"},
    {"code": "园丁", "label": "园丁", "role": "剪草"},
]

# 每个功能块由谁负责（块 → 代号列表）。"?" 表示流程里没写，待确认。
OWNER_MAP = {
    "project.header": ["负责人"],
    "overview.steps": [],            # 每项各自负责人
    "overview.status": ["负责人"],
    "overview.risks": ["负责人"],
    "overview.notes": ["负责人"],
    "overview.budget": ["A"],
    "overview.updates": ["负责人"],
    "analysis": ["D", "L"],
    "data.specs": ["J", "L"],
    "data.owner": ["J"],
    "data.mortgage": ["J"],
    "data.history": ["J"],
    "files.upload": ["当前身份"],
    "files.table": ["负责人"],
    "budget.summary": ["负责人"],
    "budget.lines": ["?"],
    "budget.expenses": ["A"],
    "wizard": ["J"],
}

# 文件类型 → 默认上传人（上传表单里的默认值，可改）
FILE_DEFAULT_OWNER = {
    "purchase_contract": "J", "title_report": "J", "inspection": "J", "closing_statement": "K",
    "loan_doc": "D", "insurance": "K",
    "permit": "Z", "inspection_report": "Z", "drawing": "设计师",
    "contractor_contract": "Z", "invoice": "A", "change_order": "Z",
    "listing_agreement": "J", "sale_closing": "S", "seller_disclosure": "K",
    "report": "负责人", "other": "负责人",
}

# ---------------- 阶段清单 ----------------
# 6 个阶段来自负责人手写的 24 条。证据规则：file:<doc_type> | field:<项目字段> | expense:any | project:exists | manual
STAGE_CHECKLIST = [
    {"key": "s1", "label": "① 找房、看房、出价", "items": [
        {"key": "screen", "title": "筛选房源：死亡记录、unpermitted sqft", "owners": ["J"], "evidence": "project:exists"},
        {"key": "view", "title": "去看房：定时间和 open door 形式", "owners": ["L"], "evidence": "manual"},
        {"key": "price", "title": "董事会决策价格、谈价", "owners": ["D", "L"], "evidence": "field:purchase_price"},
        {"key": "open_escrow", "title": "大节点：Open escrow", "owners": ["负责人"], "evidence": "manual", "gate": True},
    ]},
    {"key": "s2", "label": "② 买入 escrow 期间", "items": [
        {"key": "loan_insurance", "title": "开始贷款、开始买房屋保险", "owners": ["J", "K"], "evidence": "file:insurance|file:loan_doc"},
        {"key": "loan_doc", "title": "签 loan doc", "owners": ["D", "L"], "evidence": "file:loan_doc"},
        {"key": "measure", "title": "量尺", "owners": ["L"], "evidence": "manual"},
        {"key": "design", "title": "设计方案", "owners": ["设计师"], "evidence": "file:drawing"},
        {"key": "utilities_on", "title": "开通水电网", "owners": ["K"], "evidence": "manual"},
        {"key": "close_escrow", "title": "大节点：Close escrow", "owners": ["负责人"], "evidence": "field:purchase_date", "gate": True},
    ]},
    {"key": "s3", "label": "③ 办 permit", "items": [
        {"key": "permit", "title": "申请 permit（每个房子不一样）", "owners": ["Z"], "evidence": "file:permit"},
        {"key": "start", "title": "大节点：开始施工", "owners": ["负责人"], "evidence": "field:construction_start", "gate": True},
    ]},
    {"key": "s4", "label": "④ 施工与检查", "items": [
        {"key": "materials", "title": "买建筑材料", "owners": ["A"], "evidence": "expense:any"},
        {"key": "inspection", "title": "申请 inspection（有时间限制）", "owners": ["Z"], "evidence": "file:inspection_report"},
        {"key": "agent", "title": "agent 介入", "owners": ["J"], "evidence": "manual"},
        {"key": "final", "title": "大节点：final 检查通过", "owners": ["Z"], "evidence": "manual", "gate": True},
    ]},
    {"key": "s5", "label": "⑤ 布置、上市", "items": [
        {"key": "staging", "title": "staging", "owners": ["J"], "evidence": "manual"},
        {"key": "listing", "title": "上市", "owners": ["J"], "evidence": "field:list_date"},
        {"key": "mow", "title": "园丁剪草", "owners": ["A", "园丁"], "evidence": "manual"},
        {"key": "offer", "title": "大节点：收到 offer，open escrow", "owners": ["负责人"], "evidence": "manual", "gate": True},
    ]},
    {"key": "s6", "label": "⑥ 卖出 escrow 与收尾", "items": [
        {"key": "sale_docs", "title": "卖房文件", "owners": ["S", "W"], "evidence": "file:sale_closing"},
        {"key": "disclosure", "title": "seller disclosure", "owners": ["K"], "evidence": "file:seller_disclosure"},
        {"key": "sign", "title": "签卖房文件", "owners": ["D"], "evidence": "manual"},
        {"key": "closed", "title": "大节点：交割完成", "owners": ["负责人"], "evidence": "field:sale_date", "gate": True},
        {"key": "services_off", "title": "关水电网、取消房屋保险", "owners": ["K"], "evidence": "manual"},
    ]},
]

KEY_FIELDS_FOR_COMPLETENESS = [
    "year_built", "sqft", "beds", "baths_full", "lot_sqft", "apn",
]


def meta() -> dict:
    return {
        "strategies": STRATEGIES,
        "stages": STAGES,
        "substages": SUBSTAGES,
        "statuses": STATUSES,
        "budget_categories": BUDGET_CATEGORIES,
        "file_types": FILE_TYPES,
        "sources": SOURCES,
        "property_fields": PROPERTY_FIELDS,
        "people": PEOPLE,
        "owner_map": OWNER_MAP,
        "file_default_owner": FILE_DEFAULT_OWNER,
        "stage_checklist": STAGE_CHECKLIST,
        "analysis_defaults": {k: v for k, v in ANALYSIS_DEFAULTS.items() if k != "utilities_by_sqft"},
    }
