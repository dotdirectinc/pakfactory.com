"use client";

import { AudioLines, Clock, Plus } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@pakfactory/ui/components/button";
import { Card, CardContent } from "@pakfactory/ui/components/card";
import { Input } from "@pakfactory/ui/components/input";
import { QuickAction } from "@/components/home/ui/quick-action";
import { LogoMark } from "@/components/layout/logo-mark";
import {
  ADMIN_HOME_COPY,
  type AdminHomePillId,
} from "@/lib/copy/home";

function showComingSoon() {
  toast.message(ADMIN_HOME_COPY.comingSoon);
}

export type PakAiPanelProps = {
  value: string;
  onChange: (value: string) => void;
  onSubmitAsk: () => void;
  onPill: (id: AdminHomePillId) => void;
  busy: boolean;
};

export function PakAiPanel({
  value,
  onChange,
  onSubmitAsk,
  onPill,
  busy,
}: PakAiPanelProps) {
  return (
    <div className="flex w-full max-w-4xl flex-col items-center gap-6">
      <Card className="w-full gap-0 py-0">
        <CardContent className="px-6 py-5">
          <form
            className="flex items-center gap-2"
            onSubmit={(event) => {
              event.preventDefault();
              onSubmitAsk();
            }}
          >
            <LogoMark className="size-10 shrink-0" label="PakAI" />
            <Input
              name="message"
              aria-label={ADMIN_HOME_COPY.pakAiLabel}
              placeholder={ADMIN_HOME_COPY.pakAiTitle}
              autoComplete="off"
              value={value}
              disabled={busy}
              onChange={(event) => onChange(event.target.value)}
              className="h-12 border-0 bg-transparent text-base shadow-none focus-visible:border-transparent focus-visible:ring-0 dark:bg-transparent md:text-base"
            />
            <Button
              type="button"
              variant="ghost"
              size="default"
              aria-disabled="true"
              disabled={busy}
              onClick={showComingSoon}
            >
              <Clock aria-hidden />
              {ADMIN_HOME_COPY.recents}
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              aria-label={ADMIN_HOME_COPY.addAction}
              aria-disabled="true"
              disabled={busy}
              onClick={showComingSoon}
            >
              <Plus aria-hidden />
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              aria-label={ADMIN_HOME_COPY.voiceAction}
              aria-disabled="true"
              disabled={busy}
              onClick={showComingSoon}
            >
              <AudioLines aria-hidden />
            </Button>
            <button type="submit" className="sr-only" disabled={busy}>
              {ADMIN_HOME_COPY.pakAiLabel}
            </button>
          </form>
        </CardContent>
      </Card>
      <div className="flex flex-wrap items-center justify-center gap-2">
        {ADMIN_HOME_COPY.pills.map((pill) => (
          <QuickAction
            key={pill.id}
            label={pill.label}
            disabled={busy}
            onClick={() => onPill(pill.id)}
          />
        ))}
      </div>
    </div>
  );
}
