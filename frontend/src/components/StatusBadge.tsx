import StatusIndicator, { StatusIndicatorProps } from '@cloudscape-design/components/status-indicator';
import { useMeta } from '../lib/meta';

const KIND: Record<string, StatusIndicatorProps.Type> = {
  on_track: 'success', off_track: 'error', at_risk: 'warning', hot_lead: 'info', warm_lead: 'pending', done: 'success',
};

export default function StatusBadge({ status, reason }: { status: string; reason?: string }) {
  const meta = useMeta();
  const label = meta?.statuses.find((s) => s.value === status)?.label ?? status;
  return <StatusIndicator type={KIND[status] ?? 'info'}>{label}{reason ? '' : ''}</StatusIndicator>;
}
