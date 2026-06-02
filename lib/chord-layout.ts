const NON_SPACE = /\S/;

export function wordStart(lyrics: string, index: number): number {
  const clamped = Math.min(Math.max(0, index), lyrics.length);
  let i = clamped;
  while (i > 0 && NON_SPACE.test(lyrics[i - 1] ?? "")) {
    i -= 1;
  }
  return i;
}

export function wordEnd(lyrics: string, index: number): number {
  const clamped = Math.min(Math.max(0, index), lyrics.length);
  let i = clamped;
  while (i < lyrics.length && NON_SPACE.test(lyrics[i] ?? "")) {
    i += 1;
  }
  return i;
}
