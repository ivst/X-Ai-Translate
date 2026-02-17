const DEFAULT_CONFIG = {
  provider: "openai",
  apiUrl: "https://api.openai.com/v1",
  apiKey: "",
  apiKeyByProvider: {},
  model: "gpt-4o-mini",
  targetLang: "en",
  sourceLang: "auto",
  syncApiKeys: false,
  overlayMode: "center",
  yandexFolderId: ""
};

function isUnsupportedTabUrl(url) {
  if (!url) return false;
  const blockedPrefixes = [
    "chrome://",
    "chrome-extension://",
    "edge://",
    "about:",
    "view-source:"
  ];
  return blockedPrefixes.some((prefix) => url.startsWith(prefix));
}

function notify(title, message) {
  chrome.notifications.create({
    type: "basic",
    iconUrl: "icon128.png",
    title,
    message
  });
}

const injectionAttempts = new Set();

function ensureContentScript(tabId) {
  return new Promise((resolve) => {
    if (!tabId) {
      resolve(false);
      return;
    }
    chrome.scripting.insertCSS(
      { target: { tabId }, files: ["styles.css"] },
      () => {
        if (chrome.runtime.lastError) {
          resolve(false);
          return;
        }
        chrome.scripting.executeScript(
          { target: { tabId }, files: ["content.js"] },
          () => {
            if (chrome.runtime.lastError) {
              resolve(false);
              return;
            }
            resolve(true);
          }
        );
      }
    );
  });
}

async function sendToTab(tabId, payload) {
  if (!tabId) return false;
  return new Promise((resolve) => {
    chrome.tabs.sendMessage(tabId, payload, async () => {
      if (!chrome.runtime.lastError) {
        resolve(true);
        return;
      }
      if (injectionAttempts.has(tabId)) {
        resolve(false);
        return;
      }
      injectionAttempts.add(tabId);
      const injected = await ensureContentScript(tabId);
      if (!injected) {
        resolve(false);
        return;
      }
      chrome.tabs.sendMessage(tabId, payload, () => {
        resolve(!chrome.runtime.lastError);
      });
    });
  });
}

function showFallback(text, isError, tabId, allowOverlayFallback) {
  const payload = isError
    ? { lastError: text }
    : { lastTranslation: text, lastError: "" };
  chrome.storage.local.set(payload, () => {
    if (chrome.runtime.lastError) {
      notify("AI Translate", "Translation ready, but cannot show it here.");
      return;
    }
    if (allowOverlayFallback && tabId) {
      sendToTab(tabId, { action: "showTranslation", text }).then((ok) => {
        if (!ok) {
          notify("AI Translate", "Translation saved. Open the extension popup.");
        }
      });
      return;
    }
    notify("AI Translate", "Translation saved. Open the extension popup.");
  });
}

chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: "ai-translate-selection",
    title: "Translate selection with AI",
    contexts: ["selection"]
  });
});

function buildPrompt(text, targetLang, sourceLang) {
  const LANGUAGE_NAMES = {
    ar: "Arabic",
    zh: "Chinese",
    en: "English",
    fr: "French",
    de: "German",
    el: "Greek",
    he: "Hebrew",
    it: "Italian",
    ja: "Japanese",
    ko: "Korean",
    pt: "Portuguese",
    ru: "Russian",
    es: "Spanish",
    th: "Thai",
    tr: "Turkish",
    uk: "Ukrainian"
  };
  const targetLangName = LANGUAGE_NAMES[targetLang] || targetLang;
  const sourceLangName = LANGUAGE_NAMES[sourceLang] || sourceLang;
  const detectClause =
    sourceLang && sourceLang !== "auto"
      ? `The source language is ${sourceLangName}.`
      : "Detect the source language automatically.";
  return [
    "You are a professional translator.",
    detectClause,
    `Translate the text to ${targetLangName}.`,
    "Return only the translated text without quotes or extra commentary.",
    "",
    "Text:",
    text
  ].join("\n");
}

function normalizeApiBaseUrl(provider, apiUrl) {
  const raw = (apiUrl || "").trim();
  if (!raw) return raw;
  let parsed;
  try {
    parsed = new URL(raw);
  } catch (_) {
    return raw.replace(/\/$/, "");
  }

  const host = parsed.hostname.toLowerCase();
  const path = parsed.pathname.replace(/\/+$/, "");
  if (provider === "openrouter" && host === "openrouter.ai") {
    if (path === "" || path === "/") {
      parsed.pathname = "/api/v1";
    } else if (!path.startsWith("/api/")) {
      parsed.pathname = "/api/v1";
    }
  }
  if (provider === "yandexgpt" && /(^|\.)api\.cloud\.yandex\.net$/i.test(host)) {
    if (path === "" || path === "/") {
      parsed.pathname = "/v1";
    }
  }
  if (provider === "gemini" && host === "generativelanguage.googleapis.com") {
    if (path === "" || path === "/" || path === "/v1beta") {
      parsed.pathname = "/v1beta/openai";
    }
  }
  if (provider === "claude" && host === "api.anthropic.com") {
    if (path === "/v1" || path === "/v1/messages" || path === "/v1/models") {
      parsed.pathname = "/";
    }
  }
  return parsed.toString().replace(/\/$/, "");
}

