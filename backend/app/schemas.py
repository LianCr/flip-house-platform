from typing import Optional

from pydantic import BaseModel, ConfigDict


class ORM(BaseModel):
    model_config = ConfigDict(from_attributes=True)


# ---------- lookup ----------
class AddressCandidateOut(BaseModel):
    label: str
    street: str
    city: str
    state: str
    zip: str
    lat: Optional[float] = None
    lng: Optional[float] = None


class FieldValueOut(BaseModel):
    field: str
    label: str
    value: Optional[str]
    source: str
    confidence: Optional[float] = None
    note: Optional[str] = None


class DuplicateOut(BaseModel):
    project_id: int
    project_name: str
    property_id: int


class LookupOut(BaseModel):
    address: AddressCandidateOut
    apn: Optional[str]
    fields: list[FieldValueOut]
    owner: Optional[dict] = None
    mortgages: list[dict] = []
    sales_history: list[dict] = []
    provider: str
    valuation: Optional[dict] = None
    duplicate_of: Optional[DuplicateOut] = None


# ---------- projects ----------
class PropertyBrief(ORM):
    id: int
    address_std: str
    street: Optional[str] = None
    city: Optional[str] = None
    state: Optional[str] = None
    zip: Optional[str] = None
    lat: Optional[float] = None
    lng: Optional[float] = None
    apn: Optional[str] = None
    property_type: Optional[str] = None
    style: Optional[str] = None
    year_built: Optional[int] = None
    sqft: Optional[int] = None
    beds: Optional[int] = None
    baths_full: Optional[int] = None
    baths_half: Optional[int] = None
    stories: Optional[int] = None
    garage_spaces: Optional[int] = None
    basement: Optional[str] = None
    lot_sqft: Optional[int] = None
    land_use: Optional[str] = None
    avm_value: Optional[int] = None
    list_price: Optional[int] = None
    annual_tax: Optional[int] = None


class ProjectOut(ORM):
    id: int
    name: str
    strategy: str
    stage: str
    substage: Optional[str] = None
    lead_heat: Optional[str] = None
    status: str
    status_reason: str
    status_override: Optional[str] = None
    status_override_reason: Optional[str] = None
    purchase_price: Optional[float] = None
    target_arv: Optional[float] = None
    purchase_date: Optional[str] = None
    construction_start: Optional[str] = None
    construction_end: Optional[str] = None
    list_date: Optional[str] = None
    sale_date: Optional[str] = None
    sale_price: Optional[float] = None
    risks: Optional[str] = None
    notes: Optional[str] = None
    created_at: str
    updated_at: str
    property: PropertyBrief
    budget_planned: float
    budget_spent: float
    budget_used_pct: Optional[float] = None
    missing_fields: list[str] = []
    analysis_count: int = 0
    current_stage: Optional[dict] = None
    next_up: list[dict] = []


class FieldIn(BaseModel):
    field: str
    value: Optional[str]
    source: str = "public_record"
    confidence: Optional[float] = None
    note: Optional[str] = None


class ProjectCreate(BaseModel):
    name: str
    strategy: str = "flip"
    stage: str = "lead"
    substage: Optional[str] = None
    lead_heat: Optional[str] = "warm_lead"
    address: AddressCandidateOut
    apn: Optional[str] = None
    fields: list[FieldIn] = []
    owner: Optional[dict] = None
    mortgages: list[dict] = []
    sales_history: list[dict] = []
    valuation: Optional[dict] = None
    reuse_property_id: Optional[int] = None
    purchase_price: Optional[float] = None
    target_arv: Optional[float] = None
    purchase_date: Optional[str] = None
    construction_start: Optional[str] = None
    construction_end: Optional[str] = None
    risks: Optional[str] = None
    notes: Optional[str] = None
    create_analysis: bool = True


class ProjectPatch(BaseModel):
    name: Optional[str] = None
    strategy: Optional[str] = None
    stage: Optional[str] = None
    substage: Optional[str] = None
    lead_heat: Optional[str] = None
    status_override: Optional[str] = None
    status_override_reason: Optional[str] = None
    purchase_price: Optional[float] = None
    target_arv: Optional[float] = None
    purchase_date: Optional[str] = None
    construction_start: Optional[str] = None
    construction_end: Optional[str] = None
    list_date: Optional[str] = None
    sale_date: Optional[str] = None
    sale_price: Optional[float] = None
    risks: Optional[str] = None
    notes: Optional[str] = None
    clear_status_override: bool = False


# ---------- property data ----------
class SourceOut(ORM):
    id: int
    field: str
    value: Optional[str]
    source: str
    fetched_at: str
    confidence: Optional[float] = None
    is_primary: bool
    note: Optional[str] = None


