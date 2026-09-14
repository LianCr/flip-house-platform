import os
from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles
from sqlalchemy import select

from . import models
from .db import SessionLocal, init_db
from .routers import analyses, budget, dashboard, files, lookup, meta, ops, procurement, projects, property_data, steps


@asynccontextmanager
async def lifespan(app: FastAPI):
    init_db()
    with SessionLocal() as db:
        if db.scalar(select(models.Project).limit(1)) is None:
            from .seed import seed
            seed(db)
    yield


app = FastAPI(title="翻新项目平台 API", version="0.1.0", lifespan=lifespan)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5180", "http://127.0.0.1:5180", "http://localhost:5173", "http://127.0.0.1:5173"],
    allow_methods=["*"],
    allow_headers=["*"],
)

for r in (meta, dashboard, lookup, projects, property_data, files, budget, analyses, steps, ops, procurement):
    app.include_router(r.router)


@app.get("/api/health")
def health():
    return {"ok": True, "commit": os.getenv("RENDER_GIT_COMMIT", "local")[:7]}


# ---- 生产环境：同一容器提供前端静态文件（本地开发时 dist 不存在则跳过）----
DIST = Path(os.getenv("FRONTEND_DIST", Path(__file__).resolve().parents[2] / "frontend" / "dist"))
if (DIST / "index.html").exists():
    app.mount("/assets", StaticFiles(directory=DIST / "assets"), name="assets")

    @app.get("/{full_path:path}", include_in_schema=False)
    async def spa(full_path: str):
        if full_path.startswith("api/"):
            raise HTTPException(404)
        candidate = DIST / full_path
        if full_path and candidate.is_file():
            return FileResponse(candidate)
        return FileResponse(DIST / "index.html")
