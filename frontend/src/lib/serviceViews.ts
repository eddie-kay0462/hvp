import { supabase } from "@/integrations/supabase/client";

const SESSION_KEY = "hv-session-id";
const VIEW_TTL_MS = 30 * 60 * 1000;

function safeStorage(): Storage | null {
  try {
    return typeof window === "undefined" ? null : window.sessionStorage;
  } catch {
    return null;
  }
}

function getSessionId(): string | null {
  const store = safeStorage();
  if (!store) return null;
  let sid = store.getItem(SESSION_KEY);
  if (!sid) {
    sid =
      typeof crypto !== "undefined" && "randomUUID" in crypto
        ? crypto.randomUUID()
        : `sess-${Date.now().toString(36)}-${Math.random()
            .toString(36)
            .slice(2, 10)}`;
    store.setItem(SESSION_KEY, sid);
  }
  return sid;
}

function alreadyLoggedRecently(serviceId: string): boolean {
  const store = safeStorage();
  if (!store) return false;
  const key = `hv-viewed-${serviceId}`;
  const raw = store.getItem(key);
  if (!raw) return false;
  const ts = Number(raw);
  if (!Number.isFinite(ts)) return false;
  return Date.now() - ts < VIEW_TTL_MS;
}

function markLogged(serviceId: string) {
  const store = safeStorage();
  if (!store) return;
  store.setItem(`hv-viewed-${serviceId}`, String(Date.now()));
}

export interface LogServiceViewArgs {
  serviceId: string;
  viewerId?: string | null;
  ownerId?: string | null;
}

export async function logServiceView({
  serviceId,
  viewerId,
  ownerId,
}: LogServiceViewArgs): Promise<void> {
  if (!serviceId) return;
  if (viewerId && ownerId && viewerId === ownerId) return;
  if (alreadyLoggedRecently(serviceId)) return;

  markLogged(serviceId);

  const session_id = getSessionId();
  const source =
    typeof document !== "undefined" && document.referrer
      ? document.referrer.slice(0, 512)
      : null;

  try {
    await supabase.from("service_views").insert({
      service_id: serviceId,
      viewer_id: viewerId ?? null,
      session_id,
      source,
    });
  } catch {
    // Telemetry must never break the page.
  }
}
