(function initializeWorldCupTheme() {
  "use strict";

  const STORAGE_KEY = "world-cup-simplified-theme";
  const THEME_COLORS = {
    light: "#ffffff",
    dark: "#0b0d10"
  };
  const systemThemeQuery = window.matchMedia("(prefers-color-scheme: dark)");
  const subscribers = new Set();

  function normalizeTheme(value) {
    return value === "light" || value === "dark" ? value : null;
  }

  function readStoredPreference() {
    try {
      return normalizeTheme(window.localStorage.getItem(STORAGE_KEY));
    } catch (error) {
      console.warn("Unable to read the saved color theme", error);
      return null;
    }
  }

  function getSystemTheme() {
    return systemThemeQuery.matches ? "dark" : "light";
  }

  let preference = readStoredPreference();
  let activeTheme = preference || getSystemTheme();

  function updateThemeColor(theme) {
    const themeColor = document.querySelector('meta[name="theme-color"]');
    if (themeColor) {
      themeColor.setAttribute("content", THEME_COLORS[theme]);
    }
  }

  function publishThemeChange(source) {
    const detail = {
      theme: activeTheme,
      preference,
      source
    };

    subscribers.forEach((subscriber) => {
      try {
        subscriber(detail);
      } catch (error) {
        console.error("Unable to notify a color theme subscriber", error);
      }
    });

    window.dispatchEvent(new CustomEvent("worldcupthemechange", { detail }));
  }

  function applyTheme(theme, options) {
    const nextTheme = normalizeTheme(theme) || getSystemTheme();
    const didChange = nextTheme !== activeTheme;
    activeTheme = nextTheme;

    document.documentElement.dataset.theme = activeTheme;
    document.documentElement.style.colorScheme = activeTheme;
    updateThemeColor(activeTheme);

    if (options && options.notify && (didChange || options.forceNotify)) {
      publishThemeChange(options.source || "unknown");
    }

    return activeTheme;
  }

  function setTheme(theme) {
    const nextPreference = normalizeTheme(theme);
    if (!nextPreference) {
      throw new TypeError('Theme must be either "light" or "dark".');
    }

    const didPreferenceChange = preference !== nextPreference;
    preference = nextPreference;
    try {
      window.localStorage.setItem(STORAGE_KEY, preference);
    } catch (error) {
      console.warn("Unable to save the color theme", error);
    }

    return applyTheme(preference, {
      notify: true,
      forceNotify: didPreferenceChange,
      source: "user"
    });
  }

  function clearPreference() {
    const hadPreference = preference !== null;
    preference = null;
    try {
      window.localStorage.removeItem(STORAGE_KEY);
    } catch (error) {
      console.warn("Unable to clear the saved color theme", error);
    }

    return applyTheme(getSystemTheme(), {
      notify: true,
      forceNotify: hadPreference,
      source: "system"
    });
  }

  function subscribe(subscriber) {
    if (typeof subscriber !== "function") {
      throw new TypeError("Theme subscriber must be a function.");
    }

    subscribers.add(subscriber);
    return function unsubscribe() {
      subscribers.delete(subscriber);
    };
  }

  function handleSystemThemeChange() {
    if (preference === null) {
      applyTheme(getSystemTheme(), { notify: true, source: "system" });
    }
  }

  function handleStoredThemeChange(event) {
    if (event.key !== STORAGE_KEY || (event.storageArea && event.storageArea !== window.localStorage)) {
      return;
    }

    const nextPreference = normalizeTheme(event.newValue);
    const didPreferenceChange = preference !== nextPreference;
    preference = nextPreference;
    applyTheme(preference || getSystemTheme(), {
      notify: true,
      forceNotify: didPreferenceChange,
      source: "storage"
    });
  }

  applyTheme(activeTheme);

  window.worldCupTheme = Object.freeze({
    storageKey: STORAGE_KEY,
    getTheme: function getTheme() {
      return activeTheme;
    },
    getPreference: function getPreference() {
      return preference;
    },
    setTheme,
    clearPreference,
    subscribe
  });

  if (typeof systemThemeQuery.addEventListener === "function") {
    systemThemeQuery.addEventListener("change", handleSystemThemeChange);
  } else if (typeof systemThemeQuery.addListener === "function") {
    systemThemeQuery.addListener(handleSystemThemeChange);
  }
  window.addEventListener("storage", handleStoredThemeChange);

  window.requestAnimationFrame(() => {
    window.requestAnimationFrame(() => {
      document.documentElement.dataset.themeReady = "true";
    });
  });
})();
