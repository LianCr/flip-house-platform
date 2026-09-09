"""路由共用的序列化与计算。"""

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from .. import models, schemas
from ..dictionaries import KEY_FIELDS_FOR_COMPLETENESS, PROPERTY_FIELDS
from ..status import compute_status

FIELD_TYPES = {f["key"]: f["type"] for f in PROPERTY_FIELDS}
FIELD_LABELS = {f["key"]: f["label"] for f in PROPERTY_FIELDS}


def cast_value(field: str, value):
    if value is None or value == "":
        return None
    t = FIELD_TYPES.get(field, "text")
    if t == "int":
        try:
            return int(float(str(value).replace(",", "")))
        except ValueError:
            return None
    return str(value)


def budget_totals(db: Session, project_id: int) -> tuple[float, float]:
    planned = db.scalar(select(func.coalesce(func.sum(models.BudgetLine.planned_amount), 0)).where(models.BudgetLine.project_id == project_id)) or 0
    spent = db.scalar(select(func.coalesce(func.sum(models.Expense.amount), 0)).where(models.Expense.project_id == project_id)) or 0
    return float(planned), float(spent)


def project_out(db: Session, p: models.Project) -> schemas.ProjectOut:
    planned, spent = budget_totals(db, p.id)
    status, reason = compute_status(p, planned, spent)
    prop = p.property
    missing = [FIELD_LABELS[k] for k in KEY_FIELDS_FOR_COMPLETENESS if getattr(prop, k) in (None, "")]
    if p.stage != "lead" and p.purchase_price is None:
        missing.append("买入价")
    if p.target_arv is None:
        missing.append("目标售价（ARV）")
    return schemas.ProjectOut(
        id=p.id, name=p.name, strategy=p.strategy, stage=p.stage, substage=p.substage,
        lead_heat=p.lead_heat, status=status, status_reason=reason,
        status_override=p.status_override, status_override_reason=p.status_override_reason,
        purchase_price=p.purchase_price, target_arv=p.target_arv, purchase_date=p.purchase_date,
        construction_start=p.construction_start, construction_end=p.construction_end,
        list_date=p.list_date, sale_date=p.sale_date, sale_price=p.sale_price,
        risks=p.risks, notes=p.notes, created_at=p.created_at, updated_at=p.updated_at,
        property=schemas.PropertyBrief.model_validate(prop),
        budget_planned=planned, budget_spent=spent,
        budget_used_pct=(round(spent / planned * 100, 1) if planned > 0 else None),
        missing_fields=missing,
        analysis_count=len(p.analyses),
    )


def set_field_with_source(db: Session, prop: models.Property, field: str, value, source: str,
                          confidence=None, note=None, make_primary: bool = True) -> models.PropertyFieldSource:
    """写一条来源记录；若 make_primary 则设为主值并写回 properties 列。"""
    if make_primary:
        for s in prop.field_sources:
            if s.field == field:
                s.is_primary = False
    rec = models.PropertyFieldSource(
        property_id=prop.id, field=field, value=(None if value is None else str(value)),
        source=source, confidence=confidence, note=note, is_primary=make_primary,
    )
    db.add(rec)
    if make_primary and hasattr(prop, field):
        setattr(prop, field, cast_value(field, value))
    return rec
