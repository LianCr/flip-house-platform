import { useActor } from './actor';
import { useMeta } from './meta';

export type Tier = 'purple' | 'blue' | 'teal' | 'grey';
export const TIER_FALLBACK: Record<Tier, { label: string; color: string }> = {
  purple: { label: '决策', color: '#7A3EE8' }, blue: { label: '统筹', color: '#0972D3' }, teal: { label: '执行', color: '#0E8A8A' }, grey: { label: '外部', color: '#7D8998' },
};

/** 当前身份是谁、哪一级、什么颜色、能做什么。没登录，全靠顶栏“我是”。 */
export function useRole() {
  const { actor } = useActor();
  const meta = useMeta();
  const role = meta?.roles.find((r) => r.code === actor);
  const tier: Tier = (role?.tier as Tier) ?? 'blue';
  const tierInfo = meta?.tiers?.[tier] ?? TIER_FALLBACK[tier];
  const can = (action: string, ...extraOk: string[]) => {
    const ok = meta?.permissions?.[action] ?? ['purple', 'blue'];
    return ok.includes(tier) || ok.includes(actor) || extraOk.includes(actor);
  };
  return { actor, tier, color: tierInfo.color, tierLabel: tierInfo.label, duties: role?.duties ?? '', can, canReadMoney: can('read_money') };
}

export function tierOf(meta: ReturnType<typeof useMeta>, code: string): Tier {
  return (meta?.roles.find((r) => r.code === code)?.tier as Tier) ?? 'grey';
}
export function colorOf(meta: ReturnType<typeof useMeta>, code: string): string {
  const t = tierOf(meta, code);
  return meta?.tiers?.[t]?.color ?? TIER_FALLBACK[t].color;
}
