import { useEffect, useState } from 'react';
import Alert from '@cloudscape-design/components/alert';
import Box from '@cloudscape-design/components/box';
import Button from '@cloudscape-design/components/button';
import Container from '@cloudscape-design/components/container';
import Grid from '@cloudscape-design/components/grid';
import Header from '@cloudscape-design/components/header';
import KeyValuePairs from '@cloudscape-design/components/key-value-pairs';
import SpaceBetween from '@cloudscape-design/components/space-between';
import Textarea from '@cloudscape-design/components/textarea';
import { useNavigate } from 'react-router-dom';
import StepsPanel from '../../components/StepsPanel';
import UpdatesList from '../../components/UpdatesList';
import OwnerTag from '../../components/OwnerTag';
import { BulletList, Meter, compactMoney } from '../../components/charts';
import StatusBadge from '../../components/StatusBadge';
import { api, BudgetSummary, Project, Update } from '../../api/client';
import { useFlash } from '../../lib/flash';
import { dateStr, money, num, pct, text } from '../../lib/format';
import ReviewTag from '../../components/ReviewTag';

export default function OverviewTab({ project, reload }: { project: Project; reload: () => Promise<any> }) {
  const flash = useFlash();
  const navigate = useNavigate();
  const [summary, setSummary] = useState<BudgetSummary | null>(null);
  const [updates, setUpdates] = useState<Update[]>([]);
  const [risks, setRisks] = useState(project.risks ?? '');
  const [savingRisks, setSavingRisks] = useState(false);

  useEffect(() => { api.budgetSummary(project.id).then(setSummary); }, [project.id, project.updated_at]);
  useEffect(() => { api.projectUpdates(project.id, 12).then(setUpdates).catch(() => setUpdates([])); }, [project.id, project.updated_at]);
  useEffect(() => { setRisks(project.risks ?? ''); }, [project.risks]);

  const cost = Math.max(project.budget_planned, project.budget_spent);
  const expectedProfit = project.target_arv != null ? project.target_arv - (project.purchase_price ?? 0) - cost : null;
  const cats = [...(summary?.categories ?? [])].sort((a, b) => b.planned - a.planned || b.spent - a.spent);
  const topCats = cats.slice(0, 6);
  const restCats = cats.slice(6);
  const bulletRows = [
    ...topCats.map((c) => ({ key: c.category, label: c.category, actual: c.spent, target: c.planned })),
    ...(restCats.length ? [{ key: '__rest', label: `其他（${restCats.length} 类）`, actual: restCats.reduce((a, c) => a + c.spent, 0), target: restCats.reduce((a, c) => a + c.planned, 0) }] : []),
  ];
  const overCats = cats.filter((c) => c.planned > 0 && c.spent > c.planned * 1.05).length;

  return (
    <SpaceBetween size="l">
      {project.missing_fields.length > 0 && (
        <Alert type="info" header={<><ReviewTag id="A" />数据完整度</>}>
          以下关键字段还没有值：{project.missing_fields.join('、')}。可在“数据”页或“编辑”中补充。
        </Alert>
      )}
      <Container header={<Header variant="h2" description="按负责人写的六个阶段。蓝圆标是谁负责；有文件或日期做证据的自动打勾，其余谁做完谁勾。"><ReviewTag id="B" />现在到哪一步</Header>}>
        <StepsPanel projectId={project.id} onChanged={() => { reload(); api.projectUpdates(project.id, 12).then(setUpdates).catch(() => undefined); }} />
      </Container>

      <Grid gridDefinition={[{ colspan: { default: 12, m: 6 } }, { colspan: { default: 12, m: 6 } }]}>
        <Container header={<Header variant="h2"><ReviewTag id="C" />关键信息</Header>}>
          <KeyValuePairs
            columns={2}
            items={[
              { label: '买入价', value: money(project.purchase_price) },
              { label: '目标售价（ARV）', value: money(project.target_arv) },
              { label: '装修预算', value: money(project.budget_planned) },
              { label: '预计利润', value: expectedProfit == null ? '—' : money(expectedProfit) },
              { label: '买入日期', value: dateStr(project.purchase_date) },
              { label: '开工日期', value: dateStr(project.construction_start) },
              { label: '计划完工', value: dateStr(project.construction_end) },
              { label: '挂牌日期', value: dateStr(project.list_date) },
              { label: '成交日期', value: dateStr(project.sale_date) },
              { label: '实际成交价', value: money(project.sale_price) },
              { label: '建筑面积', value: project.property.sqft ? `${num(project.property.sqft)} sqft` : '—' },
              { label: '户型', value: project.property.beds != null ? `${project.property.beds} 卧 ${project.property.baths_full ?? 0} 卫` : '—' },
              { label: '交易分析', value: project.analysis_count ? `${project.analysis_count} 个版本` : '未做' },
              { label: '挂牌价（市场）', value: money(project.property.list_price) },
            ]}
          />
        </Container>
        <Container header={<Header variant="h2" description={summary?.planned_total ? (overCats ? `灰底是预算，彩条是实际支出，红段是超出。${overCats} 个类别超支。` : '灰底是预算，彩条是实际支出，目前没有类别超支。') : '还没有预算项。'}><ReviewTag id="D" /><OwnerTag block="overview.budget" />预算：花在哪、哪超了</Header>}>
          <SpaceBetween size="l">
            {summary && summary.planned_total > 0 && (
              <Meter value={summary.spent_total} max={summary.planned_total} label="总预算已用" reading={`${compactMoney(summary.spent_total)} / ${compactMoney(summary.planned_total)}`} targetLabel="预算" note={summary.remaining >= 0 ? `剩余 ${compactMoney(summary.remaining)}` : `已超支 ${compactMoney(-summary.remaining)}`} />
            )}
            <BulletList rows={bulletRows} format={compactMoney} overAt={1.0} labelWidth={120} targetLabel="预算" emptyText="在“预算”页添加预算项后，这里按类别显示花了多少、超了没有。" />
          </SpaceBetween>
        </Container>
      </Grid>

      <Grid gridDefinition={[{ colspan: { default: 12, m: 6 } }, { colspan: { default: 12, m: 6 } }]}>
        <Container header={<Header variant="h2"><ReviewTag id="E" /><OwnerTag block="overview.status" />状态</Header>}>
          <SpaceBetween size="s">
            <StatusBadge status={project.status} />
            <Box color="text-body-secondary">{project.status_reason}</Box>
            <Box variant="small">规则：支出超预算 5% 为“有风险”；超过计划完工日且未挂牌为“落后”；线索阶段用人工标记的热度。可在“编辑”中人工覆盖。</Box>
          </SpaceBetween>
        </Container>
        <Container
          header={<Header variant="h2" actions={<Button loading={savingRisks} disabled={risks === (project.risks ?? '')} onClick={async () => { setSavingRisks(true); try { await api.patchProject(project.id, { risks: risks || null }); await reload(); flash({ type: 'success', content: '风险已保存' }); } finally { setSavingRisks(false); } }}>保存</Button>}><ReviewTag id="F" /><OwnerTag block="overview.risks" />风险</Header>}
        >
          <Textarea value={risks} rows={4} placeholder="记录已知风险，例如地基、屋顶、许可证问题。" onChange={({ detail }) => setRisks(detail.value)} />
        </Container>
      </Grid>
      {project.notes && (
        <Container header={<Header variant="h2"><ReviewTag id="G" /><OwnerTag block="overview.notes" />备注</Header>}>
          <Box>{text(project.notes)}</Box>
        </Container>
      )}
      <Container header={<Header variant="h2" counter={`(${updates.length})`} description="谁上传了文件、改了数据、记了支出、勾了清单，都在这里。"><ReviewTag id="H" /><OwnerTag block="overview.updates" />最近更新</Header>}>
        <UpdatesList items={updates} onGo={(href) => navigate(href)} />
      </Container>
    </SpaceBetween>
  );
}