function buildChatCompletionsUrl(config) {
  const base = normalizeApiBaseUrl(config.provider, config.apiUrl);
  if (config.provider === "claude") {
    return `${base}/v1/messages`;
  }
  return `${base}/chat/completions`;
}

function buildProviderHeaders(config, authToken) {
  const headers = { "Content-Type": "application/json" };
  if (config.provider === "gemini") {
    headers.Authorization = `Bearer ${authToken}`;
    headers["x-goog-api-key"] = authToken;
  } else if (config.provider === "claude") {
    headers["x-api-key"] = authToken;
    headers["anthropic-version"] = "2023-06-01";
    headers["anthropic-dangerous-direct-browser-access"] = "true";
  } else {
    headers.Authorization = `Bearer ${authToken}`;
  }
  if (config.provider === "openrouter") {
    headers["X-Title"] = "X-AI-Translate";
  }
  if (config.provider === "yandexgpt" && config.yandexFolderId) {
    headers["OpenAI-Project"] = config.yandexFolderId.trim();
  }
  return headers;
}

function resolveModelForProvider(config) {
  const model = (config.model || "").trim();
  if (!model) return model;
  if (config.provider !== "yandexgpt") {
    return model;
  }
  const lowerModel = model.toLowerCase();
  if (lowerModel.startsWith("emb://") || lowerModel.includes("embedding")) {
    throw new Error("Embedding models are not supported for translation. Choose a YandexGPT text model.");
  }
  if (model.startsWith("gpt://")) {
    return model;
  }
  const folderId = (config.yandexFolderId || "").trim();
  if (!folderId) {
    throw new Error("Yandex Folder ID is required for YandexGPT models.");
  }
  return `gpt://${folderId}/${model}`;
}

async function getAuthorizationToken(config) {
  const provider = config.provider;
  const syncMap = config.apiKeyByProvider || {};
  if (config.syncApiKeys) {
    const syncKey = syncMap[provider] || config.apiKey || "";
    if (syncKey) return syncKey;
  }
  const localData = await chrome.storage.local.get({ apiKeyByProvider: {}, apiKey: "" });
  const localMap = localData.apiKeyByProvider || {};
  const localKey = localMap[provider] || localData.apiKey || "";
  const fallbackSyncKey = syncMap[provider] || config.apiKey || "";
  const key = localKey || fallbackSyncKey;
  if (!key) {
    throw new Error("API key is missing. Set it in the extension options.");
  }
  return key;
}

function buildTranslateRequestBody(config, text, targetLang, sourceLang, stream) {
  const prompt = buildPrompt(text, targetLang, sourceLang);
  if (config.provider === "claude") {
    return {
      model: resolveModelForProvider(config),
      system: "You translate text precisely and preserve meaning and tone.",
      messages: [{ role: "user", content: prompt }],
      temperature: 0.2,
      max_tokens: 2048,
      stream: Boolean(stream)
    };
  }
  return {
    model: resolveModelForProvider(config),
    messages: [
      {
        role: "system",
        content: "You translate text precisely and preserve meaning and tone."
      },
      {
        role: "user",
        content: prompt
      }
    ],
    temperature: 0.2,
    stream: Boolean(stream)
  };
}

function extractClaudeText(data) {
  const blocks = Array.isArray(data?.content) ? data.content : [];
  return blocks
    .filter((b) => b?.type === "text" && typeof b.text === "string")
    .map((b) => b.text)
    .join("")
    .trim();
}

function extractTextFromOpenAICompatible(data) {
  const message = data?.choices?.[0]?.message || {};
  const direct = message?.content;
  if (typeof direct === "string" && direct.trim()) {
    return direct.trim();
  }
  if (Array.isArray(direct)) {
    const joined = direct
      .map((part) => (typeof part?.text === "string" ? part.text : ""))
      .join("")
      .trim();
    if (joined) return joined;
  }
  const messageFallbacks = [
    message?.text,
    message?.output_text,
    message?.reasoning_content,
    message?.reasoning,
    message?.response_text
  ];
  for (const candidate of messageFallbacks) {
    if (typeof candidate === "string" && candidate.trim()) {
      return candidate.trim();
    }
  }
  const altChoicesText = data?.choices?.[0]?.text;
  if (typeof altChoicesText === "string" && altChoicesText.trim()) {
    return altChoicesText.trim();
  }
  const outputText = data?.output_text || data?.response?.output_text;
  if (typeof outputText === "string" && outputText.trim()) {
    return outputText.trim();
  }
  return "";
}

