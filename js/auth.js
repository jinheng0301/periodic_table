import { CONFIG } from "./config.js";

let tokenClient;

/** Wait for the asynchronous Google Identity Services library to become available. */
export function waitForGoogle(timeoutMs = 10000) {
  return new Promise((resolve, reject) => {
    const startedAt = Date.now();
    const check = () => {
      if (window.google?.accounts?.oauth2) {
        resolve();
        return;
      }
      if (Date.now() - startedAt >= timeoutMs) {
        reject(new Error("gis_unavailable"));
        return;
      }
      window.setTimeout(check, 100);
    };
    check();
  });
}

/** Request an access token directly from the user's button click. */
export function signIn() {
  if (!window.google?.accounts?.oauth2) {
    return Promise.reject(new Error("gis_unavailable"));
  }

  return new Promise((resolve, reject) => {
    let settled = false;
    let callbackReceived = false;
    let focusTimer;
    let timeoutTimer;
    const cleanup = () => {
      window.removeEventListener("focus", onFocus);
      window.clearTimeout(focusTimer);
      window.clearTimeout(timeoutTimer);
    };
    const finish = (callback, value) => {
      if (settled) return;
      settled = true;
      cleanup();
      callback(value);
    };
    const onFocus = () => {
      window.clearTimeout(focusTimer);
      focusTimer = window.setTimeout(() => {
        if (!callbackReceived) finish(reject, new Error("popup_closed"));
      }, 900);
    };

    window.addEventListener("focus", onFocus);
    timeoutTimer = window.setTimeout(() => finish(reject, new Error("popup_closed")), 120000);
    tokenClient = window.google.accounts.oauth2.initTokenClient({
      client_id: CONFIG.CLIENT_ID,
      scope: CONFIG.SCOPES,
      callback: async (tokenResponse) => {
      callbackReceived = true;
      if (tokenResponse.error) {
        finish(reject, new Error(tokenResponse.error));
        return;
      }

      if (!window.google.accounts.oauth2.hasGrantedAllScopes(tokenResponse, CONFIG.SHEETS_SCOPE)) {
        finish(reject, new Error("missing_sheets_scope"));
        return;
      }

      try {
        const response = await fetch("https://www.googleapis.com/oauth2/v3/userinfo", {
          headers: { Authorization: `Bearer ${tokenResponse.access_token}` }
        });
        if (!response.ok) throw new Error(`userinfo_${response.status}`);
        const user = await response.json();
        finish(resolve, {
          user: { name: user.name || user.email || "Google user", email: user.email || "", picture: user.picture || "" },
          token: tokenResponse.access_token
        });
      } catch (error) {
        finish(reject, error instanceof Error ? error : new Error("userinfo_failed"));
      }
      }
    });

    try {
      tokenClient.requestAccessToken({ prompt: "select_account" });
    } catch (error) {
      finish(reject, error instanceof Error ? error : new Error("popup_failed_to_open"));
    }
  });
}

/** Revoke this app's granted scopes and resolve when GIS reports completion. */
export function signOut(token) {
  return new Promise((resolve) => {
    if (!token || !window.google?.accounts?.oauth2) {
      resolve();
      return;
    }
    window.google.accounts.oauth2.revoke(token, () => resolve());
  });
}

export function describeAuthError(error) {
  const code = error?.message || "";
  const messages = {
    gis_unavailable: "Google sign-in could not load. Check your connection and refresh.",
    popup_closed: "The sign-in window was closed. Click the button to try again.",
    popup_failed_to_open: "The browser blocked the sign-in window. Allow pop-ups for this site and try again.",
    access_denied: "Access was denied. This app is in testing, so only approved accounts can sign in.",
    missing_sheets_scope: "Sign-in needs permission to read Google Sheets. Sign in again and allow access."
  };
  if (code.startsWith("userinfo_")) return "Could not load your Google profile. Check your connection and try again.";
  return messages[code] || "Google sign-in failed. Check your connection and try again.";
}
