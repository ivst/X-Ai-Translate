const defaultConfig = {
  provider: "openai",
  apiUrl: "https://api.openai.com/v1",
  apiKey: "",
  apiKeyByProvider: {},
  model: "gpt-4o-mini",
  targetLang: "en",
  sourceLang: "auto",
  uiLang: "en",
  overlayMode: "center",
  overlayDuration: 6,
  selectionShortcut: false,
  syncApiKeys: false,
  openrouterFreeOnly: true,
  openrouterSource: "user",
  yandexFolderId: "",
  customApiUrl: "",
  customModel: ""
};

const PROVIDERS = {
  openai: {
    label: "OpenAI",
    apiUrl: "https://api.openai.com/v1",
    models: ["gpt-4o-mini", "gpt-4o"]
  },
  claude: {
    label: "Claude",
    apiUrl: "https://api.anthropic.com",
    models: ["claude-3-5-haiku-latest", "claude-3-7-sonnet-latest"]
  },
  gemini: {
    label: "Gemini",
    apiUrl: "https://generativelanguage.googleapis.com/v1beta/openai",
    models: ["gemini-2.0-flash", "gemini-2.0-flash-lite", "gemini-1.5-pro"]
  },
  deepseek: {
    label: "DeepSeek",
    apiUrl: "https://api.deepseek.com/v1",
    models: ["deepseek-chat", "deepseek-reasoner"]
  },
  yandexgpt: {
    label: "YandexGPT",
    apiUrl: "https://llm.api.cloud.yandex.net/v1",
    models: ["yandexgpt-lite/latest", "yandexgpt/latest"]
  },
  openrouter: {
    label: "OpenRouter",
    apiUrl: "https://openrouter.ai/api/v1",
    models: [
      "qwen/qwen-2.5-7b-instruct",
      "qwen/qwen-2.5-coder-7b-instruct",
      "deepseek/deepseek-r1-distill-llama-70b"
    ]
  },
  custom: {
    label: "Custom",
    apiUrl: "",
    models: []
  }
};



const providerSelect = document.getElementById("provider");
const apiUrlInput = document.getElementById("apiUrl");
const apiKeyInput = document.getElementById("apiKey");
const modelSelect = document.getElementById("model");
const modelCustomInput = document.getElementById("modelCustom");
const targetLangSelect = document.getElementById("targetLang");
const sourceLangSelect = document.getElementById("sourceLang");
const overlayModeSelect = document.getElementById("overlayMode");
const overlayDurationInput = document.getElementById("overlayDuration");
const selectionShortcutCheckbox = document.getElementById("selectionShortcut");
const statusEl = document.getElementById("status");
const openrouterControls = document.getElementById("openrouterControls");
const openrouterFreeOnlyCheckbox = document.getElementById("openrouterFreeOnly");
const openrouterSourceSelect = document.getElementById("openrouterSource");
const refreshOpenrouterBtn = document.getElementById("refreshOpenrouter");
const refreshYandexBtn = document.getElementById("refreshYandex");
const uiLangSelect = document.getElementById("uiLang");
const yandexControls = document.getElementById("yandexControls");
const yandexFolderInput = document.getElementById("yandexFolderId");
const setupNoteIntro = document.getElementById("setupNoteIntro");
const setupNoteWarning = document.getElementById("setupNoteWarning");
const setupNoteLinksLabel = document.getElementById("setupNoteLinksLabel");
const setupLinkOpenAI = document.getElementById("setupLinkOpenAI");
const setupLinkClaude = document.getElementById("setupLinkClaude");
const setupLinkGemini = document.getElementById("setupLinkGemini");
const setupLinkDeepSeek = document.getElementById("setupLinkDeepSeek");
const setupLinkOpenRouter = document.getElementById("setupLinkOpenRouter");
const setupLinkYandex = document.getElementById("setupLinkYandex");
const syncApiKeysCheckbox = document.getElementById("syncApiKeys");
const syncApiKeysLabel = document.getElementById("syncApiKeysLabel");
const syncApiKeysHelp = document.getElementById("syncApiKeysHelp");

let savedCustomApiUrl = "";
let savedCustomModel = "";

const OPENROUTER_CACHE_KEY = "openrouter_models_cache";
const OPENROUTER_CACHE_TTL_MS = 24 * 60 * 60 * 1000;
const OPENAI_CACHE_KEY = "openai_models_cache";
const OPENAI_CACHE_TTL_MS = 24 * 60 * 60 * 1000;
const CLAUDE_CACHE_KEY = "claude_models_cache";
const CLAUDE_CACHE_TTL_MS = 24 * 60 * 60 * 1000;
const GEMINI_CACHE_KEY = "gemini_models_cache";
const GEMINI_CACHE_TTL_MS = 24 * 60 * 60 * 1000;
const YANDEX_CACHE_KEY = "yandex_models_cache";
const YANDEX_CACHE_TTL_MS = 24 * 60 * 60 * 1000;