function extractDeltaFromOpenAIChunk(json) {
  const delta = json?.choices?.[0]?.delta?.content;
  if (typeof delta === "string") return delta;
  if (Array.isArray(delta)) {
    return delta.map((part) => (typeof part?.text === "string" ? part.text : "")).join("");
  }
  const textDelta = json?.choices?.[0]?.text
    || json?.delta?.content
    || json?.delta?.text
    || json?.output_text?.delta
    || json?.response?.output_text?.delta
    || "";
  return typeof textDelta === "string" ? textDelta : "";
}

async function translateText(text, overrides = {}) {
  const config = await chrome.storage.sync.get(DEFAULT_CONFIG);
  const url = buildChatCompletionsUrl(config);
  const authToken = await getAuthorizationToken(config);
  const targetLang = overrides.targetLang || config.targetLang;
  const sourceLang = overrides.sourceLang || config.sourceLang;
  const body = buildTranslateRequestBody(config, text, targetLang, sourceLang, false);

  let response = await fetch(url, {
    method: "POST",
    headers: buildProviderHeaders(config, authToken),
    body: JSON.stringify(body)
  });

  if (
    !response.ok &&
    config.provider === "openrouter" &&
    /openrouter\.ai\/chat\/completions/i.test(url)
  ) {
    const fallbackUrl = `${normalizeApiBaseUrl("openrouter", "https://openrouter.ai/api/v1")}/chat/completions`;
    response = await fetch(fallbackUrl, {
      method: "POST",
      headers: buildProviderHeaders(config, authToken),
      body: JSON.stringify(body)
    });
  }

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`API error ${response.status}: ${errorText}`);
  }

  const data = await response.json();
  const content = config.provider === "claude"
    ? extractClaudeText(data)
    : extractTextFromOpenAICompatible(data);
  if (!content) {
    const choice = data?.choices?.[0] || {};
    const finishReason = choice?.finish_reason || "unknown";
    throw new Error(`Empty response from API (finish_reason=${finishReason}). Provider returned no displayable text.`);
  }
  return content;
}

async function streamTranslate(text, onUpdate, overrides = {}) {
  const config = await chrome.storage.sync.get(DEFAULT_CONFIG);
  if (config.provider === "yandexgpt") {
    const translated = await translateText(text, overrides);
    onUpdate(translated, true);
    return;
  }
  const url = buildChatCompletionsUrl(config);
  const authToken = await getAuthorizationToken(config);
  const targetLang = overrides.targetLang || config.targetLang;
  const sourceLang = overrides.sourceLang || config.sourceLang;
  const body = buildTranslateRequestBody(config, text, targetLang, sourceLang, true);

  let response = await fetch(url, {
    method: "POST",
    headers: buildProviderHeaders(config, authToken),
    body: JSON.stringify(body)
  });

  if (
    !response.ok &&
    config.provider === "openrouter" &&
    /openrouter\.ai\/chat\/completions/i.test(url)
  ) {
    const fallbackUrl = `${normalizeApiBaseUrl("openrouter", "https://openrouter.ai/api/v1")}/chat/completions`;
    response = await fetch(fallbackUrl, {
      method: "POST",
      headers: buildProviderHeaders(config, authToken),
      body: JSON.stringify(body)
    });
  }

  if (!response.ok || !response.body) {
    const errorText = await response.text();
    throw new Error(`API error ${response.status}: ${errorText}`);
  }

  const contentType = (response.headers.get("content-type") || "").toLowerCase();
  if (!contentType.includes("text/event-stream")) {
    const data = await response.json();
    const content = config.provider === "claude"
      ? extractClaudeText(data)
      : extractTextFromOpenAICompatible(data);
    if (!content) {
      throw new Error("Empty response from API.");
    }
    onUpdate(content, true);
    return;
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder("utf-8");
  let buffer = "";
  let fullText = "";
  let currentEvent = "";

  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split("\n");
    buffer = lines.pop() || "";
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed) continue;
      if (trimmed.startsWith("event:")) {
        currentEvent = trimmed.replace(/^event:\s*/, "");
        continue;
      }
      if (!trimmed.startsWith("data:")) continue;
      const data = trimmed.replace(/^data:\s*/, "");
      if (data === "[DONE]") {
        onUpdate(fullText, true);
        return;
      }
      try {
        const json = JSON.parse(data);
        if (config.provider === "claude") {
          const delta = json?.delta?.text ?? "";
          if ((json?.type === "content_block_delta" || currentEvent === "content_block_delta") && delta) {
            fullText += delta;
            onUpdate(fullText, false);
          }
          if (json?.type === "message_stop" || currentEvent === "message_stop") {
            onUpdate(fullText, true);
            return;
          }
        } else {
          const delta = extractDeltaFromOpenAIChunk(json);
          if (delta) {
            fullText += delta;
            onUpdate(fullText, false);
          }
        }
      } catch (err) {
        // Ignore malformed chunks
      }
    }
  }
  onUpdate(fullText, true);
}

