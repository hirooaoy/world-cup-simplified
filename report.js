const REPORT_ENDPOINT = "/api/report-issue";
const LANGUAGE_STORAGE_KEY = "world-cup-simplified-language";
const TIMEZONE_STORAGE_KEY = "world-cup-simplified-timezone";
const FOOTER_FIXTURES_URL = "data/fixtures.json";
const FOOTER_RELEASE_NOTES_URL = "data/release-notes.json";
const LEGACY_REPORT_TYPE_ALIASES = {
  "no-matches": "match-score-schedule",
  "wrong-match": "match-score-schedule",
  "wrong-standings": "prediction-standings"
};

const params = new URLSearchParams(window.location.search);
const reportForm = document.querySelector("#report-form");
const issueType = document.querySelector("#issue-type");
const issueDetails = document.querySelector("#issue-details");
const reporterEmail = document.querySelector("#reporter-email");
const website = document.querySelector("#website");
const reportSummary = document.querySelector("#report-summary");
const formStatus = document.querySelector("#form-status");
const submitButton = reportForm.querySelector("button[type='submit']");
const backLink = document.querySelector("#back-link");
const backLinkLabel = document.querySelector("#back-link-label");
const reportHeading = document.querySelector("#report-heading");
const sourceNote = document.querySelector("#source-note");

const requestedReportType = params.get("type") || "";
const reportType = LEGACY_REPORT_TYPE_ALIASES[requestedReportType] || requestedReportType;
const reportDetails = params.get("details") || "";
const reportDate = params.get("date") || "";
const reportTimeZone = params.get("tz") || "";
const sourceUrl = params.get("from") || document.referrer || "";
const currentLanguage = getCurrentLanguage();
const text = {
  en: {
    addNote: "Add a short note before sending.",
    attachedContext: "Attached context",
    back: "Back",
    completeRequired: "Choose an issue and add details before sending.",
    date: "Date",
    details: "Details",
    emailPlaceholder: "you@example.com",
    issue: "Issue",
    issueOptions: {
      "": "Select an issue",
      "match-score-schedule": "Match, score, or schedule",
      "lineup-player": "Line-up or player information",
      "prediction-standings": "Prediction or standings",
      other: "Others"
    },
    metaDescription: "Report a schedule or data issue for World Cup Simplified.",
    optional: "optional",
    reportFailed: "Report could not be sent yet. Please try again later.",
    reportHeading: "Report issue",
    reportSent: "Report sent. Thank you.",
    replyEmail: "Reply email",
    sending: "Sending...",
    sendReport: "Send report",
    timezone: "Timezone",
    title: "Report Issue | World Cup Simplified",
    website: "Website",
    whatChanged: "What should be changed?"
  },
  zh: {
    addNote: "发送前请先写一小段说明。",
    attachedContext: "已附加的上下文",
    back: "返回",
    completeRequired: "请选择问题并填写详情后再发送。",
    date: "日期",
    details: "详情",
    emailPlaceholder: "你的邮箱@example.com",
    issue: "问题",
    issueOptions: {
      "": "请选择问题",
      "match-score-schedule": "比赛、比分或赛程",
      "lineup-player": "阵容或球员信息",
      "prediction-standings": "预测或积分榜",
      other: "其他"
    },
    metaDescription: "向世界杯简明指南报告赛程或数据问题。",
    optional: "可选",
    reportFailed: "报告暂时无法发送，请稍后再试。",
    reportHeading: "报告问题",
    reportSent: "报告已发送。谢谢。",
    replyEmail: "回复邮箱",
    sending: "正在发送...",
    sendReport: "发送报告",
    timezone: "时区",
    title: "报告问题 | 世界杯简明指南",
    website: "网站",
    whatChanged: "需要修改什么？"
  }
};
const t = text[currentLanguage] || text.en;
const footerText = {
  en: {
    dataRefreshed: "Data refreshed",
    fallbackRelease: "Release notes explain the latest app changes.",
    latestChanges: "Latest changes",
    madeBy: "Made by",
    predictions: "Predictions are unofficial.",
    releaseNotes: "See release notes",
    reportIssue: "Report issue",
    seeSources: "See sources",
    sourceLabels: ["FIFA schedule", "debutants", "ranking", "standings"],
    sources: "Sources"
  },
  zh: {
    dataRefreshed: "数据刷新于",
    fallbackRelease: "发布说明介绍应用的最新改动。",
    latestChanges: "最新更新",
    madeBy: "由",
    predictions: "预测为非官方内容。",
    releaseNotes: "查看发布说明",
    reportIssue: "报告问题",
    seeSources: "查看来源",
    sourceLabels: ["FIFA赛程", "首次参赛球队", "排名", "积分榜"],
    sources: "来源"
  }
};
const ft = footerText[currentLanguage] || footerText.en;
const dateLabel = getDateLabel(reportDate);
let footerUpdatedAt = "2026-07-15T04:45:47.457Z";
let footerReleaseNotes = { releases: [] };
const zhTimeZoneNames = {
  "America/Los_Angeles": "洛杉矶",
  "America/Vancouver": "温哥华",
  "America/Denver": "丹佛",
  "America/Chicago": "芝加哥",
  "America/Mexico_City": "墨西哥城",
  "America/New_York": "纽约",
  "America/Toronto": "多伦多",
  "America/Sao_Paulo": "圣保罗",
  "Europe/London": "伦敦",
  "Europe/Paris": "巴黎",
  "Europe/Madrid": "马德里",
  "Europe/Berlin": "柏林",
  "Africa/Casablanca": "卡萨布兰卡",
  "Africa/Lagos": "拉各斯",
  "Africa/Johannesburg": "约翰内斯堡",
  "Asia/Dubai": "迪拜",
  "Asia/Kolkata": "加尔各答",
  "Asia/Bangkok": "曼谷",
  "Asia/Shanghai": "上海",
  "Asia/Tokyo": "东京",
  "Australia/Sydney": "悉尼"
};