const SETUP_NOTE_I18N = {
  ar: {
    intro: "يتطلب استخدام الإضافة التسجيل ومفتاح API من أي مزود متوافق مع OpenAI.",
    warning: "للأمان، استخدم مفتاح API منفصلًا بأقل صلاحيات وحد ميزانية.",
    links: "روابط إعداد المفاتيح الرسمية:"
  },
  zh: {
    intro: "要使用扩展，需要注册并获取任意兼容 OpenAI 的提供商 API 密钥。",
    warning: "为安全起见，请使用单独的 API 密钥，并限制权限和预算。",
    links: "官方密钥获取："
  },
  en: {
    intro: "Registration and an API key are required to use the extension with any OpenAI-compatible provider.",
    warning: "For security, use a separate API key with minimal permissions and a limited budget.",
    links: "Official key setup:"
  },
  fr: {
    intro: "Pour utiliser l'extension, une inscription et une clé API d'un fournisseur compatible OpenAI sont nécessaires.",
    warning: "Pour la sécurité, utilisez une clé API distincte avec des droits minimaux et un budget limité.",
    links: "Configuration officielle des clés :"
  },
  de: {
    intro: "Für die Nutzung der Erweiterung sind eine Registrierung und ein API-Schlüssel eines OpenAI-kompatiblen Anbieters erforderlich.",
    warning: "Aus Sicherheitsgründen sollten Sie einen separaten API-Schlüssel mit minimalen Rechten und begrenztem Budget verwenden.",
    links: "Offizielle Schlüssel-Einrichtung:"
  },
  el: {
    intro: "Για να χρησιμοποιήσετε την επέκταση, απαιτούνται εγγραφή και κλειδί API από πάροχο συμβατό με OpenAI.",
    warning: "Για ασφάλεια, χρησιμοποιήστε ξεχωριστό κλειδί API με ελάχιστα δικαιώματα και περιορισμένο budget.",
    links: "Επίσημη ρύθμιση κλειδιών:"
  },
  he: {
    intro: "כדי להשתמש בתוסף נדרשים הרשמה ומפתח API מכל ספק תואם OpenAI.",
    warning: "למען האבטחה, השתמשו במפתח API נפרד עם הרשאות מינימליות ותקציב מוגבל.",
    links: "הגדרת מפתחות רשמית:"
  },
  it: {
    intro: "Per usare l'estensione sono necessari registrazione e una chiave API di un provider compatibile con OpenAI.",
    warning: "Per sicurezza, usa una chiave API separata con permessi minimi e budget limitato.",
    links: "Configurazione ufficiale delle chiavi:"
  },
  ja: {
    intro: "拡張機能を使用するには、OpenAI 互換プロバイダーでの登録と API キーが必要です。",
    warning: "セキュリティのため、権限を最小限にし、予算を制限した専用の API キーを使用してください。",
    links: "公式のキー取得先:"
  },
  ko: {
    intro: "확장 프로그램을 사용하려면 OpenAI 호환 제공자의 계정 등록과 API 키가 필요합니다.",
    warning: "보안을 위해 최소 권한과 제한된 예산으로 별도의 API 키를 사용하세요.",
    links: "공식 키 발급 안내:"
  },
  pt: {
    intro: "Para usar a extensão, é necessário cadastro e chave de API de qualquer provedor compatível com OpenAI.",
    warning: "Por segurança, use uma chave de API separada com permissões mínimas e orçamento limitado.",
    links: "Configuração oficial de chaves:"
  },
  ru: {
    intro: "Для работы расширения нужна регистрация и API-ключ любого OpenAI-совместимого провайдера.",
    warning: "Для безопасности используйте отдельный API-ключ с минимальными правами и ограниченным бюджетом.",
    links: "Официальные инструкции по ключам:"
  },
  es: {
    intro: "Para usar la extensión, se requiere registro y una clave API de cualquier proveedor compatible con OpenAI.",
    warning: "Por seguridad, usa una clave API independiente con permisos mínimos y presupuesto limitado.",
    links: "Configuración oficial de claves:"
  },
  th: {
    intro: "การใช้งานส่วนขยายต้องมีการสมัครและคีย์ API จากผู้ให้บริการที่รองรับ OpenAI",
    warning: "เพื่อความปลอดภัย ให้ใช้คีย์ API แยกต่างหาก โดยจำกัดสิทธิ์และงบประมาณ",
    links: "ลิงก์ทางการสำหรับรับคีย์:"
  },
  tr: {
    intro: "Eklentiyi kullanmak için OpenAI uyumlu bir sağlayıcıdan kayıt ve API anahtarı gerekir.",
    warning: "Güvenlik için minimum yetkili ve bütçesi sınırlı ayrı bir API anahtarı kullanın.",
    links: "Resmi anahtar alma bağlantıları:"
  },
  uk: {
    intro: "Для роботи розширення потрібні реєстрація та API-ключ будь-якого OpenAI-сумісного постачальника.",
    warning: "Для безпеки використовуйте окремий API-ключ із мінімальними правами та обмеженим бюджетом.",
    links: "Офіційні інструкції для отримання ключів:"
  }
};

const SYNC_KEYS_I18N = {
  ar: {
    label: "مزامنة مفاتيح API عبر الأجهزة",
    warning: "الأمان أقل: سيتم حفظ مفاتيح API في Chrome Sync ومزامنتها مع الأجهزة المرتبطة بالحساب. استخدم هذا الخيار فقط إذا كنت تثق بجميع أجهزتك."
  },
  zh: {
    label: "在设备间同步 API 密钥",
    warning: "安全性较低：API 密钥会存储在 Chrome 同步中，并同步到该账号下的设备。仅在你信任所有设备时启用。"
  },
  en: {
    label: "Sync API keys across devices",
    warning: "Less secure: API keys will be stored in Chrome Sync and synchronized to devices connected to your account. Enable only if you trust all those devices."
  },
  fr: {
    label: "Synchroniser les clés API entre appareils",
    warning: "Moins sûr : les clés API seront stockées dans Chrome Sync et synchronisées sur les appareils liés à votre compte. Activez uniquement si vous faites confiance à tous ces appareils."
  },
  de: {
    label: "API-Schlüssel zwischen Geräten synchronisieren",
    warning: "Weniger sicher: API-Schlüssel werden in Chrome Sync gespeichert und auf Geräte Ihres Kontos synchronisiert. Nur aktivieren, wenn Sie allen diesen Geräten vertrauen."
  },
  el: {
    label: "Συγχρονισμός κλειδιών API μεταξύ συσκευών",
    warning: "Λιγότερο ασφαλές: τα κλειδιά API αποθηκεύονται στο Chrome Sync και συγχρονίζονται σε συσκευές του λογαριασμού σας. Ενεργοποιήστε το μόνο αν εμπιστεύεστε όλες αυτές τις συσκευές."
  },
  he: {
    label: "סנכרון מפתחות API בין מכשירים",
    warning: "פחות מאובטח: מפתחות API יישמרו ב-Chrome Sync ויסונכרנו למכשירים המחוברים לחשבון. הפעל רק אם אתה סומך על כל המכשירים האלה."
  },
  it: {
    label: "Sincronizza le chiavi API tra dispositivi",
    warning: "Meno sicuro: le chiavi API verranno archiviate in Chrome Sync e sincronizzate sui dispositivi del tuo account. Attiva solo se ti fidi di tutti questi dispositivi."
  },
  ja: {
    label: "APIキーをデバイス間で同期する",
    warning: "安全性は低下します: APIキーは Chrome Sync に保存され、同じアカウントのデバイスへ同期されます。すべてのデバイスを信頼できる場合のみ有効にしてください。"
  },
  ko: {
    label: "기기 간 API 키 동기화",
    warning: "보안 수준이 낮아집니다: API 키가 Chrome Sync에 저장되고 계정에 연결된 기기로 동기화됩니다. 모든 기기를 신뢰할 때만 사용하세요."
  },
  pt: {
    label: "Sincronizar chaves de API entre dispositivos",
    warning: "Menos seguro: as chaves de API serão armazenadas no Chrome Sync e sincronizadas com os dispositivos da sua conta. Ative apenas se confiar em todos esses dispositivos."
  },
  ru: {
    label: "Синхронизировать API-ключи между устройствами",
    warning: "Менее безопасно: API-ключи будут храниться в Chrome Sync и синхронизироваться на устройства вашего аккаунта. Включайте только если доверяете всем этим устройствам."
  },
  es: {
    label: "Sincronizar claves API entre dispositivos",
    warning: "Menos seguro: las claves API se guardarán en Chrome Sync y se sincronizarán con los dispositivos de tu cuenta. Actívalo solo si confías en todos esos dispositivos."
  },
  th: {
    label: "ซิงก์คีย์ API ระหว่างอุปกรณ์",
    warning: "ความปลอดภัยลดลง: คีย์ API จะถูกเก็บใน Chrome Sync และซิงก์ไปยังอุปกรณ์ในบัญชีของคุณ เปิดใช้เฉพาะเมื่อเชื่อถือทุกอุปกรณ์ดังกล่าว"
  },
  tr: {
    label: "API anahtarlarını cihazlar arasında senkronize et",
    warning: "Daha az güvenli: API anahtarları Chrome Sync'te saklanır ve hesabınıza bağlı cihazlara eşitlenir. Yalnızca bu cihazların tümüne güveniyorsanız açın."
  },
  uk: {
    label: "Синхронізувати API-ключі між пристроями",
    warning: "Менш безпечно: API-ключі зберігатимуться в Chrome Sync і синхронізуватимуться на пристрої вашого акаунта. Увімкніть лише якщо довіряєте всім цим пристроям."
  }
};

