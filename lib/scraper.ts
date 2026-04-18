import * as cheerio from "cheerio";

const UG_HEADERS = {
  "User-Agent":
    "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15",
  "Accept-Language": "en-US,en;q=0.9",
  Accept: "text/html,application/xhtml+xml",
} as const;

export type ScrapedSongMeta = {
  title: string;
  artist: string;
  tuning?: string | null;
  capo?: number | null;
  difficulty?: string | null;
};

export type ScrapeResult = ScrapedSongMeta & {
  rawText: string;
};

const FETCH_TIMEOUT_MS = 10_000;

function devLogHtmlSnippet(html: string, label: string) {
  if (process.env.NODE_ENV !== "production") {
    const snippet = html.slice(0, 4000);
    console.log(`[scraper] ${label} HTML snippet (len=${html.length}):`, snippet);
  }
}

function tryParseJsonObjectSlice(slice: string): unknown | null {
  try {
    return JSON.parse(slice) as unknown;
  } catch {
    return null;
  }
}

/**
 * Attempts to parse a JSON object from HTML by finding balanced braces from start index.
 */
function extractJsonObjectFrom(html: string, startIdx: number): unknown | null {
  const start = html.indexOf("{", startIdx);
  if (start === -1) {
    return null;
  }
  let depth = 0;
  let inString = false;
  let escape = false;
  for (let i = start; i < html.length; i += 1) {
    const c = html[i]!;
    if (inString) {
      if (escape) {
        escape = false;
      } else if (c === "\\") {
        escape = true;
      } else if (c === '"') {
        inString = false;
      }
      continue;
    }
    if (c === '"') {
      inString = true;
      continue;
    }
    if (c === "{") {
      depth += 1;
    } else if (c === "}") {
      depth -= 1;
      if (depth === 0) {
        const jsonStr = html.slice(start, i + 1);
        return tryParseJsonObjectSlice(jsonStr);
      }
    }
  }
  return null;
}

function findLongTabLikeString(value: unknown, depth = 0): string | null {
  if (depth > 30) {
    return null;
  }
  if (typeof value === "string") {
    const t = value.trim();
    if (t.length > 40 && (t.includes("\n") || t.includes("["))) {
      return value;
    }
    return null;
  }
  if (!value || typeof value !== "object") {
    return null;
  }
  if (Array.isArray(value)) {
    for (const item of value) {
      const found = findLongTabLikeString(item, depth + 1);
      if (found) {
        return found;
      }
    }
    return null;
  }
  const preferredKeys = [
    "content",
    "wiki_tab",
    "tab",
    "text",
    "body",
    "tab_content",
    "chords",
    "plain",
  ];
  const obj = value as Record<string, unknown>;
  for (const k of preferredKeys) {
    if (k in obj) {
      const found = findLongTabLikeString(obj[k], depth + 1);
      if (found) {
        return found;
      }
    }
  }
  for (const v of Object.values(obj)) {
    const found = findLongTabLikeString(v, depth + 1);
    if (found) {
      return found;
    }
  }
  return null;
}

function pickString(obj: unknown, keys: string[]): string | null {
  if (!obj || typeof obj !== "object") {
    return null;
  }
  const rec = obj as Record<string, unknown>;
  for (const k of keys) {
    const v = rec[k];
    if (typeof v === "string" && v.trim()) {
      return v.trim();
    }
  }
  return null;
}

function extractMetaFromUgStore(store: unknown): ScrapedSongMeta {
  const root = store as Record<string, unknown> | null | undefined;
  const page = root?.page as Record<string, unknown> | undefined;
  const data =
    (page?.data as Record<string, unknown> | undefined) ??
    (root?.data as Record<string, unknown> | undefined);
  const tab = data?.tab as Record<string, unknown> | undefined;
  const song = data?.song as Record<string, unknown> | undefined;

  const title =
    pickString(tab, ["song_name", "title"]) ??
    pickString(song, ["name", "title"]) ??
    pickString(data, ["song_name", "title"]) ??
    "Unknown title";

  const artist =
    pickString(tab, ["artist_name", "artist"]) ??
    pickString(song, ["artist_name", "artist"]) ??
    pickString(data, ["artist_name", "artist"]) ??
    "Unknown artist";

  const tuningRaw = pickString(tab, ["tuning", "tuning_label"]) ?? pickString(song, ["tuning"]);
  const capoRaw = tab?.capo ?? song?.capo;
  const capo =
    typeof capoRaw === "number" && Number.isFinite(capoRaw)
      ? capoRaw
      : typeof capoRaw === "string"
        ? Number.parseInt(capoRaw, 10)
        : null;

  const difficulty =
    (typeof tab?.difficulty === "string" && tab.difficulty) ||
    (typeof song?.difficulty === "string" && song.difficulty) ||
    null;

  return {
    title,
    artist,
    tuning: tuningRaw,
    capo: Number.isFinite(capo!) ? capo : null,
    difficulty,
  };
}

