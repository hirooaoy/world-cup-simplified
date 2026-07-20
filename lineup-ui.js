function joinClassNames(...values) {
  return values
    .flatMap((value) => String(value || "").split(/\s+/))
    .map((value) => value.trim())
    .filter(Boolean)
    .join(" ");
}

export function formatLineupShortName(name) {
  const parts = String(name || "").trim().split(/\s+/).filter(Boolean);
  if (parts.length <= 1) {
    return parts[0] || "";
  }

  const first = parts[0].charAt(0);
  const lastParts = [parts.at(-1)];
  const particles = new Set(["al", "da", "de", "del", "der", "di", "el", "van", "von"]);
  for (let index = parts.length - 2; index > 0; index -= 1) {
    const part = parts[index];
    if (!particles.has(part.toLowerCase())) {
      break;
    }
    lastParts.unshift(part);
  }

  return `${first}. ${lastParts.join(" ")}`;
}

export function formatLineupNumberLabel(number, isCaptain = false) {
  const text = String(number || "").trim();
  if (!text) {
    return "";
  }
  return isCaptain && !/\(C\)$/i.test(text) ? `${text}(C)` : text;
}

export function renderLineupControlBand({
  tabsMarkup = "",
  actionsMarkup = "",
  bandClass = "",
  tabsClass = "",
  actionsClass = "",
  tabsAttributes = ""
} = {}) {
  return `
    <div class="${joinClassNames("lineup-team-band", bandClass)}">
      <div class="${joinClassNames("lineup-tabs", "lineup-card-tabs", tabsClass)}" ${tabsAttributes}>
        ${tabsMarkup}
      </div>
      <div class="${joinClassNames("lineup-team-actions", actionsClass)}">
        ${actionsMarkup}
      </div>
    </div>
  `;
}

export function renderLineupBenchPanel({
  id = "",
  panelClass = "",
  panelAttributes = "",
  listId = "",
  listClass = "",
  itemsMarkup = ""
} = {}) {
  return `
    <div
      class="${joinClassNames("lineup-bench-panel", panelClass)}"
      ${id ? `id="${id}"` : ""}
      ${panelAttributes}
      aria-hidden="true"
    >
      <div class="lineup-bench-panel-inner">
        <ul class="${joinClassNames("lineup-bench-list", listClass)}"${listId ? ` id="${listId}"` : ""}>
          ${itemsMarkup}
        </ul>
      </div>
    </div>
  `;
}

export function renderLineupPitchLines() {
  return `
    <span class="lineup-pitch-line is-mid" aria-hidden="true"></span>
    <span class="lineup-pitch-line is-circle" aria-hidden="true"></span>
    <span class="lineup-pitch-line is-spot" aria-hidden="true"></span>
    <span class="lineup-pitch-line is-box is-top" aria-hidden="true"></span>
    <span class="lineup-pitch-line is-six is-top" aria-hidden="true"></span>
    <span class="lineup-pitch-line is-box is-bottom" aria-hidden="true"></span>
    <span class="lineup-pitch-line is-six is-bottom" aria-hidden="true"></span>
  `;
}

export function renderLineupPitchCard({
  cardClass = "",
  bandMarkup = "",
  benchMarkup = "",
  pitchClass = "",
  pitchAttributes = "",
  surfaceClass = "",
  surfaceAttributes = "",
  markerMarkup = ""
} = {}) {
  return `
    <div class="${joinClassNames("lineup-pitch-card", cardClass)}">
      ${bandMarkup}
      ${benchMarkup}
      <div class="${joinClassNames("lineup-pitch", pitchClass)}" ${pitchAttributes}>
        <div class="${joinClassNames("lineup-pitch-surface", surfaceClass)}" ${surfaceAttributes}>
          ${renderLineupPitchLines()}
          ${markerMarkup}
        </div>
      </div>
    </div>
  `;
}

export function renderLineupAvatarFrame({
  avatarMarkup = "",
  numberMarkup = "",
  leftEventsMarkup = "",
  rightEventsMarkup = ""
} = {}) {
  return `
    <span class="lineup-avatar-frame">
      <span class="lineup-avatar-wrap" aria-hidden="true">
        ${avatarMarkup}
        ${numberMarkup}
      </span>
      ${leftEventsMarkup}
      ${rightEventsMarkup}
    </span>
  `;
}

export function renderLineupPlayerMarkerShell({
  className = "",
  style = "",
  attributes = "",
  content = ""
} = {}) {
  return `
    <span
      class="${joinClassNames("lineup-player-marker", className)}"
      ${style ? `style="${style}"` : ""}
      ${attributes}
    >
      ${content}
    </span>
  `;
}

export function updateLineupTabIndicators(root = document) {
  const shells = root?.matches?.(".lineup-tabs")
    ? [root]
    : Array.from(root?.querySelectorAll?.(".lineup-tabs") || []);

  shells.forEach((shell) => {
    const activeTab = shell.querySelector(".lineup-tab.is-active");
    if (!activeTab) {
      shell.style.removeProperty("--active-tab-left");
      shell.style.removeProperty("--active-tab-width");
      return;
    }
    const shellRect = shell.getBoundingClientRect();
    const tabRect = activeTab.getBoundingClientRect();
    shell.style.setProperty("--active-tab-left", `${tabRect.left - shellRect.left}px`);
    shell.style.setProperty("--active-tab-width", `${tabRect.width}px`);
  });
}
