import Box from '@cloudscape-design/components/box';
import ColumnLayout from '@cloudscape-design/components/column-layout';
import SpaceBetween from '@cloudscape-design/components/space-between';
import StatusIndicator, { StatusIndicatorProps } from '@cloudscape-design/components/status-indicator';
import { Project } from '../api/client';
import { dateStr, money, pct } from '../lib/format';
import { labelOf, useMeta } from '../lib/meta';
import { SegmentTrack } from './charts';

/** 全流程的子阶段顺序，用来算“走到百分之几”。 */
const ORDER = ['new_lead', 'contacting', 'appointment', 'offer_made', 'negotiating', 'pending', 'construction', 'listing', 'sold'];

const today = () => new Date().toISOString().slice(0, 10);
const days = (a: string | null | undefined, b: string | null | undefined) =>
  a && b ? Math.round((new Date(b + 'T00:00:00').getTime() - new Date(a + 'T00:00:00').getTime()) / 86400000) : null;
const short = (d: string | null | undefined) => (d ? d.slice(5).replace('-', '/') : null);

type Phase = 'done' | 'current' | 'future';
const ICON: Record<Phase, StatusIndicatorProps.Type> = { done: 'success', current: 'in-progress', future: 'stopped' };

interface Col { title: string; phase: Phase; lines: (string | null)[]; foot?: string | null }

function Column({ c }: { c: Col }) {
  const dim = c.phase === 'future';
  return (
    <SpaceBetween size="xxs">
      <StatusIndicator type={ICON[c.phase]} colorOverride={dim ? 'grey' : undefined}>
        <Box variant="span" fontWeight="bold" color={dim ? 'text-status-inactive' : 'inherit'}>{c.title}</Box>
      </StatusIndicator>
      {c.lines.filter(Boolean).map((l, i) => (
        <Box key={i} color={dim ? 'text-status-inactive' : 'text-body-secondary'} fontSize="body-s">{l}</Box>
      ))}
      {c.foot && <Box fontSize="body-s" fontWeight="bold" color={dim ? 'text-status-inactive' : 'inherit'}>{c.foot}</Box>}
    </SpaceBetween>
  );
}

