import { createBlocksClient } from "/vendor/blocks-client/index.js";

const RETURN_TO_KEY = "complitrack.returnTo";
const ACCESS_TOKEN_KEY = "complitrack.accessToken";
const REFRESH_TOKEN_KEY = "complitrack.refreshToken";
const LOGIN_CALLBACK_TIMEOUT_MS = 15_000;
let cachedAccessToken;
let cachedRefreshToken;
let refreshInFlight;

function tokenPayload(token) {
  try {
    const encoded = token.split(".")[1];
    return JSON.parse(atob(encoded.replace(/-/g, "+").replace(/_/g, "/")));
  } catch {
    return {};
  }
}

function isExpired(token) {
  const exp = Number(tokenPayload(token).exp || 0);
  return exp > 0 && exp * 1000 <= Date.now() + 30_000;
}

function currentAccessToken() {
  const token = cachedAccessToken || sessionStorage.getItem(ACCESS_TOKEN_KEY);
  if (!token || isExpired(token)) return undefined;
  cachedAccessToken = token;
  return token;
}

function currentRefreshToken() {
  return cachedRefreshToken || sessionStorage.getItem(REFRESH_TOKEN_KEY) || undefined;
}

function persistTokens(accessToken, refreshToken) {
  cachedAccessToken = accessToken;
  sessionStorage.setItem(ACCESS_TOKEN_KEY, accessToken);
  if (refreshToken) {
    cachedRefreshToken = refreshToken;
    sessionStorage.setItem(REFRESH_TOKEN_KEY, refreshToken);
  }
}

function clearTokens() {
  cachedAccessToken = undefined;
  cachedRefreshToken = undefined;
  sessionStorage.removeItem(ACCESS_TOKEN_KEY);
  sessionStorage.removeItem(REFRESH_TOKEN_KEY);
}

export const blocks = createBlocksClient({
  apiUrl: "https://blocksapi.slsblx.com",
  appDomain: "https://dbgmze.slsblx.com",
  oidc: {
    clientId: "aba4efed-b86e-4bd9-9346-bf4b48974816",
    scope: "openid profile",
    url: "https://iam.seliseblocks.com",
  },
  accessToken: () => getValidAccessToken(),
  xBlocksKey: "Dba0c99247e2e4e4091e1bfbcc3648396",
});

export async function getValidAccessToken() {
  const token = currentAccessToken();
  if (token) return token;
  const refreshToken = currentRefreshToken();
  if (!refreshToken) return undefined;
  if (!refreshInFlight) {
    refreshInFlight = blocks.auth.oidc.refreshToken({ refreshToken })
      .then((response) => {
        const data = response?.data || response;
        const accessToken = data?.access_token || data?.accessToken;
        if (!accessToken) {
          clearTokens();
          return undefined;
        }
        persistTokens(
          accessToken,
          data.refresh_token || data.refreshToken || refreshToken,
        );
        return accessToken;
      })
      .catch(() => undefined)
      .finally(() => {
        refreshInFlight = undefined;
      });
  }
  return refreshInFlight;
}

export async function ensureSession() {
  if (currentAccessToken() || (await getValidAccessToken())) return true;
  return blocks.auth.isAuthenticated();
}

export function startLogin(returnTo = "/") {
  sessionStorage.setItem(RETURN_TO_KEY, returnTo);
  return blocks.auth.idp.redirectToProvider();
}

export async function completeLogin(callbackUrl) {
  const returnTo = sessionStorage.getItem(RETURN_TO_KEY) || "/";
  const timeout = new Promise((_, reject) => {
    setTimeout(
      () => reject(new Error("The sign-in service did not respond. Check the browser console for a CORS or network error, then try again.")),
      LOGIN_CALLBACK_TIMEOUT_MS,
    );
  });
  const response = await Promise.race([
    blocks.auth.idp.callback(callbackUrl),
    timeout,
  ]);
  const data = response?.data || response;
  if (data?.error || data?.error_description || data?.isSuccess === false) {
    throw data;
  }
  const accessToken = data?.access_token || data?.accessToken;
  if (accessToken) {
    persistTokens(accessToken, data.refresh_token || data.refreshToken);
  } else if (!(await blocks.auth.isAuthenticated())) {
    throw new Error("Login completed, but no secure browser session was established.");
  }
  sessionStorage.removeItem(RETURN_TO_KEY);
  return returnTo;
}

export async function logout() {
  try {
    await blocks.auth.logout({ refreshToken: currentRefreshToken() });
  } finally {
    clearTokens();
  }
}
