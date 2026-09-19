"use client";

import {useState} from "react";
import type {AxisRange} from "@pakfactory/utilities/length-units";
import {formatAxisRangeLabel} from "@pakfactory/utilities/length-units";
import type {LengthUnit} from "@pakfactory/utilities/length-units";
import {cn} from "../../../lib/utils";
import type {DimensionFieldAxis, DimensionFieldValue} from "../types";
import {DEFAULT_DIMENSION_AXES} from "../types";
import {hintClass, inputClass} from "./field-styles";

function emptyValues(axes: DimensionFieldAxis[]): Record<string, string> {
  return Object.fromEntries(axes.map((a) => [a.id, ""]));
}

function asLengthUnit(unit: string): LengthUnit | null {
  return unit === "mm" || unit === "in" ? unit : null;
}

export function DimensionInputs({
  unit,
  axes = DEFAULT_DIMENSION_AXES,
  value,
  ranges,
  disabled = false,
  onChange,
}: {
  unit: string;
  axes?: DimensionFieldAxis[];
  value?: Record<string, string>;
  /** Per-axis min/max already converted into `unit`. */
  ranges?: Partial<Record<string, AxisRange>> | null;
  disabled?: boolean;
  onChange?: (values: Record<string, string>) => void;
}) {
  const [internal, setInternal] = useState(() => emptyValues(axes));
  const values = value ?? internal;
  const lengthUnit = asLengthUnit(unit);

  const setAxis = (id: string, next: string) => {
    const updated = {...values, [id]: next};
    if (value === undefined) setInternal(updated);
    onChange?.(updated);
  };

  return (
    <div className="flex flex-col gap-2">
      <div className="flex gap-2">
        {axes.map((axis) => {
          const range = ranges?.[axis.id];
          const min =
            range?.min != null && Number.isFinite(range.min)
              ? range.min
              : 0;
          const max =
            range?.max != null && Number.isFinite(range.max)
              ? range.max
              : undefined;
          return (
            <div key={axis.id} className="relative min-w-0 flex-1">
              <span className="pointer-events-none absolute top-1/2 left-2 -translate-y-1/2 text-xs text-muted-foreground">
                {axis.prefix}
              </span>
              <input
                type="number"
                min={min}
                max={max}
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
          );
        })}
      </div>
      {lengthUnit && ranges
        ? axes.map((axis) => {
            const range = ranges[axis.id];
            if (!range || (range.min == null && range.max == null)) {
              return null;
            }
            const label = formatAxisRangeLabel(range, lengthUnit);
            if (!label) return null;
            return (
              <p
                key={`${axis.id}-range`}
                className="text-xs text-muted-foreground"
              >
                {axis.label}: {label}
              </p>
            );
          })
        : null}
    </div>
  );
}

export function DimensionField({
  unit,
  axes = DEFAULT_DIMENSION_AXES,
  value: controlled,
  defaultValue,
  ranges,
  onChange,
  showHint = true,
  unsureLabel = "I'm not sure",
}: {
  unit: string;
  axes?: DimensionFieldAxis[];
  value?: DimensionFieldValue;
  defaultValue?: DimensionFieldValue;
  ranges?: Partial<Record<string, AxisRange>> | null;
  onChange?: (value: DimensionFieldValue) => void;
  showHint?: boolean;
  unsureLabel?: string;
}) {
  const [internal, setInternal] = useState<DimensionFieldValue>(
    () =>
      defaultValue ?? {
        unsure: false,
        values: emptyValues(axes),
      },
  );
  const state = controlled ?? internal;

  const setState = (next: DimensionFieldValue) => {
    if (controlled === undefined) setInternal(next);
    onChange?.(next);
  };

  return (
    <>
      <DimensionInputs
        unit={unit}
        axes={axes}
        value={state.values}
        ranges={ranges}
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

export {DEFAULT_DIMENSION_AXES};
