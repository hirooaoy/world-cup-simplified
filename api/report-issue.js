const MAX_DETAILS_LENGTH = 4000;
const MAX_TEXT_FIELD_LENGTH = 2000;
const MAX_REPORTER_EMAIL_LENGTH = 254;
const MAX_USER_AGENT_LENGTH = 500;
const MAX_BODY_BYTES = positiveNumber(process.env.REPORT_MAX_BODY_BYTES, 16 * 1024);
const RATE_LIMIT_WINDOW_MS = positiveNumber(
  process.env.REPORT_RATE_LIMIT_WINDOW_MS,
  10 * 60 * 1000
);
const RATE_LIMIT_MAX = positiveNumber(process.env.REPORT_RATE_LIMIT_MAX, 5);
const RESEND_TIMEOUT_MS = positiveNumber(process.env.RESEND_TIMEOUT_MS, 8000);

const rateLimitBuckets = new Map();

export default async function handler(request, response) {
  setApiHeaders(response);

  if (request.method !== "POST") {
    response.setHeader("Allow", "POST");
    sendJson(response, 405, { error: "Method not allowed" });
    return;
  }

  if (!isAllowedOrigin(request)) {
    sendJson(response, 403, { error: "Request origin is not allowed" });
    return;
  }

  if (!isJsonRequest(request)) {
    sendJson(response, 415, { error: "Content-Type must be application/json" });
    return;
  }

  if (isBodyTooLarge(request)) {
    sendJson(response, 413, { error: "Request body is too large" });
    return;
  }

  let payload;
  try {
    payload = await readJsonBody(request);
  } catch (error) {
    const statusCode = error.statusCode || 400;
    sendJson(response, statusCode, {
      error: statusCode === 413 ? "Request body is too large" : "Invalid JSON"
    });
    return;
  }

  if (isHoneypotFilled(payload)) {
    sendJson(response, 200, { ok: true });
    return;
  }

  const clientIp = getClientIp(request);
  if (isRateLimited(clientIp)) {
    response.setHeader("Retry-After", String(Math.ceil(RATE_LIMIT_WINDOW_MS / 1000)));
    sendJson(response, 429, { error: "Too many reports. Please try again later." });
    return;
  }

  const details = limitedString(payload.details, MAX_DETAILS_LENGTH).trim();
  if (!details) {
    sendJson(response, 400, { error: "Details are required" });
    return;
  }

  const reporterEmail = limitedString(
    payload.reporterEmail,
    MAX_REPORTER_EMAIL_LENGTH
  ).trim();
  if (reporterEmail && !isValidEmail(reporterEmail)) {
    sendJson(response, 400, { error: "Reporter email is invalid" });
    return;
  }

  const resendApiKey = process.env.RESEND_API_KEY;
  const reportToEmail = process.env.REPORT_TO_EMAIL;
  const reportFromEmail = process.env.REPORT_FROM_EMAIL;

  if (!resendApiKey || !reportToEmail || !reportFromEmail) {
    sendJson(response, 503, { error: "Report email is not configured" });
    return;
  }

  const report = normalizeReport({ ...payload, details, reporterEmail });
  let emailResponse;

  try {
    emailResponse = await sendReportEmail({
      apiKey: resendApiKey,
      from: reportFromEmail,
      report,
      to: reportToEmail
    });
  } catch {
    sendJson(response, 502, { error: "Unable to send report" });
    return;
  }

  if (!emailResponse.ok) {
    sendJson(response, 502, { error: "Unable to send report" });
    return;
  }

  sendJson(response, 200, { ok: true });
}

async function sendReportEmail({ apiKey, from, report, to }) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), RESEND_TIMEOUT_MS);

  try {
    return await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
        "User-Agent": "world-cup-simplified/0.2"
      },
      body: JSON.stringify({
        from,
        to: [to],
        subject: `World Cup Simplified report: ${report.typeLabel}`,
        text: renderPlainTextEmail(report),
        html: renderHtmlEmail(report)
      }),
      signal: controller.signal
    });
  } finally {
    clearTimeout(timeout);
  }
}

