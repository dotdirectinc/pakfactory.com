"use client";

import { useState } from "react";
import { Button } from "@pakfactory/ui/components/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@pakfactory/ui/components/card";
import { Input } from "@pakfactory/ui/components/input";
import { Label } from "@pakfactory/ui/components/label";
import { RadioGroup, RadioGroupItem } from "@pakfactory/ui/components/radio-group";
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

const selectClassName = cn(
  "h-9 w-full min-w-0 rounded-md border border-input bg-transparent px-3 py-1 text-base shadow-xs transition-[color,box-shadow] outline-none disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 md:text-sm dark:bg-input/30",
  "focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50",
);

type ContributeFormProps = {
  subjectOptions: { value: string; label: string }[];
};

export function ContributeForm({ subjectOptions }: ContributeFormProps) {
  const [role, setRole] = useState<ContributeRoleValue | "">("");
  const [status, setStatus] = useState<"idle" | "loading" | "ok" | "error">("idle");
  const [message, setMessage] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    if (!form.checkValidity()) {
      form.reportValidity();
      return;
    }
    if (!role) {
      setStatus("error");
      setMessage("Select your role.");
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
      subjectMatter: String(fd.get("subjectMatter") ?? ""),
      role,
      pitchAngle: String(fd.get("pitchAngle") ?? ""),
      outline: String(fd.get("outline") ?? ""),
      qualifications: String(fd.get("qualifications") ?? ""),
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
      setStatus("ok");
      setMessage(data.message ?? "Thanks — we received your pitch.");
      form.reset();
      setRole("");
    } catch {
      setStatus("error");
      setMessage("Something went wrong. Try again later.");
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg tracking-tight">Pitch the editors</CardTitle>
        <CardDescription>
          Share your idea in a few minutes. We review every submission.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={onSubmit} className="relative flex flex-col gap-5">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="contribute-name">Name</Label>
              <Input
                id="contribute-name"
                name="name"
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
                autoComplete="organization"
                disabled={status === "loading"}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="contribute-linkedin">LinkedIn (optional)</Label>
              <Input
                id="contribute-linkedin"
                name="linkedIn"
                type="url"
                placeholder="https://linkedin.com/in/…"
                disabled={status === "loading"}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="contribute-subject">Subject matter</Label>
            <select
              id="contribute-subject"
              name="subjectMatter"
              required
              disabled={status === "loading"}
              className={selectClassName}
              defaultValue=""
            >
              <option value="" disabled>
                Select a topic
              </option>
              {subjectOptions.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          <fieldset className="space-y-3">
            <legend className="text-sm font-medium">Your role</legend>
            <RadioGroup
              value={role}
              onValueChange={(v) => setRole(v as ContributeRoleValue)}
              disabled={status === "loading"}
              className="gap-2"
            >
              {CONTRIBUTE_ROLE_OPTIONS.map((opt) => (
                <div key={opt.value} className="flex items-center gap-2">
                  <RadioGroupItem value={opt.value} id={`contribute-role-${opt.value}`} />
                  <Label htmlFor={`contribute-role-${opt.value}`} className="font-normal">
                    {opt.label}
                  </Label>
                </div>
              ))}
            </RadioGroup>
          </fieldset>

          <div className="space-y-2">
            <Label htmlFor="contribute-pitch">Pitch angle</Label>
            <textarea
              id="contribute-pitch"
              name="pitchAngle"
              required
              rows={3}
              disabled={status === "loading"}
              className={textareaClassName}
              placeholder="What is the core insight readers should take away?"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="contribute-outline">Outline</Label>
            <textarea
              id="contribute-outline"
              name="outline"
              required
              rows={5}
              disabled={status === "loading"}
              className={textareaClassName}
              placeholder="Headings or bullet outline for the article"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="contribute-qualifications">Qualifications (optional)</Label>
            <textarea
              id="contribute-qualifications"
              name="qualifications"
              rows={3}
              disabled={status === "loading"}
              className={textareaClassName}
              placeholder="Relevant experience, credentials, or prior publications"
            />
          </div>

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

          <Button type="submit" disabled={status === "loading"} className="w-full sm:w-auto">
            {status === "loading" ? "Submitting…" : "Submit pitch"}
          </Button>

          {message && (
            <p
              className={`text-sm ${status === "error" ? "text-destructive" : "text-muted-foreground"}`}
              role={status === "error" ? "alert" : "status"}
            >
              {message}
            </p>
          )}
        </form>
      </CardContent>
    </Card>
  );
}
