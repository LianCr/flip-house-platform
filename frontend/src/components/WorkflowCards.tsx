import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import ColumnLayout from '@cloudscape-design/components/column-layout';
import Container from '@cloudscape-design/components/container';
import Link from '@cloudscape-design/components/link';
import SpaceBetween from '@cloudscape-design/components/space-between';
import { api, Project } from '../api/client';
import { money, pct } from '../lib/format';
import ReviewTag from './ReviewTag';
import { Meter, StatTile } from './charts';

interface Card { title: string; value: string; note: string; href: string; action: string; meter?: { value: number; max: number } }

const KEY_FIELD_COUNT = 6;

function days(a: string | null, b: string | null): number | null {
  if (!a || !b) return null;
  return Math.round((new Date(b + 'T00:00:00').getTime() - new Date(a + 'T00:00:00').getTime()) / 86400000);
}

/** 项目页顶部的“本阶段要做的事”三张卡。全部来自现有数据。 */
export default function WorkflowCards({ project }: { project: Project }) {
  const navigate = useNavigate();
  const [fileCount, setFileCount] = useState<number | null>(null);
  const [hasPermit, setHasPermit] = useState(true);

  useEffect(() => {
    api.files(project.id).then((fs) => { setFileCount(fs.length); setHasPermit(fs.some((f) => f.doc_type === 'permit')); }).catch(() => setFileCount(0));
  }, [project.id, project.updated_at]);

  const base = `/projects/${project.id}`;
  const files: Card = {
    title: '文件登记',
    value: fileCount == null ? '…' : `${fileCount} 份`,
    note: project.stage === 'active' && !hasPermit ? '还没有登记许可证' : fileCount ? '合同、报告、发票都在这里' : '还没有登记任何文件',
    href: `${base}?tab=files`, action: '去登记',
  };

  let cards: Card[];
  if (project.stage === 'lead') {
    const filled = KEY_FIELD_COUNT - project.missing_fields.filter((m) => !m.includes('售价') && !m.includes('买入价')).length;
    cards = [
      { title: '数据完整度', value: `${filled} / ${KEY_FIELD_COUNT}`, note: project.missing_fields.length ? `还缺：${project.missing_fields.slice(0, 2).join('、')}` : '关键字段已齐', href: `${base}?tab=data`, action: '去补全' },
      { title: '交易分析', value: project.analysis_count ? `${project.analysis_count} 版` : '未算', note: project.target_arv ? `目标售价 ${money(project.target_arv)}` : '出价前先算一遍账', href: `${base}?tab=analysis`, action: project.analysis_count ? '看分析' : '去算账' },
      files,
    ];
  } else if (project.stage === 'active') {
    const left = days(new Date().toISOString().slice(0, 10), project.construction_end);
    cards = [
      { title: '预算已用', value: project.budget_planned ? pct(project.budget_used_pct) : '无预算', note: project.budget_planned ? `${money(project.budget_spent)} / ${money(project.budget_planned)}` : '先建预算项才能算占比', href: `${base}?tab=budget`, action: '看明细', meter: project.budget_planned ? { value: project.budget_spent, max: project.budget_planned } : undefined },
      { title: '距计划完工', value: left == null ? '未设' : left >= 0 ? `${left} 天` : `超期 ${-left} 天`, note: project.construction_end ? `计划 ${project.construction_end.replace(/-/g, '/')} 完工` : '在“编辑”里设置计划完工日', href: base, action: '去编辑' },
      files,
    ];
  } else {
    const profit = project.sale_price != null ? project.sale_price - (project.purchase_price ?? 0) - project.budget_spent : null;
    cards = [
      { title: '实际利润', value: profit == null ? '未知' : money(profit), note: project.sale_price ? `成交 ${money(project.sale_price)}，支出 ${money(project.budget_spent)}` : '填成交价后自动计算', href: `${base}?tab=budget`, action: '看账目' },
      { title: '总工期', value: (() => { const d = days(project.construction_start, project.construction_end); return d == null ? '未知' : `${d} 天`; })(), note: '开工到完工', href: base, action: '看日期' },
      files,
    ];
  }

  return (
    <ColumnLayout columns={3}>
      {cards.map((c, i) => (
        <Container key={c.title}>
          <SpaceBetween size="xs">
            <StatTile label={<><ReviewTag id={['B', 'C', 'D'][i]} />{c.title}</>} value={c.value} sub={c.note} extra={c.meter ? <Meter value={c.meter.value} max={c.meter.max} height={6} targetLabel="预算" /> : undefined} />
            <Link href={c.href} onFollow={(e) => { e.preventDefault(); navigate(c.href); }}>{c.action}</Link>
          </SpaceBetween>
        </Container>
      ))}
    </ColumnLayout>
  );
}
