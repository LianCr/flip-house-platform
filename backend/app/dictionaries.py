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
        "analysis_defaults": {k: v for k, v in ANALYSIS_DEFAULTS.items() if k != "utilities_by_sqft"},
    }
