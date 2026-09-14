import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCollection } from '@cloudscape-design/collection-hooks';
import Board, { BoardProps } from '@cloudscape-design/board-components/board';
import BoardItem from '@cloudscape-design/board-components/board-item';
import Autosuggest from '@cloudscape-design/components/autosuggest';
import Box from '@cloudscape-design/components/box';
import BreadcrumbGroup from '@cloudscape-design/components/breadcrumb-group';
import Button from '@cloudscape-design/components/button';
import ButtonDropdown from '@cloudscape-design/components/button-dropdown';
import Cards from '@cloudscape-design/components/cards';
import ColumnLayout from '@cloudscape-design/components/column-layout';
import Container from '@cloudscape-design/components/container';
import ContentLayout from '@cloudscape-design/components/content-layout';
import FormField from '@cloudscape-design/components/form-field';
import Grid from '@cloudscape-design/components/grid';
import Header from '@cloudscape-design/components/header';
import Link from '@cloudscape-design/components/link';
import Pagination from '@cloudscape-design/components/pagination';
import Select from '@cloudscape-design/components/select';
import SpaceBetween from '@cloudscape-design/components/space-between';
import StatusIndicator from '@cloudscape-design/components/status-indicator';
import Table from '@cloudscape-design/components/table';
import TextFilter from '@cloudscape-design/components/text-filter';
import StatusBadge from '../components/StatusBadge';
import CoverImage from '../components/CoverImage';
import ReviewTag from '../components/ReviewTag';
import { BulletList, DeltaBadge, HBars, InlineBar, Meter, StackedBar, StatTile, Trend, compactMoney, fullMoney } from '../components/charts';
import { api, AddressCandidate, DashboardSummary, DashboardWidgets, Project, Update } from '../api/client';
import UpdatesList from '../components/UpdatesList';
import { OwnerDot } from '../components/OwnerTag';
import { dateStr, money, pct } from '../lib/format';
import { headline, Insight, loadInsights } from '../lib/insights';
import { labelOf, useMeta } from '../lib/meta';

type WidgetId = 'attention' | 'money' | 'stages' | 'recent' | 'list' | 'upcoming' | 'capital' | 'retro' | 'weekly' | 'vendors' | 'funnel' | 'updates' | 'turns';
type ItemData = { title: string; tag: string };
type Item = BoardProps.Item<ItemData>;

const WIDGETS: Record<WidgetId, ItemData & { cols: number; rows: number }> = {
  attention: { title: '需要关注', tag: 'B', cols: 2, rows: 4 },
  money: { title: '在建项目：花了多少（灰底 = 预算）', tag: 'C', cols: 2, rows: 4 },
  stages: { title: '阶段分布', tag: 'D', cols: 1, rows: 4 },
  recent: { title: '最近更新', tag: 'E', cols: 3, rows: 4 },
  list: { title: '项目列表', tag: 'F', cols: 4, rows: 6 },
  upcoming: { title: '未来 30 天', tag: 'G', cols: 2, rows: 4 },
  capital: { title: '资金占用', tag: 'H', cols: 2, rows: 4 },
  retro: { title: '估算准不准（已完成项目）', tag: 'I', cols: 4, rows: 3 },
  weekly: { title: '近 12 周支出', tag: 'J', cols: 2, rows: 4 },
  vendors: { title: '供应商支出前五', tag: 'K', cols: 2, rows: 4 },
  funnel: { title: '线索漏斗', tag: 'L', cols: 1, rows: 4 },
  updates: { title: '谁更新了什么', tag: 'M', cols: 2, rows: 4 },
  turns: { title: '每套房轮到谁', tag: 'N', cols: 4, rows: 7 },
};
const DEFAULT_ORDER: WidgetId[] = ['attention', 'turns'];
const LAYOUT_KEY = 'boardLayout.v5';

function mkItem(id: WidgetId, extra?: Partial<Item>): Item {
  const w = WIDGETS[id];
  return { id, columnSpan: w.cols, rowSpan: w.rows, data: { title: w.title, tag: w.tag }, ...extra };
}
function loadLayout(): Item[] {
  try {
    const raw = localStorage.getItem(LAYOUT_KEY);
    if (raw) {
      const saved = JSON.parse(raw) as { id: WidgetId; columnSpan?: number; rowSpan?: number; columnOffset?: Record<number, number> }[];
      const items = saved.filter((s) => WIDGETS[s.id]).map((s) => mkItem(s.id, { columnSpan: s.columnSpan, rowSpan: s.rowSpan, columnOffset: s.columnOffset }));
      if (items.length) return items;
    }
  } catch { /* ignore */ }
  return DEFAULT_ORDER.map((id) => mkItem(id));
}
function saveLayout(items: ReadonlyArray<Item>) {
  try { localStorage.setItem(LAYOUT_KEY, JSON.stringify(items.map((i) => ({ id: i.id, columnSpan: i.columnSpan, rowSpan: i.rowSpan, columnOffset: i.columnOffset })))); } catch { /* ignore */ }
}

