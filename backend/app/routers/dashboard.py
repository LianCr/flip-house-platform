from datetime import date, timedelta

from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.orm import Session

from .. import models, schemas
from ..db import get_db
from ..dictionaries import SUBSTAGES
from .common import budget_totals, get_actor, require


def _guard(actor: str = Depends(get_actor)) -> None:
    require(actor, "dashboard", what="看完整工作台")

router = APIRouter(prefix="/api/dashboard", tags=["dashboard"], dependencies=[Depends(_guard)])


@router.get("/summary", response_model=schemas.DashboardSummary)
def summary(db: Session = Depends(get_db)):
    projects = db.scalars(select(models.Project)).all()
    leads = sum(1 for p in projects if p.stage == "lead")
    active = sum(1 for p in projects if p.stage == "active")
    portfolio = sum(1 for p in projects if p.stage == "portfolio")

    invested = 0.0
    budget = 0.0
    profit = 0.0
    over = 0
    for p in projects:
        planned, spent = budget_totals(db, p.id)
        if p.stage == "active":
            invested += (p.purchase_price or 0) + spent
            budget += planned
            if p.target_arv:
                profit += p.target_arv - (p.purchase_price or 0) - max(planned, spent)
            if planned > 0 and spent > planned * 1.05:
                over += 1
    return schemas.DashboardSummary(
        leads=leads, active=active, portfolio=portfolio, total=len(projects),
        total_invested=invested, total_budget=budget, expected_profit=profit, over_budget_count=over,
    )


DATE_KINDS = [("purchase_date", "买入"), ("construction_start", "开工"), ("construction_end", "计划完工"),
              ("list_date", "挂牌"), ("sale_date", "成交")]


@router.get("/widgets", response_model=schemas.DashboardWidgets)
def widgets(db: Session = Depends(get_db)):
    """工作台小组件的数据：一次返回，全部来自现有表。"""
    today = date.today()
    projects = db.scalars(select(models.Project)).all()
    expenses = db.scalars(select(models.Expense)).all()

    spent_by: dict[int, float] = {}
    for e in expenses:
        spent_by[e.project_id] = spent_by.get(e.project_id, 0) + e.amount
    planned_by: dict[int, float] = {}
    for l in db.scalars(select(models.BudgetLine)).all():
        planned_by[l.project_id] = planned_by.get(l.project_id, 0) + l.planned_amount

    # 未来 30 天（含逾期 14 天内）的关键日期；已完成项目只看成交
    upcoming = []
    for p in projects:
        for field, label in DATE_KINDS:
            v = getattr(p, field)
            if not v:
                continue
            if p.stage == "portfolio" and field != "sale_date":
                continue
            try:
                d = date.fromisoformat(v)
            except ValueError:
                continue
            delta = (d - today).days
            if -14 <= delta <= 30:
                upcoming.append({"project_id": p.id, "project_name": p.name, "date": v, "kind": label, "days": delta,
                                 "overdue": delta < 0 and field in ("construction_end", "list_date")})
    # 有到期日的文件（保险）：到期前 30 天开始提醒，过期 14 天内还显示
    names = {p.id: p for p in projects}
    for f in db.scalars(select(models.ProjectFile).where(models.ProjectFile.expires_at.is_not(None))).all():
        p = names.get(f.project_id)
        if not p or p.stage == "portfolio":
            continue
        try:
            d = date.fromisoformat(f.expires_at)
        except ValueError:
            continue
        delta = (d - today).days
        if -14 <= delta <= 30:
            label = "保险到期" if f.doc_type == "insurance" else "文件到期"
            upcoming.append({"project_id": p.id, "project_name": p.name, "date": f.expires_at, "kind": label, "days": delta, "overdue": delta < 0})
    upcoming.sort(key=lambda x: x["date"])

    capital = [{"project_id": p.id, "project_name": p.name, "purchase_price": p.purchase_price or 0,
                "spent": round(spent_by.get(p.id, 0), 2), "total": round((p.purchase_price or 0) + spent_by.get(p.id, 0), 2)}
               for p in projects if p.stage == "active"]

    retrospectives = []
    for p in projects:
        if p.stage != "portfolio" or not p.sale_price:
            continue
        planned = planned_by.get(p.id, 0)
        spent = spent_by.get(p.id, 0)
        days = None
        if p.construction_start and p.construction_end:
            days = (date.fromisoformat(p.construction_end) - date.fromisoformat(p.construction_start)).days
        retrospectives.append({
            "project_id": p.id, "project_name": p.name,
            "target_arv": p.target_arv, "sale_price": p.sale_price,
            "arv_error_pct": round((p.sale_price - p.target_arv) / p.target_arv * 100, 1) if p.target_arv else None,
            "budget_planned": round(planned, 2), "spent": round(spent, 2),
            "budget_error_pct": round((spent - planned) / planned * 100, 1) if planned else None,
            "days": days,
            "profit": round(p.sale_price - (p.purchase_price or 0) - spent, 2),
        })

    # 近 12 周每周支出（周一归组）
    this_monday = today - timedelta(days=today.weekday())
    weeks = [this_monday - timedelta(weeks=i) for i in range(11, -1, -1)]
    buckets = {w.isoformat(): 0.0 for w in weeks}
    for e in expenses:
        if not e.date:
            continue
        try:
            d = date.fromisoformat(e.date)
        except ValueError:
            continue
        w = (d - timedelta(days=d.weekday())).isoformat()
        if w in buckets:
            buckets[w] += e.amount
    weekly_spend = [{"week_start": w, "amount": round(a, 2)} for w, a in buckets.items()]

    vend: dict[str, dict] = {}
    for e in expenses:
        if not e.vendor:
            continue
        v = vend.setdefault(e.vendor, {"vendor": e.vendor, "amount": 0.0, "count": 0, "projects": set()})
        v["amount"] += e.amount
        v["count"] += 1
        v["projects"].add(e.project_id)
    vendors = sorted(({**v, "amount": round(v["amount"], 2), "projects": len(v["projects"])} for v in vend.values()),
                     key=lambda x: -x["amount"])[:5]

    counts: dict[str, int] = {}
    for p in projects:
        if p.stage == "lead":
            counts[p.substage or "new_lead"] = counts.get(p.substage or "new_lead", 0) + 1
    funnel = [{"substage": s["value"], "label": s["label"], "count": counts.get(s["value"], 0)} for s in SUBSTAGES["lead"]]

    return schemas.DashboardWidgets(upcoming=upcoming, capital=capital, retrospectives=retrospectives,
                                    weekly_spend=weekly_spend, vendors=vendors, funnel=funnel)
