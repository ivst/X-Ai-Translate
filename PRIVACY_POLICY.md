Privacy Policy AI Translate for X and YouTube (X-AI-Translate)

Summary
- The extension processes text you explicitly choose to translate:
  - selected text on web pages,
  - inline text on X (Twitter) and YouTube comments when you press the translate button,
  - text entered by you in the popup "Quick Translate" fields.
- Text is sent only to the AI provider endpoint you configure (OpenAI-compatible/custom or supported native providers).
- The extension stores settings in Chrome storage to keep your configuration between sessions.

Data We Process
- Text you submit for translation:
  - selected text,
  - X/YouTube inline text you request to translate,
  - popup Quick Translate input text.
- Configuration data you provide:
  - provider, API base URL, model, source/target language, UI language, output mode and related options.
- Optional operational data:
  - last translation / last error (for popup display),
  - cached model lists for supported providers.

How We Use Data
- To send translation requests to the provider you selected.
- To show translation results in-page and in popup.
- To persist your settings and improve usability (last result/error, model caches).

API Keys and Storage
- By default, API keys are stored locally in `chrome.storage.local`.
- If you enable "Sync API keys across devices", API keys are stored in `chrome.storage.sync` and synchronized by your Chrome account.
- Syncing keys across devices is optional and less secure than local-only storage.

Data Sharing
- Translation text is sent only to the API endpoint/provider you configured.
- We do not sell personal data and do not share data with unrelated third parties.

Remote Code
- The extension does not download or execute remote JavaScript/WASM code.
- Network access is used only for HTTPS API requests and receiving text responses.

Retention
- Settings remain until you change or remove them.
- Last translation / last error and model caches remain until overwritten or cleared.

Contact
- Support email: xtran@msk.onl
