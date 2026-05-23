import { supabase, API_URL } from "./supabase";
import type { Transaction } from "./types";

/**
 * Utility to fetch secure authorization headers automatically from current Supabase session.
 * Throws a descriptive error if there is no active authenticated session to trigger local storage fallbacks immediately.
 */
async function getAuthHeaders() {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) {
    throw new Error("No active authenticated session; falling back to offline browser store.");
  }
  return {
    "Content-Type": "application/json",
    "Authorization": `Bearer ${session.access_token}`,
  };
}

/**
 * Handle HTTP responses robustly. If the server returns 401 Unauthorized,
 * clean up the local stale Supabase session immediately and throw to trigger offline store.
 */
async function handleResponse(res: Response): Promise<Response> {
  if (res.status === 401) {
    console.warn("[API_CLIENT] Received HTTP 401 Unauthorized; cleaning up stale Supabase session token...");
    try {
      await supabase.auth.signOut();
    } catch (e) {
      console.error("Error signing out during 401 recovery:", e);
    }
    throw new Error("Session expired or invalid token; falling back to offline store.");
  }
  if (!res.ok) {
    throw new Error(`Server returned HTTP ${res.status}: ${res.statusText}`);
  }
  return res;
}

/**
 * Centralized API client representing the backend services.
 */
export const apiClient = {
  /**
   * Fetch all transactions from the Supabase-backed API
   */
  async getTransactions(type?: string, channel?: string): Promise<Transaction[]> {
    try {
      const headers = await getAuthHeaders();
      let url = `${API_URL}/api/v1/income/transactions`;
      const params = new URLSearchParams();
      if (type) params.append("type", type);
      if (channel) params.append("channel", channel);
      
      const paramStr = params.toString();
      if (paramStr) url += `?${paramStr}`;

      const res = await fetch(url, { headers });
      await handleResponse(res);
      const data = await res.json();
      
      // Map Backend UUID model back to Frontend Transaction model
      return data.map((t: any) => ({
        id: t.id,
        type: t.type,
        category: t.category,
        amount: parseFloat(t.amount),
        description: t.name || t.description || "",
        date: t.date,
        notes: t.note || "",
        createdAt: t.created_at || new Date().toISOString()
      }));
    } catch (error) {
      console.error("[API_CLIENT] Failed to fetch transactions:", error);
      throw error;
    }
  },

  /**
   * Record a new transaction in the backend Supabase DB
   */
  async createTransaction(data: Omit<Transaction, "id" | "createdAt">): Promise<Transaction> {
    try {
      const headers = await getAuthHeaders();
      const body = {
        date: data.date,
        name: data.description || data.category || "รายจ่ายไม่มีชื่อ",
        amount: data.amount,
        type: data.type,
        category: data.category,
        is_tax_deductible: false,
        channel: data.type === "income" ? "other" : undefined,
        note: data.notes || undefined
      };

      const res = await fetch(`${API_URL}/api/v1/income/transactions`, {
        method: "POST",
        headers,
        body: JSON.stringify(body),
      });

      await handleResponse(res);
      const t = await res.json();

      return {
        id: t.id,
        type: t.type,
        category: t.category,
        amount: parseFloat(t.amount),
        description: t.name || "",
        date: t.date,
        notes: t.note || "",
        createdAt: t.created_at || new Date().toISOString()
      };
    } catch (error) {
      console.error("[API_CLIENT] Failed to create transaction:", error);
      throw error;
    }
  },

  /**
   * Update an existing transaction in the backend
   */
  async updateTransaction(id: string | number, data: Partial<Omit<Transaction, "id" | "createdAt">>): Promise<Transaction> {
    try {
      const headers = await getAuthHeaders();
      const body: any = {};
      if (data.date) body.date = data.date;
      if (data.description) body.name = data.description;
      if (data.amount) body.amount = data.amount;
      if (data.type) body.type = data.type;
      if (data.category) body.category = data.category;
      if (data.notes !== undefined) body.note = data.notes;

      const res = await fetch(`${API_URL}/api/v1/income/transactions/${id}`, {
        method: "PUT",
        headers,
        body: JSON.stringify(body),
      });

      await handleResponse(res);
      const t = await res.json();

      return {
        id: t.id,
        type: t.type,
        category: t.category,
        amount: parseFloat(t.amount),
        description: t.name || "",
        date: t.date,
        notes: t.note || "",
        createdAt: t.created_at || new Date().toISOString()
      };
    } catch (error) {
      console.error("[API_CLIENT] Failed to update transaction:", error);
      throw error;
    }
  },

  /**
   * Delete a transaction by UUID from backend
   */
  async deleteTransaction(id: string | number): Promise<void> {
    try {
      const headers = await getAuthHeaders();
      const res = await fetch(`${API_URL}/api/v1/income/transactions/${id}`, {
        method: "DELETE",
        headers,
      });

      await handleResponse(res);
    } catch (error) {
      console.error("[API_CLIENT] Failed to delete transaction:", error);
      throw error;
    }
  },

  /**
   * Fetch financial summary calculations from backend (used in Dashboard analytics)
   */
  async getFinancialSummary(year: number = 2026): Promise<any> {
    try {
      const headers = await getAuthHeaders();
      const res = await fetch(`${API_URL}/api/v1/income/summary?year=${year}`, { headers });
      await handleResponse(res);
      return await res.json();
    } catch (error) {
      console.error("[API_CLIENT] Failed to fetch financial summary:", error);
      throw error;
    }
  }
};
