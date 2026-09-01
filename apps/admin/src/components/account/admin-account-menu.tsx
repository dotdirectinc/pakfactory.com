"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@pakfactory/ui/lib/utils";
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@pakfactory/ui/components/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@pakfactory/ui/components/dropdown-menu";
import { signOutInternal } from "@/lib/auth/actions";
import { ADMIN_ACCOUNT_COPY } from "@/lib/copy/account";

export type AdminAccountMenuProps = {
  displayName: string;
  email: string;
  avatarUrl?: string;
};

type AdminAccountMenuLayout = {
  size?: "default" | "sm";
};

const NAV_ITEMS = [
  {
    href: "/requests",
    label: ADMIN_ACCOUNT_COPY.requestsTitle,
  },
] as const;

function isNavActive(pathname: string, href: string): boolean {
  return pathname === href || pathname.startsWith(`${href}/`);
}

function initialsOf(name: string): string {
  const words = name.split(/\s+/).filter(Boolean).slice(0, 2);
  return words.map((word) => word[0]?.toUpperCase() ?? "").join("");
}

export function AdminAccountMenu({
  displayName,
  email,
  avatarUrl,
  size = "default",
}: AdminAccountMenuProps & AdminAccountMenuLayout) {
  const pathname = usePathname();
  const initials = initialsOf(displayName || email);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        aria-label={ADMIN_ACCOUNT_COPY.accountMenu}
        className={cn(
          "rounded-full outline-none focus-visible:ring-2 focus-visible:ring-ring",
          size === "sm" && "flex size-9 items-center justify-center",
        )}
      >
        <Avatar size={size}>
          {avatarUrl ? <AvatarImage src={avatarUrl} alt="" /> : null}
          <AvatarFallback>{initials}</AvatarFallback>
        </Avatar>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="min-w-48">
        <DropdownMenuLabel className="font-normal">
          <span className="block truncate text-sm font-medium">
            {displayName}
          </span>
          <span className="block truncate text-xs text-muted-foreground">
            {email}
          </span>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        {NAV_ITEMS.map((item) => {
          const active = isNavActive(pathname, item.href);
          return (
            <DropdownMenuItem key={item.href} asChild>
              <Link
                href={item.href}
                className={cn(active && "font-medium")}
                aria-current={active ? "page" : undefined}
              >
                {item.label}
              </Link>
            </DropdownMenuItem>
          );
        })}
        <DropdownMenuSeparator />
        <form action={signOutInternal}>
          <DropdownMenuItem asChild>
            <button type="submit" className="w-full text-left">
              {ADMIN_ACCOUNT_COPY.signOut}
            </button>
          </DropdownMenuItem>
        </form>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
