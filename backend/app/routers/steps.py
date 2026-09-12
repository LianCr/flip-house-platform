"""阶段清单与更新记录。"""

from datetime import datetime
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.orm import Session

from .. import models, schemas
from ..db import get_db
from ..dictionaries import STAGE_CHECKLIST
from ..steps import compute_steps
from .common import get_actor, log_update

router = APIRouter(prefix="/api", tags=["steps"])

ITEM_TITLE = {it["key"]: it["title"] for st in STAGE_CHECKLIST for it in st["items"]}


def _project(db: Session, project_id: int) -> models.Project:
    p = db.get(models.Project, project_id)
    if not p:
        raise HTTPException(404, "项目不存在")
    return p


@router.get("/projects/{project_id}/steps", response_model=schemas.StepsOut)
def get_steps(project_id: int, db: Session = Depends(get_db)):
    return compute_steps(db, _project(db, project_id))


@router.post("/projects/{project_id}/steps/{key}", response_model=schemas.StepsOut)
def toggle_step(project_id: int, key: str, body: schemas.StepToggleIn, db: Session = Depends(get_db), actor: str = Depends(get_actor)):
    p = _project(db, project_id)
    if key not in ITEM_TITLE:
        raise HTTPException(400, "未知清单项")
    rec = db.scalar(select(models.ProjectStep).where(models.ProjectStep.project_id == project_id, models.ProjectStep.key == key))
    if rec is None:
        rec = models.ProjectStep(project_id=project_id, key=key)
        db.add(rec)
    rec.done = body.done
    rec.done_by = actor if body.done else None
    rec.done_at = datetime.now().isoformat(timespec="seconds") if body.done else None
    rec.note = body.note
    log_update(db, project_id, actor, "step", f"{'完成了' if body.done else '取消了'}“{ITEM_TITLE[key]}”" + (f"：{body.note}" if body.note else ""))
    db.commit()
    return compute_steps(db, p)


def _with_names(db: Session, rows: list[models.ProjectUpdate]) -> list[schemas.UpdateOut]:
    names = {p.id: p.name for p in db.scalars(select(models.Project)).all()}
    return [schemas.UpdateOut(id=r.id, project_id=r.project_id, project_name=names.get(r.project_id), actor=r.actor, kind=r.kind,
                              text=r.text, created_at=r.created_at) for r in rows]


@router.get("/updates", response_model=list[schemas.UpdateOut])
def all_updates(limit: int = 30, actor: Optional[str] = None, db: Session = Depends(get_db)):
    stmt = select(models.ProjectUpdate).order_by(models.ProjectUpdate.created_at.desc(), models.ProjectUpdate.id.desc()).limit(limit)
    if actor:
        stmt = stmt.where(models.ProjectUpdate.actor == actor)
    return _with_names(db, db.scalars(stmt).all())


@router.get("/projects/{project_id}/updates", response_model=list[schemas.UpdateOut])
def project_updates(project_id: int, limit: int = 30, db: Session = Depends(get_db)):
    _project(db, project_id)
    stmt = (select(models.ProjectUpdate).where(models.ProjectUpdate.project_id == project_id)
            .order_by(models.ProjectUpdate.created_at.desc(), models.ProjectUpdate.id.desc()).limit(limit))
    return _with_names(db, db.scalars(stmt).all())