function getLocaleStrings(lang) {
  return window.AITranslateI18n.getOptionsStrings(lang);
}

function applyTranslations(lang) {
  document.documentElement.lang = lang || "en";
  const strings = getLocaleStrings(lang);
  document.querySelectorAll("[data-i18n]").forEach((el) => {
    const key = el.getAttribute("data-i18n");
    if (strings[key]) {
      el.textContent = strings[key];
    }
  });
  document.querySelectorAll("[data-i18n-placeholder]").forEach((el) => {
    const key = el.getAttribute("data-i18n-placeholder");
    if (strings[key]) {
      el.setAttribute("placeholder", strings[key]);
    }
  });
}

function applySetupNoteTranslations(lang) {
  const strings = SETUP_NOTE_I18N[lang] || SETUP_NOTE_I18N.en;
  const syncStrings = SYNC_KEYS_I18N[lang] || SYNC_KEYS_I18N.en;
  setupNoteIntro.textContent = strings.intro;
  setupNoteWarning.textContent = strings.warning;
  setupNoteLinksLabel.textContent = strings.links;
  setupLinkOpenAI.textContent = "OpenAI";
  if (setupLinkClaude) {
    setupLinkClaude.textContent = "Claude";
  }
  if (setupLinkGemini) {
    setupLinkGemini.textContent = "Gemini";
  }
  setupLinkDeepSeek.textContent = "DeepSeek";
  setupLinkOpenRouter.textContent = "OpenRouter";
  setupLinkYandex.textContent = "YandexGPT";
  if (syncApiKeysLabel) {
    syncApiKeysLabel.textContent = syncStrings.label;
  }
  if (syncApiKeysHelp) {
    syncApiKeysHelp.dataset.tooltip = syncStrings.warning;
    syncApiKeysHelp.removeAttribute("title");
    syncApiKeysHelp.setAttribute("aria-label", syncStrings.label);
    syncApiKeysHelp.setAttribute("aria-description", syncStrings.warning);
  }
}

function getKeyByProviderFromStore(provider, syncData, localData, useSyncKeys) {
  if (useSyncKeys) {
    const map = syncData.apiKeyByProvider || {};
    return map[provider] || syncData.apiKey || "";
  }
  const map = localData.apiKeyByProvider || {};
  return map[provider] || localData.apiKey || "";
}

function migrateLegacySyncedKeysToLocalIfNeeded(syncData, localData) {
  if (syncData.syncApiKeys) return;
  const localMap = localData.apiKeyByProvider || {};
  const hasLocalKeys = Object.keys(localMap).length > 0 || Boolean(localData.apiKey);
  if (hasLocalKeys) return;
  const syncMap = syncData.apiKeyByProvider || {};
  const hasSyncKeys = Object.keys(syncMap).length > 0 || Boolean(syncData.apiKey);
  if (!hasSyncKeys) return;
  const migrated = { ...syncMap };
  const fallbackProvider = syncData.provider || defaultConfig.provider;
  if (syncData.apiKey && !migrated[fallbackProvider]) {
    migrated[fallbackProvider] = syncData.apiKey;
  }
  chrome.storage.local.set({ apiKeyByProvider: migrated, apiKey: syncData.apiKey || "" });
}

function migrateKeyStorage(useSyncKeys, currentProvider, done) {
  chrome.storage.sync.get({ apiKeyByProvider: {}, apiKey: "" }, (syncData) => {
    chrome.storage.local.get({ apiKeyByProvider: {}, apiKey: "" }, (localData) => {
      const syncMap = syncData.apiKeyByProvider || {};
      const localMap = localData.apiKeyByProvider || {};
      if (useSyncKeys) {
        const nextSyncMap = Object.keys(localMap).length ? localMap : syncMap;
        const currentKey = nextSyncMap[currentProvider] || syncData.apiKey || localData.apiKey || "";
        chrome.storage.sync.set(
          {
            syncApiKeys: true,
            apiKeyByProvider: nextSyncMap,
            apiKey: currentKey
          },
          () => done?.()
        );
        return;
      }
      const nextLocalMap = Object.keys(localMap).length ? localMap : syncMap;
      const currentKey = nextLocalMap[currentProvider] || localData.apiKey || syncData.apiKey || "";
      chrome.storage.local.set(
        {
          apiKeyByProvider: nextLocalMap,
          apiKey: currentKey
        },
        () => {
          chrome.storage.sync.set(
            {
              syncApiKeys: false,
              apiKeyByProvider: {},
              apiKey: ""
            },
            () => done?.()
          );
        }
      );
    });
  });
}

function getLanguageDisplayName(code, uiLang) {
  return window.AITranslateI18n.getLanguageDisplayName(code, uiLang);
}

