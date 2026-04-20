const exportBtn = document.getElementById("exportBtn");
const statusEl = document.getElementById("status");

function setStatus(message, isError = false) {
  statusEl.textContent = message;
  statusEl.style.color = isError ? "#b91c1c" : "#166534";
}

async function getActiveTab() {
  const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
  return tabs[0] || null;
}

async function extractFromPage(tabId) {
  return chrome.tabs.sendMessage(tabId, { type: "extractSong" });
}

async function sendToApi(payload) {
  return chrome.runtime.sendMessage({ type: "exportSong", payload });
}

exportBtn.addEventListener("click", async () => {
  exportBtn.disabled = true;
  setStatus("Extracting song from page...");

  try {
    const tab = await getActiveTab();
    if (!tab?.id) {
      throw new Error("No active tab found.");
    }

    const extraction = await extractFromPage(tab.id);
    if (!extraction?.ok) {
      throw new Error(extraction?.error || "Could not extract song from this page.");
    }

    setStatus("Sending song to API...");
    const result = await sendToApi(extraction.data);
    if (!result?.ok) {
      throw new Error(result?.error || "Export failed.");
    }

    const { data } = result;
    const songTitle = data?.song?.title || extraction.data.title;
    setStatus(data?.isNew ? `Imported: ${songTitle}` : `Already exists: ${songTitle}`);
  } catch (error) {
    setStatus(error instanceof Error ? error.message : "Unexpected export error.", true);
  } finally {
    exportBtn.disabled = false;
  }
});
