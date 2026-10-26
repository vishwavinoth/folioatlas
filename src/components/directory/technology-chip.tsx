export function TechnologyChip({
  label,
  href,
  count,
  removable,
  onRemove,
}: {
  label: string;
  href?: string;
  count?: number;
  removable?: boolean;
  onRemove?: () => void;
}) {
  const base =
    "inline-flex max-w-full items-center gap-1 rounded-full border border-[var(--surface-border)] bg-black/[0.03] px-2.5 py-0.5 text-xs font-medium text-[var(--fa-text-secondary)] transition-colors dark:bg-white/[0.06]";

  if (removable && onRemove) {
    return (
      <button
        type="button"
        onClick={onRemove}
        className={`${base} hover:border-[var(--fa-accent)]/40 hover:text-[var(--fa-accent)]`}
        aria-label={`Remove filter: ${label}`}
      >
        <span className="truncate">{label}</span>
        <span aria-hidden="true" className="text-[14px] leading-none">
          ×
        </span>
      </button>
    );
  }

  const inner = (
    <>
      <span className="truncate">{label}</span>
      {typeof count === "number" && <span className="opacity-60">{count}</span>}
    </>
  );

  if (href) {
    return (
      <a href={href} className={`${base} hover:border-[var(--fa-accent)]/40 hover:text-[var(--fa-accent)]`}>
        {inner}
      </a>
    );
  }

  return <span className={base}>{inner}</span>;
}
