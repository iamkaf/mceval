export function isMcevalAdmin(userId: string, allowedUserIds: string | undefined): boolean {
  const ids = allowedUserIds
    ?.split(",")
    .map((id) => id.trim())
    .filter(Boolean);

  if (!ids || ids.length === 0) {
    return true;
  }

  return ids.includes(userId);
}

export function authorizeDashboardUser(userId: string, allowedUserIds: string | undefined): Response | null {
  if (isMcevalAdmin(userId, allowedUserIds)) {
    return null;
  }

  return new Response("Forbidden", {
    status: 403,
    headers: { "content-type": "text/plain; charset=utf-8" },
  });
}
