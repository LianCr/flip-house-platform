import Box from '@cloudscape-design/components/box';
import Link from '@cloudscape-design/components/link';
import SpaceBetween from '@cloudscape-design/components/space-between';
import { Update } from '../api/client';
import { OwnerDot } from './OwnerTag';

const KIND_TAB: Record<string, string> = { file: 'files', data: 'data', expense: 'budget', budget: 'budget', analysis: 'analysis', step: 'overview', project: 'overview' };
const when = (iso: string) => iso.slice(5, 16).replace('T', ' ').replace('-', '/');

/** “谁更新了什么”列表：时间 · 蓝圆标 · 一句话。工作台和项目页共用。 */
export default function UpdatesList({ items, showProject, onGo, emptyText = '还没有更新记录。' }: { items: Update[]; showProject?: boolean; onGo: (href: string) => void; emptyText?: string }) {
  if (!items.length) return <Box color="text-body-secondary">{emptyText}</Box>;
  return (
    <SpaceBetween size="xs">
      {items.map((u) => {
        const href = `/projects/${u.project_id}?tab=${KIND_TAB[u.kind] ?? 'overview'}`;
        return (
          <div key={u.id} style={{ display: 'grid', gridTemplateColumns: '78px auto minmax(0, 1fr)', gap: 8, alignItems: 'baseline' }}>
            <Box variant="small" color="text-body-secondary">{when(u.created_at)}</Box>
            <OwnerDot code={u.actor} />
            <Box>
              {showProject && u.project_name && <><Link href={href} onFollow={(e) => { e.preventDefault(); onGo(href); }}>{u.project_name}</Link>　</>}
              {u.text}
              {!showProject && <>　<Link href={href} variant="secondary" onFollow={(e) => { e.preventDefault(); onGo(href); }}>去看</Link></>}
            </Box>
          </div>
        );
      })}
    </SpaceBetween>
  );
}
