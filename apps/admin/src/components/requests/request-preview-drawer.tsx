"use client";

import type { ReactNode } from "react";
import { Button } from "@pakfactory/ui/components/button";
import {
  Drawer,
  DrawerContent,
  DrawerTitle,
  DrawerTrigger,
} from "@pakfactory/ui/components/drawer";
import { ADMIN_REQUESTS_COPY } from "@/lib/copy/requests";

type RequestPreviewDrawerProps = {
  children: ReactNode;
};

/**
 * Transparent right Drawer — letter pages float on the dim overlay.
 * Closed by default; opened from the page header Preview control.
 */
export function RequestPreviewDrawer({ children }: RequestPreviewDrawerProps) {
  return (
    <Drawer direction="right">
      <DrawerTrigger asChild>
        <Button type="button" variant="outline" size="sm">
          {ADMIN_REQUESTS_COPY.previewAction}
        </Button>
      </DrawerTrigger>
      <DrawerContent className="border-transparent bg-transparent shadow-none data-[vaul-drawer-direction=right]:sm:max-w-2xl">
        <DrawerTitle className="sr-only">
          {ADMIN_REQUESTS_COPY.previewDrawerTitle}
        </DrawerTitle>
        <div className="flex-1 overflow-y-auto p-4">{children}</div>
      </DrawerContent>
    </Drawer>
  );
}
