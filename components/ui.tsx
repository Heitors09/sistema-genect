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
import { Check, ChevronDown } from "lucide-react";

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
      "bg-[#f3f4f6] text-[#0c0d10] shadow-[inset_0_1px_0_rgb(255_255_255_/_0.7),0_8px_18px_rgb(0_0_0_/_0.28)] hover:bg-white hover:shadow-[inset_0_1px_0_rgb(255_255_255_/_0.8),0_10px_20px_rgb(0_0_0_/_0.32)]",
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
}: SelectHTMLAttributes<HTMLSelectElement>) {
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
        )}
      >
        <span className={cn("min-w-0 truncate", !selected?.value && "text-faint")}>
          {selected?.label || "Selecionar"}
        </span>
        <ChevronDown
          size={16}
          strokeWidth={1.75}
          className={cn("shrink-0 text-faint transition-transform duration-200 ease-[cubic-bezier(0.22,1,0.36,1)]", open && "rotate-180")}
        />
      </button>
      {panel ? (
        <div
          id={listId}
          role="listbox"
          className={cn(
            "absolute z-50 mt-1 max-h-60 w-full origin-top overflow-auto rounded-md border border-line-strong bg-[#12131a] p-1 shadow-[0_18px_40px_rgb(0_0_0_/_0.55),inset_0_1px_0_rgb(255_255_255_/_0.06)]",
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
                    ? "bg-[#f3f4f6] text-[#0c0d10]"
                    : isActive
                      ? "bg-elevated text-ink"
                      : "text-ink hover:bg-elevated/80",
                  o.disabled && "cursor-not-allowed opacity-40",
                )}
              >
                <span className="min-w-0 truncate">{o.label}</span>
                {isSelected ? <Check size={14} strokeWidth={2} className="shrink-0" /> : null}
              </button>
            );
          })}
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
}: {
  value: string;
  onChange: (value: string) => void;
  options: Array<{ value: string; label: string }>;
  emptyLabel?: string;
  addLabel?: string;
  addPlaceholder?: string;
  onAdd: (label: string) => void;
  disabled?: boolean;
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
    <div className="flex flex-col gap-2">
      <Select
        value={adding ? "__novo__" : value}
        disabled={disabled}
        onChange={(e) => {
          if (e.target.value === "__novo__") {
            setAdding(true);
            return;
          }
          setAdding(false);
          onChange(e.target.value);
        }}
      >
        {emptyLabel ? <option value="">{emptyLabel}</option> : null}
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
        <option value="__novo__">{addLabel}</option>
      </Select>
      {adding ? (
        <div className="flex gap-2">
          <Input
            value={draft}
            autoFocus
            placeholder={addPlaceholder}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
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
          <Button type="button" size="sm" onClick={commit}>
            Adicionar
          </Button>
        </div>
      ) : null}
    </div>
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
  children,
}: {
  tone?: "mute" | "mint" | "sky" | "rose" | "amber" | "violet";
  children: ReactNode;
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
    <span className={cn("inline-flex h-7 shrink-0 items-center rounded-md px-2 text-[11px] font-medium leading-none", map[tone])}>
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
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div className="min-w-0">
        {kicker ? <p className="kicker mb-1.5">{kicker}</p> : null}
        <h1 className="page-title">{title}</h1>
        {description ? <p className="lede hidden md:block">{description}</p> : null}
      </div>
      {actions ? <div className="flex flex-wrap items-center gap-2 pt-0.5">{actions}</div> : null}
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

export function DataTable({
  headers,
  children,
}: {
  headers: string[];
  children: ReactNode;
}) {
  const rows = Children.map(children, (row) => {
    if (!isValidElement(row)) return row;
    const rowEl = row as ReactElement<{ children?: ReactNode; className?: string }>;
    const cells = Children.map(rowEl.props.children, (cell, i) => {
      if (!isValidElement(cell)) return cell;
      const cellEl = cell as ReactElement<{ label?: string }>;
      return cloneElement(cellEl, { label: cellEl.props.label ?? headers[i] });
    });
    return cloneElement(rowEl, { className: cn(rowEl.props.className) }, cells);
  });

  return (
    <div className="table-shell">
      <table className="stack-table w-full text-left text-[13px] md:min-w-[640px]">
        <thead className="max-md:sr-only">
          <tr>
            {headers.map((h) => (
              <th key={h} className="kicker px-3 py-3">
                {h}
              </th>
            ))}
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
