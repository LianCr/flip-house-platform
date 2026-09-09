from dataclasses import asdict

from fastapi import APIRouter, Depends
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.orm import Session

from .. import models, schemas
from ..db import get_db
from ..providers import get_provider
from .common import FIELD_LABELS

router = APIRouter(prefix="/api/lookup", tags=["lookup"])


class LookupIn(BaseModel):
    address: str


@router.get("/address", response_model=list[schemas.AddressCandidateOut])
def address(q: str = ""):
    return [asdict(c) for c in get_provider().geocode(q)]


@router.post("/property", response_model=schemas.LookupOut)
def property_lookup(body: LookupIn, db: Session = Depends(get_db)):
    r = get_provider().lookup(body.address)
    dup = None
    existing = db.scalar(
        select(models.Property).where(
            (models.Property.apn == r.apn) | (models.Property.address_std == r.address.label)
        )
    )
    if existing and existing.projects:
        p = existing.projects[0]
        dup = schemas.DuplicateOut(project_id=p.id, project_name=p.name, property_id=existing.id)
    return schemas.LookupOut(
        address=schemas.AddressCandidateOut(**asdict(r.address)),
        apn=r.apn,
        fields=[schemas.FieldValueOut(field=f.field, label=FIELD_LABELS.get(f.field, f.field), value=f.value,
                                      source=f.source, confidence=f.confidence, note=f.note) for f in r.fields],
        owner=r.owner, mortgages=r.mortgages, sales_history=r.sales_history,
        provider=r.provider, duplicate_of=dup,
        valuation=asdict(r.valuation) if r.valuation else None,
    )