function buildLanguageOptions(selectEl, lang, selectedValue) {
  const strings = getLocaleStrings(lang);
  const autoLabel = strings.autodetect || "Autodetect";
  const hasAuto = selectEl.id === "sourceLang";
  const preferredValue = selectedValue || selectEl.value;
  selectEl.innerHTML = "";
  if (hasAuto) {
    const opt = document.createElement("option");
    opt.value = "auto";
    opt.textContent = autoLabel;
    selectEl.appendChild(opt);
  }
  window.AITranslateI18n.languageCodes.forEach((code) => {
    const opt = document.createElement("option");
    opt.value = code;
    opt.textContent = getLanguageDisplayName(code, lang);
    selectEl.appendChild(opt);
  });
  if (preferredValue && Array.from(selectEl.options).some((opt) => opt.value === preferredValue)) {
    selectEl.value = preferredValue;
  }
}

function buildUiLanguageOptions(selectEl) {
  const labels = window.AITranslateI18n.uiLanguageLabels;
  selectEl.innerHTML = "";
  window.AITranslateI18n.languageCodes.forEach((code) => {
    const opt = document.createElement("option");
    opt.value = code;
    opt.textContent = labels[code] || code;
    selectEl.appendChild(opt);
  });
}

function setStatus(message, isError) {
  statusEl.textContent = message;
  statusEl.style.color = isError ? "#b00020" : "#0b6b0b";
  if (message) {
    setTimeout(() => {
      statusEl.textContent = "";
    }, 2500);
  }
}

function formatYandexModelLabel(modelId) {
  const text = (modelId || "").trim();
  if (!text) return modelId;
  const match = text.match(/^gpt:\/\/[^/]+\/(.+)$/i);
  if (match && match[1]) {
    return match[1];
  }
  return text;
}

function getModelLabel(modelId, provider) {
  if (provider === "yandexgpt") {
    return formatYandexModelLabel(modelId);
  }
  return modelId;
}

function populateModels(models, selected, provider = providerSelect.value) {
  modelSelect.innerHTML = "";
  const hasModels = models.length > 0;
  if (hasModels) {
    models.forEach((model) => {
      const option = document.createElement("option");
      option.value = model;
      option.textContent = getModelLabel(model, provider);
      modelSelect.appendChild(option);
    });
    modelSelect.style.display = "block";
    modelSelect.disabled = false;
    modelCustomInput.style.display = "none";
    modelSelect.value = selected && models.includes(selected) ? selected : models[0];
  } else {
    modelSelect.style.display = "none";
    modelSelect.disabled = true;
    modelCustomInput.style.display = "block";
    modelCustomInput.value = selected || "";
  }
}

function applyProviderDefaults(provider, currentModel) {
  const preset = PROVIDERS[provider] || PROVIDERS.custom;
  if (provider === "custom") {
    apiUrlInput.value = savedCustomApiUrl || "";
    populateModels([], savedCustomModel || "");
    return;
  }
  apiUrlInput.value = preset.apiUrl || "";
  populateModels(preset.models, currentModel);
}

function setOpenrouterControlsVisible(visible) {
  openrouterControls.style.display = visible ? "block" : "none";
}

function setYandexControlsVisible(visible) {
  yandexControls.style.display = visible ? "block" : "none";
}

function normalizeApiBaseUrl(apiUrl) {
  return (apiUrl || "").trim().replace(/\/$/, "");
}

function normalizeProviderApiUrl(provider, apiUrl) {
  const base = normalizeApiBaseUrl(apiUrl);
  if (!base) return base;
  try {
    const url = new URL(base);
    if (provider === "openrouter" && url.hostname.toLowerCase() === "openrouter.ai") {
      const path = url.pathname.replace(/\/+$/, "");
      if (path === "" || path === "/" || !path.startsWith("/api/")) {
        url.pathname = "/api/v1";
      }
    }
    if (provider === "yandexgpt" && /(^|\.)api\.cloud\.yandex\.net$/i.test(url.hostname)) {
      const path = url.pathname.replace(/\/+$/, "");
      if (path === "" || path === "/") {
        url.pathname = "/v1";
      }
    }
    if (provider === "gemini" && url.hostname.toLowerCase() === "generativelanguage.googleapis.com") {
      const path = url.pathname.replace(/\/+$/, "");
      if (path === "" || path === "/" || path === "/v1beta") {
        url.pathname = "/v1beta/openai";
      }
    }
    if (provider === "claude" && url.hostname.toLowerCase() === "api.anthropic.com") {
      const path = url.pathname.replace(/\/+$/, "");
      if (path === "/v1" || path === "/v1/messages" || path === "/v1/models") {
        url.pathname = "/";
      }
    }
    return url.toString().replace(/\/$/, "");
  } catch (_) {
    return base;
  }
}

function isLikelyOpenAIChatModel(id) {
  if (!id) return false;
  return /^(gpt-|chatgpt-|o[1-9]\d*($|-)|o\d($|-))/i.test(id);
}

async function fetchOpenAIModels(apiUrl, apiKey) {
  const endpoint = `${normalizeApiBaseUrl(apiUrl)}/models`;
  const response = await fetch(endpoint, {
    headers: {
      Authorization: `Bearer ${apiKey}`
    }
  });
  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`OpenAI API error ${response.status}: ${errorText}`);
  }
  const json = await response.json();
  return Array.isArray(json?.data) ? json.data : [];
}

function filterOpenAIModels(models) {
  const ids = models.map((m) => m.id).filter(Boolean);
  const chat = ids.filter((id) => isLikelyOpenAIChatModel(id)).sort();
  return chat.length ? chat : ids.sort();
}

function loadOpenAICache() {
  return new Promise((resolve) => {
    chrome.storage.local.get({ [OPENAI_CACHE_KEY]: null }, (data) => {
      resolve(data[OPENAI_CACHE_KEY]);
    });
  });
}

async function getOpenAIModels(apiUrl, apiKey, forceRefresh = false) {
  const normalizedUrl = normalizeApiBaseUrl(apiUrl);
  if (!normalizedUrl) {
    throw new Error("API URL is required.");
  }
  const cache = await loadOpenAICache();
  if (
    !forceRefresh &&
    cache &&
    cache.apiUrl === normalizedUrl &&
    Array.isArray(cache.models) &&
    Date.now() - cache.ts < OPENAI_CACHE_TTL_MS
  ) {
    return cache.models;
  }
  const models = await fetchOpenAIModels(normalizedUrl, apiKey);
  const ids = filterOpenAIModels(models);
  chrome.storage.local.set({
    [OPENAI_CACHE_KEY]: {
      ts: Date.now(),
      apiUrl: normalizedUrl,
      models: ids
    }
  });
  return ids;
}