issueType.value = [...issueType.options].some((option) => option.value === reportType)
  ? reportType
  : "";
renderStaticText();
renderAttachedContext();
renderReportFooter();
void loadReportFooterData();
if (reportDetails) {
  issueDetails.value = reportDetails;
}
updateSubmitState();

if (reportDate) {
  const backParams = new URLSearchParams({
    view: "matches",
    date: reportDate
  });

  if (reportTimeZone) {
    backParams.set("tz", reportTimeZone);
  }

  if (currentLanguage !== "en") {
    backParams.set("lang", currentLanguage);
  }

  backLink.href = `./?${backParams.toString()}`;
}

function getCurrentLanguage() {
  const requestedLanguage = String(params.get("lang") || "").trim().toLowerCase();
  const storedLanguage = String(localStorage.getItem(LANGUAGE_STORAGE_KEY) || "")
    .trim()
    .toLowerCase();
  const language = requestedLanguage || storedLanguage;

  if (language.startsWith("zh")) {
    localStorage.setItem(LANGUAGE_STORAGE_KEY, "zh");
    return "zh";
  }

  return "en";
}

function renderStaticText() {
  document.documentElement.lang = currentLanguage === "zh" ? "zh-Hans" : "en";
  document.title = t.title;
  document
    .querySelector("meta[name='description']")
    ?.setAttribute("content", t.metaDescription);
  if (backLinkLabel) {
    backLinkLabel.textContent = t.back;
  }
  if (reportHeading) {
    reportHeading.textContent = t.reportHeading;
  }
  reportForm.querySelector("[data-report-label='issue']").textContent = t.issue;
  reportForm.querySelector("[data-report-label='details']").textContent = t.details;
  reportForm.querySelector("[data-report-label='email']").firstChild.textContent = `${t.replyEmail} `;
  reportForm.querySelector("[data-report-label='email'] em").textContent = t.optional;
  reportForm.querySelector("[data-report-label='website']").textContent = t.website;
  issueDetails.placeholder = t.whatChanged;
  reporterEmail.placeholder = t.emailPlaceholder;
  reportSummary.setAttribute("aria-label", t.attachedContext);
  submitButton.textContent = t.sendReport;

  [...issueType.options].forEach((option) => {
    option.textContent = t.issueOptions[option.value] || option.textContent;
  });
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function getFooterTimeZone() {
  const storedTimeZone = String(localStorage.getItem(TIMEZONE_STORAGE_KEY) || "").trim();
  return reportTimeZone || storedTimeZone || Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
}

function formatFooterUpdatedAt(value) {
  const timestamp = Date.parse(value || "");
  if (Number.isNaN(timestamp)) {
    return "";
  }

  try {
    return new Intl.DateTimeFormat(currentLanguage === "zh" ? "zh-CN" : "en-US", {
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
      month: "short",
      timeZone: getFooterTimeZone(),
      timeZoneName: "short",
      year: "numeric"
    }).format(new Date(timestamp));
  } catch {
    return new Intl.DateTimeFormat(currentLanguage === "zh" ? "zh-CN" : "en-US", {
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
      month: "short",
      timeZoneName: "short",
      year: "numeric"
    }).format(new Date(timestamp));
  }
}

function getFooterReleaseContent() {
  const latestRelease = Array.isArray(footerReleaseNotes?.releases)
    ? footerReleaseNotes.releases[0]
    : null;
  const localizedHighlights = currentLanguage === "zh" ? latestRelease?.highlightsZh : latestRelease?.highlights;
  const highlights = Array.isArray(localizedHighlights)
    ? localizedHighlights.map((item) => String(item || "").trim()).filter(Boolean).slice(0, 3)
    : [];
  const title = currentLanguage === "zh"
    ? String(latestRelease?.titleZh || latestRelease?.title || ft.latestChanges).trim()
    : String(latestRelease?.title || ft.latestChanges).trim();

  return {
    title: title || ft.latestChanges,
    highlights: highlights.length ? highlights : [ft.fallbackRelease]
  };
}

function renderReportFooter() {
  if (!sourceNote) {
    return;
  }

  const sentenceEnd = currentLanguage === "zh" ? "。" : ".";
  const sourceLinks = [
    "https://www.fifa.com/en/tournaments/mens/worldcup/canadamexicousa2026/articles/match-schedule-fixtures-results-teams-stadiums",
    "https://www.fifa.com/en/tournaments/mens/worldcup/canadamexicousa2026/articles/debutants-cabo-verde-curacao-jordan-uzbekistan",
    "https://inside.fifa.com/fifa-world-ranking/men",
    "https://www.fifa.com/en/tournaments/mens/worldcup/canadamexicousa2026/standings"
  ].map((url, index) =>
    `<a href="${url}" target="_blank" rel="noreferrer">${escapeHtml(ft.sourceLabels[index])}</a>`
  );
  const updatedAtText = formatFooterUpdatedAt(footerUpdatedAt);
  const dataRefreshed = updatedAtText
    ? `${escapeHtml(ft.dataRefreshed)} ${escapeHtml(updatedAtText)}${sentenceEnd}`
    : "";
  const reportUrl = currentLanguage === "zh" ? "report.html?lang=zh" : "report.html";
  const creatorLink = `<a href="https://www.linkedin.com/in/hirooaoy" target="_blank" rel="noreferrer">H</a>`;
  const creatorText = currentLanguage === "zh"
    ? `${escapeHtml(ft.madeBy)} ${creatorLink} 制作`
    : `${escapeHtml(ft.madeBy)} ${creatorLink}`;
  const releaseContent = getFooterReleaseContent();
  const sourceTooltip = `
    <span class="source-tooltip-wrapper">
      <button class="source-tooltip-trigger" type="button" aria-describedby="source-tooltip">${escapeHtml(ft.seeSources)}</button>${sentenceEnd}
      <span class="source-tooltip" id="source-tooltip" role="tooltip">
        <strong>${escapeHtml(ft.sources)}</strong>
        <span>${sourceLinks.join(" ")}</span>
      </span>
    </span>
  `.trim();
  const releaseTooltip = `
    <span class="release-tooltip-wrapper">
      <button class="release-tooltip-trigger" type="button" aria-describedby="release-tooltip">${escapeHtml(ft.releaseNotes)}</button>${sentenceEnd}
      <span class="release-tooltip" id="release-tooltip" role="tooltip">
        <strong>${escapeHtml(releaseContent.title)}</strong>
        <ul>${releaseContent.highlights.map((item) => `<li>${escapeHtml(item)}</li>`).join("")}</ul>
      </span>
    </span>
  `.trim();

  sourceNote.innerHTML = `${sourceTooltip} ${escapeHtml(ft.predictions)}${dataRefreshed ? ` ${dataRefreshed}` : ""} <a href="${reportUrl}">${escapeHtml(ft.reportIssue)}</a>${sentenceEnd} ${creatorText}${sentenceEnd} ${releaseTooltip}`;
}

async function fetchFooterJson(url) {
  const response = await fetch(url, { cache: "no-store" });
  if (!response.ok) {
    throw new Error(`Unable to load ${url}`);
  }
  return response.json();
}

async function loadReportFooterData() {
  const [fixturesResult, releaseNotesResult] = await Promise.allSettled([
    fetchFooterJson(FOOTER_FIXTURES_URL),
    fetchFooterJson(FOOTER_RELEASE_NOTES_URL)
  ]);

  if (fixturesResult.status === "fulfilled" && fixturesResult.value?.updatedAt) {
    footerUpdatedAt = fixturesResult.value.updatedAt;
  }
  if (releaseNotesResult.status === "fulfilled") {
    footerReleaseNotes = releaseNotesResult.value;
  }

  renderReportFooter();
}

function getDateLabel(dayKey) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dayKey)) {
    return "";
  }

  const [year, month, day] = dayKey.split("-").map(Number);
  return new Intl.DateTimeFormat(currentLanguage === "zh" ? "zh-CN" : undefined, {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC"
  }).format(new Date(Date.UTC(year, month - 1, day, 12)));
}

