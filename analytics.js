const VERCEL_ANALYTICS_SCRIPT_SRC = "/_vercel/insights/script.js";
const VERCEL_ANALYTICS_SDK_NAME = "@vercel/analytics";
const VERCEL_ANALYTICS_SDK_VERSION = "2.0.1";

window.va =
  window.va ||
  function (...params) {
    (window.vaq = window.vaq || []).push(params);
  };

if (!document.head.querySelector(`script[src*="${VERCEL_ANALYTICS_SCRIPT_SRC}"]`)) {
  const script = document.createElement("script");
  script.defer = true;
  script.src = VERCEL_ANALYTICS_SCRIPT_SRC;
  script.dataset.sdkn = VERCEL_ANALYTICS_SDK_NAME;
  script.dataset.sdkv = VERCEL_ANALYTICS_SDK_VERSION;
  document.head.appendChild(script);
}
