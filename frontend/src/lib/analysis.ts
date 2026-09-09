// 与后端 analysis.py 完全相同的公式，用于输入改动时的即时重算。保存时以后端结果为准。

export interface Row { label: string; amount: number | string | null }
export interface RehabRow { category: string; label: string; amount: number | string | null; note?: string | null }
export interface Financing { enabled: boolean; down_pct: number; rate_pct: number; years: number }
export interface SourceInfo { source: string; fetched_at?: string; confidence?: number | null; note?: string | null }

export interface AnalysisInputs {
  purchase_price: number | string | null;
  purchase_extras: Row[];
  holding_months: number | string | null;
  monthly_costs: Row[];
  financing: Financing;
  rehab_items: RehabRow[];
  rehab_tier?: string;
  selling_pct: number | string | null;
  selling_extras: Row[];
  sale_price: number | string | null;
  target_margin_pct: number | string | null;
  sources?: Record<string, SourceInfo>;
  note?: string;
}

export interface AnalysisOutputs {
  purchase_total: number; purchase_extras_total: number; loan_amount: number; down_payment: number; monthly_payment: number;
  monthly_costs_total: number; holding_total: number; rehab_total: number; selling_total: number; total_costs: number;
  total_profit: number; profit_margin_pct: number | null; cash_invested: number; roi_pct: number | null; equity_multiple: number | null;
  sale_price: number; target_margin_pct: number; mao: number; mao_rule70: number;
}

const n = (v: unknown, d = 0): number => { const x = typeof v === 'string' ? parseFloat(v) : (v as number); return Number.isFinite(x) ? x : d; };
const sum = (rows?: { amount: unknown }[]) => (rows ?? []).reduce((a, r) => a + n(r.amount), 0);

export function monthlyPayment(principal: number, ratePct: number, years: number): number {
  if (principal <= 0 || years <= 0) return 0;
  const m = Math.round(years * 12); const r = ratePct / 100 / 12;
  if (r === 0) return principal / m;
  return principal * r / (1 - Math.pow(1 + r, -m));
}

export function compute(i: AnalysisInputs, priceOverride?: number): Omit<AnalysisOutputs, 'target_margin_pct' | 'mao' | 'mao_rule70'> {
  const price = priceOverride ?? n(i.purchase_price);
  const extras = sum(i.purchase_extras);
  const f = i.financing ?? { enabled: true, down_pct: 20, rate_pct: 7, years: 30 };
  const loan = f.enabled ? price * (1 - n(f.down_pct, 20) / 100) : 0;
  const down = price - loan;
  const payment = f.enabled ? monthlyPayment(loan, n(f.rate_pct, 7), n(f.years, 30)) : 0;
  const months = n(i.holding_months, 6);
  const monthly = sum(i.monthly_costs);
  const holding = months * (monthly + payment);
  const rehab = sum(i.rehab_items);
  const sale = n(i.sale_price);
  const selling = sale * n(i.selling_pct) / 100 + sum(i.selling_extras);
  const total = price + extras + rehab + holding + selling;
  const profit = sale - total;
  const cash = down + extras + rehab + holding;
  return {
    purchase_total: price + extras, purchase_extras_total: extras, loan_amount: loan, down_payment: down, monthly_payment: payment,
    monthly_costs_total: monthly, holding_total: holding, rehab_total: rehab, selling_total: selling, total_costs: total,
    total_profit: profit, profit_margin_pct: total ? profit / total * 100 : null, cash_invested: cash,
    roi_pct: cash ? profit / cash * 100 : null, equity_multiple: cash ? sale / cash : null, sale_price: sale,
  };
}

export function maoForTargetMargin(i: AnalysisInputs, targetPct: number): number {
  const sale = n(i.sale_price);
  if (sale <= 0) return 0;
  let lo = 0, hi = sale;
  if ((compute(i, lo).profit_margin_pct ?? -1e9) < targetPct) return 0;
  for (let k = 0; k < 60; k++) {
    const mid = (lo + hi) / 2;
    const m = compute(i, mid).profit_margin_pct;
    if (m !== null && m >= targetPct) lo = mid; else hi = mid;
  }
  return Math.round(lo / 100) * 100;
}

export function fullOutputs(i: AnalysisInputs): AnalysisOutputs {
  const base = compute(i);
  const target = n(i.target_margin_pct, 20);
  return { ...base, target_margin_pct: target, mao: maoForTargetMargin(i, target), mao_rule70: Math.round((0.7 * n(i.sale_price) - base.rehab_total) / 100) * 100 };
}