async function readJsonBody(request) {
  if (
    request.body &&
    typeof request.body === "object" &&
    !Buffer.isBuffer(request.body) &&
    typeof request.body.pipe !== "function" &&
    typeof request.body.getReader !== "function"
  ) {
    return request.body;
  }

  if (Buffer.isBuffer(request.body)) {
    if (request.body.byteLength > MAX_BODY_BYTES) {
      throw httpError(413, "Request body is too large");
    }
    const text = request.body.toString("utf8");
    return text ? JSON.parse(text) : {};
  }

  if (typeof request.body === "string") {
    if (Buffer.byteLength(request.body, "utf8") > MAX_BODY_BYTES) {
      throw httpError(413, "Request body is too large");
    }
    return request.body ? JSON.parse(request.body) : {};
  }

  const chunks = [];
  let totalBytes = 0;

  for await (const chunk of request) {
    const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
    totalBytes += buffer.byteLength;

    if (totalBytes > MAX_BODY_BYTES) {
      throw httpError(413, "Request body is too large");
    }

    chunks.push(buffer);
  }

  const text = Buffer.concat(chunks).toString("utf8");
  return text ? JSON.parse(text) : {};
}

function normalizeReport(payload) {
  const typeLabels = {
    "no-matches": "No matches found",
    "wrong-match": "Wrong match details",
    "wrong-standings": "Wrong standings",
    other: "Other"
  };
  const requestedType = limitedString(payload.type, 40);
  const type = Object.hasOwn(typeLabels, requestedType) ? requestedType : "other";
  const date = isDayKey(payload.date) ? payload.date : "";

  return {
    type,
    typeLabel: typeLabels[type],
    details: limitedString(payload.details, MAX_DETAILS_LENGTH),
    reporterEmail: limitedString(payload.reporterEmail, MAX_REPORTER_EMAIL_LENGTH).trim(),
    date,
    dateLabel: limitedString(payload.dateLabel, 120),
    timeZone: limitedString(payload.timeZone, 80),
    sourceUrl: limitedString(payload.sourceUrl, MAX_TEXT_FIELD_LENGTH),
    reportPageUrl: limitedString(payload.reportPageUrl, MAX_TEXT_FIELD_LENGTH),
    userAgent: limitedString(payload.userAgent, MAX_USER_AGENT_LENGTH),
    createdAt: new Date().toISOString()
  };
}

function renderPlainTextEmail(report) {
  return [
    `Issue: ${report.typeLabel}`,
    `Date: ${report.dateLabel || report.date || "Not provided"}`,
    `Timezone: ${report.timeZone || "Not provided"}`,
    `Reporter email: ${report.reporterEmail || "Not provided"}`,
    "",
    "Details:",
    report.details,
    "",
    `Source URL: ${report.sourceUrl || "Not provided"}`,
    `Report page: ${report.reportPageUrl || "Not provided"}`,
    `Created at: ${report.createdAt}`,
    `User agent: ${report.userAgent || "Not provided"}`
  ].join("\n");
}

function renderHtmlEmail(report) {
  const rows = [
    ["Issue", report.typeLabel],
    ["Date", report.dateLabel || report.date || "Not provided"],
    ["Timezone", report.timeZone || "Not provided"],
    ["Reporter email", report.reporterEmail || "Not provided"],
    ["Source URL", linkOrText(report.sourceUrl)],
    ["Report page", linkOrText(report.reportPageUrl)],
    ["Created at", report.createdAt],
    ["User agent", report.userAgent || "Not provided"]
  ];

  return `
    <div style="font-family: Arial, sans-serif; color: #111; line-height: 1.5;">
      <h1 style="font-size: 20px;">World Cup Simplified report</h1>
      <table style="border-collapse: collapse; margin-bottom: 20px;">
        ${rows
          .map(
            ([label, value]) => `
              <tr>
                <th style="padding: 6px 12px 6px 0; text-align: left; vertical-align: top;">${escapeHtml(label)}</th>
                <td style="padding: 6px 0; vertical-align: top;">${value}</td>
              </tr>
            `
          )
          .join("")}
      </table>
      <h2 style="font-size: 16px;">Details</h2>
      <p style="white-space: pre-wrap;">${escapeHtml(report.details)}</p>
    </div>
  `;
}

function linkOrText(value) {
  if (!value) {
    return "Not provided";
  }

  const escaped = escapeHtml(value);
  if (!isSafeWebUrl(value)) {
    return escaped;
  }

  return `<a href="${escaped}">${escaped}</a>`;
}

