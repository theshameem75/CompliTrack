import { BlocksAuthenticationClient } from "./auth/auth-client.js";
import { BlocksDataClient } from "./data/data-client.js";
import { BlocksHttpClient } from "./http/http-client.js";
import { BlocksIAMClient } from "./iam/iam-client.js";
import { BlocksLocalizationClient } from "./localization/localization-client.js";
import { BlocksMailClient } from "./mail/mail-client.js";
import { BlocksMfaClient } from "./mfa/mfa-client.js";
import { BlocksNotifierClient } from "./notifier/notifier-client.js";
/**
 * What: creates a framework-neutral Blocks SDK instance for one tenant/app runtime.
 * Why: frontend code needs a single configured entry point for IAM, Auth, Data, and Localization APIs.
 * How: pass `apiUrl` and `xBlocksKey`; optionally pass an `accessToken` callback and OIDC config. The SDK never adds `ProjectKey` and never stores tokens.
 */
export function createBlocksClient(config) {
    const normalized = normalizeConfig(config);
    const auth = new BlocksAuthenticationClient(normalized, config.fetch);
    const http = new BlocksHttpClient(normalized, auth, config.fetch);
    return {
        auth,
        config: normalized,
        data: new BlocksDataClient(http),
        http,
        iam: new BlocksIAMClient(http),
        localization: new BlocksLocalizationClient(http),
        mail: new BlocksMailClient(http),
        mfa: new BlocksMfaClient(http),
        notifier: new BlocksNotifierClient(http)
    };
}
function normalizeConfig(config) {
    if (!config.apiUrl)
        throw new Error("Blocks client requires apiUrl.");
    if (!config.xBlocksKey)
        throw new Error("Blocks client requires xBlocksKey.");
    return {
        accessToken: config.accessToken,
        apiUrl: trimTrailingSlash(config.apiUrl),
        appDomain: config.appDomain,
        oidc: config.oidc ? {
            ...config.oidc,
            redirectUri: config.oidc.redirectUri ?? browserRedirectUri(),
            scope: config.oidc.scope ?? "openid profile"
        } : undefined,
        xBlocksKey: config.xBlocksKey
    };
}
function browserRedirectUri() {
    if (typeof window === "undefined") {
        throw new Error("OIDC redirectUri is required outside a browser.");
    }
    return `${window.location.origin}/login/callback`;
}
function trimTrailingSlash(value) {
    return value.replace(/\/+$/, "");
}
