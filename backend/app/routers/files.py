import re
import shutil
from typing import Optional

from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile
from fastapi.responses import FileResponse
from sqlalchemy import select
from sqlalchemy.orm import Session

from .. import models, schemas
from ..db import UPLOAD_DIR, get_db
from ..dictionaries import FILE_DEFAULT_OWNER, FILE_TYPES
from .common import get_actor, log_update

router = APIRouter(prefix="/api", tags=["files"])

STAGE_OF_TYPE = {t["value"]: t["stage"] for t in FILE_TYPES}
FILE_TYPES_LABEL = {t["value"]: t["label"] for t in FILE_TYPES}


def _safe(name: str) -> str:
    return re.sub(r"[^\w.\-一-鿿]+", "_", name)[:120] or "file"


@router.get("/projects/{project_id}/files", response_model=list[schemas.FileOut])
def list_files(project_id: int, db: Session = Depends(get_db)):
    return db.scalars(select(models.ProjectFile).where(models.ProjectFile.project_id == project_id)
                      .order_by(models.ProjectFile.uploaded_at.desc())).all()


@router.post("/projects/{project_id}/files", response_model=schemas.FileOut, status_code=201)
async def upload(project_id: int, file: UploadFile = File(...), doc_type: Optional[str] = Form(None),
                 doc_date: Optional[str] = Form(None), counterparty: Optional[str] = Form(None),
                 amount: Optional[float] = Form(None), uploaded_by: Optional[str] = Form(None),
                 db: Session = Depends(get_db), actor: str = Depends(get_actor)):
    if not db.get(models.Project, project_id):
        raise HTTPException(404, "项目不存在")
    folder = UPLOAD_DIR / str(project_id)
    folder.mkdir(parents=True, exist_ok=True)
    rec = models.ProjectFile(project_id=project_id, filename=file.filename or "file", stored_path="",
                             mime=file.content_type, doc_type=doc_type or "other",
                             stage=STAGE_OF_TYPE.get(doc_type or "other"), doc_date=doc_date,
                             counterparty=counterparty, amount=amount, source="upload",
                             uploaded_by=uploaded_by or (actor if actor != "负责人" else FILE_DEFAULT_OWNER.get(doc_type or "other", actor)))
    db.add(rec)
    db.flush()
    target = folder / f"{rec.id}_{_safe(rec.filename)}"
    with target.open("wb") as fh:
        shutil.copyfileobj(file.file, fh)
    rec.stored_path = str(target)
    rec.size = target.stat().st_size
    log_update(db, project_id, rec.uploaded_by or actor, "file", f"上传了{FILE_TYPES_LABEL.get(rec.doc_type, '文件')}：{rec.filename}")
    db.commit()
    db.refresh(rec)
    return rec


@router.patch("/files/{file_id}", response_model=schemas.FileOut)
def patch_file(file_id: int, body: schemas.FilePatch, db: Session = Depends(get_db), actor: str = Depends(get_actor)):
    rec = db.get(models.ProjectFile, file_id)
    if not rec:
        raise HTTPException(404, "文件不存在")
    for k, v in body.model_dump(exclude_unset=True).items():
        setattr(rec, k, v)
    if body.doc_type:
        rec.stage = STAGE_OF_TYPE.get(body.doc_type, rec.stage)
    log_update(db, rec.project_id, actor, "file", f"修改了文件登记：{rec.filename}")
    db.commit()
    db.refresh(rec)
    return rec


@router.get("/files/{file_id}/download")
def download(file_id: int, db: Session = Depends(get_db)):
    rec = db.get(models.ProjectFile, file_id)
    if not rec:
        raise HTTPException(404, "文件不存在")
    return FileResponse(rec.stored_path, filename=rec.filename, media_type=rec.mime or "application/octet-stream")


@router.delete("/files/{file_id}", status_code=204)
def delete_file(file_id: int, db: Session = Depends(get_db)):
    rec = db.get(models.ProjectFile, file_id)
    if not rec:
        raise HTTPException(404, "文件不存在")
    try:
        import os
        os.remove(rec.stored_path)
    except OSError:
        pass
    db.delete(rec)
    db.commit()