function isAllowedOrigin(request) {
  const origin = getHeader(request, "origin");

  if (!origin) {
    return true;
  }

  const normalizedOrigin = normalizeOrigin(origin);
  if (!normalizedOrigin) {
    return false;
  }

  return getAllowedOrigins(request).has(normalizedOrigin);
}

function getAllowedOrigins(request) {
  const origins = new Set();
  const requestOrigin = getRequestOrigin(request);

  if (requestOrigin) {
    origins.add(requestOrigin);
  }

  for (const value of splitList(process.env.ALLOWED_REPORT_ORIGINS)) {
    const origin = normalizeOrigin(value);
    if (origin) {
      origins.add(origin);
    }
  }

  if (process.env.VERCEL_URL) {
    const vercelOrigin = normalizeOrigin(`https://${process.env.VERCEL_URL}`);
    if (vercelOrigin) {
      origins.add(vercelOrigin);
    }
  }

  return origins;
}

function getRequestOrigin(request) {
  const host = firstHeaderValue(
    getHeader(request, "x-forwarded-host") || getHeader(request, "host")
  );

  if (!host) {
    return "";
  }

  const forwardedProto = firstHeaderValue(getHeader(request, "x-forwarded-proto"));
  const protocol =
    forwardedProto ||
    (host.startsWith("localhost") || host.startsWith("127.") ? "http" : "https");

  return normalizeOrigin(`${protocol}://${host}`) || "";
}

function normalizeOrigin(value) {
  try {
    const url = new URL(String(value).trim());
    if (url.protocol !== "http:" && url.protocol !== "https:") {
      return "";
    }
    return url.origin;
  } catch {
    return "";
  }
}

function isJsonRequest(request) {
  return getHeader(request, "content-type").toLowerCase().includes("application/json");
}

function isBodyTooLarge(request) {
  const contentLength = Number(getHeader(request, "content-length") || 0);
  return Number.isFinite(contentLength) && contentLength > MAX_BODY_BYTES;
}

function isHoneypotFilled(payload) {
  return Boolean(limitedString(payload?.website, 100).trim());
}

function isRateLimited(clientIp) {
  const now = Date.now();
  pruneRateLimitBuckets(now);

  const bucket = rateLimitBuckets.get(clientIp);
  if (!bucket || bucket.resetAt <= now) {
    rateLimitBuckets.set(clientIp, {
      count: 1,
      resetAt: now + RATE_LIMIT_WINDOW_MS
    });
    return false;
  }

  if (bucket.count >= RATE_LIMIT_MAX) {
    return true;
  }

  bucket.count += 1;
  return false;
}

function pruneRateLimitBuckets(now) {
  if (rateLimitBuckets.size < 1000) {
    return;
  }

  for (const [key, bucket] of rateLimitBuckets.entries()) {
    if (bucket.resetAt <= now) {
      rateLimitBuckets.delete(key);
    }
  }
}

function getClientIp(request) {
  return (
    firstHeaderValue(getHeader(request, "x-forwarded-for")) ||
    firstHeaderValue(getHeader(request, "x-real-ip")) ||
    request.socket?.remoteAddress ||
    "unknown"
  );
}

function firstHeaderValue(value) {
  return String(value || "")
    .split(",")[0]
    .trim();
}

function getHeader(request, name) {
  if (typeof request.headers?.get === "function") {
    return request.headers.get(name) || "";
  }

  const value = request.headers?.[name.toLowerCase()] ?? request.headers?.[name];
  if (Array.isArray(value)) {
    return value[0] || "";
  }

  return value ? String(value) : "";
}

function splitList(value) {
  return String(value || "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

function isSafeWebUrl(value) {
  try {
    const url = new URL(String(value));
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

function isDayKey(value) {
  return /^\d{4}-\d{2}-\d{2}$/.test(String(value || ""));
}

function isValidEmail(value) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function limitedString(value, maxLength) {
  return String(value || "").trim().slice(0, maxLength);
}

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, (char) => {
    const replacements = {
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;"
    };
    return replacements[char];
  });
}

function positiveNumber(value, fallback) {
  const number = Number(value);
  return Number.isFinite(number) && number > 0 ? number : fallback;
}

function httpError(statusCode, message) {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
}

function setApiHeaders(response) {
  response.setHeader("Cache-Control", "no-store");
  response.setHeader("X-Content-Type-Options", "nosniff");
  response.setHeader("Vary", "Origin");
}

function sendJson(response, statusCode, payload) {
  response.status(statusCode).json(payload);
}
