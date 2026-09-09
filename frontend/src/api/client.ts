export type Option = { value: string; label: string };

export interface Meta {
  strategies: Option[];
  stages: Option[];
  substages: Record<string, Option[]>;
  statuses: (Option & { kind: string })[];
  budget_categories: string[];
  file_types: (Option & { stage: string })[];
  sources: Option[];
  property_fields: { key: string; label: string; type: string }[];
}

export interface AddressCandidate {
  label: string; street: string; city: string; state: string; zip: string; lat?: number | null; lng?: number | null;
}

export interface LookupField {
  field: string; label: string; value: string | null; source: string; confidence?: number | null; note?: string | null;
}

export interface LookupResult {
  address: AddressCandidate;
  apn: string | null;
  fields: LookupField[];
  owner: Record<string, any> | null;
  mortgages: Record<string, any>[];
  sales_history: Record<string, any>[];
  provider: string;
  valuation: { avm_value?: number | null; avm_low?: number | null; avm_high?: number | null; list_price?: number | null; annual_tax?: number | null } | null;
  duplicate_of: { project_id: number; project_name: string; property_id: number } | null;
}

export interface PropertyBrief {
  id: number; address_std: string; street?: string | null; city?: string | null; state?: string | null; zip?: string | null;
  lat?: number | null; lng?: number | null; apn?: string | null; property_type?: string | null; style?: string | null;
  year_built?: number | null; sqft?: number | null; beds?: number | null; baths_full?: number | null; baths_half?: number | null;
  stories?: number | null; garage_spaces?: number | null; basement?: string | null; lot_sqft?: number | null; land_use?: string | null;
  avm_value?: number | null; list_price?: number | null; annual_tax?: number | null;
}

export interface Project {
  id: number; name: string; strategy: string; stage: string; substage: string | null; lead_heat: string | null;
  status: string; status_reason: string; status_override: string | null; status_override_reason: string | null;
  purchase_price: number | null; target_arv: number | null; purchase_date: string | null; construction_start: string | null;
  construction_end: string | null; list_date: string | null; sale_date: string | null; sale_price: number | null;
  risks: string | null; notes: string | null; created_at: string; updated_at: string; property: PropertyBrief;
  budget_planned: number; budget_spent: number; budget_used_pct: number | null; missing_fields: string[]; analysis_count: number;
}

export interface SourceRec {
  id: number; field: string; value: string | null; source: string; fetched_at: string; confidence: number | null; is_primary: boolean; note: string | null;
}

export interface PropertyField {
  key: string; label: string; type: string; value: string | null; primary_source: string | null; sources: SourceRec[]; has_conflict: boolean;
}

export interface PropertyData {
  property: PropertyBrief;
  fields: PropertyField[];
  owner: { name?: string | null; mailing_address?: string | null; phone?: string | null; email?: string | null; owner_since?: string | null } | null;
  mortgages: { id: number; recording_date?: string | null; lender?: string | null; loan_type?: string | null; term_months?: number | null; original_balance?: number | null; est_balance?: number | null; rate?: number | null; payment?: number | null }[];
  sales_history: { id: number; recording_date?: string | null; seller?: string | null; buyer?: string | null; doc_type?: string | null; amount?: number | null }[];
}

export interface ProjectFile {
  id: number; project_id: number; filename: string; mime: string | null; size: number; doc_type: string | null; stage: string | null;
  doc_date: string | null; counterparty: string | null; amount: number | null; source: string; uploaded_at: string;
}

export interface BudgetLine { id: number; project_id: number; category: string; planned_amount: number; note: string | null }
export interface Expense { id: number; project_id: number; category: string; amount: number; date: string | null; vendor: string | null; note: string | null; file_id: number | null }
export interface BudgetSummary {
  planned_total: number; spent_total: number; remaining: number; used_pct: number | null;
  categories: { category: string; planned: number; spent: number; planned_pct: number; spent_pct: number; variance: number }[];
}
export interface Analysis {
  id: number; project_id: number; name: string; inputs: import('../lib/analysis').AnalysisInputs; outputs: import('../lib/analysis').AnalysisOutputs;
  is_current: boolean; created_at: string; updated_at: string;
}

export interface DashboardWidgets {
  upcoming: { project_id: number; project_name: string; date: string; kind: string; days: number; overdue: boolean }[];
  capital: { project_id: number; project_name: string; purchase_price: number; spent: number; total: number }[];
  retrospectives: { project_id: number; project_name: string; target_arv: number | null; sale_price: number; arv_error_pct: number | null; budget_planned: number; spent: number; budget_error_pct: number | null; days: number | null; profit: number }[];
  weekly_spend: { week_start: string; amount: number }[];
  vendors: { vendor: string; amount: number; count: number; projects: number }[];
  funnel: { substage: string; label: string; count: number }[];
}