/** 总览 B：一条横向生命周期。回答三个问题：走到哪、走了多久、下一步是什么。 */
export default function LifecycleStrip({ project: p }: { project: Project }) {
  const meta = useMeta();
  const prop = p.property;
  const sub = p.substage ?? (p.stage === 'lead' ? 'new_lead' : p.stage === 'active' ? 'construction' : 'sold');
  const idx = Math.max(0, ORDER.indexOf(sub));
  const progress = p.stage === 'portfolio' ? 100 : Math.round((idx / (ORDER.length - 1)) * 100);

  const isLead = p.stage === 'lead';
  const isActive = p.stage === 'active';
  const isDone = p.stage === 'portfolio';
  const listing = isActive && sub === 'listing';

  // ---- 下一步 ----
  let next = '';
  if (isLead) {
    const seq = meta?.substages.lead ?? [];
    const i = seq.findIndex((s) => s.value === sub);
    const nx = i >= 0 && i < seq.length - 1 ? seq[i + 1].label : '买入过户';
    next = `下一步：${nx}${p.analysis_count ? '' : '（先在“分析”里算一遍账）'}`;
  } else if (isActive && !listing) {
    const left = days(today(), p.construction_end);
    next = p.construction_end ? `下一步：挂牌。计划 ${dateStr(p.construction_end)} 完工，${left != null && left < 0 ? `已超期 ${-left} 天` : `还有 ${left} 天`}` : '下一步：挂牌。还没填计划完工日';
  } else if (listing) {
    const onMarket = days(p.list_date, today());
    next = `下一步：成交。${onMarket != null ? `已挂牌 ${onMarket} 天` : '挂牌日期未填'}${p.target_arv ? `，目标售价 ${money(p.target_arv)}` : ''}`;
  } else if (isDone) {
    next = sub === 'held' ? '已完成，持有中' : '已售出。可在“分析”里看“复盘：实际值”与买前对照';
  }

  // ---- 四列 ----
  const leadDaysRaw = isLead ? days(p.created_at.slice(0, 10), today()) : days(p.created_at.slice(0, 10), p.purchase_date);
  const leadDays = leadDaysRaw != null && leadDaysRaw >= 0 ? leadDaysRaw : null;  // 示例数据创建日晚于买入日时不显示
  const lead: Col = {
    title: '线索',
    phase: isLead ? 'current' : 'done',
    lines: [
      isLead ? `当前：${labelOf(meta?.substages.lead, sub)}` : `${labelOf(meta?.substages.lead, 'pending')} → 已买入`,
      prop.list_price ? `挂牌 ${money(prop.list_price)}${prop.avm_value ? ` · 估值 ${money(prop.avm_value)}` : ''}` : null,
      p.analysis_count ? `交易分析 ${p.analysis_count} 版${p.target_arv ? `，目标售价 ${money(p.target_arv)}` : ''}` : '还没算账',
    ],
    foot: leadDays == null ? null : isLead ? (leadDays === 0 ? '今天新建' : `跟进 ${leadDays} 天`) : `用时 ${leadDays} 天`,
  };

  const buy: Col = {
    title: '买入',
    phase: isLead ? (sub === 'pending' ? 'current' : 'future') : 'done',
    lines: [
      p.purchase_price ? `买入价 ${money(p.purchase_price)}` : isLead ? '买入价待定' : null,
      p.purchase_date ? `过户 ${dateStr(p.purchase_date)}` : isLead && sub === 'pending' ? '待成交' : null,
      !isLead && p.purchase_price && prop.list_price ? `较挂牌 ${pct(((p.purchase_price - prop.list_price) / prop.list_price) * 100)}` : null,
    ],
  };

  const total = days(p.construction_start, p.construction_end);
  const elapsed = isActive ? days(p.construction_start, today()) : total;
  const build: Col = {
    title: '施工',
    phase: isLead ? 'future' : isActive && !listing ? 'current' : 'done',
    lines: [
      p.construction_start || p.construction_end ? `${short(p.construction_start) ?? '?'} → ${short(p.construction_end) ?? '?'}${total ? `，计划 ${total} 天` : ''}` : '开工 / 完工日期未填',
      p.budget_planned ? `预算 ${money(p.budget_planned)}，已用 ${pct(p.budget_used_pct)}` : '还没有预算',
      isActive && !listing && elapsed != null && total ? (elapsed > total ? `已超期 ${elapsed - total} 天` : `进行到第 ${elapsed} 天`) : null,
    ],
    foot: isDone && total ? `工期 ${total} 天` : null,
  };

  const onMarket = days(p.list_date, isDone ? p.sale_date : today());
  const sell: Col = {
    title: '卖出',
    phase: isDone ? 'done' : listing ? 'current' : 'future',
    lines: [
      p.list_date ? `挂牌 ${dateStr(p.list_date)}` : listing ? '挂牌日期未填' : null,
      isDone ? `成交 ${money(p.sale_price)}${p.sale_date ? ` · ${dateStr(p.sale_date)}` : ''}` : p.target_arv ? `目标售价 ${money(p.target_arv)}` : '目标售价未定',
      isDone && p.sale_price != null && p.target_arv ? `较目标 ${pct(((p.sale_price - p.target_arv) / p.target_arv) * 100)}` : null,
    ],
    foot: onMarket != null && (isDone || listing) ? `在市 ${onMarket} 天` : null,
  };

  return (
    <SpaceBetween size="m">
      <SpaceBetween size="xs">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 12, flexWrap: 'wrap' }}>
          <Box fontWeight="bold">{labelOf(meta?.stages, p.stage)} · {labelOf(meta?.substages[p.stage], p.substage)} <Box variant="span" color="text-body-secondary" fontWeight="normal">（第 {idx + 1} / {ORDER.length} 步，{progress}%）</Box></Box>
          <Box color="text-body-secondary">{next}</Box>
        </div>
        <SegmentTrack
          segments={ORDER.map((id) => ({ id, label: id === 'sold' ? '已售出' : labelOf([...(meta?.substages.lead ?? []), ...(meta?.substages.active ?? [])], id) }))}
          currentIndex={idx}
          complete={isDone}
        />
      </SpaceBetween>
      <ColumnLayout columns={4} borders="vertical" minColumnWidth={160}>
        <Column c={lead} />
        <Column c={buy} />
        <Column c={build} />
        <Column c={sell} />
      </ColumnLayout>
    </SpaceBetween>
  );
}
