"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@pakfactory/ui/components/button";
import { Checkbox } from "@pakfactory/ui/components/checkbox";
import { Input } from "@pakfactory/ui/components/input";
import { Label } from "@pakfactory/ui/components/label";
import { cn } from "@pakfactory/ui/lib/utils";
import {
  CONTRIBUTE_ROLE_OPTIONS,
  type ContributeRoleValue,
} from "@/lib/contribute-options";

const textareaClassName = cn(
  "w-full min-w-0 rounded-md border border-input bg-transparent px-3 py-2 text-base shadow-xs transition-[color,box-shadow] outline-none selection:bg-primary selection:text-primary-foreground placeholder:text-muted-foreground disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 md:text-sm dark:bg-input/30",
  "focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50",
  "aria-invalid:border-destructive aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40",
);

export function ContributeForm() {
  const router = useRouter();
  const [role, setRole] = useState<ContributeRoleValue | "">("");
  const [consent, setConsent] = useState(false);
  const [status, setStatus] = useState<"idle" | "loading" | "error">("idle");
  const [message, setMessage] = useState<string | null>(null);

  function toggleRole(value: ContributeRoleValue) {
    setRole((prev) => (prev === value ? "" : value));
  }

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    if (!form.checkValidity()) {
      form.reportValidity();
      return;
    }
    if (!consent) {
      setStatus("error");
      setMessage("You must agree to the privacy terms.");
      return;
    }

    setStatus("loading");
    setMessage(null);

    const fd = new FormData(form);
    const body = {
      name: String(fd.get("name") ?? ""),
      email: String(fd.get("email") ?? ""),
      organization: String(fd.get("organization") ?? ""),
      linkedIn: String(fd.get("linkedIn") ?? ""),
      role: role || undefined,
      pitchAngle: String(fd.get("pitchAngle") ?? ""),
      consent: true,
      website: String(fd.get("website") ?? ""),
    };

    try {
      const res = await fetch("/api/contribute", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = (await res.json().catch(() => ({}))) as { message?: string };
      if (!res.ok) {
        setStatus("error");
        setMessage(data.message ?? "Something went wrong. Try again later.");
        return;
      }
      router.push("/contribute/thank-you");
    } catch {
      setStatus("error");
      setMessage("Something went wrong. Try again later.");
    }
  }

  return (
    <div className="flex h-fit flex-col gap-6 rounded-2xl border border-border bg-background p-6 md:p-8">
      <div className="flex flex-col gap-1.5">
        <h2 className="text-2xl font-medium leading-8 tracking-tight text-foreground">
          Pitch a story
        </h2>
        <p className="text-base leading-6 text-muted-foreground">
          All fields required unless noted. Your details are only used for editorial review.
        </p>
      </div>

      <form onSubmit={onSubmit} className="relative flex flex-col gap-5">

        {/* Section: About you */}
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">About you</p>
          <hr className="mt-2 mb-4 border-border" />
          <div className="flex flex-col gap-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="contribute-name">Name</Label>
                <Input
                  id="contribute-name"
                  name="name"
                  placeholder="Your full name"
                  autoComplete="name"
                  required
                  disabled={status === "loading"}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="contribute-email">Email</Label>
                <Input
                  id="contribute-email"
                  name="email"
                  type="email"
                  placeholder="you@brand.com"
                  autoComplete="email"
                  required
                  disabled={status === "loading"}
                />
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="contribute-organization">Organization (optional)</Label>
                <Input
                  id="contribute-organization"
                  name="organization"
                  placeholder="Where you work"
                  autoComplete="organization"
                  disabled={status === "loading"}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="contribute-linkedin">LinkedIn URL (optional)</Label>
                <Input
                  id="contribute-linkedin"
                  name="linkedIn"
                  type="url"
                  placeholder="linkedin.com/in/…"
                  disabled={status === "loading"}
                />
              </div>
            </div>

            <fieldset className="space-y-3">
              <legend className="text-sm font-medium">Which best describes you? (optional)</legend>
              <div className="grid grid-cols-2 gap-x-6 gap-y-3">
                {CONTRIBUTE_ROLE_OPTIONS.map((opt) => {
                  const checked = role === opt.value;
                  return (
                    <label
                      key={opt.value}
                      className="flex cursor-pointer items-center gap-3 text-sm leading-5 text-foreground"
                    >
                      <input
                        type="radio"
                        name="describe"
                        value={opt.value}
                        checked={checked}
                        onChange={() => toggleRole(opt.value)}
                        onClick={() => { if (checked) setRole(""); }}
                        disabled={status === "loading"}
                        className="sr-only"
                      />
                      <span
                        className={cn(
                          "flex size-4 shrink-0 items-center justify-center rounded-full border transition-colors",
                          checked ? "border-primary" : "border-input",
                        )}
                      >
                        {checked ? (
                          <span className="size-2 rounded-full bg-primary" />
                        ) : null}
                      </span>
                      {opt.label}
                    </label>
                  );
                })}
              </div>
            </fieldset>
          </div>
        </div>

        {/* Section: Your pitch */}
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Your pitch</p>
          <hr className="mt-2 mb-4 border-border" />
          <div className="space-y-2">
            <Label htmlFor="contribute-pitch">Pitch — angle</Label>
            <textarea
              id="contribute-pitch"
              name="pitchAngle"
              required
              rows={4}
              disabled={status === "loading"}
              className={textareaClassName}
              placeholder="What's the angle? Why now? Who is it for?"
            />
          </div>
        </div>

        {/* Consent */}
        <div className="flex items-start gap-3">
          <Checkbox
            id="contribute-consent"
            checked={consent}
            onCheckedChange={(v) => setConsent(v === true)}
            disabled={status === "loading"}
            className="mt-0.5"
          />
          <Label htmlFor="contribute-consent" className="cursor-pointer font-normal leading-snug">
            I agree to PakFactory storing my details to review this pitch.{" "}
            <a href="/privacy-policy" className="underline underline-offset-2 hover:text-foreground">
              See our Privacy Policy.
            </a>
          </Label>
        </div>

        {/* Honeypot */}
        <div className="absolute -left-[9999px] h-0 w-0 overflow-hidden" aria-hidden>
          <label htmlFor="contribute-website">Website</label>
          <input
            id="contribute-website"
            name="website"
            type="text"
            tabIndex={-1}
            autoComplete="off"
          />
        </div>

        {/* Submit row */}
        <div className="flex flex-wrap items-center gap-4">
          <Button type="submit" disabled={status === "loading"}>
            {status === "loading" ? "Submitting…" : "Send Pitch →"}
          </Button>
          <p className="text-sm text-muted-foreground">Reply within 5 business days.</p>
        </div>

        {message && (
          <p className="text-sm text-destructive" role="alert">
            {message}
          </p>
        )}
      </form>
    </div>
  );
}
