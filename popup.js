/* global chrome */

const openOptionsBtn = document.getElementById("openOptions");
const lastTranslationWrap = document.getElementById("lastTranslation");
const lastTranslationText = document.getElementById("lastTranslationText");
const copyLastBtn = document.getElementById("copyLast");
const clearLastBtn = document.getElementById("clearLast");
const lastErrorWrap = document.getElementById("lastError");
const lastErrorText = document.getElementById("lastErrorText");
const clearErrorBtn = document.getElementById("clearError");
const quickFromSelect = document.getElementById("quickFrom");
const quickToSelect = document.getElementById("quickTo");
const quickSwapBtn = document.getElementById("quickSwap");
const quickInput = document.getElementById("quickInput");
const quickOutput = document.getElementById("quickOutput");
const quickTranslateBtn = document.getElementById("quickTranslateBtn");
let currentUiLang = "en";
const QUICK_STATE_KEY = "quickTranslateState";
const QUICK_STATE_DEFAULT = {
  sourceLang: "auto",
  targetLang: "en",
  inputText: "",
  outputText: ""
};
const QUICK_POPUP_I18N = {
  ar: {
    quick_translate: "ترجمة سريعة",
    quick_auto: "اكتشاف تلقائي",
    quick_input: "نص للترجمة",
    quick_input_ph: "اكتب النص...",
    quick_translate_btn: "ترجمة",
    quick_swap_title: "تبديل اللغات",
    quick_output: "النتيجة",
    quick_output_ph: "ستظهر الترجمة هنا...",
    quick_empty: "أدخل نصاً للترجمة.",
    quick_translating: "جارٍ الترجمة...",
    quick_error: "خطأ"
  },
  zh: {
    quick_translate: "快速翻译",
    quick_auto: "自动检测",
    quick_input: "待翻译文本",
    quick_input_ph: "输入文本...",
    quick_translate_btn: "翻译",
    quick_swap_title: "交换语言",
    quick_output: "结果",
    quick_output_ph: "翻译结果将显示在这里...",
    quick_empty: "请输入要翻译的文本。",
    quick_translating: "翻译中...",
    quick_error: "错误"
  },
  fr: {
    quick_translate: "Traduction rapide",
    quick_auto: "Détection auto",
    quick_input: "Texte à traduire",
    quick_input_ph: "Saisissez le texte...",
    quick_translate_btn: "Traduire",
    quick_swap_title: "Inverser les langues",
    quick_output: "Résultat",
    quick_output_ph: "La traduction apparaîtra ici...",
    quick_empty: "Saisissez du texte à traduire.",
    quick_translating: "Traduction...",
    quick_error: "Erreur"
  },
  de: {
    quick_translate: "Schnellübersetzung",
    quick_auto: "Automatisch erkennen",
    quick_input: "Zu übersetzender Text",
    quick_input_ph: "Text eingeben...",
    quick_translate_btn: "Übersetzen",
    quick_swap_title: "Sprachen tauschen",
    quick_output: "Ergebnis",
    quick_output_ph: "Die Übersetzung erscheint hier...",
    quick_empty: "Text zum Übersetzen eingeben.",
    quick_translating: "Wird übersetzt...",
    quick_error: "Fehler"
  },
  el: {
    quick_translate: "Γρήγορη μετάφραση",
    quick_auto: "Αυτόματος εντοπισμός",
    quick_input: "Κείμενο για μετάφραση",
    quick_input_ph: "Πληκτρολογήστε κείμενο...",
    quick_translate_btn: "Μετάφραση",
    quick_swap_title: "Αντιμετάθεση γλωσσών",
    quick_output: "Αποτέλεσμα",
    quick_output_ph: "Η μετάφραση θα εμφανιστεί εδώ...",
    quick_empty: "Εισαγάγετε κείμενο για μετάφραση.",
    quick_translating: "Μετάφραση...",
    quick_error: "Σφάλμα"
  },
  he: {
    quick_translate: "תרגום מהיר",
    quick_auto: "זיהוי אוטומטי",
    quick_input: "טקסט לתרגום",
    quick_input_ph: "הקלד טקסט...",
    quick_translate_btn: "תרגם",
    quick_swap_title: "החלף שפות",
    quick_output: "תוצאה",
    quick_output_ph: "התרגום יופיע כאן...",
    quick_empty: "הזן טקסט לתרגום.",
    quick_translating: "מתרגם...",
    quick_error: "שגיאה"
  },
  it: {
    quick_translate: "Traduzione rapida",
    quick_auto: "Rilevamento automatico",
    quick_input: "Testo da tradurre",
    quick_input_ph: "Inserisci testo...",
    quick_translate_btn: "Traduci",
    quick_swap_title: "Scambia lingue",
    quick_output: "Risultato",
    quick_output_ph: "La traduzione apparirà qui...",
    quick_empty: "Inserisci del testo da tradurre.",
    quick_translating: "Traduzione...",
    quick_error: "Errore"
  },
  ja: {
    quick_translate: "クイック翻訳",
    quick_auto: "自動検出",
    quick_input: "翻訳するテキスト",
    quick_input_ph: "テキストを入力...",
    quick_translate_btn: "翻訳",
    quick_swap_title: "言語を入れ替え",
    quick_output: "結果",
    quick_output_ph: "翻訳結果がここに表示されます...",
    quick_empty: "翻訳するテキストを入力してください。",
    quick_translating: "翻訳中...",
    quick_error: "エラー"
  },
  ko: {
    quick_translate: "빠른 번역",
    quick_auto: "자동 감지",
    quick_input: "번역할 텍스트",
    quick_input_ph: "텍스트 입력...",
    quick_translate_btn: "번역",
    quick_swap_title: "언어 바꾸기",
    quick_output: "결과",
    quick_output_ph: "번역 결과가 여기에 표시됩니다...",
    quick_empty: "번역할 텍스트를 입력하세요.",
    quick_translating: "번역 중...",
    quick_error: "오류"
  },
  pt: {
    quick_translate: "Tradução rápida",
    quick_auto: "Detecção automática",
    quick_input: "Texto para traduzir",
    quick_input_ph: "Digite o texto...",
    quick_translate_btn: "Traduzir",
    quick_swap_title: "Inverter idiomas",
    quick_output: "Resultado",
    quick_output_ph: "A tradução aparecerá aqui...",
    quick_empty: "Digite um texto para traduzir.",
    quick_translating: "Traduzindo...",
    quick_error: "Erro"
  },
  es: {
    quick_translate: "Traducción rápida",
    quick_auto: "Detección automática",
    quick_input: "Texto a traducir",
    quick_input_ph: "Escribe el texto...",
    quick_translate_btn: "Traducir",
    quick_swap_title: "Intercambiar idiomas",
    quick_output: "Resultado",
    quick_output_ph: "La traducción aparecerá aquí...",
    quick_empty: "Introduce texto para traducir.",
    quick_translating: "Traduciendo...",
    quick_error: "Error"
  },
  th: {
    quick_translate: "แปลด่วน",
    quick_auto: "ตรวจจับอัตโนมัติ",
    quick_input: "ข้อความที่จะแปล",
    quick_input_ph: "พิมพ์ข้อความ...",
    quick_translate_btn: "แปล",
    quick_swap_title: "สลับภาษา",
    quick_output: "ผลลัพธ์",
    quick_output_ph: "คำแปลจะแสดงที่นี่...",
    quick_empty: "กรุณาใส่ข้อความที่ต้องการแปล",
    quick_translating: "กำลังแปล...",
    quick_error: "ข้อผิดพลาด"
  },
  tr: {
    quick_translate: "Hızlı çeviri",
    quick_auto: "Otomatik algıla",
    quick_input: "Çevrilecek metin",
    quick_input_ph: "Metin girin...",
    quick_translate_btn: "Çevir",
    quick_swap_title: "Dilleri değiştir",
    quick_output: "Sonuç",
    quick_output_ph: "Çeviri burada görünecek...",
    quick_empty: "Çevirmek için metin girin.",
    quick_translating: "Çevriliyor...",
    quick_error: "Hata"
  },
  uk: {
    quick_translate: "Швидкий переклад",
    quick_auto: "Автовизначення",
    quick_input: "Текст для перекладу",
    quick_input_ph: "Введіть текст...",
    quick_translate_btn: "Перекласти",
    quick_swap_title: "Поміняти мови місцями",
    quick_output: "Результат",
    quick_output_ph: "Переклад з'явиться тут...",
    quick_empty: "Введіть текст для перекладу.",
    quick_translating: "Перекладаємо...",
    quick_error: "Помилка"
  }
};


