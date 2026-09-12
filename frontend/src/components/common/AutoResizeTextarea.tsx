import { useRef, useEffect } from "react";

type Props = {
  value: string;
  onChange: (value: string) => void;
  className?: string;
  rows?: number;
  maxLength?: number;
  placeholder?: string;
};

export function AutoResizeTextarea({
  value,
  onChange,
  className = "",
  rows = 4,
  maxLength,
  placeholder,
}: Props) {
  const ref = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${el.scrollHeight}px`;
  }, [value]);

  const showCounter = maxLength != null;

  return (
    <div className="relative">
      <textarea
        ref={ref}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        rows={rows}
        maxLength={maxLength}
        placeholder={placeholder}
        className={`min-h-[100px] resize-y overflow-y-auto text-sm leading-relaxed ${showCounter ? "pb-8" : ""} ${className}`}
      />
      {showCounter && (
        <span className="pointer-events-none absolute bottom-2.5 right-3 text-[11px] font-medium text-gray-400">
          {value.length}/{maxLength}
        </span>
      )}
    </div>
  );
}