export interface DashboardSummary {
  leads: number; active: number; portfolio: number; total: number; total_invested: number; total_budget: number; expected_profit: number; over_budget_count: number;
}

async function req<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(path, { headers: init?.body instanceof FormData ? {} : { 'Content-Type': 'application/json' }, ...init });
  if (!res.ok) {
    let msg = `${res.status} ${res.statusText}`;
    try { const j = await res.json(); if (j.detail) msg = typeof j.detail === 'string' ? j.detail : JSON.stringify(j.detail); } catch { /* ignore */ }
    throw new Error(msg);
  }
  if (res.status === 204) return undefined as T;
  return res.json();
}

export const api = {
  meta: () => req<Meta>('/api/meta'),
  dashboard: () => req<DashboardSummary>('/api/dashboard/summary'),
  widgets: () => req<DashboardWidgets>('/api/dashboard/widgets'),
  lookupAddress: (q: string) => req<AddressCandidate[]>(`/api/lookup/address?q=${encodeURIComponent(q)}`),
  lookupProperty: (address: string) => req<LookupResult>('/api/lookup/property', { method: 'POST', body: JSON.stringify({ address }) }),
  projects: (params?: { stage?: string; q?: string }) => {
    const s = new URLSearchParams();
    if (params?.stage) s.set('stage', params.stage);
    if (params?.q) s.set('q', params.q);
    return req<Project[]>(`/api/projects${s.toString() ? `?${s}` : ''}`);
  },
  project: (id: number) => req<Project>(`/api/projects/${id}`),
  createProject: (body: any) => req<Project>('/api/projects', { method: 'POST', body: JSON.stringify(body) }),
  patchProject: (id: number, body: any) => req<Project>(`/api/projects/${id}`, { method: 'PATCH', body: JSON.stringify(body) }),
  deleteProject: (id: number) => req<void>(`/api/projects/${id}`, { method: 'DELETE' }),
  propertyData: (id: number) => req<PropertyData>(`/api/projects/${id}/property`),
  patchField: (id: number, field: string, value: string | null) => req<PropertyData>(`/api/projects/${id}/property`, { method: 'PATCH', body: JSON.stringify({ field, value }) }),
  setPrimary: (id: number, field: string, source_id: number) => req<PropertyData>(`/api/projects/${id}/property/fields/${field}/primary`, { method: 'POST', body: JSON.stringify({ source_id }) }),
  files: (id: number) => req<ProjectFile[]>(`/api/projects/${id}/files`),
  upload: (id: number, form: FormData) => req<ProjectFile>(`/api/projects/${id}/files`, { method: 'POST', body: form }),
  patchFile: (fileId: number, body: any) => req<ProjectFile>(`/api/files/${fileId}`, { method: 'PATCH', body: JSON.stringify(body) }),
  deleteFile: (fileId: number) => req<void>(`/api/files/${fileId}`, { method: 'DELETE' }),
  budgetLines: (id: number) => req<BudgetLine[]>(`/api/projects/${id}/budget-lines`),
  addBudgetLine: (id: number, body: any) => req<BudgetLine>(`/api/projects/${id}/budget-lines`, { method: 'POST', body: JSON.stringify(body) }),
  deleteBudgetLine: (lineId: number) => req<void>(`/api/budget-lines/${lineId}`, { method: 'DELETE' }),
  expenses: (id: number) => req<Expense[]>(`/api/projects/${id}/expenses`),
  addExpense: (id: number, body: any) => req<Expense>(`/api/projects/${id}/expenses`, { method: 'POST', body: JSON.stringify(body) }),
  deleteExpense: (expenseId: number) => req<void>(`/api/expenses/${expenseId}`, { method: 'DELETE' }),
  budgetSummary: (id: number) => req<BudgetSummary>(`/api/projects/${id}/budget-summary`),
  analyses: (id: number) => req<Analysis[]>(`/api/projects/${id}/analyses`),
  analysisPrefill: (id: number, tier = 'medium') => req<{ inputs: Analysis['inputs']; outputs: Analysis['outputs'] }>(`/api/projects/${id}/analyses/prefill?tier=${tier}`),
  createAnalysis: (id: number, body: { name?: string; inputs?: Analysis['inputs']; tier?: string }) => req<Analysis>(`/api/projects/${id}/analyses`, { method: 'POST', body: JSON.stringify(body) }),
  patchAnalysis: (aid: number, body: { name?: string; inputs?: Analysis['inputs']; is_current?: boolean }) => req<Analysis>(`/api/analyses/${aid}`, { method: 'PATCH', body: JSON.stringify(body) }),
  deleteAnalysis: (aid: number) => req<void>(`/api/analyses/${aid}`, { method: 'DELETE' }),
  applyAnalysis: (aid: number, body: { mode: 'replace' | 'append'; apply_prices: boolean }) => req<Project>(`/api/analyses/${aid}/apply`, { method: 'POST', body: JSON.stringify(body) }),
};