function saveLastTranslation(text, isError) {
  const payload = isError
    ? { lastError: text }
    : { lastTranslation: text, lastError: "" };
  chrome.storage.local.set(payload);
}

function showTranslatingState(tabId, requestId) {
  if (!tabId) return;
  sendToTab(tabId, {
    action: "streamUpdate",
    requestId,
    target: "overlay",
    text: "Translating...",
    done: false
  });
}

chrome.contextMenus.onClicked.addListener(async (info, tab) => {
  if (info.menuItemId !== "ai-translate-selection" || !info.selectionText) {
    return;
  }
  if (isUnsupportedTabUrl(tab?.url)) {
    showFallback("This page is restricted by browser policy.", true, tab?.id, false);
    return;
  }
  try {
    const requestId = `ctx-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    showTranslatingState(tab?.id, requestId);
    await streamTranslate(info.selectionText, (text, done) => {
      sendToTab(tab?.id, {
        action: "streamUpdate",
        requestId,
        target: "overlay",
        text,
        done
      }).then((ok) => {
        if (!ok && done) {
          notify("AI Translate", "Translation saved. Open the extension popup.");
        }
      });
      if (done) {
        saveLastTranslation(text, false);
      }
    });
  } catch (err) {
    if (tab?.id) {
      const errorText = `Error: ${err.message || String(err)}`;
      sendToTab(tab.id, {
        action: "streamUpdate",
        requestId: `ctx-error-${Date.now()}`,
        target: "overlay",
        text: errorText,
        done: true,
        error: true
      });
      saveLastTranslation(errorText, true);
    }
  }
});

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message?.action === "translateText" && message.text) {
    translateText(message.text, {
      sourceLang: message.sourceLang,
      targetLang: message.targetLang
    })
      .then((translated) => sendResponse({ ok: true, text: translated }))
      .catch((err) => sendResponse({ ok: false, error: err.message || String(err) }));
    return true;
  }
  if (message?.action === "translateStream" && message.text && sender.tab?.id) {
    const { requestId, target, elementId } = message;
    streamTranslate(message.text, (text, done) => {
      sendToTab(sender.tab.id, {
        action: "streamUpdate",
        requestId,
        target,
        elementId,
        text,
        done
      });
      if (done) {
        saveLastTranslation(text, false);
      }
    }).catch((err) => {
      const errorText = `Error: ${err.message || String(err)}`;
      sendToTab(sender.tab.id, {
        action: "streamUpdate",
        requestId,
        target,
        elementId,
        text: errorText,
        done: true,
        error: true
      });
      saveLastTranslation(errorText, true);
    });
    return true;
  }
});

chrome.commands.onCommand.addListener((command) => {
  if (command !== "translate-selection") {
    return;
  }

  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    const tab = tabs?.[0];
    if (!tab?.id) {
      return;
    }
    if (isUnsupportedTabUrl(tab.url)) {
      showFallback("This page is restricted by browser policy.", true, tab?.id, false);
      return;
    }

    chrome.scripting.executeScript(
      {
        target: { tabId: tab.id },
        func: () => {
          const selection = window.getSelection();
          return selection ? selection.toString() : "";
        }
      },
      (results) => {
        if (chrome.runtime.lastError) {
          showFallback(chrome.runtime.lastError.message || "Cannot access this page.", true, tab?.id, false);
          return;
        }
        const selectedText = results?.[0]?.result?.trim();
        if (!selectedText) {
          chrome.tabs.sendMessage(
            tab.id,
            { action: "showTranslation", text: "No text selected." },
            () => {
              if (chrome.runtime.lastError) {
                showFallback("No text selected.", true, tab?.id, true);
              }
            }
          );
          return;
        }

        const requestId = `hotkey-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
        showTranslatingState(tab.id, requestId);
        streamTranslate(selectedText, (text, done) => {
          sendToTab(tab.id, {
            action: "streamUpdate",
            requestId,
            target: "overlay",
            text,
            done
          }).then((ok) => {
            if (!ok && done) {
              notify("AI Translate", "Translation saved. Open the extension popup.");
            }
          });
          if (done) {
            saveLastTranslation(text, false);
          }
        }).catch((err) => {
          const errorText = `Error: ${err.message || String(err)}`;
          sendToTab(tab.id, {
            action: "streamUpdate",
            requestId,
            target: "overlay",
            text: errorText,
            done: true,
            error: true
          });
          saveLastTranslation(errorText, true);
        });
      }
    );
  });
});
