import { useMeta } from '../lib/meta';
import { useActor } from '../lib/actor';
import { colorOf } from '../lib/role';

/** 蓝色圆标：这一块由谁负责。单字母画圆，多字（设计师 / 园丁 / 负责人 / ？）画胶囊。和黄色评审圆标并排。 */
export function OwnerDot({ code, title }: { code: string; title?: string }) {
  const meta = useMeta();
  const single = [...code].length === 1;
  const color = code === '?' ? '#5f6b7a' : colorOf(meta, code);
  const tierLabel = meta?.tiers?.[meta?.roles.find((r) => r.code === code)?.tier ?? '']?.label;
  return (
    <span
      title={title ?? `${code}${tierLabel ? `（${tierLabel}）` : ''}`}
      aria-label={title ?? `负责人：${code}`}
      style={{
        display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
        minWidth: 22, height: 22, borderRadius: 11, padding: single ? 0 : '0 7px',
        background: code === '?' ? '#fff' : color, color: code === '?' ? '#5f6b7a' : '#fff',
        border: code === '?' ? '1px dashed #8d99a8' : 'none',
        fontFamily: '"Helvetica Neue", Helvetica, Arial, sans-serif', fontWeight: 700, fontSize: single ? 13 : 11, lineHeight: 1,
        marginRight: 4, verticalAlign: 'middle', flexShrink: 0, userSelect: 'none', whiteSpace: 'nowrap',
      }}
    >
      {code}
    </span>
  );
}

/** 按功能块名从字典取负责人；也可直接传 codes。 */
export default function OwnerTag({ block, codes }: { block?: string; codes?: string[] }) {
  const meta = useMeta();
  const { actor } = useActor();
  const list = (codes ?? (block ? meta?.owner_map?.[block] : undefined) ?? []).map((c) => (c === '当前身份' ? actor : c));
  if (!list.length) return null;
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', marginRight: 6, verticalAlign: 'middle' }}>
      {list.map((c) => <OwnerDot key={c} code={c} />)}
    </span>
  );
}