class PropertyFieldOut(BaseModel):
    key: str
    label: str
    type: str
    value: Optional[str]
    primary_source: Optional[str] = None
    sources: list[SourceOut]
    has_conflict: bool


class OwnerOut(ORM):
    name: Optional[str] = None
    mailing_address: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[str] = None
    owner_since: Optional[str] = None


class MortgageOut(ORM):
    id: int
    recording_date: Optional[str] = None
    lender: Optional[str] = None
    loan_type: Optional[str] = None
    term_months: Optional[int] = None
    original_balance: Optional[float] = None
    est_balance: Optional[float] = None
    rate: Optional[float] = None
    payment: Optional[float] = None


class SalesHistoryOut(ORM):
    id: int
    recording_date: Optional[str] = None
    seller: Optional[str] = None
    buyer: Optional[str] = None
    doc_type: Optional[str] = None
    amount: Optional[float] = None


class PropertyDataOut(BaseModel):
    property: PropertyBrief
    fields: list[PropertyFieldOut]
    owner: Optional[OwnerOut] = None
    mortgages: list[MortgageOut]
    sales_history: list[SalesHistoryOut]


class FieldPatch(BaseModel):
    field: str
    value: Optional[str]


class PrimaryIn(BaseModel):
    source_id: int


# ---------- files ----------
class FileOut(ORM):
    id: int
    project_id: int
    filename: str
    mime: Optional[str] = None
    size: int
    doc_type: Optional[str] = None
    stage: Optional[str] = None
    doc_date: Optional[str] = None
    counterparty: Optional[str] = None
    amount: Optional[float] = None
    source: str
    uploaded_by: Optional[str] = None
    uploaded_at: str


class FilePatch(BaseModel):
    uploaded_by: Optional[str] = None
    doc_type: Optional[str] = None
    stage: Optional[str] = None
    doc_date: Optional[str] = None
    counterparty: Optional[str] = None
    amount: Optional[float] = None
    filename: Optional[str] = None


# ---------- budget ----------
class BudgetLineIn(BaseModel):
    category: str
    planned_amount: float
    note: Optional[str] = None


class BudgetLineOut(ORM):
    id: int
    project_id: int
    category: str
    planned_amount: float
    note: Optional[str] = None


class ExpenseIn(BaseModel):
    category: str
    amount: float
    date: Optional[str] = None
    vendor: Optional[str] = None
    note: Optional[str] = None
    file_id: Optional[int] = None


class ExpenseOut(ORM):
    id: int
    project_id: int
    category: str
    amount: float
    date: Optional[str] = None
    vendor: Optional[str] = None
    note: Optional[str] = None
    file_id: Optional[int] = None


class CategorySummary(BaseModel):
    category: str
    planned: float
    spent: float
    planned_pct: float
    spent_pct: float
    variance: float


class BudgetSummaryOut(BaseModel):
    planned_total: float
    spent_total: float
    remaining: float
    used_pct: Optional[float]
    categories: list[CategorySummary]


# ---------- dashboard ----------
class DashboardSummary(BaseModel):
    leads: int
    active: int
    portfolio: int
    total: int
    total_invested: float
    total_budget: float
    expected_profit: float
    over_budget_count: int


# ---------- deal analysis ----------
class AnalysisOut(BaseModel):
    id: int
    project_id: int
    name: str
    inputs: dict
    outputs: dict
    is_current: bool
    created_at: str
    updated_at: str


class AnalysisCreate(BaseModel):
    name: Optional[str] = None
    inputs: Optional[dict] = None
    tier: str = "medium"


class AnalysisPatch(BaseModel):
    name: Optional[str] = None
    inputs: Optional[dict] = None
    is_current: Optional[bool] = None


class AnalysisApplyIn(BaseModel):
    mode: str = "replace"  # replace | append
    apply_prices: bool = True


class PrefillOut(BaseModel):
    inputs: dict
    outputs: dict


class DashboardWidgets(BaseModel):
    upcoming: list[dict]
    capital: list[dict]
    retrospectives: list[dict]
    weekly_spend: list[dict]
    vendors: list[dict]
    funnel: list[dict]


# ---------- 更新记录与阶段清单 ----------
class UpdateOut(ORM):
    id: int
    project_id: int
    project_name: Optional[str] = None
    actor: str
    kind: str
    text: str
    created_at: str


class StepToggleIn(BaseModel):
    done: bool = True
    note: Optional[str] = None


class StepsOut(BaseModel):
    stages: list[dict]
    current_stage: dict
    next_up: list[dict]
    earlier_undone: list[dict] = []
