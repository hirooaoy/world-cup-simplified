const CLARITY_PROJECT_ID = "xlylz8xtsx";
const CLARITY_SCRIPT_SRC = `https://www.clarity.ms/tag/${CLARITY_PROJECT_ID}`;

window.clarity =
  window.clarity ||
  function (...params) {
    (window.clarity.q = window.clarity.q || []).push(params);
  };

if (!document.head.querySelector(`script[src="${CLARITY_SCRIPT_SRC}"]`)) {
  const script = document.createElement("script");
  script.async = true;
  script.src = CLARITY_SCRIPT_SRC;
  document.head.appendChild(script);
}
