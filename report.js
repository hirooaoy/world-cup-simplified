const REPORT_ENDPOINT = "/api/report-issue";

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

const reportType = params.get("type") || "other";
const reportDate = params.get("date") || "";
const reportTimeZone = params.get("tz") || "";
const sourceUrl = params.get("from") || document.referrer || "";
const dateLabel = getDateLabel(reportDate);

issueType.value = [...issueType.options].some((option) => option.value === reportType)
  ? reportType
  : "other";
renderAttachedContext();

if (reportDate) {
  const backParams = new URLSearchParams({
    view: "matches",
    date: reportDate
  });

  if (reportTimeZone) {
    backParams.set("tz", reportTimeZone);
  }

  backLink.href = `./?${backParams.toString()}`;
}

function getDateLabel(dayKey) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dayKey)) {
    return "";
  }

  const [year, month, day] = dayKey.split("-").map(Number);
  return new Intl.DateTimeFormat(undefined, {
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

function renderAttachedContext() {
  const contextItems = [];

  if (dateLabel) {
    contextItems.push(`Date: ${dateLabel}`);
  }

  if (reportTimeZone) {
    contextItems.push(`Timezone: ${reportTimeZone.replace(/_/g, " ")}`);
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
    setStatus("Add a short note before sending.", "error");
    issueDetails.focus();
    return;
  }

  submitButton.disabled = true;
  setStatus("Sending...");

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
    setStatus("Report sent. Thank you.", "success");
  } catch {
    setStatus("Report could not be sent yet. Please try again later.", "error");
  } finally {
    submitButton.disabled = false;
  }
});
