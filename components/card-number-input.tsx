"use client";

import { useMemo, useState } from "react";
import { inputClass, labelClass } from "@/components/ui";
import { cardNumberPrefix, nextCardNumber, normalizeCardNumber } from "@/lib/card-number";

type CardNumberInputProps = {
  defaultValue?: string | null;
  label?: string;
  name?: string;
  onChange?: (value: string) => void;
  suggestions?: string[];
  value?: string;
};

export function CardNumberInput({
  defaultValue,
  label = "型番",
  name = "cardNumber",
  onChange,
  suggestions = [],
  value,
}: CardNumberInputProps) {
  const [internalValue, setInternalValue] = useState(defaultValue ?? "");
  const currentValue = value ?? internalValue;
  const normalizedValue = normalizeCardNumber(currentValue);
  const nextValue = nextCardNumber(normalizedValue);

  const visibleSuggestions = useMemo(() => {
    const prefix = cardNumberPrefix(currentValue);
    const unique = Array.from(new Set(suggestions.map(normalizeCardNumber).filter(Boolean)));
    const filtered = prefix
      ? unique.filter((suggestion) => suggestion.startsWith(prefix) && suggestion !== normalizedValue)
      : unique;

    return filtered.slice(0, 6);
  }, [currentValue, normalizedValue, suggestions]);

  const setValue = (nextValue: string) => {
    if (value === undefined) setInternalValue(nextValue);
    onChange?.(nextValue);
  };

  const quickValues = [
    normalizedValue && normalizedValue !== currentValue ? { label: `補正: ${normalizedValue}`, value: normalizedValue } : null,
    nextValue ? { label: `次: ${nextValue}`, value: nextValue } : null,
  ].filter(Boolean) as Array<{ label: string; value: string }>;

  return (
    <div className="space-y-2">
      <label className="block space-y-2">
        <span className={labelClass}>{label}</span>
        <input
          className={inputClass}
          name={name}
          onBlur={() => {
            if (normalizedValue) setValue(normalizedValue);
          }}
          onChange={(event) => setValue(event.target.value)}
          placeholder="例: LB-05 / ABYR-JP040"
          value={currentValue}
        />
      </label>

      {quickValues.length > 0 || visibleSuggestions.length > 0 ? (
        <div className="flex flex-wrap gap-1.5 text-[11px]">
          {quickValues.map((item) => (
            <button
              className="rounded border border-amber-500/40 bg-amber-950/30 px-2 py-1 font-semibold text-amber-200 hover:border-amber-400"
              key={item.label}
              onClick={() => setValue(item.value)}
              type="button"
            >
              {item.label}
            </button>
          ))}
          {visibleSuggestions.map((suggestion) => (
            <button
              className="rounded border border-[#30312f] bg-[#222321] px-2 py-1 font-semibold text-zinc-300 hover:border-amber-400 hover:text-amber-300"
              key={suggestion}
              onClick={() => setValue(suggestion)}
              type="button"
            >
              {suggestion}
            </button>
          ))}
        </div>
      ) : null}

      {currentValue && normalizedValue !== currentValue ? (
        <p className="text-xs text-zinc-500">保存時は {normalizedValue} に整形されます。</p>
      ) : null}
    </div>
  );
}

