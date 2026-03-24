// Highlight — renders text with matching segments highlighted in royalYellow.
// Used on the Sorting Frame search and any future search context.

import { highlightMatch } from '@/lib/highlightMatch';

type Props = {
  text: string;
  term?: string;
};

export function Highlight({ text, term }: Props) {
  const segments = highlightMatch(text, term ?? '');
  return (
    <>
      {segments.map((seg, i) =>
        seg.highlight ? (
          <mark
            key={i}
            className="rounded-[2px] bg-royalYellow px-[2px] text-yellow-900"
            style={{ padding: '0 2px' }}
          >
            {seg.text}
          </mark>
        ) : (
          <span key={i}>{seg.text}</span>
        )
      )}
    </>
  );
}
