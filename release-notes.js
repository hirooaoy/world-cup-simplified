const RELEASE_NOTES_URL = "data/release-notes.json?v=2026-06-23-curated-profile-notes";

const releaseNoteList = document.querySelector("#release-note-list");

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function formatReleaseDate(value) {
  const date = new Date(`${value}T12:00:00`);
  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat("en-US", {
    day: "numeric",
    month: "short",
    year: "numeric"
  }).format(date);
}

function renderReleaseNotes(data) {
  const releases = Array.isArray(data?.releases) ? data.releases : [];
  const releaseItems = releases
    .filter((release) => release?.date && release?.title)
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  if (releaseItems.length === 0) {
    return;
  }

  releaseNoteList.innerHTML = releaseItems
    .map((release) => {
      const highlights = Array.isArray(release.highlights) ? release.highlights : [];
      return `
        <article class="release-note">
          <time datetime="${escapeHtml(release.date)}">${escapeHtml(formatReleaseDate(release.date))}</time>
          <h2>${escapeHtml(release.title)}</h2>
          <ul>
            ${highlights.map((highlight) => `<li>${escapeHtml(highlight)}</li>`).join("")}
          </ul>
        </article>
      `;
    })
    .join("");
}

async function loadReleaseNotes() {
  try {
    const response = await fetch(RELEASE_NOTES_URL, { cache: "no-store" });
    if (!response.ok) {
      throw new Error(`Unable to load ${RELEASE_NOTES_URL}`);
    }
    renderReleaseNotes(await response.json());
  } catch (error) {
    console.warn("Unable to load release notes", error);
  }
}

loadReleaseNotes();
