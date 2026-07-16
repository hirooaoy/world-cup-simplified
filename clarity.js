const CLARITY_PROJECT_ID = "xlylz8xtsx";
const CLARITY_SCRIPT_SRC = `https://www.clarity.ms/tag/${CLARITY_PROJECT_ID}`;
const CLARITY_PRODUCTION_HOST = "world-cup-simplified.vercel.app";
const shouldLoadClarity = window.location.hostname === CLARITY_PRODUCTION_HOST;

window.clarity =
  window.clarity ||
  function (...params) {
    (window.clarity.q = window.clarity.q || []).push(params);
  };

if (shouldLoadClarity && !document.head.querySelector(`script[src="${CLARITY_SCRIPT_SRC}"]`)) {
  const script = document.createElement("script");
  script.async = true;
  script.src = CLARITY_SCRIPT_SRC;
  document.head.appendChild(script);
}
