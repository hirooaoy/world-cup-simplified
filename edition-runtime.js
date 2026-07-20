function validTimestamp(value) {
  const timestamp = new Date(value ?? "").getTime();
  return Number.isFinite(timestamp) ? timestamp : null;
}

export function getEditionLiveSyncStatus(lifecycle, nowValue = Date.now()) {
  const edition = Number(lifecycle?.edition);
  const now = validTimestamp(nowValue);
  const startsAt = validTimestamp(lifecycle?.tournamentStartsAt);
  const endsAt = validTimestamp(lifecycle?.liveSyncEndsAt);
  const state = String(lifecycle?.state || "").trim().toLowerCase();
  const valid =
    Number.isInteger(edition) &&
    edition >= 1930 &&
    now !== null &&
    startsAt !== null &&
    endsAt !== null &&
    startsAt < endsAt &&
    ["live", "review", "archived"].includes(state);

  return {
    active: valid && state === "live" && now >= startsAt && now < endsAt,
    edition: Number.isInteger(edition) ? edition : null,
    endsAt,
    now,
    startsAt,
    state,
    valid
  };
}

export function isEditionLiveSyncActive(lifecycle, nowValue = Date.now()) {
  return getEditionLiveSyncStatus(lifecycle, nowValue).active;
}

export async function requestLiveDataForActiveEdition(
  lifecycle,
  loader,
  nowValue = Date.now()
) {
  if (typeof loader !== "function") {
    throw new TypeError("A live-data loader function is required.");
  }

  if (!isEditionLiveSyncActive(lifecycle, nowValue)) {
    return {
      requested: false,
      value: null
    };
  }

  return {
    requested: true,
    value: await loader()
  };
}
