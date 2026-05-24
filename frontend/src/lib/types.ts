// Type definitions for the Tax Accounting Assistant (frontend-only)
// These replace the old Drizzle schema types

export interface Transaction {
  id: string | number;
  type: "income" | "expense";
  category: string;
  incomeType?: "40(1)" | "40(2)" | "40(3)" | "40(4)" | "40(5)" | "40(6)" | "40(7)" | "40(8)";
  amount: number;
  description?: string;
  date: string; // ISO date string
  notes?: string;
  receiptId?: number; // Linked receipt
  createdAt: string;
}

export interface Allowance {
  id: string;
  label: string;
  amount: number;
  isSelected: boolean;
  category: "personal" | "family" | "insurance" | "investment" | "other";
}

export interface Receipt {
  id: number | string;
  fileName: string;
  fileUrl: string;
  fileKey: string;
  mimeType: string;
  fileSize: number;
  uploadDate: string;
  year: number;
  month: number;
  day: number;
  description?: string;
  amount?: string;
  vendor?: string;
  sellerTaxId?: string;
  isDbdVerified?: boolean;
  dbdCompanyName?: string;
  createdAt: string;
}

export interface TaxAssessment {
  id: number;
  year: number;
  riskLevel: "low" | "medium" | "high";
  totalIncome: string;
  totalExpenses: string;
  netIncome: string;
  assessmentDate: string;
  riskFactors: RiskFactor[];
  recommendations: Recommendation[];
  complianceChecklist: ComplianceItem[];
  notes?: string;
  createdAt: string;
}

export interface RiskFactor {
  factor: string;
  severity: "low" | "medium" | "high";
  description: string;
}

export interface Recommendation {
  id: string;
  title: string;
  description: string;
  priority: "low" | "medium" | "high";
  action: string;
}

export interface ComplianceItem {
  item: string;
  completed: boolean;
}

export interface ExportRecord {
  id: number;
  exportType: "pdf" | "excel";
  fileName: string;
  startDate: string;
  endDate: string;
  recordCount: number;
  createdAt: string;
}
