import { SCREENSHOT_BUCKET, SUPABASE_ANON_KEY, SUPABASE_URL } from "./config.js";

function assertConfigured() {
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    throw new Error("Extension is not configured. Set SUPABASE_URL and SUPABASE_ANON_KEY in extension/config.js");
  }
}

function nowSeconds() {
  return Math.floor(Date.now() / 1000);
}

async function storageGet(keys) {
  return await chrome.storage.local.get(keys);
}

async function storageSet(obj) {
  await chrome.storage.local.set(obj);
}

async function supabaseAuthPassword(email, password) {
  assertConfigured();
  const url = `${SUPABASE_URL}/auth/v1/token?grant_type=password`;
  const res = await fetch(url, {
    method: "POST",
    headers: {
      apikey: SUPABASE_ANON_KEY,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ email, password }),
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(json?.error_description || json?.msg || "Sign in failed");
  }
  return json;
}

async function supabaseAuthRefresh(refreshToken) {
  assertConfigured();
  const url = `${SUPABASE_URL}/auth/v1/token?grant_type=refresh_token`;
  const res = await fetch(url, {
    method: "POST",
    headers: {
      apikey: SUPABASE_ANON_KEY,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ refresh_token: refreshToken }),
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(json?.error_description || json?.msg || "Session refresh failed");
  }
  return json;
}

async function getSession() {
  const { session } = await storageGet(["session"]);
  return session || null;
}

async function setSessionFromAuth(authJson) {
  const expiresAt = nowSeconds() + (authJson.expires_in || 0) - 30;
  const session = {
    access_token: authJson.access_token,
    refresh_token: authJson.refresh_token,
    expires_at: expiresAt,
    user: authJson.user,
  };
  await storageSet({ session });
  return session;
}

async function requireAccessToken() {
  const session = await getSession();
  if (!session) throw new Error("Not signed in");
  if (session.expires_at && session.expires_at > nowSeconds()) return session;

  const refreshed = await supabaseAuthRefresh(session.refresh_token);
  return await setSessionFromAuth(refreshed);
}

