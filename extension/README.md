# AutoScrollChords Chrome Extension (V1)

This extension exports the currently opened Ultimate Guitar tab page into your AutoScrollChords backend.

## Load extension

1. Open `chrome://extensions`.
2. Enable **Developer mode**.
3. Click **Load unpacked**.
4. Select this `extension/` folder.

## Configure

Open extension options and set:

- `API Base URL` (e.g. `https://your-app.vercel.app`)
- `Extension Import Token` (`EXTENSION_IMPORT_TOKEN` configured in backend)

## Use

1. Open a UG tab page (`/tab/...`).
2. Click extension icon.
3. Click **Export current song**.
