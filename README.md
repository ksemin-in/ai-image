# Pose Correction Chrome Extension

This Chrome extension helps with pose correction using a local ML model. Follow the steps below to set up and use the extension locally.

## Prerequisites
- [Node.js](https://nodejs.org/) (includes npm)
- Google Chrome browser

## Setup Instructions

1. **Clone the Repository**
   
   If you haven't already, clone this repository to your local machine:
   ```bash
   git clone <repo-url>
   cd pose_correction
   ```

2. **Install Dependencies**
   
   Run the following command in the project root to install all required npm packages:
   ```bash
   npm install
   ```

3. **Load the Extension in Chrome**
   
   1. Open Chrome and go to `chrome://extensions/`
   2. Enable **Developer mode** (toggle in the top right)
   3. Click **Load unpacked**
   4. Select the project directory (the folder containing `manifest.json`)

4. **Using the Extension**
   - The extension should now appear in your Chrome toolbar.
   - Click the extension icon or open the side panel to use pose correction features.

## File Structure
- `manifest.json` — Chrome extension manifest
- `background.js` — Background script
- `offscreen.html`, `offscreen.js` — Offscreen processing
- `sidepanel.html`, `sidepanel.js` — Side panel UI
- `models/pose_landmarker_lite.task` — ML model file

## Notes
- Make sure the `models/pose_landmarker_lite.task` file is present in the `models` directory.
- If you update code, reload the extension in `chrome://extensions/`.

## Troubleshooting
- If you see errors, check the Chrome extension console (right-click the extension > Inspect views).
- Ensure all dependencies are installed with `npm install`.

---