const boardI18n: BoardProps.I18nStrings<ItemData> = {
  liveAnnouncementDndStarted: (t) => (t === 'resize' ? '开始调整大小' : '开始拖动'),
  liveAnnouncementDndItemReordered: () => '已移动',
  liveAnnouncementDndItemResized: () => '已调整大小',
  liveAnnouncementDndItemInserted: () => '已插入',
  liveAnnouncementDndCommitted: (t) => (t === 'resize' ? '大小已确定' : '位置已确定'),
  liveAnnouncementDndDiscarded: () => '已取消',
  liveAnnouncementItemRemoved: (op) => `已移除 ${op.item.data.title}`,
  navigationAriaLabel: '看板导航',
  navigationItemAriaLabel: (item) => (item ? item.data.title : '空'),
};
const itemI18n = { dragHandleAriaLabel: '拖动', resizeHandleAriaLabel: '调整大小', dragHandleTooltipText: '拖动改变位置', resizeHandleTooltipText: '拖动改变大小' };

function Stat({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return <StatTile label={label} value={value} sub={sub} />;
}

const shortDate = (d: string) => d.slice(5).replace('-', '/');

export default function Dashboard({ listOnly = false }: { listOnly?: boolean }) {
  const navigate = useNavigate();
  const meta = useMeta();
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [widgets, setWidgets] = useState<DashboardWidgets | null>(null);
  const [projects, setProjects] = useState<Project[]>([]);
  const [insights, setInsights] = useState<Insight[]>([]);
  const [updates, setUpdates] = useState<Update[]>([]);
  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState<ReadonlyArray<Item>>(loadLayout);
  const [stage, setStage] = useState<{ label: string; value: string }>({ label: '全部阶段', value: '' });
  const [q, setQ] = useState('');
  const [cands, setCands] = useState<AddressCandidate[]>([]);
  const [searching, setSearching] = useState(false);

  useEffect(() => {
    setLoading(true);
    Promise.all([api.dashboard(), api.projects(), api.widgets(), api.updates(20).catch(() => [] as Update[])])
      .then(async ([s, p, w, u]) => { setSummary(s); setProjects(p); setWidgets(w); setUpdates(u); setInsights(await loadInsights(p)); })
      .finally(() => setLoading(false));
  }, []);

  const filtered = useMemo(() => (stage.value ? projects.filter((p) => p.stage === stage.value) : projects), [projects, stage]);
  const { items: rows, collectionProps, filterProps, paginationProps } = useCollection(filtered, {
    filtering: {
      filteringFunction: (item, s) => { const t = s.toLowerCase(); return item.name.toLowerCase().includes(t) || item.property.address_std.toLowerCase().includes(t); },
      empty: <Box textAlign="center" color="inherit"><b>还没有项目</b><Box padding={{ bottom: 's' }} variant="p" color="inherit">输入一个地址，系统会自动补全房产数据。</Box><Button variant="primary" onClick={() => navigate('/projects/new')}>新建项目</Button></Box>,
      noMatch: <Box textAlign="center" color="inherit"><b>没有匹配的项目</b></Box>,
    },
    pagination: { pageSize: 10 },
    sorting: { defaultState: { sortingColumn: { sortingField: 'updated_at' }, isDescending: true } },
  });

  const recent = [...projects].sort((a, b) => (a.updated_at < b.updated_at ? 1 : -1)).slice(0, 3);
  const stageOptions = [{ label: '全部阶段', value: '' }, ...(meta?.stages ?? [])];
  const head = headline(insights, projects);
  const active = projects.filter((p) => p.stage === 'active');
  const go = (href: string) => navigate(href);
  const projLink = (id: number, name: string) => <Link href={`/projects/${id}`} onFollow={(e) => { e.preventDefault(); go(`/projects/${id}`); }}>{name}</Link>;

  const table = (
    <Table
      {...collectionProps}
      items={rows}
      loading={loading}
      loadingText="加载中"
      variant={listOnly ? 'container' : 'embedded'}
      resizableColumns
      onRowClick={({ detail }) => go(`/projects/${detail.item.id}`)}
      header={listOnly ? <Header variant="h2" counter={`(${filtered.length})`} actions={<Button variant="primary" onClick={() => go('/projects/new')}>新建项目</Button>}><ReviewTag id="A" />项目列表</Header> : undefined}
      filter={
        <SpaceBetween direction="horizontal" size="xs">
          <TextFilter {...filterProps} filteringPlaceholder="按项目名或地址查找" countText={`${rows.length} 个匹配`} />
          <Select selectedOption={stage} options={stageOptions} onChange={({ detail }) => setStage(detail.selectedOption as any)} />
        </SpaceBetween>
      }
      pagination={<Pagination {...paginationProps} />}
      columnDefinitions={[
        { id: 'name', header: '项目', sortingField: 'name', minWidth: 260, cell: (p) => (
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <CoverImage propertyId={p.property.id} width={56} height={40} radius={6} showLabel={false} />
            <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0 }}>
              {projLink(p.id, p.name)}
              <Box variant="small" color="text-body-secondary">{p.property.address_std}</Box>
            </div>
          </div>
        ) },
        { id: 'stage', header: '阶段', sortingField: 'stage', cell: (p) => `${labelOf(meta?.stages, p.stage)} · ${labelOf(meta?.substages[p.stage], p.substage)}` },
        { id: 'status', header: '状态', sortingField: 'status', cell: (p) => <StatusBadge status={p.status} /> },
        { id: 'budget', header: '预算已用', sortingField: 'budget_used_pct', cell: (p) => ((p.budget_planned ?? 0) > 0 ? `${pct(p.budget_used_pct)}（${money(p.budget_spent)} / ${money(p.budget_planned)}）` : '—') },
        { id: 'arv', header: '目标售价', sortingField: 'target_arv', cell: (p) => money(p.target_arv) },
        { id: 'updated', header: '更新', sortingField: 'updated_at', cell: (p) => dateStr(p.updated_at) },
      ]}
    />
  );

  if (listOnly) {
    return (
      <ContentLayout
        breadcrumbs={<BreadcrumbGroup items={[{ text: '工作台', href: '/' }, { text: '项目', href: '/projects' }]} onFollow={(e) => { e.preventDefault(); go(e.detail.href); }} />}
        header={<Header variant="h1" description="按阶段筛选，点任意一行进入项目。">所有项目</Header>}
      >
        {table}
      </ContentLayout>
    );
  }

  const empty = (t: string) => <Box textAlign="center" color="inherit" padding="l">{loading ? '正在读取…' : t}</Box>;

  const widget = (id: WidgetId) => {
    switch (id) {
      case 'attention': {
        const bar: Record<string, string> = { error: '#d91515', warning: '#8d6605', info: '#0972d3' };
        const bg: Record<string, string> = { error: '#fff5f5', warning: '#fffbf0', info: '#f3f8ff' };
        return insights.length ? (
          <SpaceBetween size="xs">
            {insights.slice(0, 8).map((i, k) => (
              <div key={k} role="button" tabIndex={0} onClick={() => go(i.href)} onKeyDown={(e) => { if (e.key === 'Enter') go(i.href); }}
                style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) auto', gap: 8, alignItems: 'center', padding: '8px 10px 8px 12px', borderLeft: `4px solid ${bar[i.level]}`, background: bg[i.level], borderRadius: 6, cursor: 'pointer' }}>
                <div style={{ minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 2 }}>
                    <span style={{ fontSize: 11, fontWeight: 700, color: bar[i.level], border: `1px solid ${bar[i.level]}`, borderRadius: 10, padding: '0 7px', whiteSpace: 'nowrap' }}>{i.tag}</span>
                    <span style={{ fontWeight: 700, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{i.projectName}</span>
                  </div>
                  <div style={{ fontSize: 14 }}>{i.headline}</div>
                  {i.detail && <Box variant="small" color="text-body-secondary">{i.detail}</Box>}
                </div>
                <Link href={i.href} onFollow={(e) => { e.preventDefault(); go(i.href); }}>去看看</Link>
              </div>
            ))}
          </SpaceBetween>
        ) : empty('所有项目都在正轨上，没有需要处理的事。');
      }
      case 'money':
        return (
          <BulletList
            rows={active.map((p) => ({ key: String(p.id), label: projLink(p.id, p.name), actual: p.budget_spent ?? 0, target: p.budget_planned ?? 0 }))}
            format={compactMoney}
            overAt={1.0}
            targetLabel="预算"
            emptyText={loading ? '正在读取…' : '没有在建项目'}
          />
        );
      case 'stages':
        return (
          <StackedBar
            segments={[{ label: '线索', value: summary?.leads ?? 0 }, { label: '在建', value: summary?.active ?? 0 }, { label: '已完成', value: summary?.portfolio ?? 0 }]}
            format={(n) => `${n} 套`}
            emptyText={loading ? '正在读取…' : '还没有项目'}
          />
        );
      case 'recent':
        return (
          <Cards variant="full-page" cardsPerRow={[{ cards: 1 }, { minWidth: 500, cards: 3 }]} items={recent} loading={loading}
            cardDefinition={{
              header: (p) => <Link fontSize="heading-s" href={`/projects/${p.id}`} onFollow={(e) => { e.preventDefault(); go(`/projects/${p.id}`); }}>{p.name}</Link>,
              sections: [
                { id: 'img', content: (p) => <CoverImage propertyId={p.property.id} height={110} radius={8} /> },
                { id: 'meta', content: (p) => (
                  <SpaceBetween size="xxs">
                    <Box variant="small" color="text-body-secondary">{p.property.address_std}</Box>
                    <SpaceBetween direction="horizontal" size="xs"><StatusBadge status={p.status} /><Box variant="small">{labelOf(meta?.stages, p.stage)} · {labelOf(meta?.substages[p.stage], p.substage)}</Box></SpaceBetween>
                    {(p.budget_planned ?? 0) > 0 && <Meter value={p.budget_spent ?? 0} max={p.budget_planned ?? 0} label="预算已用" reading={`${compactMoney(p.budget_spent)} / ${compactMoney(p.budget_planned)}`} height={6} />}
                  </SpaceBetween>
                ) },
              ],
            }} />
        );
      case 'list':
        return table;
      case 'updates':
        return <UpdatesList items={updates} showProject onGo={go} emptyText={loading ? '正在读取…' : '还没有人更新过。'} />;
      case 'turns': {
        const turns = projects.filter((p) => p.stage !== 'portfolio' && (p.stage_progress?.length ?? 0) > 0);
        const goProject = (p: Project) => {
          const n = p.next_up[0];
          go(n ? `/projects/${p.id}?tab=overview&step=${n.key}` : `/projects/${p.id}?tab=overview`);
        };
        return turns.length ? (
          <Cards variant="full-page" cardsPerRow={[{ cards: 1 }, { minWidth: 520, cards: 2 }, { minWidth: 900, cards: 3 }]} items={turns} loading={loading}
            cardDefinition={{
              header: (p) => (
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 8 }}>
                  <Link fontSize="heading-s" href={`/projects/${p.id}`} onFollow={(e) => { e.preventDefault(); goProject(p); }}>{p.name}</Link>
                  <Box variant="small" color="text-body-secondary">{p.current_stage?.label}</Box>
                </div>
              ),
              sections: [
                { id: 'img', content: (p) => (
                  <div style={{ position: 'relative' }}>
                    <CoverImage propertyId={p.property.id} height={96} radius={8} showLabel={false} />
                    <div style={{ position: 'absolute', top: 8, right: 8 }}><StatusBadge status={p.status} /></div>
                  </div>
                ) },
                { id: 'track', content: (p) => {
                  const cur = p.stage_progress.find((s) => s.key === p.current_stage?.key);
                  return (
                    <SpaceBetween size="xxs">
                      <Box variant="small" color="text-body-secondary">{p.property.address_std}</Box>
                      <Box fontSize="body-s">{cur ? `${cur.label} · 这段做了 ${cur.done}/${cur.total}` : p.current_stage?.label}<Box variant="span" color="text-body-secondary">　大节点过了 {p.stage_progress.filter((s) => s.gate_done).length}/5</Box></Box>
                    </SpaceBetween>
                  );
                } },
                { id: 'next', header: '轮到', content: (p) => (
                  p.next_up.length ? (
                    <SpaceBetween size="xxs">
                      {p.next_up.slice(0, 2).map((n) => (
                        <span key={n.key} style={{ display: 'inline-flex', alignItems: 'center', gap: 2 }}>
                          {n.gate && <span style={{ width: 9, height: 9, transform: 'rotate(45deg)', border: '2px solid #0972d3', borderRadius: 2, marginRight: 6, flexShrink: 0 }} />}
                          {n.owners.map((o) => <OwnerDot key={o} code={o} />)}<span style={{ fontWeight: n.gate ? 700 : 400 }}>{n.title}</span>
                        </span>
                      ))}
                    </SpaceBetween>
                  ) : <Box color="text-body-secondary">这段的事都做完了</Box>
                ) },
                { id: 'warn', content: (p) => (p.earlier_undone_count > 0 ? <StatusIndicator type="warning">前面 {p.earlier_undone_count} 项没确认</StatusIndicator> : <Box variant="small" color="text-status-success">前面的都确认了</Box>) },
              ],
            }} />
        ) : empty(loading ? '正在读取…' : '没有在进行中的房子。');
      }
      case 'upcoming': {
        const ups = widgets?.upcoming ?? [];
        return ups.length ? (
          <SpaceBetween size="s">
            {ups.map((u, k) => (
              <div key={k} style={{ display: 'flex', gap: 12, alignItems: 'baseline' }}>
                <Box fontWeight="bold" color="text-body-secondary"><span style={{ display: 'inline-block', minWidth: 44 }}>{shortDate(u.date)}</span></Box>
                <StatusIndicator type={u.days < 0 ? (u.overdue ? 'error' : 'stopped') : u.days <= 7 ? 'warning' : 'info'}>{u.kind}</StatusIndicator>
                <span>{projLink(u.project_id, u.project_name)} <Box variant="span" color="text-body-secondary">{u.days < 0 ? `${-u.days} 天前` : u.days === 0 ? '今天' : `${u.days} 天后`}</Box></span>
              </div>
            ))}
          </SpaceBetween>
        ) : empty('未来 30 天没有关键日期。');
      }
      case 'capital': {
        const caps = widgets?.capital ?? [];
        const total = caps.reduce((a, r) => a + r.total, 0);
        return caps.length ? (
          <SpaceBetween size="s">
            <Box color="text-body-secondary">在建项目合计压着 <b>{fullMoney(total)}</b>（买入价 + 已支出）</Box>
            <HBars rows={caps.map((r) => ({ key: String(r.project_id), label: projLink(r.project_id, r.project_name), values: [r.purchase_price, r.spent], tooltipTitle: r.project_name }))} series={['买入价', '已支出']} format={compactMoney} />
          </SpaceBetween>
        ) : empty('没有在建项目');
      }
      case 'retro': {
        const rs = widgets?.retrospectives ?? [];
        return (
          <Table variant="embedded" items={rs} empty={empty('还没有带成交价的已完成项目')}
            columnDefinitions={[
              { id: 'n', header: '项目', cell: (r) => projLink(r.project_id, r.project_name) },
              { id: 't', header: '目标售价', cell: (r) => money(r.target_arv) },
              { id: 's', header: '成交价', cell: (r) => money(r.sale_price) },
              { id: 'se', header: '售价偏差', cell: (r) => <DeltaBadge pct={r.arv_error_pct} goodWhenPositive /> },
              { id: 'b', header: '预算', cell: (r) => money(r.budget_planned) },
              { id: 'a', header: '实际支出', cell: (r) => money(r.spent) },
              { id: 'be', header: '预算偏差', cell: (r) => <DeltaBadge pct={r.budget_error_pct} goodWhenPositive={false} /> },
              { id: 'p', header: '实际利润', cell: (r) => money(r.profit) },
              { id: 'd', header: '工期', cell: (r) => (r.days == null ? '—' : `${r.days} 天`) },
            ]} />
        );
      }
      case 'weekly': {
        const ws = widgets?.weekly_spend ?? [];
        const total = ws.reduce((a, r) => a + r.amount, 0);
        return ws.length ? (
          <SpaceBetween size="s">
            <Box color="text-body-secondary">12 周共支出 <b>{fullMoney(total)}</b>，每周平均 {compactMoney(total / ws.length)}</Box>
            <Trend points={ws.map((r) => ({ x: shortDate(r.week_start), y: r.amount }))} format={compactMoney} height={170} />
          </SpaceBetween>
        ) : empty('没有支出记录');
      }
      case 'vendors': {
        const vs = widgets?.vendors ?? [];
        const vmax = Math.max(...vs.map((v) => v.amount), 1);
        return (
          <Table variant="embedded" items={vs} empty={empty('没有供应商支出')}
            columnDefinitions={[
              { id: 'v', header: '供应商', cell: (r) => r.vendor },
              { id: 'a', header: '金额', minWidth: 200, cell: (r) => <InlineBar value={r.amount} max={vmax} text={fullMoney(r.amount)} width={100} /> },
              { id: 'c', header: '笔数', cell: (r) => r.count },
              { id: 'p', header: '项目数', cell: (r) => r.projects },
            ]} />
        );
      }
      case 'funnel': {
        const fs = widgets?.funnel ?? [];
        return fs.length ? (
          <HBars rows={fs.map((r) => ({ key: r.substage, label: r.label, values: [r.count] }))} ordinal format={(n) => `${n} 条`} labelWidth={72} />
        ) : empty('没有线索');
      }
    }
  };

  const hidden = (Object.keys(WIDGETS) as WidgetId[]).filter((id) => !items.some((i) => i.id === id));

  return (
    <ContentLayout
      maxContentWidth={1400}
      header={
        <Header
          variant="h1"
          description={head.subtitle}
          actions={
            <SpaceBetween direction="horizontal" size="xs">
              <ButtonDropdown
                items={hidden.length ? hidden.map((id) => ({ id, text: `${WIDGETS[id].tag} · ${WIDGETS[id].title}` })) : [{ id: 'none', text: '所有小组件都在看板上', disabled: true }]}
                onItemClick={({ detail }) => { if (detail.id !== 'none') { const next = [...items, mkItem(detail.id as WidgetId)]; setItems(next); saveLayout(next); } }}
              >添加小组件</ButtonDropdown>
              <Button variant="primary" onClick={() => go('/projects/new')}>新建项目</Button>
            </SpaceBetween>
          }
        >
          {head.title}
        </Header>
      }
    >
      <SpaceBetween size="l">
        <Container header={<Header variant="h2"><ReviewTag id="A" />今日概览</Header>}>
          <Grid gridDefinition={[{ colspan: { default: 12, m: 5 } }, { colspan: { default: 12, m: 7 } }]}>
            <FormField label="从一个地址开始" description="输入地址，系统自动补全房产数据并预填交易分析。">
              <Autosuggest
                value={q}
                placeholder="例如 4928 NW Fisk Ave"
                ariaLabel="按地址新建项目"
                options={cands.map((c) => ({ value: c.label, label: c.label, description: `${c.city}, ${c.state} ${c.zip}` }))}
                filteringType="manual"
                statusType={searching ? 'loading' : 'finished'}
                loadingText="查找中"
                empty="没有找到地址。试试 Fisk、Parkville、Alvarado。"
                enteredTextLabel={(v) => `用“${v}”新建`}
                onChange={({ detail }) => setQ(detail.value)}
                onLoadItems={async ({ detail }) => {
                  if (detail.filteringText.length < 2) { setCands([]); return; }
                  setSearching(true);
                  try { setCands(await api.lookupAddress(detail.filteringText)); } finally { setSearching(false); }
                }}
                onSelect={({ detail }) => { const v = detail.selectedOption?.value ?? detail.value; go(`/projects/new?address=${encodeURIComponent(v)}`); }}
              />
            </FormField>
            <ColumnLayout columns={4} minColumnWidth={120} variant="text-grid">
              <Stat label="线索" value={String(summary?.leads ?? '—')} sub={`${projects.filter((p) => p.lead_heat === 'hot_lead').length} 条热线索`} />
              <Stat label="在建" value={String(summary?.active ?? '—')} sub={`${summary?.over_budget_count ?? 0} 个超预算`} />
              <Stat label="已投入" value={compactMoney(summary?.total_invested)} sub="在建项目买入价 + 已支出" />
              <Stat label="预计利润" value={compactMoney(summary?.expected_profit)} sub="在建：目标售价 − 买入 − 装修" />
            </ColumnLayout>
          </Grid>
        </Container>

        <Board
          items={items}
          i18nStrings={boardI18n}
          onItemsChange={({ detail }) => { setItems(detail.items); saveLayout(detail.items); }}
          empty={<Box textAlign="center" color="inherit"><b>看板是空的</b><Box variant="p" color="inherit">用右上角“添加小组件”加回来。</Box></Box>}
          renderItem={(item, actions) => (
            <BoardItem
              header={<Header variant="h2"><ReviewTag id={item.data.tag} />{item.data.title}</Header>}
              i18nStrings={itemI18n}
              settings={<Button variant="icon" iconName="close" ariaLabel="移除小组件" onClick={() => actions.removeItem()} />}
            >
              {widget(item.id as WidgetId)}
            </BoardItem>
          )}
        />
      </SpaceBetween>
    </ContentLayout>
  );
}
