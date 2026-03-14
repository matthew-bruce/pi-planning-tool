"use client";

import { useState } from "react";

type HelpAccordionProps = {
  title: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
};

export function HelpAccordion({
  title,
  children,
  defaultOpen = false,
}: HelpAccordionProps) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <section className="rounded-2xl border border-neutral-200">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left"
      >
        <span className="text-base font-semibold text-neutral-900">{title}</span>
        <span
          className={`text-lg text-neutral-500 transition-transform ${
            open ? "rotate-45" : ""
          }`}
          aria-hidden="true"
        >
          +
        </span>
      </button>

      {open && <div className="border-t border-neutral-200 px-5 py-4">{children}</div>}
    </section>
  );
}
