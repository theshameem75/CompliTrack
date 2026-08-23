import { createBlocksClient } from "/vendor/blocks-client/index.js";

const RETURN_TO_KEY = "complitrack.returnTo";

export const blocks = createBlocksClient({
  apiUrl: "https://blocksapi.slsblx.com",
  appDomain: "https://dbgmze.dev.slsblx.com",
  oidc: {
    clientId: "aba4efed-b86e-4bd9-9346-bf4b48974816",
    scope: "openid profile",
    url: "https://iam.seliseblocks.com",
  },
  xBlocksKey: "Dba0c99247e2e4e4091e1bfbcc3648396",
});

export function ensureSession() {
  return blocks.auth.isAuthenticated();
}

export function startLogin(returnTo = "/") {
  sessionStorage.setItem(RETURN_TO_KEY, returnTo);
  return blocks.auth.idp.redirectToProvider();
}

export async function completeLogin(callbackUrl) {
  const returnTo = sessionStorage.getItem(RETURN_TO_KEY) || "/";
  sessionStorage.removeItem(RETURN_TO_KEY);
  const response = await blocks.auth.idp.callback(callbackUrl);
  if (response?.error || response?.error_description || response?.isSuccess === false) {
    throw response;
  }
  if (!(await blocks.auth.isAuthenticated())) {
    throw new Error("Login completed, but no secure browser session was established.");
  }
  return returnTo;
}
