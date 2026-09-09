"""项目健康状态的计算规则。规则写死并可解释，人工可覆盖。"""

from datetime import date

from .models import Project


def compute_status(project: Project, planned_total: float, spent_total: float, today: date | None = None) -> tuple[str, str]:
    """返回 (status_value, reason)。"""
    if project.status_override:
        return project.status_override, f"人工覆盖：{project.status_override_reason or '未填写理由'}"

    today = today or date.today()

    if project.stage == "lead":
        heat = project.lead_heat or "warm_lead"
        return heat, "线索阶段的热度由人工标记"

    if project.stage == "portfolio":
        return "done", "项目已完成"

    # active
    if planned_total > 0 and spent_total > planned_total * 1.05:
        over = spent_total - planned_total
        return "at_risk", f"支出已超预算 ${over:,.0f}（超过 5%）"

    if project.construction_end and project.substage != "listing":
        try:
            end = date.fromisoformat(project.construction_end)
            if today > end:
                days = (today - end).days
                return "off_track", f"已超过计划完工日 {days} 天且尚未挂牌"
        except ValueError:
            pass

    return "on_track", "支出在预算内，进度未超期"
