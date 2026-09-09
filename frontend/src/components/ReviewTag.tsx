import { createContext, useContext } from 'react';

/** 评审标注开关。开会时打开，平时可关。 */
export const ReviewContext = createContext<boolean>(true);
export const useReviewOn = () => useContext(ReviewContext);

/** 纽约地铁线路牌样式：黄底黑字粗体圆标。放在功能块标题前，供会议口头引用（如“总览 C”）。 */
export default function ReviewTag({ id }: { id: string }) {
  const on = useReviewOn();
  if (!on) return null;
  return (
    <span
      aria-label={`评审标注 ${id}`}
      title={`评审标注 ${id}`}
      style={{
        display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
        width: 22, height: 22, borderRadius: '50%', background: '#FCCC0A', color: '#000',
        fontFamily: '"Helvetica Neue", Helvetica, Arial, sans-serif', fontWeight: 700, fontSize: 13, lineHeight: 1,
        marginRight: 8, verticalAlign: 'middle', flexShrink: 0, userSelect: 'none',
      }}
    >
      {id}
    </span>
  );
}
