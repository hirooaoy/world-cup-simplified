const REPORT_ENDPOINT = "/api/report-issue";
const LANGUAGE_STORAGE_KEY = "world-cup-simplified-language";

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
const brandHomeLink = document.querySelector(".site-brand");
const brandLabel = document.querySelector(".brand-label");
const reportHeading = document.querySelector("#report-heading");

const reportType = params.get("type") || "other";
const reportDate = params.get("date") || "";
const reportTimeZone = params.get("tz") || "";
const sourceUrl = params.get("from") || document.referrer || "";
const currentLanguage = getCurrentLanguage();
const text = {
  en: {
    addNote: "Add a short note before sending.",
    appHomeLabel: "World Cup Simplified home",
    appName: "World Cup Simplified",
    attachedContext: "Attached context",
    back: "Back",
    date: "Date",
    details: "Details",
    emailPlaceholder: "you@example.com",
    issue: "Issue",
    issueOptions: {
      "no-matches": "No matches found for this date",
      "wrong-match": "Wrong match details",
      "wrong-standings": "Wrong standings",
      other: "Other"
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
    appHomeLabel: "世界杯简明指南首页",
    appName: "世界杯简明指南",
    attachedContext: "已附加的上下文",
    back: "返回",
    date: "日期",
    details: "详情",
    emailPlaceholder: "你的邮箱@example.com",
    issue: "问题",
    issueOptions: {
      "no-matches": "这个日期没有找到比赛",
      "wrong-match": "比赛信息有误",
      "wrong-standings": "积分榜有误",
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
const dateLabel = getDateLabel(reportDate);
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
  : "other";
renderStaticText();
renderAttachedContext();

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
  brandHomeLink?.setAttribute("aria-label", t.appHomeLabel);
  if (brandLabel) {
    brandLabel.textContent = t.appName;
  }
  if (backLink) {
    backLink.textContent = t.back;
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
  if (!payload.details) {
    setStatus(t.addNote, "error");
    issueDetails.focus();
    return;
  }

  submitButton.disabled = true;
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
    issueType.value = payload.type;
    setStatus(t.reportSent, "success");
  } catch {
    setStatus(t.reportFailed, "error");
  } finally {
    submitButton.disabled = false;
  }
});
