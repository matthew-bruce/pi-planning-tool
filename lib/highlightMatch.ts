export type HighlightSegment = { text: string; highlight: boolean };

export function highlightMatch(text: string, term: string): HighlightSegment[] {
  if (!term || term.length < 2) return [{ text, highlight: false }];

  const segments: HighlightSegment[] = [];
  const lower = text.toLowerCase();
  const lowerTerm = term.toLowerCase();
  let pos = 0;

  while (pos < text.length) {
    const idx = lower.indexOf(lowerTerm, pos);
    if (idx === -1) {
      segments.push({ text: text.slice(pos), highlight: false });
      break;
    }
    if (idx > pos) segments.push({ text: text.slice(pos, idx), highlight: false });
    segments.push({ text: text.slice(idx, idx + term.length), highlight: true });
    pos = idx + term.length;
  }

  return segments;
}