function extractUgStoreFromScripts(html: string): unknown | null {
  const $ = cheerio.load(html);
  const scripts = $("script")
    .toArray()
    .map((el) => $(el).html() ?? "")
    .filter((s) => s.includes("UGAPP") || s.includes("ugapp") || s.includes("ultimate"));

  for (const script of scripts) {
    const lower = script.toLowerCase();
    const ugappIdx = lower.indexOf("ugapp");
    if (ugappIdx === -1) {
      continue;
    }
    const windowAssign = script.indexOf("window.UGAPP", ugappIdx - 20);
    const searchFrom = windowAssign >= 0 ? windowAssign : ugappIdx;
    const storeIdx = script.indexOf("store", searchFrom);
    const braceFrom = storeIdx >= 0 ? script.indexOf("{", storeIdx) : script.indexOf("{", searchFrom);
    if (braceFrom !== -1) {
      const parsed = extractJsonObjectFrom(script, braceFrom - 1);
      if (parsed) {
        return parsed;
      }
    }
    const anyBrace = script.indexOf("{", searchFrom);
    if (anyBrace !== -1) {
      const parsed = extractJsonObjectFrom(script, anyBrace - 1);
      if (parsed) {
        return parsed;
      }
    }
  }

  const globalIdx = html.indexOf("window.UGAPP");
  if (globalIdx !== -1) {
    const parsed = extractJsonObjectFrom(html, globalIdx);
    if (parsed) {
      return parsed;
    }
  }

  return null;
}

function extractFromPreFallback(html: string): string | null {
  const $ = cheerio.load(html);
  const pre =
    $("pre.tabContent-code").first().length > 0
      ? $("pre.tabContent-code").first()
      : $('pre[class*="tabContent"]').first();

  if (!pre.length) {
    return null;
  }

  const lines: string[] = [];
  pre.contents().each((_, node) => {
    if (node.type === "text") {
      const t = $(node).text();
      if (t) {
        lines.push(t);
      }
      return;
    }
    if (node.type === "tag" && "name" in node && node.name === "span") {
      const chord = $(node).attr("data-original-chord")?.trim();
      if (chord) {
        lines.push(chord);
      } else {
        lines.push($(node).text());
      }
    }
  });

  const directText = pre.text().trim();
  if (directText.length > 20) {
    return directText;
  }

  const joined = lines.join("").trim();
  return joined.length > 20 ? joined : pre.text().trim() || null;
}

export async function scrapeUltimateGuitarTab(url: string): Promise<ScrapeResult> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

  let res: Response;
  try {
    res = await fetch(url, { headers: UG_HEADERS as HeadersInit, signal: controller.signal });
  } catch (e) {
    const err = e as Error;
    if (err.name === "AbortError") {
      throw new Error("Request timed out");
    }
    throw new Error(err.message || "Fetch failed");
  } finally {
    clearTimeout(timer);
  }

  if (!res.ok) {
    throw new Error(`HTTP ${res.status}`);
  }

  const html = await res.text();
  devLogHtmlSnippet(html, "fetch");

  let rawText: string | null = null;
  let meta: ScrapedSongMeta = {
    title: "Unknown title",
    artist: "Unknown artist",
    tuning: null,
    capo: null,
    difficulty: null,
  };

  const store = extractUgStoreFromScripts(html);
  if (store) {
    try {
      meta = extractMetaFromUgStore(store);
      const tabStr = findLongTabLikeString(store);
      if (tabStr) {
        rawText = tabStr;
      }
    } catch {
      /* fall through */
    }
  }

  if (!rawText) {
    rawText = extractFromPreFallback(html);
  }

  if (!rawText || !rawText.trim()) {
    throw new Error("Empty tab content");
  }

  const ogTitle = html.match(/<meta\s+property="og:title"\s+content="([^"]+)"/i)?.[1];
  if (ogTitle && (meta.title === "Unknown title" || !meta.title)) {
    const parts = ogTitle.split(/\s+[–-]\s+/);
    if (parts.length >= 2) {
      meta = {
        ...meta,
        title: parts[0]!.trim(),
        artist: parts.slice(1).join(" - ").replace(/\s+Chords.*$/i, "").trim(),
      };
    } else {
      meta = { ...meta, title: ogTitle.trim() };
    }
  }

  return {
    ...meta,
    rawText: rawText.trim(),
  };
}
