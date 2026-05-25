import type {
  Transaction,
  Receipt,
  TaxAssessment,
  ExportRecord,
  Allowance,
} from "./types";

// LocalStorage-based data store (replaces tRPC + DB backend)
// FIXME: ข้อจำกัดของ LocalStorage ที่ต้องระวัง:
// 1. ขนาดจำกัดที่ 5MB: ถ้าข้อมูลมีจำนวนมากอาจจะเต็มได้
// 2. ข้อมูลหายเมื่อเคลียร์ Browser Cache
// 3. ไม่สามารถ Sync ข้อมูลข้ามอุปกรณ์ได้
// ปัจจุบันใช้สำหรับ MVP เท่านั้น ต้องวางแผนย้ายไปใช้ Supabase ก่อน Launch จริง
const STORAGE_KEYS = {
  transactions: "fillax_transactions",
  receipts: "fillax_receipts",
  taxAssessments: "fillax_tax_assessments",
  exports: "fillax_exports",
  allowances: "fillax_allowances",
} as const;



function getFromStorage<T>(key: string): T[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

// ─── Allowances ──────────────────────────────────────────────────────────────

export function getAllowances(): Allowance[] {
  return getFromStorage<Allowance>(STORAGE_KEYS.allowances);
}

export function updateAllowance(id: string, isSelected: boolean, amount?: number): void {
  const items = getAllowances();
  const updated = items.map((item) =>
    item.id === id ? { ...item, isSelected, amount: amount ?? item.amount } : item
  );
  saveToStorage(STORAGE_KEYS.allowances, updated);
}

function saveToStorage<T>(key: string, data: T[]): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(key, JSON.stringify(data));
}

function nextId<T extends { id: number | string }>(items: T[]): number {
  const numericIds = items
    .map((item) => typeof item.id === "number" ? item.id : parseInt(item.id as string, 10))
    .filter((id) => !isNaN(id));
  return numericIds.length > 0 ? Math.max(...numericIds) + 1 : 1;
}

function nextTransactionId(items: Transaction[]): number {
  const numericIds = items
    .map((i) => typeof i.id === "number" ? i.id : parseInt(i.id as string, 10))
    .filter((id) => !isNaN(id));
  return numericIds.length === 0 ? 1 : Math.max(...numericIds) + 1;
}

// ─── Transactions ────────────────────────────────────────────────────────────

export function getTransactions(): Transaction[] {
  return getFromStorage<Transaction>(STORAGE_KEYS.transactions);
}

export function createTransaction(
  data: Omit<Transaction, "id" | "createdAt">
): Transaction {
  const items = getTransactions();
  const newItem: Transaction = {
    ...data,
    id: nextTransactionId(items),
    createdAt: new Date().toISOString(),
  };
  saveToStorage(STORAGE_KEYS.transactions, [...items, newItem]);
  return newItem;
}

export function deleteTransaction(id: number): void {
  const items = getTransactions().filter((t) => t.id !== id);
  saveToStorage(STORAGE_KEYS.transactions, items);
}

// ─── Receipts ────────────────────────────────────────────────────────────────

export function getReceipts(): Receipt[] {
  return getFromStorage<Receipt>(STORAGE_KEYS.receipts);
}

export function createReceipt(
  data: Omit<Receipt, "id" | "createdAt">
): Receipt {
  const items = getReceipts();
  const newItem: Receipt = {
    ...data,
    id: nextId(items),
    createdAt: new Date().toISOString(),
  };
  saveToStorage(STORAGE_KEYS.receipts, [...items, newItem]);
  return newItem;
}

export function deleteReceipt(id: number | string): void {
  const items = getReceipts().filter((r) => r.id !== id);
  saveToStorage(STORAGE_KEYS.receipts, items);
}

export function updateReceipt(
  id: number | string,
  data: Partial<Omit<Receipt, "id" | "createdAt">>
): void {
  const items = getReceipts();
  const updated = items.map((r) => (r.id === id ? { ...r, ...data } : r));
  saveToStorage(STORAGE_KEYS.receipts, updated);
}

export function updateTransaction(
  id: number,
  data: Partial<Omit<Transaction, "id" | "createdAt">>
): void {
  const items = getTransactions();
  const updated = items.map((t) => (t.id === id ? { ...t, ...data } : t));
  saveToStorage(STORAGE_KEYS.transactions, updated);
}

// ─── Tax Assessments ─────────────────────────────────────────────────────────

export function getTaxAssessments(): TaxAssessment[] {
  return getFromStorage<TaxAssessment>(STORAGE_KEYS.taxAssessments);
}

export function createTaxAssessment(
  data: Omit<TaxAssessment, "id" | "createdAt" | "assessmentDate">
): TaxAssessment {
  const items = getTaxAssessments();
  // Replace existing assessment for the same year
  const filtered = items.filter((a) => a.year !== data.year);
  const newItem: TaxAssessment = {
    ...data,
    id: nextId(items),
    assessmentDate: new Date().toISOString(),
    createdAt: new Date().toISOString(),
  };
  saveToStorage(STORAGE_KEYS.taxAssessments, [...filtered, newItem]);
  return newItem;
}

// ─── Exports ─────────────────────────────────────────────────────────────────

export function getExportHistory(): ExportRecord[] {
  return getFromStorage<ExportRecord>(STORAGE_KEYS.exports);
}

export function recordExport(
  data: Omit<ExportRecord, "id" | "createdAt">
): ExportRecord {
  const items = getExportHistory();
  const newItem: ExportRecord = {
    ...data,
    id: nextId(items),
    createdAt: new Date().toISOString(),
  };
  saveToStorage(STORAGE_KEYS.exports, [...items, newItem]);
  return newItem;
}
