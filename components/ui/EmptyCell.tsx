// EmptyCell — ghost placeholder for empty sprint cells.
// Gold standard: Inbox icon (20px, text-gray-200) + "Empty" label (text-[11px] text-gray-300), centred.

import { Inbox } from 'lucide-react';

export function EmptyCell() {
  return (
    <div className="pointer-events-none flex min-h-[56px] select-none flex-col items-center justify-center gap-1">
      <Inbox size={20} className="text-gray-200" />
      <span className="text-[11px] text-gray-300">Empty</span>
    </div>
  );
}
