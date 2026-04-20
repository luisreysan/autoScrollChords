const apiBaseUrlInput = document.getElementById("apiBaseUrl");
const extensionTokenInput = document.getElementById("extensionToken");
const saveBtn = document.getElementById("saveBtn");
const statusEl = document.getElementById("status");

function setStatus(message, isError = false) {
  statusEl.textContent = message;
  statusEl.style.color = isError ? "#b91c1c" : "#166534";
}

function normalizeBaseUrl(value) {
  return value.trim().replace(/\/+$/, "");
}

async function loadSettings() {
  const data = await chrome.storage.sync.get(["apiBaseUrl", "extensionToken"]);
  if (typeof data.apiBaseUrl === "string") {
    apiBaseUrlInput.value = data.apiBaseUrl;
  }
  if (typeof data.extensionToken === "string") {
    extensionTokenInput.value = data.extensionToken;
  }
}

saveBtn.addEventListener("click", async () => {
  const apiBaseUrl = normalizeBaseUrl(apiBaseUrlInput.value);
  const extensionToken = extensionTokenInput.value.trim();

  if (!apiBaseUrl) {
    setStatus("API base URL is required.", true);
    return;
  }

  if (!/^https?:\/\//i.test(apiBaseUrl)) {
    setStatus("API base URL must start with http:// or https://", true);
    return;
  }

  if (!extensionToken) {
    setStatus("Extension token is required.", true);
    return;
  }

  await chrome.storage.sync.set({ apiBaseUrl, extensionToken });
  setStatus("Settings saved.");
});

void loadSettings();
