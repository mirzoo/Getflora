"use client";

import { useId, useState } from "react";

import { cn } from "@/lib/utils";

type GfInputProps = Omit<React.InputHTMLAttributes<HTMLInputElement>, "className"> & {
  label: string;
  className?: string;
  containerClassName?: string;
};

export function GfInput({
  label,
  className,
  containerClassName,
  id,
  value,
  defaultValue,
  onFocus,
  onBlur,
  onChange,
  ...props
}: GfInputProps) {
  const generatedId = useId();
  const inputId = id ?? generatedId;
  const [isFocused, setIsFocused] = useState(false);
  const [internalValue, setInternalValue] = useState(defaultValue ?? "");

  const resolvedValue = value !== undefined ? String(value) : String(internalValue);
  const isFloating = isFocused || resolvedValue.length > 0;

  return (
    <div
      className={cn(
        "flex h-14 w-full rounded-2xl bg-gf-bg-base-alt px-4 transition-colors",
        isFloating ? "flex-col justify-center gap-1 py-1.5" : "items-center",
        containerClassName,
      )}
    >
      {isFloating ? (
        <label className="text-gf-body-xs text-gf-text-secondary" htmlFor={inputId}>
          {label}
        </label>
      ) : null}

      <input
        {...props}
        id={inputId}
        value={value}
        defaultValue={defaultValue}
        placeholder={isFloating ? undefined : label}
        className={cn(
          "w-full min-w-0 bg-transparent text-gf-body-m text-gf-text-primary outline-none placeholder:text-gf-text-secondary",
          className,
        )}
        onFocus={(event) => {
          setIsFocused(true);
          onFocus?.(event);
        }}
        onBlur={(event) => {
          setIsFocused(false);
          onBlur?.(event);
        }}
        onChange={(event) => {
          if (value === undefined) {
            setInternalValue(event.target.value);
          }

          onChange?.(event);
        }}
      />
    </div>
  );
}