function setStatus(message, state = "") {
  formStatus.textContent = message;
  formStatus.dataset.state = state;
}

function setSubmitLoading(isLoading) {
  submitButton.classList.toggle("is-loading", isLoading);
  submitButton.disabled = isLoading || !isReportReady();
  submitButton.textContent = isLoading ? t.sending : t.sendReport;

  if (isLoading) {
    submitButton.setAttribute("aria-busy", "true");
  } else {
    submitButton.removeAttribute("aria-busy");
  }
}

function isReportReady() {
  return Boolean(issueType.value && issueDetails.value.trim());
}

function updateSubmitState() {
  if (!submitButton.classList.contains("is-loading")) {
    submitButton.disabled = !isReportReady();
  }
}

function formatTimeZoneLabel(timeZone) {
  if (currentLanguage === "zh") {
    return zhTimeZoneNames[timeZone] || timeZone.replace(/_/g, " ");
  }

  return timeZone.replace(/_/g, " ");
}

function renderAttachedContext() {
  const contextItems = [];
  const separator = currentLanguage === "zh" ? "：" : ": ";

  if (dateLabel) {
    contextItems.push(`${t.date}${separator}${dateLabel}`);
  }

  if (reportTimeZone) {
    contextItems.push(`${t.timezone}${separator}${formatTimeZoneLabel(reportTimeZone)}`);
  }

  reportSummary.replaceChildren(
    ...contextItems.map((item) => {
      const pill = document.createElement("span");
      pill.textContent = item;
      return pill;
    })
  );
  reportSummary.hidden = contextItems.length === 0;
}

function getPayload() {
  return {
    type: issueType.value,
    details: issueDetails.value.trim(),
    reporterEmail: reporterEmail.value.trim(),
    website: website.value.trim(),
    date: reportDate,
    dateLabel,
    timeZone: reportTimeZone,
    sourceUrl,
    reportPageUrl: window.location.href,
    userAgent: navigator.userAgent,
    createdAt: new Date().toISOString()
  };
}

reportForm.addEventListener("submit", async (event) => {
  event.preventDefault();

  const payload = getPayload();
  if (!payload.type || !payload.details) {
    setStatus(payload.type ? t.addNote : t.completeRequired, "error");
    (payload.type ? issueDetails : issueType).focus();
    return;
  }

  setSubmitLoading(true);
  setStatus(t.sending);

  try {
    const response = await fetch(REPORT_ENDPOINT, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      throw new Error("Report endpoint unavailable");
    }

    reportForm.reset();
    setStatus(t.reportSent, "success");
  } catch {
    setStatus(t.reportFailed, "error");
  } finally {
    setSubmitLoading(false);
  }
});

issueType.addEventListener("change", updateSubmitState);
issueDetails.addEventListener("input", updateSubmitState);
