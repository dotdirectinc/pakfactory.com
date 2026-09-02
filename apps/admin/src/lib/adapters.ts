import {
  createMockInternalAccountAdapter,
  type InternalAccountAdapter,
} from "@pakfactory/domain/adapters/internal-account";
import type { RequestReadAdapter } from "@pakfactory/domain/adapters/requests";
import { createMockRequestReadAdapter } from "@pakfactory/domain/adapters/mock-requests";
import { createSupabaseInternalAccountAdapter } from "./adapters/supabase-internal-account";
import { createSupabaseRequestReadAdapter } from "./adapters/supabase-requests";

export type AdminDataSource = "mock" | "supabase";

function resolveDataSource(): AdminDataSource {
  const value = process.env.ADMIN_DATA_SOURCE?.trim().toLowerCase();
  return value === "supabase" ? "supabase" : "mock";
}

let internalAccountAdapter: InternalAccountAdapter | null = null;
let requestReadAdapter: RequestReadAdapter | null = null;

export function getInternalAccountAdapter(): InternalAccountAdapter {
  if (!internalAccountAdapter) {
    internalAccountAdapter =
      resolveDataSource() === "supabase"
        ? createSupabaseInternalAccountAdapter()
        : createMockInternalAccountAdapter(
            process.env.ADMIN_INTERNAL_ACCOUNT_ALLOWLIST?.trim() ?? "",
          );
  }
  return internalAccountAdapter;
}

export function getRequestReadAdapter(): RequestReadAdapter {
  if (!requestReadAdapter) {
    requestReadAdapter =
      resolveDataSource() === "supabase"
        ? createSupabaseRequestReadAdapter()
        : createMockRequestReadAdapter();
  }
  return requestReadAdapter;
}
