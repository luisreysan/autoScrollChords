const STORAGE_KEYS = {
  apiBaseUrl: "apiBaseUrl",
  extensionToken: "extensionToken",
};

function normalizeBaseUrl(value) {
  return value.trim().replace(/\/+$/, "");
}

async function readSettings() {
  const data = await chrome.storage.sync.get([
    STORAGE_KEYS.apiBaseUrl,
    STORAGE_KEYS.extensionToken,
  ]);

  const apiBaseUrl = typeof data.apiBaseUrl === "string" ? normalizeBaseUrl(data.apiBaseUrl) : "";
  const extensionToken = typeof data.extensionToken === "string" ? data.extensionToken.trim() : "";
  return { apiBaseUrl, extensionToken };
}

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message?.type !== "exportSong") {
    return false;
  }

  void (async () => {
    try {
      const { apiBaseUrl, extensionToken } = await readSettings();
      if (!apiBaseUrl) {
        throw new Error("Missing apiBaseUrl. Set it in extension settings.");
      }
      if (!extensionToken) {
        throw new Error("Missing extension token. Set it in extension settings.");
      }

      const response = await fetch(`${apiBaseUrl}/api/songs/import-extension`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-extension-token": extensionToken,
        },
        body: JSON.stringify(message.payload),
      });

      const data = await response.json().catch(() => null);
      if (!response.ok) {
        throw new Error(data?.error || `Import failed (HTTP ${response.status}).`);
      }

      sendResponse({ ok: true, data });
    } catch (error) {
      sendResponse({
        ok: false,
        error: error instanceof Error ? error.message : "Unexpected API export error.",
      });
    }
  })();

  return true;
});
