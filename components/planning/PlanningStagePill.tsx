'use client';

import {
  useCallback,
  useEffect,
  useOptimistic,
  useRef,
  useState,
  useTransition,
} from 'react';
import { ChevronDown } from 'lucide-react';
import { setProgramIncrementStage } from '@/app/admin/actions';
import {
  PLANNING_STAGES,
  getStageById,
  type PlanningStageId,
} from '@/lib/planning/stages';

type Props = {
  cycleId: string | null;
  currentStage: number | null;
};

/**
 * Planning Stage pill — ambient context in the planning header that shows the
 * current stage and lets the facilitator change it from a dropdown. One
 * component, one behaviour for everyone in MVP1. No role gating — that
 * arrives with RBAC in P4.
 *
 * Visual style matches the ART selector buttons in DispatchShell.tsx exactly
 * (rounded pill, white text on a translucent white background, white border,
 * same padding).
 */
export function PlanningStagePill({ cycleId, currentStage }: Props) {
  const [isOpen, setIsOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  // Optimistic state — flips the moment the user picks a stage, rolls back
  // in the transition if the server rejects.
  const [optimisticStage, setOptimisticStage] = useOptimistic(currentStage);

  const buttonRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const itemRefs = useRef<Array<HTMLButtonElement | null>>([]);

  const stageDef = getStageById(optimisticStage);

  // ── Menu open/close and keyboard handling ──
  const closeMenu = useCallback(() => {
    setIsOpen(false);
    // Return focus to the trigger for accessibility.
    requestAnimationFrame(() => buttonRef.current?.focus());
  }, []);

  useEffect(() => {
    if (!isOpen) return;

    const onClick = (e: MouseEvent) => {
      if (
        menuRef.current?.contains(e.target as Node) ||
        buttonRef.current?.contains(e.target as Node)
      ) {
        return;
      }
      setIsOpen(false);
    };

    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        closeMenu();
        return;
      }
      if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
        e.preventDefault();
        const active = document.activeElement;
        const idx = itemRefs.current.findIndex((el) => el === active);
        const next =
          e.key === 'ArrowDown'
            ? Math.min(PLANNING_STAGES.length - 1, idx < 0 ? 0 : idx + 1)
            : Math.max(0, idx < 0 ? 0 : idx - 1);
        itemRefs.current[next]?.focus();
      }
    };

    document.addEventListener('mousedown', onClick);
    document.addEventListener('keydown', onKey);
    // Focus the current stage (or first) when the menu opens.
    const startIdx = Math.max(
      0,
      PLANNING_STAGES.findIndex((s) => s.id === optimisticStage),
    );
    requestAnimationFrame(() => itemRefs.current[startIdx]?.focus());

    return () => {
      document.removeEventListener('mousedown', onClick);
      document.removeEventListener('keydown', onKey);
    };
  }, [isOpen, closeMenu, optimisticStage]);

  // ── Click handler ──
  const handleSelect = useCallback(
    (nextId: PlanningStageId) => {
      if (!cycleId) {
        setError('No active Program Increment.');
        return;
      }
      if (nextId === optimisticStage) {
        closeMenu();
        return;
      }
      setError(null);
      closeMenu();
      startTransition(async () => {
        setOptimisticStage(nextId);
        const result = await setProgramIncrementStage(cycleId, nextId);
        if (!result.ok) {
          setError(result.error ?? 'Failed to update stage.');
        }
      });
    },
    [cycleId, optimisticStage, closeMenu, setOptimisticStage],
  );

  const label = stageDef
    ? `Stage: ${stageDef.id} · ${stageDef.shortLabel}`
    : 'Set stage';

  return (
    <div className="relative inline-flex flex-col items-end">
      <button
        ref={buttonRef}
        type="button"
        aria-haspopup="menu"
        aria-expanded={isOpen}
        aria-label={
          stageDef
            ? `Planning stage: ${stageDef.name}. Click to change stage.`
            : 'Planning stage not set. Click to set stage.'
        }
        disabled={!cycleId || isPending}
        onClick={() => setIsOpen((prev) => !prev)}
        className={[
          'inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-sm text-white',
          'hover:bg-white hover:text-royalRed hover:border-white',
          'focus:outline-none focus-visible:ring-2 focus-visible:ring-white/70',
          'disabled:opacity-60 transition-colors',
          stageDef ? 'border-white/60' : 'border-dashed border-white/40',
        ].join(' ')}
      >
        {label}
        <ChevronDown size={13} className="shrink-0 opacity-70" />
      </button>

      {error && (
        <span
          role="alert"
          className="mt-1 rounded bg-white/95 px-2 py-0.5 text-[11px] font-medium text-royalRed shadow-sm"
        >
          {error}
        </span>
      )}

      {isOpen && (
        <div
          ref={menuRef}
          role="menu"
          aria-label="Planning stages"
          className="absolute right-0 top-full z-30 mt-1 min-w-[260px] overflow-hidden rounded-md border border-gray-200 bg-white shadow-lg"
        >
          <ul className="py-1">
            {PLANNING_STAGES.map((stage, idx) => {
              const isCurrent = stage.id === optimisticStage;
              return (
                <li key={stage.id}>
                  <button
                    ref={(el) => {
                      itemRefs.current[idx] = el;
                    }}
                    type="button"
                    role="menuitem"
                    onClick={() => handleSelect(stage.id)}
                    className={[
                      'flex w-full items-center gap-2 px-3 py-2 text-left text-sm transition-colors',
                      isCurrent
                        ? 'bg-gray-50 font-semibold text-textPrimary'
                        : 'text-textPrimary hover:bg-gray-50',
                    ].join(' ')}
                  >
                    <span
                      aria-hidden="true"
                      className="inline-flex h-4 w-4 shrink-0 items-center justify-center text-royalRed"
                    >
                      {isCurrent ? '✓' : ''}
                    </span>
                    <span className="shrink-0 text-xs text-textMuted">
                      {stage.id}.
                    </span>
                    <span className="truncate">{stage.name}</span>
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </div>
  );
}
