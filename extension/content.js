const SECTION_HEADERS = ["Verse", "Chorus", "Bridge", "Intro", "Outro", "Pre-Chorus"];

function firstText(selectors) {
  for (const selector of selectors) {
    const el = document.querySelector(selector);
    if (!el) {
      continue;
    }
    const text = (el.textContent || "").trim();
    if (text) {
      return text;
    }
  }
  return "";
}

function extractRawText() {
  const selectors = ["section.s-juq code pre", "pre.k_vI3", 'pre[class*="KLhHx"]'];
  for (const selector of selectors) {
    const pre = document.querySelector(selector);
    if (!pre) {
      continue;
    }

    const raw = (pre.innerText || "").replace(/\r\n/g, "\n");
    const cleaned = raw
      .split("\n")
      .map((line) => line.replace(/\s+$/g, ""))
      .filter((line) => line.trim() !== "X")
      .join("\n")
      .trim();

    if (cleaned.length > 100) {
      return cleaned;
    }
  }
  return "";
}

function cleanTitle(title) {
  return title
    .replace(/\b(Acordes|Chords|Tabs|Tablatura|Ukulele|Piano)\b/gi, "")
    .replace(/\s+/g, " ")
    .trim();
}

function extractCapo(text) {
  const match = text.match(/(cejilla|capo)\s*:?\s*(\d+)/i);
  return match ? Number.parseInt(match[2], 10) : null;
}

function containsChordHints(rawText) {
  const hasSection = SECTION_HEADERS.some((header) => rawText.includes(`[${header}`));
  const hasChordLikeLine = /(^|\n)\s*([A-G](#|b)?(m|maj|min|sus|add|dim|aug)?\d?\s+){1,}/m.test(rawText);
  return hasSection || hasChordLikeLine;
}

function extractSongData() {
  const sourceUrl = window.location.href;
  const titleRaw = firstText(["main h1", "h1"]);
  const title = cleanTitle(titleRaw);

  const artist = firstText([
    'main h1 + span a[href*="/artist/"]',
    'main a[href*="/artist/"]',
    'a[href*="/artist/"]',
  ]);

  const rawText = extractRawText();

  const metaText = document.body.innerText || "";
  const tuningMatch = metaText.match(/Afinaci[oó]n\s*:\s*([A-G][^\n]{3,})/i);
  const difficultyMatch = metaText.match(/Dificultad\s*:\s*([^\n]+)/i);

  const tuning = tuningMatch ? tuningMatch[1].trim() : null;
  const difficulty = difficultyMatch ? difficultyMatch[1].trim() : null;
  const capo = extractCapo(metaText);

  if (!sourceUrl.includes("ultimate-guitar.com") || !sourceUrl.includes("/tab/")) {
    throw new Error("Open a valid Ultimate Guitar tab page first.");
  }

  if (!title || !artist) {
    throw new Error("Could not extract song title or artist.");
  }

  if (!rawText) {
    throw new Error("Could not extract tab content from this page.");
  }

  if (!containsChordHints(rawText)) {
    throw new Error("Extracted text does not look like a chord tab.");
  }

  return {
    sourceUrl,
    title,
    artist,
    rawText,
    tuning,
    capo,
    difficulty,
  };
}

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message?.type !== "extractSong") {
    return false;
  }

  try {
    const data = extractSongData();
    sendResponse({ ok: true, data });
  } catch (error) {
    sendResponse({
      ok: false,
      error: error instanceof Error ? error.message : "Unexpected extraction error.",
    });
  }

  return true;
});
