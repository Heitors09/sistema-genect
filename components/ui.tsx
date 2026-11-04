"use client";

import {
  Children,
  cloneElement,
  isValidElement,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type ButtonHTMLAttributes,
  type ChangeEvent,
  type InputHTMLAttributes,
  type KeyboardEvent,
  type ReactElement,
  type ReactNode,
  type SelectHTMLAttributes,
  type TdHTMLAttributes,
  type TextareaHTMLAttributes,
} from "react";
import Link from "next/link";
import { Calendar, Check, ChevronDown, ChevronLeft, ChevronRight } from "lucide-react";

export function cn(...parts: Array<string | false | null | undefined>) {
  return parts.filter(Boolean).join(" ");
}

type ButtonVariant = "primary" | "ghost" | "danger" | "soft";
type ButtonSize = "sm" | "md";

function buttonClass(
  variant: ButtonVariant,
  size: ButtonSize,
  className?: string,
) {
  return cn(
    "motion-press inline-flex cursor-pointer items-center justify-center gap-1.5 rounded-md font-medium disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:translate-y-0 disabled:active:scale-100",
    size === "sm" ? "h-7 shrink-0 px-2.5 text-[11px]" : "min-h-11 px-3.5 text-[14px] md:h-9 md:min-h-0 md:text-[13px]",
    variant === "primary" &&
      "bg-btn text-btn-ink shadow-[inset_0_1px_0_rgb(255_255_255_/_0.18),0_8px_18px_rgb(0_0_0_/_0.18)] hover:bg-[var(--btn-hover)]",
    variant === "ghost" &&
      "border border-line bg-transparent text-ink shadow-[inset_0_1px_0_rgb(255_255_255_/_0.04)] hover:bg-elevated",
    variant === "soft" &&
      "border border-line bg-elevated/80 text-ink shadow-[inset_0_1px_0_rgb(255_255_255_/_0.05)] hover:bg-elevated",
    variant === "danger" && "bg-rose/12 text-rose hover:bg-rose/20",
    className,
  );
}

export function Button({
  variant = "primary",
  size = "md",
  className,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
  size?: ButtonSize;
}) {
  return <button className={buttonClass(variant, size, className)} {...props} />;
}

export function ButtonLink({
  href,
  variant = "primary",
  size = "md",
  className,
  children,
}: {
  href: string;
  variant?: ButtonVariant;
  size?: ButtonSize;
  className?: string;
  children: ReactNode;
}) {
  return (
    <Link href={href} className={buttonClass(variant, size, className)}>
      {children}
    </Link>
  );
}

export function Field({
  label,
  hint,
  error,
  children,
}: {
  label: string;
  hint?: string;
  error?: string;
  children: ReactNode;
}) {
  return (
    <div className="flex min-w-0 flex-col gap-1.5">
      <span className="text-[12px] font-medium text-mute">{label}</span>
      {children}
      {error ? <span className="text-[11px] text-rose">{error}</span> : hint ? <span className="text-[11px] text-faint">{hint}</span> : null}
    </div>
  );
}

const control =
  "well min-h-11 w-full rounded-md border border-line px-3 text-base text-ink outline-none placeholder:text-faint focus:border-line-strong md:h-9 md:min-h-0 md:px-3 md:text-[13px]";

