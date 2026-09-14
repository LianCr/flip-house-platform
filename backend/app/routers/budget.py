from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.orm import Session

from .. import models, schemas
from ..db import get_db
from .common import get_actor, log_update, require


def _guard(actor: str = Depends(get_actor)) -> None:
    require(actor, "budget", what="看或改预算")

router = APIRouter(prefix="/api", tags=["budget"], dependencies=[Depends(_guard)])


def _check(db: Session, project_id: int):
    if not db.get(models.Project, project_id):
        raise HTTPException(404, "项目不存在")


@router.get("/projects/{project_id}/budget-lines", response_model=list[schemas.BudgetLineOut])
def list_lines(project_id: int, db: Session = Depends(get_db)):
    return db.scalars(select(models.BudgetLine).where(models.BudgetLine.project_id == project_id)).all()


@router.post("/projects/{project_id}/budget-lines", response_model=schemas.BudgetLineOut, status_code=201)
def add_line(project_id: int, body: schemas.BudgetLineIn, db: Session = Depends(get_db), actor: str = Depends(get_actor)):
    _check(db, project_id)
    rec = models.BudgetLine(project_id=project_id, **body.model_dump())
    db.add(rec)
    log_update(db, project_id, actor, "budget", f"加了预算项“{rec.category}” ${rec.planned_amount:,.0f}")
    db.commit()
    db.refresh(rec)
    return rec


@router.delete("/budget-lines/{line_id}", status_code=204)
def delete_line(line_id: int, db: Session = Depends(get_db)):
    rec = db.get(models.BudgetLine, line_id)
    if not rec:
        raise HTTPException(404)
    db.delete(rec)
    db.commit()


@router.get("/projects/{project_id}/expenses", response_model=list[schemas.ExpenseOut])
def list_expenses(project_id: int, db: Session = Depends(get_db)):
    return db.scalars(select(models.Expense).where(models.Expense.project_id == project_id)
                      .order_by(models.Expense.date.desc())).all()


@router.post("/projects/{project_id}/expenses", response_model=schemas.ExpenseOut, status_code=201)
def add_expense(project_id: int, body: schemas.ExpenseIn, db: Session = Depends(get_db), actor: str = Depends(get_actor)):
    _check(db, project_id)
    rec = models.Expense(project_id=project_id, **body.model_dump())
    db.add(rec)
    log_update(db, project_id, actor, "expense", f"记了一笔“{rec.category}”支出 ${rec.amount:,.0f}{'（' + rec.vendor + '）' if rec.vendor else ''}")
    db.commit()
    db.refresh(rec)
    return rec


@router.delete("/expenses/{expense_id}", status_code=204)
def delete_expense(expense_id: int, db: Session = Depends(get_db)):
    rec = db.get(models.Expense, expense_id)
    if not rec:
        raise HTTPException(404)
    db.delete(rec)
    db.commit()


@router.get("/projects/{project_id}/budget-summary", response_model=schemas.BudgetSummaryOut)
def summary(project_id: int, db: Session = Depends(get_db)):
    _check(db, project_id)
    lines = db.scalars(select(models.BudgetLine).where(models.BudgetLine.project_id == project_id)).all()
    exps = db.scalars(select(models.Expense).where(models.Expense.project_id == project_id)).all()
    planned_by: dict[str, float] = {}
    spent_by: dict[str, float] = {}
    for l in lines:
        planned_by[l.category] = planned_by.get(l.category, 0) + l.planned_amount
    for e in exps:
        spent_by[e.category] = spent_by.get(e.category, 0) + e.amount
    planned_total = sum(planned_by.values())
    spent_total = sum(spent_by.values())
    cats = []
    for c in sorted(set(planned_by) | set(spent_by), key=lambda c: -(planned_by.get(c, 0) + spent_by.get(c, 0))):
        pl, sp = planned_by.get(c, 0), spent_by.get(c, 0)
        cats.append(schemas.CategorySummary(
            category=c, planned=pl, spent=sp,
            planned_pct=round(pl / planned_total * 100, 1) if planned_total else 0,
            spent_pct=round(sp / spent_total * 100, 1) if spent_total else 0,
            variance=sp - pl,
        ))
    return schemas.BudgetSummaryOut(
        planned_total=planned_total, spent_total=spent_total, remaining=planned_total - spent_total,
        used_pct=round(spent_total / planned_total * 100, 1) if planned_total else None, categories=cats,
    )
