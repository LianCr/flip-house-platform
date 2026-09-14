import { useCallback, useEffect, useState } from 'react';
import Box from '@cloudscape-design/components/box';
import ContentLayout from '@cloudscape-design/components/content-layout';
import Header from '@cloudscape-design/components/header';
import { api, TodoRow } from '../api/client';
import MyTodoTable from '../components/MyTodoTable';
import ReviewTag from '../components/ReviewTag';
import { useRole } from '../lib/role';

/** 我的待办页：表体在 MyTodoTable，工作台小组件复用同一个。 */
export default function MyTodo() {
  const role = useRole();
  const [rows, setRows] = useState<TodoRow[] | null>(null);
  const load = useCallback(async () => { setRows((await api.dashboardRole()).my_todo ?? []); }, []);
  useEffect(() => { setRows(null); load().catch(() => setRows([])); }, [load, role.actor]);
  return (
    <ContentLayout header={<Header variant="h1" description={`你是 ${role.actor}（${role.tierLabel}）。${role.duties}`}><ReviewTag id="A" />我的待办</Header>}>
      <MyTodoTable rows={rows} onReload={load} />
      <Box margin={{ top: 'm' }} variant="small" color="text-body-secondary">看不到金额和预算是正常的，这些只对决策和统筹级别显示。</Box>
    </ContentLayout>
  );
}