function getLocaleStrings(lang) {
  return {
    ...window.AITranslateI18n.getPopupStrings(lang),
    ...(QUICK_POPUP_I18N[lang] || {})
  };
}

function getRuntimeSafe() {
  try {
    if (typeof chrome === "undefined" || !chrome.runtime?.id) return null;
    return chrome.runtime;
  } catch (err) {
    return null;
  }
}

function getStorageAreaSafe(area) {
  try {
    return chrome?.storage?.[area] || null;
  } catch (err) {
    return null;
  }
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
  quickFromSelect.title = strings.quick_from || "From";
  quickFromSelect.setAttribute("aria-label", strings.quick_from || "From");
  quickToSelect.title = strings.quick_to || "To";
  quickToSelect.setAttribute("aria-label", strings.quick_to || "To");
  quickSwapBtn.title = strings.quick_swap_title || "Swap languages";
}

function buildQuickLanguageOptions(lang, sourceValue, targetValue) {
  const strings = getLocaleStrings(lang);
  const autoLabel = strings.quick_auto || "Autodetect";

  quickFromSelect.innerHTML = "";
  const autoOption = document.createElement("option");
  autoOption.value = "auto";
  autoOption.textContent = autoLabel;
  quickFromSelect.appendChild(autoOption);

  quickToSelect.innerHTML = "";

  window.AITranslateI18n.languageCodes.forEach((code) => {
    const name = window.AITranslateI18n.getLanguageDisplayName(code, lang);

    const fromOption = document.createElement("option");
    fromOption.value = code;
    fromOption.textContent = name;
    quickFromSelect.appendChild(fromOption);

    const toOption = document.createElement("option");
    toOption.value = code;
    toOption.textContent = name;
    quickToSelect.appendChild(toOption);
  });

  quickFromSelect.value = sourceValue && Array.from(quickFromSelect.options).some((o) => o.value === sourceValue)
    ? sourceValue
    : "auto";
  quickToSelect.value = targetValue && Array.from(quickToSelect.options).some((o) => o.value === targetValue)
    ? targetValue
    : "en";
}

