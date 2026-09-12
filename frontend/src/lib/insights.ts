import { api, Project } from '../api/client';
import { money } from './format';

export type InsightLevel = 'error' | 'warning' | 'info';
export type InsightTag = '超支' | '落后' | '临近完工' | '缺数据' | '缺文件' | '待定价' | '未算账' | '轮到';

export interface Insight {
  level: InsightLevel;
  tag: InsightTag;
  projectId: number;
  projectName: string;
  text: string;
  href: string;
}

const LEVEL_ORDER: Record<InsightLevel, number> = { error: 0, warning: 1, info: 2 };

function daysUntil(iso: string | null): number | null {
  if (!iso) return null;
  const d = new Date(iso + 'T00:00:00');
  return Math.round((d.getTime() - Date.now()) / 86400000);
}

/** 由规则从现有数据生成洞察。不是大模型，接入后升级为真实推理。 */
export async function loadInsights(projects: Project[]): Promise<Insight[]> {
  const out: Insight[] = [];
  const active = projects.filter((p) => p.stage === 'active');

  const [summaries, fileLists] = await Promise.all([
    Promise.all(active.map((p) => api.budgetSummary(p.id).catch(() => null))),
    Promise.all(active.map((p) => api.files(p.id).catch(() => []))),
  ]);

  projects.forEach((p) => {
    const base = { projectId: p.id, projectName: p.name };
    const ai = active.indexOf(p);

    if (p.status === 'at_risk') {
      const s = ai >= 0 ? summaries[ai] : null;
      const top = s?.categories.filter((c) => c.variance > 0).sort((a, b) => b.variance - a.variance)[0];
      out.push({ ...base, level: 'error', tag: '超支', href: `/projects/${p.id}?tab=budget`,
        text: top ? `${p.name} 已超预算 ${money(p.budget_spent - p.budget_planned)}，主要来自“${top.category}”（超 ${money(top.variance)}）。` : `${p.name}：${p.status_reason}` });
    }
    if (p.status === 'off_track') {
      out.push({ ...base, level: 'warning', tag: '落后', href: `/projects/${p.id}`, text: `${p.name}：${p.status_reason}。` });
    }
    if (p.stage === 'active' && p.status !== 'off_track') {
      const d = daysUntil(p.construction_end);
      if (d !== null && d >= 0 && d <= 14) {
        out.push({ ...base, level: 'info', tag: '临近完工', href: `/projects/${p.id}`, text: `${p.name} 距计划完工还有 ${d} 天，可以准备挂牌了。` });
      }
    }
    if (p.stage === 'active' && ai >= 0) {
      const hasPermit = fileLists[ai].some((f) => f.doc_type === 'permit');
      if (!hasPermit) {
        out.push({ ...base, level: 'warning', tag: '缺文件', href: `/projects/${p.id}?tab=files`, text: `${p.name} 在施工中，但还没有登记许可证文件。` });
      }
    }
    if (p.stage === 'lead' && p.analysis_count === 0) {
      out.push({ ...base, level: 'info', tag: '未算账', href: `/projects/${p.id}?tab=analysis`, text: `${p.name} 还没算过账，先跑一遍交易分析再谈价。` });
    }
    if (p.stage === 'lead' && p.lead_heat === 'hot_lead' && p.target_arv == null) {
      out.push({ ...base, level: 'info', tag: '待定价', href: `/projects/${p.id}`, text: `${p.name} 是热线索，但还没定目标售价，出价前需要补上。` });
    }
    if (p.stage === 'active' && p.next_up.length > 0) {
      const n = p.next_up[0];
      out.push({ ...base, level: 'info', tag: '轮到', href: `/projects/${p.id}`, text: `${p.name} 在${p.current_stage?.label ?? ''}，轮到 ${n.owners.join('、')}：${n.title}。` });
    }
    if (p.missing_fields.length > 0) {
      out.push({ ...base, level: 'info', tag: '缺数据', href: `/projects/${p.id}?tab=data`, text: `${p.name} 还缺 ${p.missing_fields.length} 项关键数据：${p.missing_fields.slice(0, 3).join('、')}${p.missing_fields.length > 3 ? '…' : ''}。` });
    }
  });

  return out.sort((a, b) => LEVEL_ORDER[a.level] - LEVEL_ORDER[b.level]);
}

/** 首页头部的一句话。 */
export function headline(insights: Insight[], projects: Project[]): { title: string; subtitle: string } {
  const urgent = new Set(insights.filter((i) => i.level !== 'info').map((i) => i.projectId));
  const active = projects.filter((p) => p.stage === 'active').length;
  const leads = projects.filter((p) => p.stage === 'lead').length;
  const done = projects.filter((p) => p.stage === 'portfolio').length;
  const title = urgent.size > 0 ? `今天有 ${urgent.size} 套房子需要你关注` : projects.length ? '所有房子都在正轨上' : '从一个地址开始';
  const subtitle = projects.length
    ? `${active} 套在建，${leads} 条线索，${done} 套已完成。${urgent.size > 0 ? '优先处理下面标红和标黄的。' : '有空可以补一补缺失的数据。'}`
    : '输入地址，系统会自动补全房产数据并标注来源。';
  return { title, subtitle };
}

/** AI 抽屉里的规则问答：按关键词匹配洞察。匹配不到返回 null。 */
export function answer(question: string, insights: Insight[]): { text: string; items: Insight[] } | null {
  const q = question.trim();
  if (!q) return null;
  const pick = (tags: InsightTag[], empty: string, lead: string) => {
    const items = insights.filter((i) => tags.includes(i.tag));
    return { text: items.length ? lead.replace('{n}', String(items.length)) : empty, items };
  };
  if (/超支|预算|花超|overbudget/i.test(q)) return pick(['超支'], '目前没有项目超预算。', '有 {n} 个项目超预算：');
  if (/落后|延期|逾期|完工|工期/i.test(q)) return pick(['落后', '临近完工'], '没有落后或临近完工的项目。', '与工期有关的有 {n} 条：');
  if (/缺|不完整|数据|字段/i.test(q)) return pick(['缺数据'], '所有项目的关键数据都齐了。', '有 {n} 个项目数据不完整：');
  if (/文件|许可|合同/i.test(q)) return pick(['缺文件'], '在建项目的许可证都已登记。', '有 {n} 个项目缺文件：');
  if (/线索|售价|出价|定价|算账|分析/i.test(q)) return pick(['待定价', '未算账'], '线索都已算过账并定了目标售价。', '有 {n} 条线索要先算账或定价：');
  if (/轮到|谁做|下一步|该谁/i.test(q)) return pick(['轮到'], '在建的房子暂时没有等着谁做的事。', '有 {n} 套房在等人做事：');
  if (/关注|今天|重要|优先/i.test(q)) {
    const items = insights.filter((i) => i.level !== 'info');
    return { text: items.length ? `今天优先看这 ${items.length} 条：` : '今天没有需要紧急处理的事。', items };
  }
  return null;
}
