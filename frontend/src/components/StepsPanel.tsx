import { useCallback, useEffect, useState } from 'react';
import Box from '@cloudscape-design/components/box';
import Checkbox from '@cloudscape-design/components/checkbox';
import ExpandableSection from '@cloudscape-design/components/expandable-section';
import SpaceBetween from '@cloudscape-design/components/space-between';
import Spinner from '@cloudscape-design/components/spinner';
import StatusIndicator from '@cloudscape-design/components/status-indicator';
import { api, Steps } from '../api/client';
import { useActor } from '../lib/actor';
import { useFlash } from '../lib/flash';
import { OwnerDot } from './OwnerTag';

const shortTime = (iso: string | null) => (iso ? iso.slice(5, 16).replace('T', ' ').replace('-', '/') : '');

/** 总览里的“现在到哪一步”：负责人手写的六个阶段，每项带负责人蓝圆标；有证据自动打勾，没证据手动勾。 */
export default function StepsPanel({ projectId, onChanged }: { projectId: number; onChanged?: () => void }) {
  const flash = useFlash();
  const { actor } = useActor();
  const [steps, setSteps] = useState<Steps | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  const load = useCallback(() => api.steps(projectId).then(setSteps), [projectId]);
  useEffect(() => { load(); }, [load]);

  if (!steps) return <Box textAlign="center" padding="m"><Spinner /></Box>;

  const toggle = async (key: string, done: boolean) => {
    setBusy(key);
    try {
      setSteps(await api.toggleStep(projectId, key, { done }));
      flash({ type: 'success', content: `${actor} ${done ? '已确认完成' : '已取消'}` });
      onChanged?.();
    } catch (e: any) {
      flash({ type: 'error', content: `没保存上：${e.message}` });
    } finally {
      setBusy(null);
    }
  };

  const cur = steps.current_stage;
  return (
    <SpaceBetween size="m">
      <div>
        <Box fontSize="heading-m" fontWeight="bold">
          现在在{cur.label}
        </Box>
        {steps.next_up.length ? (
          <Box color="text-body-secondary" margin={{ top: 'xxs' }}>
            轮到：{steps.next_up.map((n, i) => (
              <span key={n.key} style={{ whiteSpace: 'nowrap' }}>
                {i > 0 && '　'}
                {n.owners.map((o) => <OwnerDot key={o} code={o} />)}
                <span style={{ fontWeight: n.gate ? 700 : 400 }}>{n.title}</span>
              </span>
            ))}
          </Box>
        ) : (
          <Box color="text-body-secondary" margin={{ top: 'xxs' }}>这个阶段的事都完成了。</Box>
        )}
        {steps.earlier_undone.length > 0 && (
          <Box margin={{ top: 'xs' }}>
            <StatusIndicator type="warning">前面还有 {steps.earlier_undone.length} 项没确认：{steps.earlier_undone.map((e) => e.title).join('、')}</StatusIndicator>
          </Box>
        )}
      </div>

      {steps.stages.map((st) => (
        <ExpandableSection
          key={st.key}
          variant="footer"
          defaultExpanded={st.key === cur.key}
          headerText={`${st.label}　${st.done_count} / ${st.total}`}
        >
          <SpaceBetween size="xs">
            {st.items.map((it) => (
              <div key={it.key} style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1.3fr) minmax(0, 1fr)', gap: 12, alignItems: 'center' }}>
                <Checkbox
                  checked={it.done}
                  disabled={it.how === 'auto' || busy === it.key}
                  onChange={({ detail }) => toggle(it.key, detail.checked)}
                >
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 2 }}>
                    {it.owners.map((o) => <OwnerDot key={o} code={o} />)}
                    <span style={{ fontWeight: it.gate ? 700 : 400, marginLeft: 4, whiteSpace: 'normal' }}>{it.title}</span>
                  </span>
                </Checkbox>
                <Box variant="small" color="text-body-secondary" textAlign="right">
                  {/* 证据或谁勾的 */}
                  {it.how === 'auto' ? it.evidence
                    : it.how === 'manual' ? `${it.done_by ?? ''} 确认 · ${shortTime(it.done_at)}${it.note ? ` · ${it.note}` : ''}`
                    : it.can_auto ? '上传对应文件或填日期后自动打勾，也可以手动勾' : '做完请手动勾'}
                </Box>
              </div>
            ))}
          </SpaceBetween>
        </ExpandableSection>
      ))}
    </SpaceBetween>
  );
}
