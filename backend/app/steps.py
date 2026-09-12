"""阶段清单：按负责人手写的 6 个阶段算“到哪一步、轮到谁”。
自动证据读时算，手动打的勾存在 project_steps。
"""

from sqlalchemy import select
from sqlalchemy.orm import Session

from . import models
from .dictionaries import FILE_TYPES, STAGE_CHECKLIST

FIELD_LABEL = {"purchase_price": "买入价", "purchase_date": "买入日期", "construction_start": "开工日期",
               "list_date": "挂牌日期", "sale_date": "成交日期"}
FILE_LABEL = {t["value"]: t["label"] for t in FILE_TYPES}


def _evidence(rule: str, p: models.Project) -> tuple[bool, str | None]:
    """返回 (是否有证据, 证据说明)。规则可用 | 表示任一满足。"""
    for alt in rule.split("|"):
        kind, _, arg = alt.partition(":")
        if kind == "project":
            return True, "项目已建立"
        if kind == "field":
            v = getattr(p, arg, None)
            if v not in (None, ""):
                return True, f"已填{FIELD_LABEL.get(arg, arg)}：{v}"
        elif kind == "file":
            hit = [f for f in p.files if f.doc_type == arg]
            if hit:
                f = sorted(hit, key=lambda x: x.uploaded_at)[-1]
                who = f"（{f.uploaded_by} 传的）" if f.uploaded_by else ""
                return True, f"已上传{FILE_LABEL.get(arg, arg)}：{f.filename}{who}"
        elif kind == "expense":
            if p.expenses:
                return True, f"已有 {len(p.expenses)} 笔支出"
    return False, None


def compute_steps(db: Session, p: models.Project) -> dict:
    manual = {s.key: s for s in db.scalars(select(models.ProjectStep).where(models.ProjectStep.project_id == p.id)).all()}
    stages = []
    for st in STAGE_CHECKLIST:
        items = []
        for it in st["items"]:
            ok, why = _evidence(it["evidence"], p)
            m = manual.get(it["key"])
            manual_done = bool(m and m.done)
            done = ok or manual_done
            items.append({
                "key": it["key"], "title": it["title"], "owners": it["owners"], "gate": bool(it.get("gate")),
                "done": done, "how": "auto" if ok else ("manual" if manual_done else None),
                "evidence": why, "can_auto": it["evidence"] != "manual",
                "done_by": (m.done_by if m else None), "done_at": (m.done_at if m else None), "note": (m.note if m else None),
            })
        undone = [i for i in items if not i["done"]]
        stages.append({"key": st["key"], "label": st["label"], "items": items, "done_count": len(items) - len(undone), "total": len(items)})

    # 当前阶段 = 最远的、有任何一项完成的阶段（施工中的房子不会因为没传贷款文件被算回买入阶段）
    idx = max((i for i, s in enumerate(stages) if s["done_count"] > 0), default=0)
    cur = stages[idx]
    undone_here = [i for i in cur["items"] if not i["done"]]
    if not undone_here and idx == len(stages) - 1:
        current = {"key": "done", "label": "全部完成", "index": idx + 1}
        next_up: list[dict] = []
    elif not undone_here:
        nxt = stages[idx + 1]
        current = {"key": nxt["key"], "label": nxt["label"], "index": idx + 2}
        next_up = [{"key": i["key"], "title": i["title"], "owners": i["owners"], "gate": i["gate"]} for i in nxt["items"] if not i["done"]][:3]
    else:
        current = {"key": cur["key"], "label": cur["label"], "index": idx + 1}
        next_up = [{"key": i["key"], "title": i["title"], "owners": i["owners"], "gate": i["gate"]} for i in undone_here[:3]]
    earlier = [{"key": i["key"], "title": i["title"], "owners": i["owners"], "stage": s["label"]}
               for s in stages[:idx] for i in s["items"] if not i["done"]]
    return {"stages": stages, "current_stage": current, "next_up": next_up, "earlier_undone": earlier}