async function fetchClaudeModels(apiUrl, apiKey) {
  const endpoint = `${normalizeApiBaseUrl(apiUrl)}/v1/models`;
  const response = await fetch(endpoint, {
    headers: {
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
      "anthropic-dangerous-direct-browser-access": "true"
    }
  });
  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Claude API error ${response.status}: ${errorText}`);
  }
  const json = await response.json();
  return Array.isArray(json?.data) ? json.data : [];
}

function filterClaudeModels(models) {
  return models
    .map((m) => m.id)
    .filter(Boolean)
    .filter((id) => /^claude-/i.test(String(id)))
    .sort();
}

function loadClaudeCache() {
  return new Promise((resolve) => {
    chrome.storage.local.get({ [CLAUDE_CACHE_KEY]: null }, (data) => {
      resolve(data[CLAUDE_CACHE_KEY]);
    });
  });
}

async function getClaudeModels(apiUrl, apiKey, forceRefresh = false) {
  const normalizedUrl = normalizeApiBaseUrl(apiUrl);
  if (!normalizedUrl) {
    throw new Error("API URL is required.");
  }
  const cache = await loadClaudeCache();
  if (
    !forceRefresh &&
    cache &&
    cache.apiUrl === normalizedUrl &&
    Array.isArray(cache.models) &&
    Date.now() - cache.ts < CLAUDE_CACHE_TTL_MS
  ) {
    return cache.models;
  }
  const models = await fetchClaudeModels(normalizedUrl, apiKey);
  const ids = filterClaudeModels(models);
  chrome.storage.local.set({
    [CLAUDE_CACHE_KEY]: {
      ts: Date.now(),
      apiUrl: normalizedUrl,
      models: ids
    }
  });
  return ids;
}

function getGeminiModelsEndpoint(apiUrl) {
  const normalized = normalizeApiBaseUrl(apiUrl);
  try {
    const url = new URL(normalized || "https://generativelanguage.googleapis.com/v1beta/openai");
    if (url.hostname.toLowerCase() === "generativelanguage.googleapis.com") {
      const path = url.pathname.replace(/\/+$/, "");
      if (path.endsWith("/openai")) {
        url.pathname = path.slice(0, -"/openai".length) || "/v1beta";
      } else if (path === "" || path === "/") {
        url.pathname = "/v1beta";
      }
      return `${url.toString().replace(/\/$/, "")}/models`;
    }
  } catch (_) {
    // fall through
  }
  return "https://generativelanguage.googleapis.com/v1beta/models";
}

async function fetchGeminiModels(apiUrl, apiKey) {
  const endpoint = getGeminiModelsEndpoint(apiUrl);
  const response = await fetch(endpoint, {
    headers: {
      "x-goog-api-key": apiKey
    }
  });
  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Gemini API error ${response.status}: ${errorText}`);
  }
  const json = await response.json();
  return Array.isArray(json?.models) ? json.models : [];
}