function saveQuickState() {
  const storageLocal = getStorageAreaSafe("local");
  if (!storageLocal) return;
  storageLocal.set({
    [QUICK_STATE_KEY]: {
      sourceLang: quickFromSelect.value || QUICK_STATE_DEFAULT.sourceLang,
      targetLang: quickToSelect.value || QUICK_STATE_DEFAULT.targetLang,
      inputText: quickInput.value || "",
      outputText: quickOutput.value || ""
    }
  });
}

function restoreQuickState(defaultSource, defaultTarget) {
  const storageLocal = getStorageAreaSafe("local");
  if (!storageLocal) {
    buildQuickLanguageOptions(currentUiLang, defaultSource || "auto", defaultTarget || "en");
    return;
  }
  storageLocal.get({ [QUICK_STATE_KEY]: QUICK_STATE_DEFAULT }, (data) => {
    const state = data[QUICK_STATE_KEY] || QUICK_STATE_DEFAULT;
    const sourceLang = state.sourceLang || defaultSource || QUICK_STATE_DEFAULT.sourceLang;
    const targetLang = state.targetLang || defaultTarget || QUICK_STATE_DEFAULT.targetLang;
    buildQuickLanguageOptions(currentUiLang, sourceLang, targetLang);
    quickInput.value = state.inputText || "";
    quickOutput.value = state.outputText || "";
  });
}

function getSwapFallbackTarget(prevTarget) {
  const fallbacks = prevTarget !== "en" ? ["en", "ru"] : ["ru", "en"];
  for (const code of fallbacks) {
    if (Array.from(quickToSelect.options).some((opt) => opt.value === code)) {
      return code;
    }
  }
  return quickToSelect.options[0]?.value || "en";
}

openOptionsBtn.addEventListener("click", () => {
  const runtime = getRuntimeSafe();
  if (runtime?.openOptionsPage) {
    runtime.openOptionsPage();
  }
});

const storageSync = getStorageAreaSafe("sync");
if (storageSync) {
  storageSync.get({ uiLang: "en", sourceLang: "auto", targetLang: "en" }, (data) => {
    currentUiLang = data.uiLang || "en";
    applyTranslations(currentUiLang);
    restoreQuickState(data.sourceLang || "auto", data.targetLang || "en");
  });
} else {
  applyTranslations(currentUiLang);
  restoreQuickState("auto", "en");
}