export function Input({ className, ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return <input className={cn(control, className)} {...props} />;
}

const WEEKDAYS = [
  { key: "dom", label: "D" },
  { key: "seg", label: "S" },
  { key: "ter", label: "T" },
  { key: "qua", label: "Q" },
  { key: "qui", label: "Q" },
  { key: "sex", label: "S" },
  { key: "sab", label: "S" },
];
const MONTHS = [
  "Janeiro",
  "Fevereiro",
  "Março",
  "Abril",
  "Maio",
  "Junho",
  "Julho",
  "Agosto",
  "Setembro",
  "Outubro",
  "Novembro",
  "Dezembro",
];

function parseISODate(iso: string) {
  const [y, m, d] = (iso || "").slice(0, 10).split("-").map(Number);
  if (!y || !m || !d) return null;
  return new Date(y, m - 1, d);
}

function toISODate(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function sameDay(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

function calendarCells(cursor: Date) {
  const start = new Date(cursor.getFullYear(), cursor.getMonth(), 1);
  const startWeekday = start.getDay();
  const daysInMonth = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 0).getDate();
  const prevMonthDays = new Date(cursor.getFullYear(), cursor.getMonth(), 0).getDate();
  const cells: { date: Date; current: boolean }[] = [];
  for (let i = startWeekday - 1; i >= 0; i--) {
    cells.push({
      date: new Date(cursor.getFullYear(), cursor.getMonth() - 1, prevMonthDays - i),
      current: false,
    });
  }
  for (let day = 1; day <= daysInMonth; day++) {
    cells.push({ date: new Date(cursor.getFullYear(), cursor.getMonth(), day), current: true });
  }
  while (cells.length % 7 !== 0) {
    const last = cells[cells.length - 1].date;
    cells.push({
      date: new Date(last.getFullYear(), last.getMonth(), last.getDate() + 1),
      current: false,
    });
  }
  return cells;
}

export function DateInput({
  value,
  onChange,
  disabled,
  name,
  required,
  className,
}: InputHTMLAttributes<HTMLInputElement>) {
  const current = String(value ?? "");
  const selected = parseISODate(current);
  const today = useMemo(() => {
    const n = new Date();
    return new Date(n.getFullYear(), n.getMonth(), n.getDate());
  }, []);
  const [open, setOpen] = useState(false);
  const [panel, setPanel] = useState(false);
  const [cursor, setCursor] = useState(() => selected ?? today);
  const rootRef = useRef<HTMLDivElement>(null);
  const cells = useMemo(() => calendarCells(cursor), [cursor]);

  useEffect(() => {
    if (open) setCursor(parseISODate(current) ?? today);
  }, [open, current, today]);

  useEffect(() => {
    if (open) {
      setPanel(true);
      return;
    }
    const t = window.setTimeout(() => setPanel(false), 160);
    return () => window.clearTimeout(t);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    function onDoc(ev: MouseEvent) {
      if (!rootRef.current?.contains(ev.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [open]);

  function emit(next: string) {
    onChange?.({
      target: { value: next, name: name ?? "" },
      currentTarget: { value: next, name: name ?? "" },
    } as ChangeEvent<HTMLInputElement>);
    setOpen(false);
  }

  const label = selected
    ? `${String(selected.getDate()).padStart(2, "0")}/${String(selected.getMonth() + 1).padStart(2, "0")}/${selected.getFullYear()}`
    : "Selecionar data";

  return (
    <div ref={rootRef} className={cn("relative min-w-0", className)}>
      <button
        type="button"
        disabled={disabled}
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-label="Data"
        onClick={() => !disabled && setOpen((v) => !v)}
        onKeyDown={(ev) => {
          if (ev.key === "Escape") setOpen(false);
          if (ev.key === "Enter" || ev.key === " ") {
            ev.preventDefault();
            setOpen((v) => !v);
          }
        }}
        className={cn(
          control,
          "flex w-full cursor-pointer items-center justify-between gap-3 pr-3 text-left tabular-nums",
          open && "border-line-strong",
          disabled && "cursor-not-allowed opacity-45",
          !selected && "text-faint",
        )}
      >
        <span className="min-w-0 truncate">{label}</span>
        <Calendar size={15} strokeWidth={1.75} className="shrink-0 text-faint" />
      </button>
      {panel ? (
        <div
          role="dialog"
          aria-label="Calendário"
          className={cn(
            "absolute z-50 mt-1 w-full min-w-[17.75rem] origin-top rounded-md border border-line-strong bg-popover p-2.5 shadow-[0_18px_40px_rgb(0_0_0_/_0.18),inset_0_1px_0_rgb(255_255_255_/_0.06)]",
            open ? "motion-rise-in" : "pointer-events-none motion-rise-out",
          )}
        >
          <div className="mb-2 flex items-center justify-between gap-2 px-0.5">
            <button
              type="button"
              className="grid h-8 w-8 place-items-center rounded-md text-mute hover:bg-elevated hover:text-ink"
              aria-label="Mês anterior"
              onClick={() => setCursor(new Date(cursor.getFullYear(), cursor.getMonth() - 1, 1))}
            >
              <ChevronLeft size={16} />
            </button>
            <p className="text-[13px] font-medium capitalize text-ink">
              {MONTHS[cursor.getMonth()]} {cursor.getFullYear()}
            </p>
            <button
              type="button"
              className="grid h-8 w-8 place-items-center rounded-md text-mute hover:bg-elevated hover:text-ink"
              aria-label="Próximo mês"
              onClick={() => setCursor(new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1))}
            >
              <ChevronRight size={16} />
            </button>
          </div>
          <div className="grid grid-cols-7 gap-0.5">
            {WEEKDAYS.map((day) => (
              <span key={day.key} className="grid h-7 place-items-center text-[10px] font-medium uppercase tracking-[0.12em] text-faint">
                {day.label}
              </span>
            ))}
            {cells.map((cell) => {
              const iso = toISODate(cell.date);
              const isSelected = selected ? sameDay(cell.date, selected) : false;
              const isToday = sameDay(cell.date, today);
              return (
                <button
                  key={iso}
                  type="button"
                  onClick={() => emit(iso)}
                  className={cn(
                    "grid h-8 place-items-center rounded-md text-[12px] tabular-nums",
                    isSelected
                      ? "bg-btn text-btn-ink"
                      : isToday
                        ? "text-sky hover:bg-elevated"
                        : cell.current
                          ? "text-ink hover:bg-elevated"
                          : "text-faint hover:bg-elevated/70",
                  )}
                >
                  {cell.date.getDate()}
                </button>
              );
            })}
          </div>
          <div className="mt-2 flex items-center justify-between border-t border-line pt-2">
            <button
              type="button"
              className="rounded-md px-2 py-1 text-[12px] text-sky hover:bg-elevated"
              onClick={() => emit(toISODate(today))}
            >
              Hoje
            </button>
            <button
              type="button"
              className="rounded-md px-2 py-1 text-[12px] text-mute hover:bg-elevated hover:text-ink"
              onClick={() => setOpen(false)}
            >
              Fechar
            </button>
          </div>
        </div>
      ) : null}
      {name ? <input type="hidden" name={name} value={current} required={required} /> : null}
    </div>
  );
}

export function FileInput({
  accept,
  multiple,
  disabled,
  emptyLabel = "Nenhum arquivo selecionado",
  actionLabel = "Escolher",
  className,
  onFiles,
}: {
  accept?: string;
  multiple?: boolean;
  disabled?: boolean;
  emptyLabel?: string;
  actionLabel?: string;
  className?: string;
  onFiles: (files: FileList | null) => void | Promise<void>;
}) {
  const id = useId();
  const [names, setNames] = useState<string[]>([]);
  const label =
    names.length === 0 ? emptyLabel : names.length === 1 ? names[0] : `${names.length} arquivos selecionados`;

  return (
    <label
      htmlFor={id}
      className={cn(
        control,
        "flex cursor-pointer items-center justify-between gap-3",
        disabled && "cursor-not-allowed opacity-45",
        className,
      )}
    >
      <span className={cn("min-w-0 truncate", names.length === 0 && "text-faint")}>{label}</span>
      <span className="shrink-0 text-[12px] text-sky">{actionLabel}</span>
      <input
        id={id}
        type="file"
        accept={accept}
        multiple={multiple}
        disabled={disabled}
        className="sr-only"
        onChange={(e) => {
          const files = e.target.files;
          setNames(files ? [...files].map((f) => f.name) : []);
          void onFiles(files);
        }}
      />
    </label>
  );
}

type SelectOption = { value: string; label: string; disabled?: boolean };

function nodeText(node: ReactNode): string {
  if (node == null || typeof node === "boolean") return "";
  if (typeof node === "string" || typeof node === "number") return String(node);
  if (Array.isArray(node)) return node.map(nodeText).join("");
  if (isValidElement(node)) return nodeText((node.props as { children?: ReactNode }).children);
  return "";
}

function collectOptions(nodes: ReactNode): SelectOption[] {
  return Children.toArray(nodes).flatMap((child) => {
    if (!isValidElement(child)) return [];
    const props = child.props as { value?: string | number; children?: ReactNode; disabled?: boolean };
    if (child.type === "option" || props.value !== undefined) {
      return [{
        value: String(props.value ?? ""),
        label: nodeText(props.children),
        disabled: props.disabled,
      }];
    }
    if (props.children) return collectOptions(props.children);
    return [];
  });
}

export function Select({
  className,
  children,
  value,
  onChange,
  disabled,
  name,
  required,
  footer,
  triggerClassName,
}: SelectHTMLAttributes<HTMLSelectElement> & {
  footer?: ReactNode;
  triggerClassName?: string;
}) {
  const listId = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [panel, setPanel] = useState(false);
  const options = useMemo(() => collectOptions(children), [children]);
  const current = String(value ?? "");
  const selected = options.find((o) => o.value === current) ?? options[0];
  const selectedIndex = Math.max(0, options.findIndex((o) => o.value === current));
  const [active, setActive] = useState(selectedIndex);

  useEffect(() => {
    if (open) setActive(selectedIndex);
  }, [open, selectedIndex]);

  useEffect(() => {
    if (open) {
      setPanel(true);
      return;
    }
    const t = window.setTimeout(() => setPanel(false), 160);
    return () => window.clearTimeout(t);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    function onDoc(ev: MouseEvent) {
      if (!rootRef.current?.contains(ev.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [open]);

  function emit(next: string) {
    onChange?.({
      target: { value: next, name: name ?? "" },
      currentTarget: { value: next, name: name ?? "" },
    } as ChangeEvent<HTMLSelectElement>);
    setOpen(false);
  }

  function onKeyDown(ev: KeyboardEvent<HTMLButtonElement>) {
    if (disabled) return;
    if (!open && (ev.key === "ArrowDown" || ev.key === "ArrowUp" || ev.key === "Enter" || ev.key === " ")) {
      ev.preventDefault();
      setOpen(true);
      return;
    }
    if (!open) return;
    if (ev.key === "Escape") {
      ev.preventDefault();
      setOpen(false);
      return;
    }
    if (ev.key === "ArrowDown") {
      ev.preventDefault();
      setActive((i) => Math.min(options.length - 1, i + 1));
      return;
    }
    if (ev.key === "ArrowUp") {
      ev.preventDefault();
      setActive((i) => Math.max(0, i - 1));
      return;
    }
    if (ev.key === "Enter" || ev.key === " ") {
      ev.preventDefault();
      const next = options[active];
      if (next && !next.disabled) emit(next.value);
    }
  }

  return (
    <div ref={rootRef} className={cn("relative min-w-0", className)}>
      <button
        type="button"
        disabled={disabled}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={listId}
        onClick={() => !disabled && setOpen((v) => !v)}
        onKeyDown={onKeyDown}
        className={cn(
          control,
          "flex w-full cursor-pointer items-center justify-between gap-3 pr-3 text-left",
          open && "border-line-strong",
          disabled && "cursor-not-allowed opacity-45",
          triggerClassName,
        )}
      >
        <span className={cn("min-w-0 truncate", !selected?.value && "text-faint")}>
          {selected?.label || "Selecionar"}
        </span>
        <ChevronDown
          size={16}
          strokeWidth={1.75}
          className={cn("shrink-0 text-faint transition-transform duration-[280ms] ease-[cubic-bezier(0.22,1,0.36,1)]", open && "rotate-180")}
        />
      </button>
      {panel ? (
        <div
          id={listId}
          role="listbox"
          className={cn(
            "absolute z-50 mt-1 max-h-60 min-w-full w-max origin-top overflow-auto rounded-md border border-line-strong bg-popover p-1 shadow-[0_18px_40px_rgb(0_0_0_/_0.18),inset_0_1px_0_rgb(255_255_255_/_0.06)]",
            open ? "motion-rise-in" : "pointer-events-none motion-rise-out",
          )}
        >
          {options.map((o, i) => {
            const isSelected = o.value === current;
            const isActive = i === active;
            return (
              <button
                key={`${o.value}-${o.label}`}
                type="button"
                role="option"
                aria-selected={isSelected}
                disabled={o.disabled}
                onMouseEnter={() => setActive(i)}
                onMouseDown={(ev) => ev.preventDefault()}
                onClick={() => emit(o.value)}
                className={cn(
                  "flex w-full cursor-pointer items-center justify-between gap-2 rounded-md px-2.5 py-2 text-left text-[13px]",
                  isSelected
                    ? "bg-btn text-btn-ink"
                    : isActive
                      ? "bg-elevated text-ink"
                      : "text-ink hover:bg-elevated/80",
                  o.disabled && "cursor-not-allowed opacity-40",
                )}
              >
                <span className="whitespace-nowrap">{o.label}</span>
                {isSelected ? <Check size={14} strokeWidth={2} className="shrink-0" /> : null}
              </button>
            );
          })}
          {footer ? <div className="mt-1 border-t border-line pt-1">{footer}</div> : null}
        </div>
      ) : null}
      {name ? <input type="hidden" name={name} value={current} required={required} /> : null}
    </div>
  );
}

export function CreatableSelect({
  value,
  onChange,
  options,
  emptyLabel,
  addLabel = "+ Adicionar item",
  addPlaceholder = "Novo item",
  onAdd,
  disabled,
  className,
  triggerClassName,
}: {
  value: string;
  onChange: (value: string) => void;
  options: Array<{ value: string; label: string }>;
  emptyLabel?: string;
  addLabel?: string;
  addPlaceholder?: string;
  onAdd: (label: string) => void;
  disabled?: boolean;
  className?: string;
  triggerClassName?: string;
}) {
  const [adding, setAdding] = useState(false);
  const [draft, setDraft] = useState("");

  function commit() {
    const next = draft.trim();
    if (!next) return;
    onAdd(next);
    setDraft("");
    setAdding(false);
  }

  return (
    <Select
      value={value}
      disabled={disabled}
      className={className}
      triggerClassName={triggerClassName}
      onChange={(e) => onChange(e.target.value)}
      footer={
        adding ? (
          <div className="flex gap-1 p-0.5" onMouseDown={(e) => e.preventDefault()}>
            <input
              value={draft}
              autoFocus
              placeholder={addPlaceholder}
              className="well h-8 min-w-0 flex-1 rounded-md border border-line px-2 text-[12px] text-ink outline-none"
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => {
                e.stopPropagation();
                if (e.key === "Enter") {
                  e.preventDefault();
                  commit();
                }
                if (e.key === "Escape") {
                  setAdding(false);
                  setDraft("");
                }
              }}
            />
            <Button type="button" size="sm" className="h-8 px-2.5" onClick={commit}>
              Ok
            </Button>
          </div>
        ) : (
          <button
            type="button"
            disabled={disabled}
            className="flex w-full cursor-pointer items-center rounded-md px-2.5 py-2 text-left text-[12px] text-sky hover:bg-elevated/80"
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => setAdding(true)}
          >
            {addLabel}
          </button>
        )
      }
    >
      {emptyLabel ? <option value="">{emptyLabel}</option> : null}
      {options.map((o) => (
        <option key={o.value} value={o.value}>
          {o.label}
        </option>
      ))}
    </Select>
  );
}

export function Textarea({ className, ...props }: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea className={cn(control, "h-24 py-2 resize-y", className)} {...props} />;
}

export function Card({ className, children }: { className?: string; children: ReactNode }) {
  return (
    <div className={cn("surface rounded-md", className)}>{children}</div>
  );
}

export function Badge({
  tone = "mute",
  size = "md",
  children,
  className,
}: {
  tone?: "mute" | "mint" | "sky" | "rose" | "amber" | "violet";
  size?: "md" | "sm";
  children: ReactNode;
  className?: string;
}) {
  const map = {
    mute: "border border-line bg-elevated/80 text-mute",
    mint: "border border-mint/20 bg-mint/10 text-mint",
    sky: "border border-sky/20 bg-sky/10 text-sky",
    rose: "border border-rose/20 bg-rose/10 text-rose",
    amber: "border border-amber/20 bg-amber/10 text-amber",
    violet: "border border-violet/20 bg-violet/10 text-violet",
  };
  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center justify-center font-medium leading-none tabular-nums transition-[background-color,border-color,color] duration-[220ms] ease-[cubic-bezier(0.22,1,0.36,1)]",
        size === "sm" ? "h-4 min-w-4 rounded px-1 text-[9px]" : "h-5 rounded px-1.5 text-[10px]",
        map[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}

export function PageHeader({
  kicker,
  title,
  description,
  actions,
}: {
  kicker?: string;
  title: string;
  description?: string;
  actions?: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-start sm:justify-between">
      <div className="min-w-0">
        {kicker ? <p className="kicker mb-1.5">{kicker}</p> : null}
        <h1 className="page-title">{title}</h1>
        {description ? <p className="lede hidden md:block">{description}</p> : null}
      </div>
      {actions ? (
        <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:items-center sm:gap-2">
          {actions}
        </div>
      ) : null}
    </div>
  );
}

export function Stat({
  label,
  value,
  hint,
  tone = "ink",
}: {
  label: string;
  value: string;
  hint?: string;
  tone?: "ink" | "mint" | "rose" | "amber";
}) {
  const color = {
    ink: "text-ink",
    mint: "text-mint",
    rose: "text-rose",
    amber: "text-amber",
  }[tone];
  return (
    <Card className="px-4 py-3.5">
      <p className="kicker">{label}</p>
      <p className={cn("stat-value mt-2", color)}>{value}</p>
      {hint ? <p className="mt-1.5 text-[11px] text-faint">{hint}</p> : null}
    </Card>
  );
}

export type TableHeader = string | { label: string; sortKey?: string };
export type TableSort = { key: string; dir: "asc" | "desc" } | null;

/** Clique alterna: crescente → decrescente → sem ordenação (estilo planilha). */
export function nextSort(current: TableSort, key: string): TableSort {
  if (!current || current.key !== key) return { key, dir: "asc" };
  if (current.dir === "asc") return { key, dir: "desc" };
  return null;
}

export function DataTable({
  headers,
  children,
  sort,
  onSort,
}: {
  headers: TableHeader[];
  children: ReactNode;
  sort?: TableSort;
  onSort?: (next: TableSort) => void;
}) {
  const labels = headers.map((h) => (typeof h === "string" ? h : h.label));
  const rows = Children.map(children, (row) => {
    if (!isValidElement(row)) return row;
    const rowEl = row as ReactElement<{ children?: ReactNode; className?: string }>;
    const cells = Children.map(rowEl.props.children, (cell, i) => {
      if (!isValidElement(cell)) return cell;
      const cellEl = cell as ReactElement<{ label?: string }>;
      return cloneElement(cellEl, { label: cellEl.props.label ?? labels[i] });
    });
    return cloneElement(rowEl, { className: cn(rowEl.props.className) }, cells);
  });

  return (
    <div className="table-shell">
      <table className="stack-table w-full text-left text-[13px] md:min-w-[640px]">
        <thead className="max-md:sr-only">
          <tr>
            {headers.map((h, i) => {
              const key = typeof h === "string" ? undefined : h.sortKey;
              const active = key && sort?.key === key ? sort.dir : null;
              return (
                <th
                  key={`${labels[i]}-${i}`}
                  className="kicker px-3 py-3"
                  aria-sort={active === "asc" ? "ascending" : active === "desc" ? "descending" : undefined}
                >
                  {key && onSort ? (
                    <button
                      type="button"
                      className={cn(
                        "inline-flex cursor-pointer items-center gap-1 uppercase tracking-[inherit] hover:text-ink",
                        active && "text-ink",
                      )}
                      onClick={() => onSort(nextSort(sort ?? null, key))}
                      title="Ordenar"
                    >
                      {labels[i]}
                      <span aria-hidden className="text-[9px]">
                        {active === "asc" ? "▲" : active === "desc" ? "▼" : "↕"}
                      </span>
                    </button>
                  ) : (
                    labels[i]
                  )}
                </th>
              );
            })}
          </tr>
        </thead>
        <tbody className="md:divide-y md:divide-line">{rows}</tbody>
      </table>
    </div>
  );
}

export function Td({
  children,
  mono,
  label,
  className,
  ...props
}: TdHTMLAttributes<HTMLTableCellElement> & { mono?: boolean; label?: string }) {
  return (
    <td
      data-label={label}
      className={cn("px-3 py-2.5 align-middle text-[13px] text-ink/90", mono && "font-mono text-[12px] text-ink", className)}
      {...props}
    >
      {children}
    </td>
  );
}

export function Empty({ title, hint }: { title: string; hint?: string }) {
  return (
    <div className="rounded-md border border-dashed border-line px-4 py-10 text-center">
      <p className="text-sm text-ink">{title}</p>
      {hint ? <p className="mt-1 text-[12px] text-mute">{hint}</p> : null}
    </div>
  );
}

export function Tabs<T extends string>({
  value,
  onChange,
  items,
  className,
}: {
  value: T;
  onChange: (v: T) => void;
  items: { id: T; label: string; count?: number }[];
  className?: string;
}) {
  return (
    <div
      role="tablist"
      className={cn("flex flex-wrap gap-1 rounded-md border border-line bg-panel p-1", className)}
    >
      {items.map((t) => {
        const active = value === t.id;
        return (
          <button
            key={t.id}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => onChange(t.id)}
            className={cn(
              "min-h-9 rounded-md px-3 text-[13px] font-medium transition-colors",
              active
                ? "bg-elevated text-ink shadow-[inset_0_1px_0_rgb(255_255_255_/_0.06)]"
                : "text-mute hover:text-ink",
            )}
          >
            {t.label}
            {typeof t.count === "number" ? <span className="ml-1 text-faint">({t.count})</span> : null}
          </button>
        );
      })}
    </div>
  );
}

export function Modal({
  open,
  title,
  onClose,
  children,
  size = "md",
}: {
  open: boolean;
  title: string;
  onClose: () => void;
  children: ReactNode;
  size?: "md" | "lg" | "xl";
}) {
  useEffect(() => {
    if (!open) return;
    function onKey(e: globalThis.KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center md:items-center md:px-4">
      <button type="button" className="scrim motion-fade-in absolute inset-0 bg-black/55" aria-label="Fechar" onClick={onClose} />
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className={cn(
          "surface page-enter relative max-h-[90dvh] w-full overflow-y-auto rounded-t-md p-4 md:rounded-md",
          size === "md" ? "md:max-w-lg" : size === "lg" ? "md:max-w-2xl" : "md:max-w-4xl",
        )}
      >
        <div className="mb-3 flex items-center justify-between gap-3">
          <p className="text-[15px] font-semibold tracking-[-0.02em]">{title}</p>
          <button type="button" className="text-[12px] text-mute hover:text-ink" onClick={onClose}>
            Fechar
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}