function filterGeminiModels(models) {
  return models
    .filter((m) => {
      const name = String(m?.name || "");
      if (!name.startsWith("models/gemini")) return false;
      const methods = Array.isArray(m?.supportedGenerationMethods) ? m.supportedGenerationMethods : [];
      return methods.length === 0 || methods.includes("generateContent");
    })
    .map((m) => String(m.name).replace(/^models\//, ""))
    .filter(Boolean)
    .sort();
}

function loadGeminiCache() {
  return new Promise((resolve) => {
    chrome.storage.local.get({ [GEMINI_CACHE_KEY]: null }, (data) => {
      resolve(data[GEMINI_CACHE_KEY]);
    });
  });
}

async function getGeminiModels(apiUrl, apiKey, forceRefresh = false) {
  const normalizedUrl = normalizeApiBaseUrl(apiUrl);
  if (!normalizedUrl) {
    throw new Error("API URL is required.");
  }
  const cache = await loadGeminiCache();
  if (
    !forceRefresh &&
    cache &&
    cache.apiUrl === normalizedUrl &&
    Array.isArray(cache.models) &&
    Date.now() - cache.ts < GEMINI_CACHE_TTL_MS
  ) {
    return cache.models;
  }
  const models = await fetchGeminiModels(normalizedUrl, apiKey);
  const ids = filterGeminiModels(models);
  chrome.storage.local.set({
    [GEMINI_CACHE_KEY]: {
      ts: Date.now(),
      apiUrl: normalizedUrl,
      models: ids
    }
  });
  return ids;
}

async function fetchYandexModels(apiUrl, apiKey, folderId) {
  const endpoint = `${normalizeApiBaseUrl(apiUrl)}/models`;
  const headers = {
    Authorization: `Bearer ${apiKey}`
  };
  const cleanFolderId = (folderId || "").trim();
  if (cleanFolderId) {
    headers["OpenAI-Project"] = cleanFolderId;
  }
  const response = await fetch(endpoint, { headers });
  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Yandex API error ${response.status}: ${errorText}`);
  }
  const json = await response.json();
  return Array.isArray(json?.data) ? json.data : [];
}

function filterYandexModels(models) {
  return models
    .map((m) => m.id)
    .filter(Boolean)
    .filter((id) => {
      const lower = String(id).toLowerCase();
      return !lower.startsWith("emb://") && !lower.includes("embedding");
    })
    .sort();
}

function loadYandexCache() {
  return new Promise((resolve) => {
    chrome.storage.local.get({ [YANDEX_CACHE_KEY]: null }, (data) => {
      resolve(data[YANDEX_CACHE_KEY]);
    });
  });
}

async function getYandexModels(apiUrl, apiKey, folderId, forceRefresh = false) {
  const normalizedUrl = normalizeApiBaseUrl(apiUrl);
  const cleanFolderId = (folderId || "").trim();
  if (!normalizedUrl) {
    throw new Error("API URL is required.");
  }
  const cache = await loadYandexCache();
  if (
    !forceRefresh &&
    cache &&
    cache.apiUrl === normalizedUrl &&
    cache.folderId === cleanFolderId &&
    Array.isArray(cache.models) &&
    Date.now() - cache.ts < YANDEX_CACHE_TTL_MS
  ) {
    return cache.models;
  }
  const models = await fetchYandexModels(normalizedUrl, apiKey, cleanFolderId);
  const ids = filterYandexModels(models);
  chrome.storage.local.set({
    [YANDEX_CACHE_KEY]: {
      ts: Date.now(),
      apiUrl: normalizedUrl,
      folderId: cleanFolderId,
      models: ids
    }
  });
  return ids;
}


function isFreeModel(pricing) {
  if (!pricing) return false;
  const fields = [
    "prompt",
    "completion",
    "request",
    "image",
    "web_search",
    "internal_reasoning",
    "input_cache_read",
    "input_cache_write"
  ];
  return fields.every((key) => pricing[key] === "0" || pricing[key] === 0 || pricing[key] === undefined);
}

async function fetchOpenrouterModels(apiKey, source) {
  const endpoints = source === "user"
    ? ["https://openrouter.ai/api/v1/models/user", "https://openrouter.ai/api/v1/models"]
    : ["https://openrouter.ai/api/v1/models"];

  let lastError = null;
  for (const endpoint of endpoints) {
    const response = await fetch(endpoint, {
      headers: {
        Authorization: `Bearer ${apiKey}`
      }
    });
    if (response.ok) {
      const json = await response.json();
      return Array.isArray(json?.data) ? json.data : [];
    }

    const errorText = await response.text();
    const isUserEndpoint = endpoint.endsWith("/models/user");
    const isCookieAuthError =
      response.status === 401 &&
      /auth cookie|no user or org id/i.test(errorText);

    if (isUserEndpoint && isCookieAuthError) {
      lastError = new Error("OpenRouter user models are unavailable for this key. Loaded public models.");
      continue;
    }

    throw new Error(`OpenRouter API error ${response.status}: ${errorText}`);
  }

  throw lastError || new Error("OpenRouter API error: cannot load models.");
}

function filterOpenrouterModels(models, freeOnly) {
  const filtered = freeOnly ? models.filter((m) => isFreeModel(m.pricing)) : models;
  return filtered.map((m) => m.id).filter(Boolean).sort();
}

function saveOpenrouterCache(models, freeOnly) {
  chrome.storage.local.set({
    [OPENROUTER_CACHE_KEY]: {
      ts: Date.now(),
      freeOnly,
      models
    }
  });
}

function loadOpenrouterCache() {
  return new Promise((resolve) => {
    chrome.storage.local.get({ [OPENROUTER_CACHE_KEY]: null }, (data) => {
      resolve(data[OPENROUTER_CACHE_KEY]);
    });
  });
}

async function getOpenrouterModels(apiKey, freeOnly, source) {
  const cache = await loadOpenrouterCache();
  if (
    cache &&
    cache.freeOnly === freeOnly &&
    cache.source === source &&
    Array.isArray(cache.models) &&
    Date.now() - cache.ts < OPENROUTER_CACHE_TTL_MS
  ) {
    return cache.models;
  }
  const models = await fetchOpenrouterModels(apiKey, source);
  const ids = filterOpenrouterModels(models, freeOnly);
  chrome.storage.local.set({
    [OPENROUTER_CACHE_KEY]: {
      ts: Date.now(),
      freeOnly,
      source,
      models: ids
    }
  });
  return ids;
}


chrome.storage.sync.get(defaultConfig, (data) => {
  const provider = data.provider || defaultConfig.provider;
  savedCustomApiUrl = data.customApiUrl || "";
  savedCustomModel = data.customModel || "";
  providerSelect.value = provider;
  apiUrlInput.value = provider === "custom"
    ? savedCustomApiUrl
    : (data.apiUrl || defaultConfig.apiUrl);
  syncApiKeysCheckbox.checked = Boolean(data.syncApiKeys);
  const model = data.model || defaultConfig.model;
  applyProviderDefaults(provider, model);
  const uiLang = data.uiLang || defaultConfig.uiLang;
  buildUiLanguageOptions(uiLangSelect);
  uiLangSelect.value = uiLang;
  buildLanguageOptions(targetLangSelect, uiLang);
  buildLanguageOptions(sourceLangSelect, uiLang);
  targetLangSelect.value = data.targetLang || defaultConfig.targetLang;
  sourceLangSelect.value = data.sourceLang || defaultConfig.sourceLang;
  overlayModeSelect.value = data.overlayMode || defaultConfig.overlayMode;
  overlayDurationInput.value =
    typeof data.overlayDuration === "number"
      ? data.overlayDuration
      : defaultConfig.overlayDuration;
  selectionShortcutCheckbox.checked =
    typeof data.selectionShortcut === "boolean"
      ? data.selectionShortcut
      : defaultConfig.selectionShortcut;
  openrouterFreeOnlyCheckbox.checked =
    typeof data.openrouterFreeOnly === "boolean"
      ? data.openrouterFreeOnly
      : defaultConfig.openrouterFreeOnly;
  openrouterSourceSelect.value = data.openrouterSource || defaultConfig.openrouterSource;
  yandexFolderInput.value = data.yandexFolderId || defaultConfig.yandexFolderId;
  setOpenrouterControlsVisible(provider === "openrouter");
  setYandexControlsVisible(provider === "yandexgpt");
  applyTranslations(uiLang);
  applySetupNoteTranslations(uiLang);
  chrome.storage.local.get({ apiKeyByProvider: {}, apiKey: "" }, (localData) => {
    migrateLegacySyncedKeysToLocalIfNeeded(data, localData);
    const key = getKeyByProviderFromStore(provider, data, localData, Boolean(data.syncApiKeys));
    apiKeyInput.value = key;
    if (!key) return;
    if (provider === "openrouter") {
      getOpenrouterModels(key, openrouterFreeOnlyCheckbox.checked, openrouterSourceSelect.value)
        .then((models) => {
          if (models.length) {
            populateModels(models, data.model || defaultConfig.model);
          }
        })
        .catch((err) => {
          setStatus(err.message || String(err), true);
        });
    } else if (provider === "openai") {
      getOpenAIModels(apiUrlInput.value, key)
        .then((models) => {
          if (models.length) {
            populateModels(models, data.model || defaultConfig.model);
          }
        })
        .catch(() => {
          populateModels(PROVIDERS.openai.models, data.model || defaultConfig.model);
        });
    } else if (provider === "claude") {
      getClaudeModels(apiUrlInput.value, key)
        .then((models) => {
          if (models.length) {
            populateModels(models, data.model || defaultConfig.model);
          } else {
            populateModels(PROVIDERS.claude.models, data.model || defaultConfig.model);
          }
        })
        .catch(() => {
          populateModels(PROVIDERS.claude.models, data.model || defaultConfig.model);
        });
    } else if (provider === "gemini") {
      getGeminiModels(apiUrlInput.value, key)
        .then((models) => {
          if (models.length) {
            populateModels(models, data.model || defaultConfig.model);
          } else {
            populateModels(PROVIDERS.gemini.models, data.model || defaultConfig.model);
          }
        })
        .catch(() => {
          populateModels(PROVIDERS.gemini.models, data.model || defaultConfig.model);
        });
    } else if (provider === "yandexgpt") {
      getYandexModels(apiUrlInput.value, key, yandexFolderInput.value)
        .then((models) => {
          if (models.length) {
            populateModels(models, data.model || defaultConfig.model);
          } else {
            populateModels(PROVIDERS.yandexgpt.models, data.model || defaultConfig.model);
          }
        })
        .catch(() => {
          populateModels(PROVIDERS.yandexgpt.models, data.model || defaultConfig.model);
        });
    }
  });
});

providerSelect.addEventListener("change", () => {
  const provider = providerSelect.value;
  applyProviderDefaults(provider, provider === "custom" ? savedCustomModel : "");
  setOpenrouterControlsVisible(provider === "openrouter");
  setYandexControlsVisible(provider === "yandexgpt");
  chrome.storage.sync.get(defaultConfig, (data) => {
    chrome.storage.local.get({ apiKeyByProvider: {}, apiKey: "" }, (localData) => {
      savedCustomApiUrl = data.customApiUrl || savedCustomApiUrl;
      savedCustomModel = data.customModel || savedCustomModel;
      if (provider === "custom") {
        apiUrlInput.value = savedCustomApiUrl || "";
        modelCustomInput.value = savedCustomModel || "";
      }
      apiKeyInput.value = getKeyByProviderFromStore(provider, data, localData, Boolean(data.syncApiKeys));
      yandexFolderInput.value = data.yandexFolderId || defaultConfig.yandexFolderId;
      if (provider === "openai" && apiKeyInput.value.trim()) {
        getOpenAIModels(apiUrlInput.value, apiKeyInput.value.trim())
          .then((models) => {
            if (models.length) {
              populateModels(models, modelSelect.value || modelCustomInput.value);
            }
          })
          .catch(() => {
            populateModels(PROVIDERS.openai.models, modelSelect.value || modelCustomInput.value);
          });
      } else if (provider === "claude" && apiKeyInput.value.trim()) {
        getClaudeModels(apiUrlInput.value, apiKeyInput.value.trim())
          .then((models) => {
            if (models.length) {
              populateModels(models, modelSelect.value || modelCustomInput.value);
            } else {
              populateModels(PROVIDERS.claude.models, modelSelect.value || modelCustomInput.value);
            }
          })
          .catch(() => {
            populateModels(PROVIDERS.claude.models, modelSelect.value || modelCustomInput.value);
          });
      } else if (provider === "gemini" && apiKeyInput.value.trim()) {
        getGeminiModels(apiUrlInput.value, apiKeyInput.value.trim())
          .then((models) => {
            if (models.length) {
              populateModels(models, modelSelect.value || modelCustomInput.value);
            } else {
              populateModels(PROVIDERS.gemini.models, modelSelect.value || modelCustomInput.value);
            }
          })
          .catch(() => {
            populateModels(PROVIDERS.gemini.models, modelSelect.value || modelCustomInput.value);
          });
      } else if (provider === "yandexgpt" && apiKeyInput.value.trim()) {
        getYandexModels(apiUrlInput.value, apiKeyInput.value.trim(), yandexFolderInput.value)
          .then((models) => {
            if (models.length) {
              populateModels(models, modelSelect.value || modelCustomInput.value);
            } else {
              populateModels(PROVIDERS.yandexgpt.models, modelSelect.value || modelCustomInput.value);
            }
          })
          .catch(() => {
            populateModels(PROVIDERS.yandexgpt.models, modelSelect.value || modelCustomInput.value);
          });
      }
    });
  });
});

apiUrlInput.addEventListener("input", () => {
  if (providerSelect.value === "custom") {
    savedCustomApiUrl = apiUrlInput.value.trim();
  }
});

modelCustomInput.addEventListener("input", () => {
  if (providerSelect.value === "custom") {
    savedCustomModel = modelCustomInput.value.trim();
  }
});

function refreshProviderModelsAfterSave(provider, apiUrl, apiKey, model, yandexFolderId, uiLang) {
  if (!apiKey) return;
  if (provider === "openrouter") {
    getOpenrouterModels(apiKey, openrouterFreeOnlyCheckbox.checked, openrouterSourceSelect.value)
      .then((models) => {
        if (models.length) {
          populateModels(models, model);
        }
      })
      .catch((err) => {
        setStatus(err.message || String(err), true);
      });
    return;
  }
  if (provider === "openai") {
    getOpenAIModels(apiUrl, apiKey, true)
      .then((models) => {
        if (models.length) {
          populateModels(models, model);
          setStatus(getLocaleStrings(uiLang).status_models_updated, false);
        }
      })
      .catch((err) => {
        populateModels(PROVIDERS.openai.models, model);
        setStatus(err.message || String(err), true);
      });
    return;
  }
  if (provider === "claude") {
    getClaudeModels(apiUrl, apiKey, true)
      .then((models) => {
        if (models.length) {
          populateModels(models, model);
          setStatus(getLocaleStrings(uiLang).status_models_updated, false);
        } else {
          populateModels(PROVIDERS.claude.models, model);
        }
      })
      .catch((err) => {
        populateModels(PROVIDERS.claude.models, model);
        setStatus(err.message || String(err), true);
      });
    return;
  }
  if (provider === "gemini") {
    getGeminiModels(apiUrl, apiKey, true)
      .then((models) => {
        if (models.length) {
          populateModels(models, model);
          setStatus(getLocaleStrings(uiLang).status_models_updated, false);
        } else {
          populateModels(PROVIDERS.gemini.models, model);
        }
      })
      .catch((err) => {
        populateModels(PROVIDERS.gemini.models, model);
        setStatus(err.message || String(err), true);
      });
    return;
  }
  if (provider === "yandexgpt") {
    getYandexModels(apiUrl, apiKey, yandexFolderId, true)
      .then((models) => {
        if (models.length) {
          populateModels(models, model);
          setStatus(getLocaleStrings(uiLang).status_models_updated, false);
        } else {
          populateModels(PROVIDERS.yandexgpt.models, model);
        }
      })
      .catch((err) => {
        populateModels(PROVIDERS.yandexgpt.models, model);
        setStatus(err.message || String(err), true);
      });
  }
}

syncApiKeysCheckbox.addEventListener("change", () => {
  const useSyncKeys = syncApiKeysCheckbox.checked;
  const currentProvider = providerSelect.value || defaultConfig.provider;
  migrateKeyStorage(useSyncKeys, currentProvider, () => {
    chrome.storage.sync.get(defaultConfig, (syncData) => {
      chrome.storage.local.get({ apiKeyByProvider: {}, apiKey: "" }, (localData) => {
        apiKeyInput.value = getKeyByProviderFromStore(currentProvider, syncData, localData, useSyncKeys);
      });
    });
  });
});

uiLangSelect.addEventListener("change", () => {
  const uiLang = uiLangSelect.value;
  const currentTarget = targetLangSelect.value;
  const currentSource = sourceLangSelect.value;
  applyTranslations(uiLang);
  applySetupNoteTranslations(uiLang);
  buildLanguageOptions(targetLangSelect, uiLang, currentTarget);
  buildLanguageOptions(sourceLangSelect, uiLang, currentSource);
  chrome.storage.sync.set({ uiLang });
});

openrouterFreeOnlyCheckbox.addEventListener("change", () => {
  chrome.storage.sync.set({ openrouterFreeOnly: openrouterFreeOnlyCheckbox.checked });
});

openrouterSourceSelect.addEventListener("change", () => {
  chrome.storage.sync.set({ openrouterSource: openrouterSourceSelect.value });
});

refreshOpenrouterBtn.addEventListener("click", async () => {
  const key = apiKeyInput.value.trim();
  if (!key) {
    setStatus(getLocaleStrings(uiLangSelect.value).status_set_openrouter_key, true);
    return;
  }
  try {
    setStatus(getLocaleStrings(uiLangSelect.value).status_refreshing, false);
    const models = await getOpenrouterModels(
      key,
      openrouterFreeOnlyCheckbox.checked,
      openrouterSourceSelect.value
    );
    if (!models.length) {
      setStatus(getLocaleStrings(uiLangSelect.value).status_no_models, true);
      return;
    }
    populateModels(models, modelSelect.value);
    setStatus(getLocaleStrings(uiLangSelect.value).status_models_updated, false);
  } catch (err) {
    setStatus(err.message || String(err), true);
  }
});

refreshYandexBtn.addEventListener("click", async () => {
  const strings = getLocaleStrings(uiLangSelect.value);
  const key = apiKeyInput.value.trim();
  if (!key) {
    const hint = (strings.status_set_openrouter_key || "Set API key first.").replace(/OpenRouter/gi, "YandexGPT");
    setStatus(hint, true);
    return;
  }
  try {
    setStatus(strings.status_refreshing || "Refreshing models...", false);
    const models = await getYandexModels(
      apiUrlInput.value,
      key,
      yandexFolderInput.value,
      true
    );
    if (!models.length) {
      setStatus(getLocaleStrings(uiLangSelect.value).status_no_models, true);
      return;
    }
    populateModels(models, modelSelect.value);
    setStatus(getLocaleStrings(uiLangSelect.value).status_models_updated, false);
  } catch (err) {
    setStatus(err.message || String(err), true);
  }
});

document.getElementById("save").addEventListener("click", () => {
  const provider = providerSelect.value;
  const isCustom = provider === "custom";
  const modelValue = isCustom ? modelCustomInput.value.trim() : modelSelect.value;
  if (isCustom) {
    savedCustomApiUrl = apiUrlInput.value.trim();
    savedCustomModel = modelValue;
  }
  const syncApiKeys = syncApiKeysCheckbox.checked;
  const config = {
    provider,
    apiUrl: normalizeProviderApiUrl(provider, apiUrlInput.value),
    model: modelValue,
    customApiUrl: savedCustomApiUrl,
    customModel: savedCustomModel,
    targetLang: targetLangSelect.value,
    sourceLang: sourceLangSelect.value,
    uiLang: uiLangSelect.value,
    overlayMode: overlayModeSelect.value,
    overlayDuration: Number(overlayDurationInput.value) || defaultConfig.overlayDuration,
    selectionShortcut: selectionShortcutCheckbox.checked,
    syncApiKeys,
    openrouterFreeOnly: openrouterFreeOnlyCheckbox.checked,
    openrouterSource: openrouterSourceSelect.value,
    yandexFolderId: yandexFolderInput.value.trim()
  };

  if (!config.apiUrl || !config.model) {
    setStatus(getLocaleStrings(uiLangSelect.value).status_required, true);
    return;
  }

  chrome.storage.sync.set(config, () => {
    migrateKeyStorage(syncApiKeys, provider, () => {
      const currentKey = apiKeyInput.value.trim();
      if (syncApiKeys) {
        chrome.storage.sync.get({ apiKeyByProvider: {} }, (syncData) => {
          const keyMap = { ...(syncData.apiKeyByProvider || {}) };
          keyMap[provider] = currentKey;
          chrome.storage.sync.set({ apiKeyByProvider: keyMap, apiKey: currentKey }, () => {
            setStatus(getLocaleStrings(uiLangSelect.value).status_saved, false);
            refreshProviderModelsAfterSave(
              provider,
              config.apiUrl,
              currentKey,
              config.model,
              config.yandexFolderId,
              uiLangSelect.value
            );
          });
        });
      } else {
        chrome.storage.local.get({ apiKeyByProvider: {} }, (localData) => {
          const keyMap = { ...(localData.apiKeyByProvider || {}) };
          keyMap[provider] = currentKey;
          chrome.storage.local.set({ apiKeyByProvider: keyMap, apiKey: currentKey }, () => {
            chrome.storage.sync.set({ apiKeyByProvider: {}, apiKey: "" }, () => {
              setStatus(getLocaleStrings(uiLangSelect.value).status_saved, false);
              refreshProviderModelsAfterSave(
                provider,
                config.apiUrl,
                currentKey,
                config.model,
                config.yandexFolderId,
                uiLangSelect.value
              );
            });
          });
        });
      }
    });
  });
});

