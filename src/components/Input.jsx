import { Search } from "lucide-react";

export function Input({ label, className = "", id, hint, error, ...props }) {
  return (
    <div className="flex flex-col gap-1.5">
      {label && (
        <label htmlFor={id} className="text-xs font-semibold tracking-wide text-text-secondary uppercase font-mono">
          {label}
        </label>
      )}
      <input
        id={id}
        aria-invalid={error ? "true" : undefined}
        className={`cf-input px-4 py-2.5 text-sm ${error ? "!border-danger" : ""} ${className}`}
        {...props}
      />
      {error ? (
        <p className="text-xs text-danger font-medium">{error}</p>
      ) : (
        hint && <p className="text-xs text-text-muted">{hint}</p>
      )}
    </div>
  );
}

export function SearchBar({ placeholder = "Search...", value, onChange, className = "" }) {
  return (
    <div className={`relative ${className}`}>
      <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-text-muted pointer-events-none" />
      <input
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        className="cf-input w-full pl-9 pr-4 py-2 text-sm text-text-primary placeholder:text-text-muted"
      />
    </div>
  );
}
