from typing import Optional

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.orm import Session

from .. import models, schemas
from ..db import get_db
from .common import project_out, set_field_with_source

router = APIRouter(prefix="/api/projects", tags=["projects"])


def _get(db: Session, project_id: int) -> models.Project:
    p = db.get(models.Project, project_id)
    if not p:
        raise HTTPException(404, "项目不存在")
    return p


@router.get("", response_model=list[schemas.ProjectOut])
def list_projects(stage: Optional[str] = None, q: Optional[str] = None, db: Session = Depends(get_db)):
    stmt = select(models.Project).order_by(models.Project.updated_at.desc())
    if stage:
        stmt = stmt.where(models.Project.stage == stage)
    items = db.scalars(stmt).all()
    if q:
        ql = q.lower()
        items = [p for p in items if ql in p.name.lower() or ql in p.property.address_std.lower()]
    return [project_out(db, p) for p in items]


@router.post("", response_model=schemas.ProjectOut, status_code=201)
def create_project(body: schemas.ProjectCreate, db: Session = Depends(get_db)):
    prop = None
    if body.reuse_property_id:
        prop = db.get(models.Property, body.reuse_property_id)
    if prop is None:
        prop = models.Property(
            address_std=body.address.label, street=body.address.street, city=body.address.city,
            state=body.address.state, zip=body.address.zip, lat=body.address.lat, lng=body.address.lng,
            apn=body.apn,
        )
        db.add(prop)
        db.flush()
        for f in body.fields:
            set_field_with_source(db, prop, f.field, f.value, f.source, f.confidence, f.note, make_primary=True)
        if body.apn and not any(f.field == "apn" for f in body.fields):
            set_field_with_source(db, prop, "apn", body.apn, "public_record", 0.99)
        if body.owner:
            db.add(models.Owner(property_id=prop.id, **{k: body.owner.get(k) for k in ("name", "mailing_address", "phone", "email", "owner_since")}))
        for m in body.mortgages:
            db.add(models.Mortgage(property_id=prop.id, **{k: m.get(k) for k in ("recording_date", "lender", "loan_type", "term_months", "original_balance", "est_balance", "rate", "payment")}))
        for s in body.sales_history:
            db.add(models.SalesHistory(property_id=prop.id, **{k: s.get(k) for k in ("recording_date", "seller", "buyer", "doc_type", "amount")}))

    project = models.Project(
        property_id=prop.id, name=body.name or body.address.street, strategy=body.strategy,
        stage=body.stage, substage=body.substage, lead_heat=body.lead_heat,
        purchase_price=body.purchase_price, target_arv=body.target_arv, purchase_date=body.purchase_date,
        construction_start=body.construction_start, construction_end=body.construction_end,
        risks=body.risks, notes=body.notes,
    )
    db.add(project)
    db.flush()
    if body.create_analysis:
        from .analyses import create_analysis
        create_analysis(db, project, None, None)
    db.commit()
    db.refresh(project)
    return project_out(db, project)


@router.get("/{project_id}", response_model=schemas.ProjectOut)
def get_project(project_id: int, db: Session = Depends(get_db)):
    return project_out(db, _get(db, project_id))


@router.patch("/{project_id}", response_model=schemas.ProjectOut)
def patch_project(project_id: int, body: schemas.ProjectPatch, db: Session = Depends(get_db)):
    p = _get(db, project_id)
    data = body.model_dump(exclude_unset=True)
    clear = data.pop("clear_status_override", False)
    for k, v in data.items():
        setattr(p, k, v)
    if clear:
        p.status_override = None
        p.status_override_reason = None
    db.commit()
    db.refresh(p)
    return project_out(db, p)


@router.delete("/{project_id}", status_code=204)
def delete_project(project_id: int, db: Session = Depends(get_db)):
    p = _get(db, project_id)
    db.delete(p)
    db.commit()
