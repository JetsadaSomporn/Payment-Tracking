export type TransactionType = "income" | "expense" | "transfer";

export type SlipExtractionResult = {
  documentType: "thai_bank_slip" | "receipt" | "unknown";
  bankName: string | null;
  status: "success" | "failed" | "unknown";
  amount: number | null;
  fee: number | null;
  currency: "THB";
  transactionDateIso: string | null;
  transactionTime: string | null;
  senderName: string | null;
  receiverName: string | null;
  receiverAccountHint: string | null;
  referenceNo: string | null;
  rawText: string;
  confidence: number;
};

export type Transaction = {
  id: string;
  type: TransactionType;
  amount: number;
  fee: number;
  currency: "THB";
  title: string;
  categoryName: string;
  merchantName?: string | null;
  receiverName?: string | null;
  bankName?: string | null;
  referenceNo?: string | null;
  transactionDate: string;
  transactionTime?: string | null;
  source: "slip" | "manual";
  createdAt: string;
};

export type DailySummary = {
  totalIncome: number;
  totalExpense: number;
  netAmount: number;
  transactionCount: number;
  topCategory: string | null;
  insight: string;
};
