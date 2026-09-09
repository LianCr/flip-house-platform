// 图表配色：只用 Cloudscape 设计令牌（CSS 变量），不自造颜色。
// 规则：分类系列固定顺序取 1–5；状态色只表示好坏；有序数据用蓝色阶；文字用文本色令牌。
import * as T from '@cloudscape-design/design-tokens';

const tok = (name: string, fallback: string): string => ((T as unknown as Record<string, string>)[name] ?? fallback);

/** 分类系列（顺序固定，不按排名重新上色）。已用色盲可辨性脚本验证前 7 位。 */
export const SERIES = [
  tok('colorChartsPaletteCategorical1', '#688AE8'),
  tok('colorChartsPaletteCategorical2', '#C33D69'),
  tok('colorChartsPaletteCategorical3', '#2EA597'),
  tok('colorChartsPaletteCategorical4', '#8456CE'),
  tok('colorChartsPaletteCategorical5', '#E07941'),
  tok('colorChartsPaletteCategorical6', '#3759CE'),
  tok('colorChartsPaletteCategorical7', '#962249'),
];

/** 状态色：只在颜色表示“好 / 注意 / 超限”时使用。 */
export const STATUS = {
  good: tok('colorChartsStatusPositive', '#1D8102'),
  warning: tok('colorChartsStatusMedium', '#CC5F21'),
  serious: tok('colorChartsStatusHigh', '#BA2E0F'),
  critical: tok('colorChartsStatusCritical', '#7D2105'),
  neutral: tok('colorChartsStatusNeutral', '#879596'),
};

/** 有序（漏斗、档位）用一色渐深。 */
export const ORDINAL_BLUE = [
  tok('colorChartsBlue1400', '#8CBBFF'),
  tok('colorChartsBlue1500', '#5C9EF4'),
  tok('colorChartsBlue1600', '#3184C2'),
  tok('colorChartsBlue1700', '#1A6BB0'),
  tok('colorChartsBlue1800', '#0E5A9E'),
  tok('colorChartsBlue1900', '#084A8A'),
];

export const GRID = tok('colorChartsLineGrid', '#E9EBED');
export const AXIS = tok('colorChartsLineAxis', '#D1D5DB');
export const TEXT = tok('colorTextBodyDefault', '#0F1B2A');
export const TEXT_2 = tok('colorTextBodySecondary', '#414D5C');
export const TEXT_GOOD = tok('colorTextStatusSuccess', '#037F0C');
export const TEXT_BAD = tok('colorTextStatusError', '#D91515');
export const TEXT_WARN = tok('colorTextStatusWarning', '#8D6605');
export const SURFACE = tok('colorBackgroundContainerContent', '#FFFFFF');
export const BORDER = tok('colorBorderDividerDefault', '#C6C6CD');
export const FONT = tok('fontFamilyBase', '"Open Sans", "Helvetica Neue", Roboto, Arial, sans-serif');

/** 轨道 = 同色更浅一档（用 color-mix，避免自造颜色）。 */
export const track = (color: string, pctOfColor = 16) => `color-mix(in srgb, ${color} ${pctOfColor}%, ${SURFACE})`;

/** 按“实际 / 目标”比例给严重度颜色：正常用系列蓝，接近上限橙，超限红。 */
export function severityColor(ratio: number | null | undefined, warnAt = 0.9, overAt = 1.0): string {
  if (ratio == null || !Number.isFinite(ratio)) return SERIES[0];
  if (ratio > overAt) return STATUS.serious;
  if (ratio >= warnAt) return STATUS.warning;
  return SERIES[0];
}
