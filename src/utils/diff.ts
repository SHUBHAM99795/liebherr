/**
 * Word-level diff for the Versionsabgleich tab (LCS-based).
 */

export interface DiffPart {
  type: 'same' | 'added' | 'removed';
  text: string;
}

export function wordDiff(oldText: string, newText: string): DiffPart[] {
  const a = oldText.split(/\s+/).filter(Boolean);
  const b = newText.split(/\s+/).filter(Boolean);
  const m = a.length;
  const n = b.length;
  const lcs: number[][] = Array.from({ length: m + 1 }, () => new Array(n + 1).fill(0));
  for (let i = m - 1; i >= 0; i--) {
    for (let j = n - 1; j >= 0; j--) {
      lcs[i][j] = a[i] === b[j] ? lcs[i + 1][j + 1] + 1 : Math.max(lcs[i + 1][j], lcs[i][j + 1]);
    }
  }
  const parts: DiffPart[] = [];
  const push = (type: DiffPart['type'], text: string) => {
    const last = parts[parts.length - 1];
    if (last && last.type === type) last.text += ' ' + text;
    else parts.push({ type, text });
  };
  let i = 0;
  let j = 0;
  while (i < m && j < n) {
    if (a[i] === b[j]) {
      push('same', a[i]);
      i++;
      j++;
    } else if (lcs[i + 1][j] >= lcs[i][j + 1]) {
      push('removed', a[i]);
      i++;
    } else {
      push('added', b[j]);
      j++;
    }
  }
  while (i < m) push('removed', a[i++]);
  while (j < n) push('added', b[j++]);
  return parts;
}
