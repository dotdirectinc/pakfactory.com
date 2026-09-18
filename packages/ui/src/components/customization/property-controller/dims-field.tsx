"use client";

import {useState} from "react";
import {cn} from "../../../lib/utils";
import type {DimAxis, DimsFieldValue} from "../types";
import {DEFAULT_DIM_AXES} from "../types";
import {hintClass, inputClass} from "./field-styles";

function emptyValues(axes: DimAxis[]): Record<string, string> {
  return Object.fromEntries(axes.map((a) => [a.id, ""]));
}

export function DimsInputs({
  unit,
  axes = DEFAULT_DIM_AXES,
  value,
  disabled = false,
  onChange,
}: {
  unit: string;
  axes?: DimAxis[];
  value?: Record<string, string>;
  disabled?: boolean;
  onChange?: (values: Record<string, string>) => void;
}) {
  const [internal, setInternal] = useState(() => emptyValues(axes));
  const values = value ?? internal;

  const setAxis = (id: string, next: string) => {
    const updated = {...values, [id]: next};
    if (value === undefined) setInternal(updated);
    onChange?.(updated);
  };

  return (
    <div className="flex gap-2">
      {axes.map((axis) => (
        <div key={axis.id} className="relative min-w-0 flex-1">
          <span className="pointer-events-none absolute top-1/2 left-2 -translate-y-1/2 text-xs text-muted-foreground">
            {axis.prefix}
          </span>
          <input
            type="number"
            min={0}
            placeholder="0"
            aria-label={axis.label}
            disabled={disabled}
            value={values[axis.id] ?? ""}
            onChange={(e) => setAxis(axis.id, e.target.value)}
            className={cn(inputClass, "px-7", disabled && "opacity-50")}
          />
          <span className="pointer-events-none absolute top-1/2 right-2 -translate-y-1/2 text-xs text-muted-foreground">
            {unit}
          </span>
        </div>
      ))}
    </div>
  );
}

export function DimsField({
  unit,
  axes = DEFAULT_DIM_AXES,
  value: controlled,
  defaultValue,
  onChange,
  showHint = true,
  unsureLabel = "I'm not sure",
}: {
  unit: string;
  axes?: DimAxis[];
  value?: DimsFieldValue;
  defaultValue?: DimsFieldValue;
  onChange?: (value: DimsFieldValue) => void;
  showHint?: boolean;
  unsureLabel?: string;
}) {
  const [internal, setInternal] = useState<DimsFieldValue>(
    () =>
      defaultValue ?? {
        unsure: false,
        values: emptyValues(axes),
      },
  );
  const state = controlled ?? internal;

  const setState = (next: DimsFieldValue) => {
    if (controlled === undefined) setInternal(next);
    onChange?.(next);
  };

  return (
    <>
      <DimsInputs
        unit={unit}
        axes={axes}
        value={state.values}
        disabled={state.unsure}
        onChange={(values) => setState({unsure: false, values})}
      />
      <label className="mt-2 flex cursor-pointer items-center gap-2 text-sm">
        <input
          type="checkbox"
          className="size-4 rounded border-border"
          checked={state.unsure}
          onChange={(e) => {
            const unsure = e.target.checked;
            setState({
              unsure,
              values: unsure ? emptyValues(axes) : state.values,
            });
          }}
        />
        <span>{unsureLabel}</span>
      </label>
      {showHint ? (
        <div className={hintClass}>
          {state.unsure
            ? "We'll confirm dimensions with you — this keeps the line Ready."
            : "Try typing values — prefixes keep each axis clear."}
        </div>
      ) : null}
    </>
  );
}

export {DEFAULT_DIM_AXES};
