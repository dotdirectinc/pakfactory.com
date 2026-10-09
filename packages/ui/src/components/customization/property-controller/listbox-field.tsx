"use client";

import {useState} from "react";
import {ChevronDownIcon} from "lucide-react";
import {cn} from "../../../lib/utils";
import {Button} from "../../button";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "../../dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../../select";

const PLACEHOLDER = "Select…";

export function ListboxField({
  choices,
  multi,
  exclusive,
  value: controlled,
  defaultValue,
  defaultValues,
  onChange,
}: {
  choices: string[];
  multi?: boolean;
  exclusive?: string;
  value?: string[];
  defaultValue?: string;
  defaultValues?: string[];
  onChange?: (value: string[]) => void;
  hint?: string;
}) {
  const [internal, setInternal] = useState<string[]>(() =>
    multi
      ? [...(defaultValues ?? [])]
      : defaultValue
        ? [defaultValue]
        : [],
  );
  const selected = controlled ?? internal;
  const setSelected = (next: string[]) => {
    if (controlled === undefined) setInternal(next);
    onChange?.(next);
  };

  function toggleMulti(c: string) {
    const on = !selected.includes(c);
    if (!on) {
      setSelected(selected.filter((x) => x !== c));
      return;
    }
    if (!exclusive) {
      setSelected([...selected, c]);
      return;
    }
    const clickedIsEx = c === exclusive;
    if (clickedIsEx) {
      setSelected([exclusive]);
      return;
    }
    setSelected(selected.filter((x) => x !== exclusive).concat(c));
  }

  if (!multi) {
    const current = selected[0] ?? "";
    return (
      <Select
        value={current || undefined}
        onValueChange={(next) => setSelected(next ? [next] : [])}
      >
        <SelectTrigger className="w-full max-w-full shadow-none">
          <SelectValue placeholder={PLACEHOLDER} />
        </SelectTrigger>
        <SelectContent position="popper" align="start" className="w-(--radix-select-trigger-width)">
          {choices.map((c) => (
            <SelectItem key={c} value={c}>
              {c}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    );
  }

  const label =
    selected.length > 0 ? selected.join(", ") : PLACEHOLDER;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          type="button"
          variant="outline"
          className={cn(
            "h-9 w-full max-w-full justify-between px-3 font-normal shadow-none",
            selected.length === 0 && "text-muted-foreground",
          )}
        >
          <span className="truncate">{label}</span>
          <ChevronDownIcon className="size-4 shrink-0 opacity-50" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="start"
        className="w-(--radix-dropdown-menu-trigger-width) min-w-[var(--radix-dropdown-menu-trigger-width)]"
      >
        {choices.map((c) => (
          <DropdownMenuCheckboxItem
            key={c}
            checked={selected.includes(c)}
            onCheckedChange={() => toggleMulti(c)}
            onSelect={(e) => e.preventDefault()}
          >
            {c}
          </DropdownMenuCheckboxItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