async function supabaseRest(path, { method = "GET", token, query, body, headers } = {}) {
  assertConfigured();
  const url = new URL(`${SUPABASE_URL}${path}`);
  if (query) {
    Object.entries(query).forEach(([k, v]) => url.searchParams.set(k, String(v)));
  }
  const res = await fetch(url.toString(), {
    method,
    headers: {
      apikey: SUPABASE_ANON_KEY,
      Authorization: `Bearer ${token}`,
      ...(body ? { "Content-Type": "application/json" } : {}),
      ...(headers || {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  const json = text ? JSON.parse(text) : null;
  if (!res.ok) {
    const msg = (Array.isArray(json) ? json[0]?.message : json?.message) || json?.error || "Request failed";
    throw new Error(msg);
  }
  return json;
}

async function getColumns(token) {
  // order=position.asc
  return await supabaseRest("/rest/v1/kanban_columns", {
    token,
    query: {
      select: "*",
      order: "position.asc",
    },
  });
}

async function getNextTaskPosition(token, columnId) {
  const rows = await supabaseRest("/rest/v1/tasks", {
    token,
    query: {
      select: "position",
      column_id: `eq.${columnId}`,
      order: "position.desc",
      limit: "1",
    },
  });
  const max = rows?.[0]?.position;
  return (typeof max === "number" ? max : -1) + 1;
}

async function uploadScreenshot(token, userId, dataUrl) {
  assertConfigured();
  // Validate bucket exists first to provide a helpful error.
  {
    const bucketUrl = `${SUPABASE_URL}/storage/v1/bucket/${SCREENSHOT_BUCKET}`;
    const bucketRes = await fetch(bucketUrl, {
      method: "GET",
      headers: {
        apikey: SUPABASE_ANON_KEY,
        Authorization: `Bearer ${token}`,
      },
    });
    if (!bucketRes.ok) {
      // Supabase returns 404 when bucket doesn't exist.
      if (bucketRes.status === 404) {
        throw new Error(
          `Screenshot bucket "${SCREENSHOT_BUCKET}" not found. Create it in Supabase Storage (or run supabase/extension_tasks_metadata_and_storage.sql) and reload the extension.`,
        );
      }
      // If storage API is disabled/misconfigured, surface status.
      throw new Error(`Failed to access Storage bucket (${bucketRes.status}).`);
    }
  }

  const base64 = dataUrl.split(",")[1] || "";
  const bin = atob(base64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);

  const name = `${userId}/${crypto.randomUUID()}.png`;
  const url = `${SUPABASE_URL}/storage/v1/object/${SCREENSHOT_BUCKET}/${name}`;
  const res = await fetch(url, {
    method: "POST",
    headers: {
      apikey: SUPABASE_ANON_KEY,
      Authorization: `Bearer ${token}`,
      "Content-Type": "image/png",
      "x-upsert": "true",
    },
    body: bytes,
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) {
    const msg = json?.message || "Screenshot upload failed";
    if (String(msg).toLowerCase().includes("bucket not found")) {
      throw new Error(
        `Screenshot bucket "${SCREENSHOT_BUCKET}" not found. Create it in Supabase Storage (or run supabase/extension_tasks_metadata_and_storage.sql) and reload the extension.`,
      );
    }
    throw new Error(msg);
  }
  return { path: name };
}

async function createTask(token, payload) {
  const session = await requireAccessToken();
  const userId = session.user?.id;
  if (!userId) throw new Error("Missing user id");

  const position = await getNextTaskPosition(token, payload.column_id);

  const rows = await supabaseRest("/rest/v1/tasks", {
    method: "POST",
    token,
    headers: {
      Prefer: "return=representation",
    },
    body: {
      user_id: userId,
      position,
      ...payload,
    },
  });
  return rows?.[0] ?? null;
}

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  (async () => {
    try {
      if (msg?.type === "AUTH_SIGNIN") {
        const auth = await supabaseAuthPassword(msg.email, msg.password);
        const session = await setSessionFromAuth(auth);
        sendResponse({ ok: true, user: session.user });
        return;
      }

      if (msg?.type === "AUTH_SIGNOUT") {
        await storageSet({ session: null });
        sendResponse({ ok: true });
        return;
      }

      if (msg?.type === "AUTH_STATUS") {
        const session = await getSession();
        sendResponse({ ok: true, signedIn: !!session, user: session?.user ?? null });
        return;
      }

      if (msg?.type === "GET_COLUMNS") {
        const session = await requireAccessToken();
        const cols = await getColumns(session.access_token);
        sendResponse({ ok: true, columns: cols });
        return;
      }

      if (msg?.type === "CAPTURE_TAB") {
        const tabId = sender?.tab?.id;
        if (!tabId) throw new Error("Missing tab");
        const dataUrl = await chrome.tabs.captureVisibleTab(sender.tab.windowId, { format: "png" });
        sendResponse({ ok: true, dataUrl });
        return;
      }

      if (msg?.type === "CREATE_TASK_WITH_SCREENSHOT") {
        const session = await requireAccessToken();
        const userId = session.user?.id;
        if (!userId) throw new Error("Missing user");
        let screenshot = null;
        let warning = null;
        if (msg.screenshotDataUrl) {
          try {
            screenshot = await uploadScreenshot(session.access_token, userId, msg.screenshotDataUrl);
          } catch (e) {
            warning = e instanceof Error ? e.message : "Screenshot upload failed";
          }
        }

        const task = await createTask(session.access_token, {
          column_id: msg.column_id,
          description: msg.description,
          assignee: msg.assignee || null,
          severity: msg.severity,
          tags: msg.tags || [],
          page_url: msg.page_url || null,
          page_title: msg.page_title || null,
          selector: msg.selector || null,
          screenshot_path: screenshot?.path ?? null,
        });

        sendResponse({ ok: true, task, warning });
        return;
      }

      throw new Error("Unknown message");
    } catch (e) {
      sendResponse({ ok: false, error: e instanceof Error ? e.message : "Unknown error" });
    }
  })();

  return true;
});

