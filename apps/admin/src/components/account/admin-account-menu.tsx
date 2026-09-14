"use client";

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
  const initials = initialsOf(displayName || email);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        aria-label={ADMIN_ACCOUNT_COPY.accountMenu}
        className={cn(
          "rounded-full outline-none focus-visible:ring-2 focus-visible:ring-ring",
          size === "sm" && "flex size-8 items-center justify-center",
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
        <form action={signOutInternal}>
          {/*
            🔴 onSelect must preventDefault, or sign-out silently does nothing.

            Selecting a Radix item closes the menu, which unmounts this <form>.
            React dispatches a Server Action asynchronously after the submit
            event, so the form can be gone before the POST is sent — the click
            registers, the menu closes, and nothing else happens. No error, no
            network request, no clue.

            Confirmed by elimination: GET /auth/sign-out does the same work
            outside the menu and signs out correctly, so signOut() and the cookie
            clearing were never at fault.

            preventDefault keeps the menu open long enough for the action to
            dispatch; the redirect inside it then navigates away, so the menu
            never needs closing by hand.
          */}
          <DropdownMenuItem asChild onSelect={(event) => event.preventDefault()}>
            <button type="submit" className="w-full text-left">
              {ADMIN_ACCOUNT_COPY.signOut}
            </button>
          </DropdownMenuItem>
        </form>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
