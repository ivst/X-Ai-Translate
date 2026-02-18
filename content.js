(() => {
try {
if (window.__aiTranslateContentLoaded) {
  return;
}
window.__aiTranslateContentLoaded = true;

const TWEET_TEXT_SELECTOR = '[data-testid="tweetText"]';
const YOUTUBE_COMMENT_TEXT_SELECTOR = [
  "ytd-comment-thread-renderer #content-text",
  "ytd-comment-view-model #content-text",
  "ytd-comment-renderer #content-text"
].join(", ");
const INLINE_TRANSLATION_TEXT_SELECTOR = `${TWEET_TEXT_SELECTOR}, ${YOUTUBE_COMMENT_TEXT_SELECTOR}`;
const TRANSLATE_BTN_CLASS = "ai-translate-btn";
const TRANSLATE_RESULT_CLASS = "ai-translate-result";
const TRANSLATE_LOADING_CLASS = "ai-translate-loading";
const SEND_MESSAGE_RETRY_DELAY_MS = 180;
const SEND_MESSAGE_MAX_RETRIES = 1; // 1 retry after the initial attempt (2 attempts total)
const SELECTION_STREAM_TIMEOUT_MS = 45000;
const DEFAULT_CONFIG = {
  targetLang: "en",
  uiLang: "en",
  overlayMode: "center",
  overlayDuration: 6,
  selectionShortcut: false,
  enableXInlineTranslation: true,
  enableYoutubeInlineTranslation: true
};
const SCRIPT_DOMINANCE_THRESHOLD = 0.7;
const CONTENT_STRINGS_FALLBACK = {
  selectionTitle: "Translate selected text",
  buttonIdle: "Translate text",
  buttonLoading: "Translating...",
  buttonDone: "Done",
  errorPrefix: "Error"
};

let currentConfig = { ...DEFAULT_CONFIG };
let selectionButton = null;
let lastSelectionText = "";
let lastSelectionAnchor = { left: 0, top: 0 };
let selectionTimer = null;
let isMouseSelecting = false;
let streamSeq = 0;
const inlineStreams = new Map();
const INLINE_STREAM_TIMEOUT_MS = 45000;
let activeSelectionRequestId = null;
let activeSelectionTimeoutId = null;
let overlayEl = null;
let overlayContentEl = null;
let overlayActionsEl = null;
let overlayTimer = null;
let overlayLoadingTimer = null;
let overlayLoadingRequestId = null;
let overlayLoadingFrame = 0;
let extensionContextLost = false;

function isContextInvalidationError(err) {
  const message = String(err?.message || err || "");
  return message.includes("Extension context invalidated");
}

function getRuntimeSafe() {
  if (extensionContextLost) return null;
  try {
    if (typeof chrome === "undefined" || !chrome?.runtime) {
      return null;
    }
    return chrome.runtime;
  } catch (err) {
    if (isContextInvalidationError(err)) {
      extensionContextLost = true;
    }
    return null;
  }
}

function isExtensionContextValid() {
  const runtime = getRuntimeSafe();
  return Boolean(runtime && runtime.id);
}

function getExtensionUrlSafe(path) {
  const runtime = getRuntimeSafe();
  if (!runtime || !runtime.id) return "";
  try {
    return runtime.getURL(path);
  } catch (err) {
    if (isContextInvalidationError(err)) {
      extensionContextLost = true;
    }
    return "";
  }
}

function isRecoverableRuntimeMessage(message) {
  const msg = String(message || "").toLowerCase();
  return (
    msg.includes("could not establish connection") ||
    msg.includes("receiving end does not exist")
  );
}

function isPortClosedMessage(message) {
  const msg = String(message || "").toLowerCase();
  return msg.includes("message port closed") && msg.includes("response");
}

function formatActionableError(strings, err) {
  const msg = String(err?.message || err || "");
  const lowerMsg = msg.toLowerCase();
  if (
    lowerMsg.includes("extension context unavailable") ||
    lowerMsg.includes("extension context invalidated")
  ) {
    return `${strings.errorPrefix}: ${strings.extensionContextUnavailable || msg}`;
  }
  if (isRecoverableRuntimeMessage(msg)) {
    return `${strings.errorPrefix}: ${strings.temporaryConnectionIssue || msg}`;
  }
  return `${strings.errorPrefix}: ${msg}`;
}

function sendMessageSafe(message, callback, attempt = 0) {
  const runtime = getRuntimeSafe();
  if (!runtime || !runtime.id) {
    if (typeof callback === "function") {
      callback(new Error("Extension context unavailable"));
    }
    return false;
  }
  try {
    runtime.sendMessage(message, (response) => {
      try {
        const lastError = chrome?.runtime?.lastError;
        if (lastError) {
          const msg = String(lastError.message || "");
          const isStreamMessage = message?.action === "translateStream";
          if (isStreamMessage && isPortClosedMessage(msg)) {
            if (typeof callback === "function") {
              callback(null, response);
            }
            return;
          }
          if (isRecoverableRuntimeMessage(msg) && attempt < SEND_MESSAGE_MAX_RETRIES) {
            setTimeout(() => {
              sendMessageSafe(message, callback, attempt + 1);
            }, SEND_MESSAGE_RETRY_DELAY_MS);
            return;
          }
          if (typeof callback === "function") {
            callback(new Error(msg || "Failed to send message"));
          }
          return;
        }
      } catch (err) {
        if (typeof callback === "function") {
          callback(err instanceof Error ? err : new Error(String(err)));
        }
        return;
      }
      if (typeof callback === "function") {
        callback(null, response);
      }
    });
    return true;
  } catch (err) {
    if (isContextInvalidationError(err)) {
      extensionContextLost = true;
      if (typeof callback === "function") {
        callback(new Error("Extension context invalidated"));
      }
      return false;
    }
    if (typeof callback === "function") {
      callback(err instanceof Error ? err : new Error(String(err)));
    }
    return false;
  }
}

function clearInlineStreamState(requestId) {
  const entry = inlineStreams.get(requestId);
  if (!entry) return;
  if (entry.timeoutId) {
    clearTimeout(entry.timeoutId);
  }
  inlineStreams.delete(requestId);
}

function armInlineStreamTimeout(requestId) {
  const entry = inlineStreams.get(requestId);
  if (!entry) return;
  if (entry.timeoutId) {
    clearTimeout(entry.timeoutId);
  }
  entry.timeoutId = setTimeout(() => {
    const current = inlineStreams.get(requestId);
    if (!current) return;
    const { result, btn, strings } = current;
    btn.classList.remove(TRANSLATE_LOADING_CLASS);
    btn.textContent = strings.buttonIdle;
    result.textContent = `${strings.errorPrefix}: timeout`;
    result.style.display = "block";
    inlineStreams.delete(requestId);
  }, INLINE_STREAM_TIMEOUT_MS);
}

function ensureSelectionButton() {
  if (selectionButton) return selectionButton;
  const btn = document.createElement("button");
  btn.className = "ai-translate-selection-btn";
  btn.type = "button";
  btn.textContent = "";
  const selectionStrings = getLocaleStrings(currentConfig.uiLang || currentConfig.targetLang);
  btn.title = selectionStrings.selectionTitle;
  const img = document.createElement("img");
  img.alt = "";
  const iconUrl = getExtensionUrlSafe("icon16.png");
  if (iconUrl) {
    img.src = iconUrl;
  }
  btn.appendChild(img);
  btn.addEventListener("mousedown", (event) => {
    event.preventDefault();
    event.stopPropagation();
  });
  btn.addEventListener("click", () => {
    const text = lastSelectionText.trim();
    if (!text) return;
    btn.classList.add(TRANSLATE_LOADING_CLASS);
    const strings = getLocaleStrings(currentConfig.uiLang || currentConfig.targetLang);
    showGlobalOverlay(strings.buttonLoading, false);
    const requestId = `selection-${Date.now()}-${streamSeq++}`;
    activeSelectionRequestId = requestId;
    armSelectionTimeout(requestId, strings);
    const sent = sendMessageSafe({
      action: "translateStream",
      requestId,
      target: "overlay",
      text
    }, (err) => {
      if (!err || activeSelectionRequestId !== requestId) return;
      clearSelectionStreamState();
      showGlobalOverlay(formatActionableError(strings, err), true);
    });
    if (!sent && activeSelectionRequestId === requestId) {
      clearSelectionStreamState();
      showGlobalOverlay(formatActionableError(strings, new Error("Extension context unavailable")), true);
    }
  });
  document.body.appendChild(btn);
  selectionButton = btn;
  return btn;
}

function hideSelectionButton() {
  if (selectionButton) {
    selectionButton.style.display = "none";
  }
}

function clearSelectionStreamState() {
  if (activeSelectionTimeoutId) {
    clearTimeout(activeSelectionTimeoutId);
    activeSelectionTimeoutId = null;
  }
  if (selectionButton) {
    selectionButton.classList.remove(TRANSLATE_LOADING_CLASS);
  }
  activeSelectionRequestId = null;
}

function armSelectionTimeout(requestId, strings) {
  if (activeSelectionTimeoutId) {
    clearTimeout(activeSelectionTimeoutId);
  }
  activeSelectionTimeoutId = setTimeout(() => {
    if (activeSelectionRequestId !== requestId) return;
    clearSelectionStreamState();
    showGlobalOverlay(`${strings.errorPrefix}: timeout`, true);
  }, SELECTION_STREAM_TIMEOUT_MS);
}

function positionSelectionButton(rect) {
  const btn = ensureSelectionButton();
  const size = 16;
  const padding = 6;
  const left = Math.min(window.innerWidth - size - 4, rect.right + padding);
  const top = Math.max(4, rect.top - 2);
  if (Math.abs(left - lastSelectionAnchor.left) < 2 && Math.abs(top - lastSelectionAnchor.top) < 2) {
    // Keep the button visible even when anchor hasn't moved.
    btn.style.display = "block";
    return;
  }
  lastSelectionAnchor = { left, top };
  btn.style.left = `${left}px`;
  btn.style.top = `${top}px`;
  btn.style.display = "block";
}

function getLocaleStrings(lang) {
  try {
    const i18n = window.AITranslateI18n;
    if (i18n && typeof i18n.getContentStrings === "function") {
      return i18n.getContentStrings(lang);
    }
  } catch (err) {
    // Ignore and use fallback.
  }
  return CONTENT_STRINGS_FALLBACK;
}

function createTranslateButton() {
  const btn = document.createElement("button");
  btn.className = TRANSLATE_BTN_CLASS;
  btn.type = "button";
  btn.textContent = "Translate";
  btn.title = "Translate with AI";
  btn.dataset.aiTranslate = "button";
  return btn;
}

function createResultContainer() {
  const result = document.createElement("div");
  result.className = TRANSLATE_RESULT_CLASS;
  result.style.display = "none";
  result.dataset.aiTranslate = "result";
  return result;
}

function getScriptBuckets(text) {
  const buckets = {
    latin: 0,
    cyrillic: 0,
    arabic: 0,
    hebrew: 0,
    greek: 0,
    thai: 0,
    hangul: 0,
    hiragana: 0,
    katakana: 0,
    cjk: 0
  };
  for (const ch of text) {
    const code = ch.codePointAt(0);
    if (!code) continue;
    if ((code >= 0x0041 && code <= 0x024f) || (code >= 0x1e00 && code <= 0x1eff)) {
      buckets.latin += 1;
    } else if (code >= 0x0400 && code <= 0x052f) {
      buckets.cyrillic += 1;
    } else if (code >= 0x0600 && code <= 0x06ff) {
      buckets.arabic += 1;
    } else if (code >= 0x0590 && code <= 0x05ff) {
      buckets.hebrew += 1;
    } else if (code >= 0x0370 && code <= 0x03ff) {
      buckets.greek += 1;
    } else if (code >= 0x0e00 && code <= 0x0e7f) {
      buckets.thai += 1;
    } else if (code >= 0xac00 && code <= 0xd7af) {
      buckets.hangul += 1;
    } else if (code >= 0x3040 && code <= 0x309f) {
      buckets.hiragana += 1;
    } else if (code >= 0x30a0 && code <= 0x30ff) {
      buckets.katakana += 1;
    } else if (code >= 0x4e00 && code <= 0x9fff) {
      buckets.cjk += 1;
    }
  }
  return buckets;
}

function dominantScript(text) {
  const buckets = getScriptBuckets(text);
  let maxKey = "latin";
  let maxVal = 0;
  let total = 0;
  for (const [key, val] of Object.entries(buckets)) {
    total += val;
    if (val > maxVal) {
      maxVal = val;
      maxKey = key;
    }
  }
  return { script: maxKey, count: maxVal, total, buckets };
}

function shouldShowButton(text, targetLang) {
  const normalized = text.replace(/\s+/g, " ").trim();
  if (!normalized) return false;

  const latinTargets = new Set(["en", "fr", "de", "es", "pt", "it", "tr"]);
  if (latinTargets.has(targetLang)) {
    const { script, count, total } = dominantScript(normalized);
    if (total === 0) return false;
    const ratio = count / total;
    if (script !== "latin") return true;
    return ratio < SCRIPT_DOMINANCE_THRESHOLD;
  }

  const mapping = {
    ru: "cyrillic",
    uk: "cyrillic",
    bg: "cyrillic",
    sr: "cyrillic",
    ar: "arabic",
    he: "hebrew",
    el: "greek",
    th: "thai",
    ko: "hangul",
    ja: "jp",
    zh: "cjk"
  };

  const targetScript = mapping[targetLang];
  if (!targetScript) return true;

  const { script, count, total, buckets } = dominantScript(normalized);
  if (total === 0) return false;
  const ratio = count / total;
  if (targetScript === "jp") {
    const japaneseCount = (buckets.hiragana || 0) + (buckets.katakana || 0) + (buckets.cjk || 0);
    const japaneseRatio = japaneseCount / total;
    return japaneseRatio < SCRIPT_DOMINANCE_THRESHOLD;
  }

  if (script !== targetScript) return true;
  return ratio < SCRIPT_DOMINANCE_THRESHOLD;
}

function getInlineContainer(el) {
  if (el.closest("ytd-comment-thread-renderer, ytd-comment-view-model, ytd-comment-renderer")) {
    return el.closest("#content") || el.parentElement;
  }
  return el.parentElement;
}

function isXInlineTarget(el) {
  return Boolean(el.closest(TWEET_TEXT_SELECTOR));
}

function isYoutubeInlineTarget(el) {
  return Boolean(el.closest("ytd-comment-thread-renderer, ytd-comment-view-model, ytd-comment-renderer"));
}

function isInlineTranslationEnabledForElement(el) {
  if (isXInlineTarget(el) && currentConfig.enableXInlineTranslation === false) {
    return false;
  }
  if (isYoutubeInlineTarget(el) && currentConfig.enableYoutubeInlineTranslation === false) {
    return false;
  }
  return true;
}

function enhanceInlineText(el) {
  const container = getInlineContainer(el);
  if (!container) {
    return;
  }

  const text = el.textContent?.trim() || "";
  const showButton =
    isInlineTranslationEnabledForElement(el) &&
    shouldShowButton(text, currentConfig.targetLang);

  const existing = container.querySelectorAll("[data-ai-translate]");
  if (!showButton) {
    existing.forEach((node) => node.remove());
    el.dataset.aiTranslateProcessed = "0";
    return;
  }

  if (el.dataset.aiTranslateProcessed === "1") {
    return;
  }
  el.dataset.aiTranslateProcessed = "1";

  const btn = createTranslateButton();
  const result = createResultContainer();
  const strings = getLocaleStrings(currentConfig.uiLang || currentConfig.targetLang);
  btn.textContent = strings.buttonIdle;

  btn.addEventListener("click", () => {
    const textToTranslate = el.textContent?.trim();
    if (!textToTranslate) {
      return;
    }

    btn.classList.add(TRANSLATE_LOADING_CLASS);
    btn.textContent = strings.buttonLoading;
    result.style.display = "none";
    result.textContent = "";

    const requestId = `inline-${Date.now()}-${streamSeq++}`;
    inlineStreams.set(requestId, { result, btn, strings, timeoutId: null });
    armInlineStreamTimeout(requestId);
    const sent = sendMessageSafe({
      action: "translateStream",
      requestId,
      target: "inline",
      text: textToTranslate
    }, (err) => {
      if (!err) return;
      const entry = inlineStreams.get(requestId);
      if (!entry) return;
      const { result: currentResult, btn: currentBtn, strings: currentStrings } = entry;
      currentBtn.classList.remove(TRANSLATE_LOADING_CLASS);
      currentBtn.textContent = currentStrings.buttonIdle;
      currentResult.textContent = formatActionableError(currentStrings, err);
      currentResult.style.display = "block";
      clearInlineStreamState(requestId);
    });
    if (!sent) {
      const entry = inlineStreams.get(requestId);
      if (!entry) return;
      btn.classList.remove(TRANSLATE_LOADING_CLASS);
      btn.textContent = strings.buttonIdle;
      result.textContent = formatActionableError(strings, new Error("Extension context unavailable"));
      result.style.display = "block";
      clearInlineStreamState(requestId);
    }
  });

  container.appendChild(btn);
  container.appendChild(result);
}

function scanForInlineTexts() {
  document.querySelectorAll(INLINE_TRANSLATION_TEXT_SELECTOR).forEach(enhanceInlineText);
}

const observer = new MutationObserver(() => scanForInlineTexts());
observer.observe(document.documentElement, { childList: true, subtree: true });
scanForInlineTexts();

function ensureOverlay() {
  if (overlayEl && overlayContentEl) return;
  overlayEl = document.getElementById("ai-translate-overlay");
  if (!overlayEl) {
    overlayEl = document.createElement("div");
    overlayEl.id = "ai-translate-overlay";
    document.body.appendChild(overlayEl);
  }
  overlayEl.className = "ai-translate-overlay";
  overlayEl.innerHTML = "";

  overlayContentEl = document.createElement("div");
  overlayContentEl.className = "ai-translate-overlay-content";
  overlayEl.appendChild(overlayContentEl);

  overlayActionsEl = document.createElement("div");
  overlayActionsEl.className = "ai-translate-overlay-actions";

  const strings = getLocaleStrings(currentConfig.uiLang || currentConfig.targetLang);
  const copyBtn = document.createElement("button");
  copyBtn.type = "button";
  copyBtn.textContent = strings.copy;
  copyBtn.addEventListener("click", () => {
    navigator.clipboard.writeText(overlayContentEl.textContent || "").catch(() => {});
  });

  const closeBtn = document.createElement("button");
  closeBtn.type = "button";
  closeBtn.textContent = strings.close;
  closeBtn.addEventListener("click", () => {
    overlayEl.classList.remove("visible");
  });

  overlayActionsEl.appendChild(copyBtn);
  overlayActionsEl.appendChild(closeBtn);
}

function applyOverlayMode(mode) {
  ensureOverlay();
  const resolvedMode = mode === "center" ? "center" : "toast";
  if (resolvedMode === "center") {
    overlayEl.classList.add("centered");
    if (!overlayActionsEl?.parentElement) {
      overlayEl.appendChild(overlayActionsEl);
    }
  } else {
    overlayEl.classList.remove("centered");
    if (overlayActionsEl?.parentElement === overlayEl) {
      overlayEl.removeChild(overlayActionsEl);
    }
  }
}

function stopOverlayLoadingAnimation() {
  if (overlayLoadingTimer) {
    clearInterval(overlayLoadingTimer);
    overlayLoadingTimer = null;
  }
  overlayLoadingRequestId = null;
  overlayLoadingFrame = 0;
}

function startOverlayLoadingAnimation(requestId) {
  stopOverlayLoadingAnimation();
  if (overlayTimer) {
    clearTimeout(overlayTimer);
    overlayTimer = null;
  }
  overlayLoadingRequestId = requestId || null;
  overlayLoadingFrame = 0;
  const frames = [".", "..", "...", ".."];
  ensureOverlay();
  overlayEl.className = "ai-translate-overlay";
  applyOverlayMode(currentConfig.overlayMode || "toast");
  overlayEl.classList.add("visible");
  overlayContentEl.textContent = frames[0];
  overlayLoadingTimer = setInterval(() => {
    overlayLoadingFrame = (overlayLoadingFrame + 1) % frames.length;
    if (!overlayContentEl) return;
    overlayContentEl.textContent = frames[overlayLoadingFrame];
  }, 350);
}

function showGlobalOverlay(text, finalize) {
  const mode = currentConfig.overlayMode || "toast";
  const durationSeconds =
    typeof currentConfig.overlayDuration === "number" && currentConfig.overlayDuration > 0
      ? currentConfig.overlayDuration
      : 6;
  ensureOverlay();
  stopOverlayLoadingAnimation();
  overlayEl.className = "ai-translate-overlay";
  overlayContentEl.textContent = text;
  applyOverlayMode(mode);
  overlayEl.classList.add("visible");
  if (overlayTimer) {
    clearTimeout(overlayTimer);
    overlayTimer = null;
  }
  if (finalize) {
    overlayTimer = setTimeout(() => {
      overlayEl.classList.remove("visible");
    }, durationSeconds * 1000);
  }
}

if (isExtensionContextValid()) {
  try {
    chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
      if (message?.action === "aiTranslatePing") {
        if (typeof sendResponse === "function") {
          sendResponse({ ok: true });
        }
        return;
      }
      if (message?.action === "showTranslation" && message.text) {
        showGlobalOverlay(message.text, true);
      }
      if (message?.action === "streamUpdate") {
        const { requestId, target, text, done, error } = message;
        if (target === "overlay") {
          if (requestId && text === "Translating..." && !done) {
            startOverlayLoadingAnimation(requestId);
            return;
          }
          if (requestId && overlayLoadingRequestId && requestId === overlayLoadingRequestId) {
            stopOverlayLoadingAnimation();
          }
          showGlobalOverlay(text, Boolean(done));
          if (requestId && requestId === activeSelectionRequestId) {
            if (done) {
              clearSelectionStreamState();
            } else {
              const strings = getLocaleStrings(currentConfig.uiLang || currentConfig.targetLang);
              armSelectionTimeout(requestId, strings);
            }
          }
          return;
        }
        if (target === "inline" && requestId) {
          const entry = inlineStreams.get(requestId);
          if (!entry) return;
          const { result, btn, strings } = entry;
          armInlineStreamTimeout(requestId);
          result.textContent = text || "";
          result.style.display = "block";
          if (done) {
            btn.classList.remove(TRANSLATE_LOADING_CLASS);
            btn.textContent = strings.buttonDone;
            if (error) {
              result.textContent = `${strings.errorPrefix}: ${text}`;
            }
            clearInlineStreamState(requestId);
          }
        }
      }
    });

    chrome.storage.sync.get(DEFAULT_CONFIG, (data) => {
      currentConfig = { ...DEFAULT_CONFIG, ...data };
      scanForInlineTexts();
    });

    chrome.storage.onChanged.addListener((changes, areaName) => {
      if (areaName !== "sync") return;
      const next = { ...currentConfig };
      Object.keys(changes).forEach((key) => {
        next[key] = changes[key].newValue;
      });
      currentConfig = next;
      if (!currentConfig.selectionShortcut) {
        hideSelectionButton();
      } else if (selectionButton) {
        const strings = getLocaleStrings(currentConfig.uiLang || currentConfig.targetLang);
        selectionButton.title = strings.selectionTitle;
      }
      document.querySelectorAll(INLINE_TRANSLATION_TEXT_SELECTOR).forEach((el) => {
        el.dataset.aiTranslateProcessed = "0";
      });
      scanForInlineTexts();
    });
  } catch (err) {
    // Ignore when extension context is invalidated.
  }
} else {
  scanForInlineTexts();
}

function handleSelectionUpdate() {
  if (selectionTimer) {
    clearTimeout(selectionTimer);
  }
  selectionTimer = setTimeout(() => {
    if (isMouseSelecting) {
      hideSelectionButton();
      return;
    }
    if (!currentConfig.selectionShortcut) {
      hideSelectionButton();
      return;
    }
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) {
      hideSelectionButton();
      return;
    }
    const text = selection.toString();
    if (!text.trim()) {
      hideSelectionButton();
      return;
    }
    const range = selection.getRangeAt(0);
    const rects = range.getClientRects();
    const rect = (rects.length ? rects[rects.length - 1] : null) || range.getBoundingClientRect();
    if (!rect || rect.width === 0) {
      hideSelectionButton();
      return;
    }
    lastSelectionText = text;
    positionSelectionButton(rect);
  }, 80);
}

document.addEventListener("mousedown", (event) => {
  if (event.button !== 0) return;
  const target = event.target;
  if (target && (target.closest?.(".ai-translate-selection-btn") || target.closest?.(".ai-translate-overlay"))) {
    return;
  }
  isMouseSelecting = true;
  hideSelectionButton();
});

document.addEventListener("mouseup", (event) => {
  if (event.button !== 0) return;
  isMouseSelecting = false;
  handleSelectionUpdate();
});
document.addEventListener("keyup", handleSelectionUpdate);
document.addEventListener("selectionchange", handleSelectionUpdate);

window.addEventListener("scroll", () => {
  if (!selectionButton || selectionButton.style.display === "none") return;
  hideSelectionButton();
});
} catch (err) {
  const message = String(err?.message || err || "");
  if (!message.includes("Extension context invalidated")) {
    throw err;
  }
}
})();
