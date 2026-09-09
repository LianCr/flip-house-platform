import { useCallback, useEffect, useState } from 'react';
import Box from '@cloudscape-design/components/box';
import ColumnLayout from '@cloudscape-design/components/column-layout';
import Container from '@cloudscape-design/components/container';
import Header from '@cloudscape-design/components/header';
import KeyValuePairs from '@cloudscape-design/components/key-value-pairs';
import SpaceBetween from '@cloudscape-design/components/space-between';
import Spinner from '@cloudscape-design/components/spinner';
import Table from '@cloudscape-design/components/table';
import Tabs from '@cloudscape-design/components/tabs';
import FieldWithSource from '../../components/FieldWithSource';
import { api, PropertyData } from '../../api/client';
import { useFlash } from '../../lib/flash';
import { dateStr, money, pct, text } from '../../lib/format';
import ReviewTag from '../../components/ReviewTag';

export default function DataTab({ projectId, reload }: { projectId: number; reload: () => Promise<any> }) {
  const flash = useFlash();
  const [data, setData] = useState<PropertyData | null>(null);

  const load = useCallback(() => api.propertyData(projectId).then(setData), [projectId]);
  useEffect(() => { load(); }, [load]);

  if (!data) return <Box padding="l" textAlign="center"><Spinner /></Box>;

  const conflicts = data.fields.filter((f) => f.has_conflict).length;

  return (
    <Tabs
      tabs={[
        {
          id: 'specs',
          label: '房产规格',
          content: (
            <Container header={<Header variant="h2" description={conflicts ? `${conflicts} 个字段存在来源冲突，请点开红色标记选择主值。` : '每个字段右侧是主值来源，悬停可看时间与把握度。'}><ReviewTag id="A" />房产、结构与地块</Header>}>
              <ColumnLayout columns={3} variant="text-grid">
                {data.fields.map((f) => (
                  <FieldWithSource
                    key={f.key}
                    field={f}
                    onSave={async (v) => { setData(await api.patchField(projectId, f.key, v)); await reload(); flash({ type: 'success', content: `${f.label} 已更新，来源标记为“人工”` }); }}
                    onSetPrimary={async (sid) => { setData(await api.setPrimary(projectId, f.key, sid)); await reload(); }}
                  />
                ))}
              </ColumnLayout>
            </Container>
          ),
        },
        {
          id: 'owner',
          label: '业主',
          content: (
            <Container header={<Header variant="h2"><ReviewTag id="B" />业主信息</Header>}>
              {data.owner ? (
                <KeyValuePairs columns={3} items={[
                  { label: '业主', value: text(data.owner.name) },
                  { label: '邮寄地址', value: text(data.owner.mailing_address) },
                  { label: '持有自', value: dateStr(data.owner.owner_since) },
                  { label: '电话', value: text(data.owner.phone) },
                  { label: '邮箱', value: text(data.owner.email) },
                ]} />
              ) : <Box color="text-body-secondary">无业主信息</Box>}
            </Container>
          ),
        },
        {
          id: 'mortgage',
          label: '按揭',
          content: (
            <Table
              header={<Header variant="h2" counter={`(${data.mortgages.length})`}><ReviewTag id="C" />当前按揭</Header>}
              items={data.mortgages}
              empty={<Box textAlign="center" color="inherit">无按揭记录</Box>}
              columnDefinitions={[
                { id: 'd', header: '登记日期', cell: (m) => dateStr(m.recording_date) },
                { id: 'l', header: '贷方', cell: (m) => text(m.lender) },
                { id: 't', header: '类型', cell: (m) => text(m.loan_type) },
                { id: 'term', header: '期限（月）', cell: (m) => text(m.term_months) },
                { id: 'o', header: '原始金额', cell: (m) => money(m.original_balance) },
                { id: 'e', header: '估算余额', cell: (m) => money(m.est_balance) },
                { id: 'r', header: '利率', cell: (m) => pct(m.rate, 2) },
                { id: 'p', header: '月供', cell: (m) => money(m.payment) },
              ]}
            />
          ),
        },
        {
          id: 'history',
          label: '历史',
          content: (
            <SpaceBetween size="l">
              <Table
                header={<Header variant="h2" counter={`(${data.sales_history.length})`}><ReviewTag id="D" />成交史</Header>}
                items={data.sales_history}
                empty={<Box textAlign="center" color="inherit">无成交记录</Box>}
                columnDefinitions={[
                  { id: 'd', header: '登记日期', cell: (s) => dateStr(s.recording_date) },
                  { id: 's', header: '卖方', cell: (s) => text(s.seller) },
                  { id: 'b', header: '买方', cell: (s) => text(s.buyer) },
                  { id: 't', header: '契约类型', cell: (s) => text(s.doc_type) },
                  { id: 'a', header: '金额', cell: (s) => money(s.amount) },
                ]}
              />
            </SpaceBetween>
          ),
        },
      ]}
    />
  );
}
