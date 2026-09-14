"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import type { AdminSearchScope } from "@/lib/search/types";

type AdminSearchContextValue = {
  open: boolean;
  setOpen: (open: boolean) => void;
  query: string;
  setQuery: (query: string) => void;
  scope: AdminSearchScope;
  setScope: (scope: AdminSearchScope) => void;
};

const AdminSearchContext = createContext<AdminSearchContextValue | null>(null);

export function AdminSearchProvider({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [scope, setScope] = useState<AdminSearchScope>("all");

  const onKeyDown = useCallback((event: KeyboardEvent) => {
    if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
      event.preventDefault();
      setOpen(true);
    }
  }, []);

  useEffect(() => {
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onKeyDown]);

  const value = useMemo(
    () => ({ open, setOpen, query, setQuery, scope, setScope }),
    [open, query, scope],
  );

  return (
    <AdminSearchContext.Provider value={value}>
      {children}
    </AdminSearchContext.Provider>
  );
}

export function useAdminSearch(): AdminSearchContextValue {
  const ctx = useContext(AdminSearchContext);
  if (!ctx) {
    throw new Error("useAdminSearch must be used within AdminSearchProvider");
  }
  return ctx;
}