function bindLocalTextState(key, textEl, wrapEl) {
  const storageLocal = getStorageAreaSafe("local");
  if (!storageLocal) return;
  storageLocal.get({ [key]: "" }, (data) => {
    const value = data[key] || "";
    textEl.textContent = value;
    wrapEl.style.display = value ? "block" : "none";
  });
}

bindLocalTextState("lastTranslation", lastTranslationText, lastTranslationWrap);
bindLocalTextState("lastError", lastErrorText, lastErrorWrap);

const storage = (() => {
  try {
    return chrome?.storage || null;
  } catch (err) {
    return null;
  }
})();
if (storage?.onChanged?.addListener) {
  storage.onChanged.addListener((changes, areaName) => {
    if (areaName !== "local") return;
    if (changes.lastTranslation) {
      const value = changes.lastTranslation.newValue || "";
      lastTranslationText.textContent = value;
      lastTranslationWrap.style.display = value ? "block" : "none";
    }
    if (changes.lastError) {
      const value = changes.lastError.newValue || "";
      lastErrorText.textContent = value;
      lastErrorWrap.style.display = value ? "block" : "none";
    }
  });
}

copyLastBtn.addEventListener("click", () => {
  const text = lastTranslationText.textContent || "";
  if (!text) return;
  navigator.clipboard.writeText(text).catch(() => {});
});

clearLastBtn.addEventListener("click", () => {
  const storageLocal = getStorageAreaSafe("local");
  if (!storageLocal) return;
  storageLocal.set({ lastTranslation: "" }, () => {
    lastTranslationText.textContent = "";
    lastTranslationWrap.style.display = "none";
  });
});

clearErrorBtn.addEventListener("click", () => {
  const storageLocal = getStorageAreaSafe("local");
  if (!storageLocal) return;
  storageLocal.set({ lastError: "" }, () => {
    lastErrorText.textContent = "";
    lastErrorWrap.style.display = "none";
  });
});

quickTranslateBtn.addEventListener("click", () => {
  const text = (quickInput.value || "").trim();
  if (!text) {
    quickOutput.value = getLocaleStrings(currentUiLang).quick_empty || "Enter text to translate.";
    saveQuickState();
    return;
  }

  quickTranslateBtn.disabled = true;
  quickOutput.value = getLocaleStrings(currentUiLang).quick_translating || "Translating...";
  saveQuickState();

  const runtime = getRuntimeSafe();
  if (!runtime?.sendMessage) {
    quickTranslateBtn.disabled = false;
    quickOutput.value = `${getLocaleStrings(currentUiLang).quick_error || "Error"}: Runtime unavailable`;
    saveQuickState();
    return;
  }
  runtime.sendMessage(
    {
      action: "translateText",
      text,
      sourceLang: quickFromSelect.value,
      targetLang: quickToSelect.value
    },
    (response) => {
      quickTranslateBtn.disabled = false;
      if (chrome.runtime?.lastError) {
        quickOutput.value = `${getLocaleStrings(currentUiLang).quick_error || "Error"}: ${chrome.runtime.lastError.message}`;
        saveQuickState();
        return;
      }
      if (response?.ok && response.text) {
        quickOutput.value = response.text;
        saveQuickState();
        return;
      }
      const err = response?.error || "Unknown error";
      quickOutput.value = `${getLocaleStrings(currentUiLang).quick_error || "Error"}: ${err}`;
      saveQuickState();
    }
  );
});

quickFromSelect.addEventListener("change", saveQuickState);
quickToSelect.addEventListener("change", saveQuickState);
quickInput.addEventListener("input", saveQuickState);

quickSwapBtn.addEventListener("click", () => {
  const prevFrom = quickFromSelect.value || "auto";
  const prevTo = quickToSelect.value || "en";
  quickFromSelect.value = prevTo;
  if (prevFrom !== "auto" && Array.from(quickToSelect.options).some((opt) => opt.value === prevFrom)) {
    quickToSelect.value = prevFrom;
  } else {
    quickToSelect.value = getSwapFallbackTarget(prevTo);
  }
  saveQuickState();
});

