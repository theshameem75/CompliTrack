export class BlocksAuthenticationClient {
    clientConfig;
    fetchImpl;
    constructor(clientConfig, fetchImpl = globalThis.fetch?.bind(globalThis)) {
        this.clientConfig = clientConfig;
        this.fetchImpl = fetchImpl;
        if (!this.fetchImpl)
            throw new Error("Blocks client requires fetch.");
    }
    /**
     * What: discovers tenant login options through `GET /iam/v4/auth/login-options`.
     * Why: login screens need to know which login methods the tenant supports before rendering controls.
     * How: call it before showing your login UI; it is public and still sends `x-blocks-key`.
     */
    loginOptions() {
        return this.json("/iam/v4/auth/login-options", { auth: false });
    }
    /**
     * What: executes username/password login through `POST /iam/v4/auth/login`.
     * Why: apps that own their login UI need a direct AuthController login call.
     * How: pass IAM's expected login payload; the SDK returns IAM's response as-is and does not store tokens.
     */
    login(request) {
        return this.json("/iam/v4/auth/login", {
            auth: false,
            body: request
        });
    }
    /**
     * What: starts social login through `GET /iam/v4/auth/social/initiate`.
     * Why: custom login screens may offer social providers while keeping the app in charge of UI.
     * How: provide the public browser client id and redirect URI, then follow IAM's returned social-login response.
     */
    socialInitiate(clientId, redirectUri) {
        return this.json("/iam/v4/auth/social/initiate", {
            auth: false,
            query: { clientId, redirectUri }
        });
    }
    /**
     * What: completes social login through `POST /iam/v4/auth/social/callback`.
     * Why: the app receives the provider callback but IAM owns the token/session response contract.
     * How: pass the callback payload your app received; store returned tokens in your app layer if IAM returns tokens.
     */
    socialCallback(request) {
        return this.json("/iam/v4/auth/social/callback", {
            auth: false,
            body: request
        });
    }
    /**
     * What: refreshes an AuthController token through `POST /iam/v4/auth/refresh`.
     * Why: direct AuthController sessions refresh through AuthController instead of the OIDC token endpoint.
     * How: pass the refresh payload your app owns; the SDK does not read or write token storage.
     */
    refresh(request = {}) {
        return this.json("/iam/v4/auth/refresh", {
            auth: false,
            body: request
        });
    }
    /**
     * What: switches the active organization through `POST /iam/v4/auth/switch-org`.
     * Why: multi-organization users need a new IAM response for the selected organization context.
     * How: pass `organizationId` plus the refresh/session fields IAM expects; then replace app-owned session state with the response if needed.
     */
    switchOrganization(request) {
        return this.json("/iam/v4/auth/switch-org", { body: request });
    }
    /**
     * What: reads OIDC-style current-user info through `GET /iam/v4/auth/me`.
     * Why: apps may need profile claims from AuthController, separate from full IAM `iam.me()`.
     * How: call after `accessToken` is available on `createBlocksClient`.
     */
    userInfo() {
        return this.json("/iam/v4/auth/me");
    }
    /**
     * What: logs out the current session through `POST /iam/v4/auth/logout`.
     * Why: the app can ask IAM to invalidate the current session/refresh token while clearing its own local state.
     * How: pass IAM's logout payload, commonly including `refreshToken`.
     */
    logout(request = {}) {
        return this.json("/iam/v4/auth/logout", { body: request });
    }
    /**
     * What: logs out all supported sessions through `POST /iam/v4/auth/logout-all`.
     * Why: security-sensitive apps may offer a sign-out-everywhere action.
     * How: pass IAM's logout-all payload and clear app-owned session state after success.
     */
    logoutAll(request = {}) {
        return this.json("/iam/v4/auth/logout-all", { body: request });
    }
    /**
     * What: registers a user through `POST /iam/v4/auth/signup`.
     * Why: apps may own their signup page while IAM owns account creation rules.
     * How: send IAM's signup payload and render IAM's response/errors directly.
     */
    signup(request) {
        return this.json("/iam/v4/auth/signup", { auth: false, body: request });
    }
    /**
     * What: starts account/password recovery through `POST /iam/v4/auth/recover`.
     * Why: apps need a public recovery entry point.
     * How: pass the email or recovery payload IAM expects and return IAM's response to the UI.
     */
    recover(request) {
        return this.json("/iam/v4/auth/recover", { auth: false, body: request });
    }
    /**
     * What: completes password reset through `POST /iam/v4/auth/reset-password`.
     * Why: IAM owns reset-token validation and password policy enforcement.
     * How: pass the reset payload from your reset form and show IAM's response/errors.
     */
    resetPassword(request) {
        return this.json("/iam/v4/auth/reset-password", { auth: false, body: request });
    }
    /**
     * What: changes password through `POST /iam/v4/auth/change-password`.
     * Why: authenticated users need an account-security action inside your app.
     * How: pass IAM's change-password payload after an access token is available.
     */
    changePassword(request) {
        return this.json("/iam/v4/auth/change-password", { body: request });
    }
    /**
     * What: activates an account through `POST /iam/v4/auth/activate`.
     * Why: signup or invitation flows may require an activation step.
     * How: pass the activation code/token payload IAM expects.
     */
    activate(request) {
        return this.json("/iam/v4/auth/activate", { auth: false, body: request });
    }
    /**
     * What: requests another activation message through `POST /iam/v4/auth/resend-activation`.
     * Why: users may need a new activation link/code.
     * How: pass IAM's resend payload; this call uses the active bearer token when configured.
     */
    resendActivation(request) {
        return this.json("/iam/v4/auth/resend-activation", { body: request });
    }
    /**
     * What: validates an activation payload through `POST /iam/v4/auth/validate-activation`.
     * Why: apps can check activation state before committing the final activation UI step.
     * How: pass the activation validation payload and render IAM's response.
     */
    validateActivation(request) {
        return this.json("/iam/v4/auth/validate-activation", { auth: false, body: request });
    }
    idp = {
        /**
         * What: starts the Blocks IAM IdP-controller browser/provider flow through `GET /iam/v4/idp/initiate`.
         * Why: hosted login should rely on IAM's IdP controller instead of manually constructing `oidc/authorize`.
         * How: pass optional `clientId`, `redirectUri`, or `forwardedTo`; otherwise the SDK uses `createBlocksClient().oidc` defaults and returns IAM's redirect response.
         */
        initiate: (request = {}) => {
            const oidc = this.oidcDefaults;
            return this.json("/iam/v4/idp/initiate", {
                auth: false,
                query: {
                    clientId: request.clientId ?? oidc.clientId,
                    forwardedTo: request.forwardedTo,
                    redirectUri: request.redirectUri ?? oidc.redirectUri
                }
            });
        },
        /**
         * What: starts hosted login and redirects the browser to IAM's returned provider URL.
         * Why: browser apps often need one call that handles initiate plus navigation.
         * How: call it from a login button handler; the function throws if IAM does not return `redirect_uri`.
         */
        redirectToProvider: async (request = {}) => {
            const response = await this.idp.initiate(request);
            const redirectUri = response.redirect_uri ?? response.redirectUri;
            if (!redirectUri)
                throw new Error("Blocks IdP initiate response did not include redirect_uri.");
            window.location.assign(redirectUri);
        },
        /**
         * What: completes the Blocks IAM IdP-controller callback through `GET /iam/v4/idp/callback`.
         * Why: IAM owns the hosted callback contract and returns the auth response shape.
         * How: pass `window.location.href` or an object with `code`, `state`, and optional OIDC error fields; store the returned tokens in your app layer if IAM returns tokens.
         */
        callback: (callback) => {
            const params = typeof callback === "string" ? callbackParams(callback) : callback;
            return this.json("/iam/v4/idp/callback", {
                auth: false,
                query: {
                    code: params.code,
                    error: params.error,
                    error_description: params.error_description,
                    state: params.state
                }
            });
        },
        /**
         * What: reads public UI configuration from `GET /iam/v4/idp/oidc-ui-config`.
         * Why: hosted auth pages may need tenant login settings such as captcha or UI config before authentication.
         * How: call before rendering hosted-auth support UI; the SDK returns IAM's response body without reshaping.
         */
        uiConfig: () => this.json("/iam/v4/idp/oidc-ui-config", { auth: false })
    };
    oidc = {
        /**
         * What: refreshes an OIDC-flow token through `POST /iam/v4/oidc/token` with `grant_type=refresh_token`.
         * Why: hosted IdP login relies on IdPController for browser login, but token refresh still belongs to the OIDC token endpoint.
         * How: pass the refresh token your app owns; the SDK always sends `client_id` from the request or client OIDC config and returns IAM's token response without storing it.
         */
        refreshToken: (request = {}) => {
            const clientId = request.clientId ?? this.clientConfig.oidc?.clientId;
            if (!clientId)
                throw new Error("Blocks OIDC clientId is required for refreshToken.");
            return this.form("/iam/v4/oidc/token", {
                client_id: clientId,
                grant_type: "refresh_token",
                refresh_token: request.refreshToken,
                scope: request.scope
            });
        },
        /**
         * What: requests a machine token through `POST /iam/v4/oidc/token` with `grant_type=client_credentials`.
         * Why: backend jobs or trusted server-side adapters may need service access to Blocks APIs.
         * How: call only outside public browser code because it requires `clientSecret`.
         */
        clientCredentials: (request) => this.form("/iam/v4/oidc/token", {
            client_id: request.clientId,
            client_secret: request.clientSecret,
            grant_type: "client_credentials",
            scope: request.scope
        })
    };
    identityProviders = {
        /**
         * What: lists configured identity providers through `GET /iam/v4/auth/identity-providers`.
         * Why: admin UI can show available IdP configurations.
         * How: call with a type parameter when your app has a specific response model.
         */
        list: () => this.json("/iam/v4/auth/identity-providers"),
        /**
         * What: reads one identity provider through `GET /iam/v4/auth/identity-providers/{id}`.
         * Why: admin UI needs one record before edit/detail rendering.
         * How: pass the IdP id from IAM.
         */
        get: (id) => this.json(`/iam/v4/auth/identity-providers/${encodeURIComponent(id)}`),
        /**
         * What: creates an identity provider through `POST /iam/v4/auth/identity-providers`.
         * Why: authorized apps can configure tenant IdP options.
         * How: pass IAM's IdP payload and receive IAM's response as-is.
         */
        create: (request) => this.json("/iam/v4/auth/identity-providers", { body: request }),
        /**
         * What: updates an identity provider through `PUT /iam/v4/auth/identity-providers/{id}`.
         * Why: authorized apps can edit tenant IdP options.
         * How: pass the IdP id and IAM's update payload.
         */
        update: (id, request) => this.json(`/iam/v4/auth/identity-providers/${encodeURIComponent(id)}`, {
            body: request,
            method: "PUT"
        }),
        /**
         * What: changes identity-provider status through `PATCH /iam/v4/auth/identity-providers/{id}/status`.
         * Why: admin UI can enable or disable an IdP without editing the whole configuration.
         * How: pass the IdP id and status payload IAM expects.
         */
        updateStatus: (id, request) => this.json(`/iam/v4/auth/identity-providers/${encodeURIComponent(id)}/status`, {
            body: request,
            method: "PATCH"
        }),
        /**
         * What: deletes an identity provider through `DELETE /iam/v4/auth/identity-providers/{id}`.
         * Why: admin UI can remove tenant IdP configuration.
         * How: pass the IdP id; IAM decides whether deletion is allowed.
         */
        delete: (id) => this.json(`/iam/v4/auth/identity-providers/${encodeURIComponent(id)}`, { method: "DELETE" })
    };
    config = {
        /**
         * What: reads auth configuration through `GET /iam/v4/auth/config`.
         * Why: admin/settings UI can render current AuthController configuration.
         * How: call after an authorized token is available.
         */
        get: () => this.json("/iam/v4/auth/config"),
        /**
         * What: saves auth configuration through `POST /iam/v4/auth/config`.
         * Why: admin/settings UI can update AuthController behavior.
         * How: pass IAM's config payload and receive IAM's response as-is.
         */
        update: (request) => this.json("/iam/v4/auth/config", { body: request })
    };
    userCodes = {
        /**
         * What: lists user codes through `GET /iam/v4/auth/user-codes`.
         * Why: apps using user-code auth/admin flows can show existing generated codes.
         * How: call from an authorized surface.
         */
        list: () => this.json("/iam/v4/auth/user-codes"),
        /**
         * What: generates a user code through `POST /iam/v4/auth/user-codes`.
         * Why: apps using user-code flows need IAM to create the code.
         * How: pass IAM's generation payload.
         */
        generate: (request) => this.json("/iam/v4/auth/user-codes", { body: request })
    };
    clientCredentials = {
        /**
         * What: lists client credentials through `GET /iam/v4/auth/client-credentials`.
         * Why: authorized admin UIs can manage service credentials.
         * How: call from a trusted/authorized management surface.
         */
        list: () => this.json("/iam/v4/auth/client-credentials"),
        /**
         * What: creates or updates client credentials through `POST /iam/v4/auth/client-credentials`.
         * Why: authorized admin UIs can provision service credentials.
         * How: pass IAM's credential payload; do not expose generated secrets in public UI longer than necessary.
         */
        save: (request) => this.json("/iam/v4/auth/client-credentials", { body: request }),
        /**
         * What: deletes a client credential through `DELETE /iam/v4/auth/client-credentials/{id}`.
         * Why: authorized admin UIs can revoke service credentials.
         * How: pass the credential id from IAM.
         */
        delete: (id) => this.json(`/iam/v4/auth/client-credentials/${encodeURIComponent(id)}`, { method: "DELETE" })
    };
    /**
     * What: resolves the caller-owned bearer token configured on `createBlocksClient`.
     * Why: the SDK must not own browser sessions or token storage, but protected API calls still need the active token.
     * How: provide `accessToken` as a string or callback in client config; call this when adapters need to inspect the resolved token.
     */
    async accessToken() {
        return typeof this.clientConfig.accessToken === "function"
            ? await this.clientConfig.accessToken()
            : this.clientConfig.accessToken;
    }
    /**
     * What: validates the current session against IAM through `GET /iam/v4/auth/me`.
     * Why: a caller-owned `accessToken` may be absent by design -- IAM's hosted IdP flow sets the
     * session as a Secure, httpOnly cookie by default, so checking for a local token would report
     * "signed out" even when the browser holds a valid session cookie. IAM is the source of truth.
     * How: checks the raw response status rather than `userInfo()` -- `json()` intentionally never
     * throws on non-2xx (auth endpoints can return protocol-shaped error bodies), so a 401 there
     * would otherwise resolve as if the call had succeeded.
     */
    async isAuthenticated() {
        try {
            const response = await this.raw("/iam/v4/auth/me", { method: "GET" });
            return response.ok;
        }
        catch {
            return false;
        }
    }
    /**
     * What: sends a JSON Auth/IdPController request and returns the parsed response body.
     * Why: auth endpoints can return protocol-shaped errors, so this layer intentionally does not reshape non-2xx bodies.
     * How: SDK methods call this with the exact IAM route, method, query, and payload.
     */
    async json(path, options = {}) {
        const response = await this.raw(path, {
            auth: options.auth,
            body: options.body === undefined ? undefined : JSON.stringify(options.body),
            headers: options.body === undefined ? undefined : { "Content-Type": "application/json" },
            method: options.method ?? (options.body === undefined ? "GET" : "POST"),
            query: options.query
        });
        return parseResponse(response);
    }
    /**
     * What: sends an `application/x-www-form-urlencoded` OIDC token request.
     * Why: `/iam/v4/oidc/token` follows OAuth/OIDC form-post semantics rather than JSON body semantics.
     * How: OIDC token helpers pass grant fields here; the response body is returned exactly as IAM sends it.
     */
    async form(path, form) {
        const body = new URLSearchParams();
        for (const [key, value] of Object.entries(form)) {
            if (value !== undefined)
                body.set(key, value);
        }
        const response = await this.raw(path, {
            auth: false,
            body,
            headers: { "Content-Type": "application/x-www-form-urlencoded" },
            method: "POST"
        });
        return parseResponse(response);
    }
    async raw(path, options) {
        const url = buildUrl(this.clientConfig.apiUrl, path, options.query);
        const headers = new Headers(options.headers);
        headers.set("Accept", "application/json");
        headers.set("x-blocks-key", this.clientConfig.xBlocksKey);
        if (options.auth !== false) {
            const token = await this.accessToken();
            if (token)
                headers.set("Authorization", `Bearer ${token}`);
        }
        return this.fetchImpl(url, {
            body: options.body,
            // IAM's hosted IdP flow sets the session as a Secure, httpOnly cookie by default;
            // without this the browser never sends it back on subsequent Auth/IdP requests.
            credentials: "include",
            headers,
            method: options.method
        });
    }
    get oidcDefaults() {
        if (!this.clientConfig.oidc)
            throw new Error("Blocks OIDC config is required.");
        return this.clientConfig.oidc;
    }
}
function callbackParams(callbackUrl) {
    const url = new URL(callbackUrl);
    return {
        code: url.searchParams.get("code") ?? undefined,
        error: url.searchParams.get("error") ?? undefined,
        error_description: url.searchParams.get("error_description") ?? undefined,
        state: url.searchParams.get("state") ?? undefined
    };
}
function buildUrl(baseUrl, path, query) {
    const url = new URL(path.replace(/^\/+/, ""), `${baseUrl.replace(/\/+$/, "")}/`);
    for (const [key, value] of Object.entries(query ?? {})) {
        if (value !== undefined)
            url.searchParams.set(key, value);
    }
    return url.toString();
}
async function parseResponse(response) {
    const text = await response.text();
    const body = text ? parseJson(text) : undefined;
    return body;
}
function parseJson(text) {
    try {
        return JSON.parse(text);
    }
    catch {
        return text;
    }
}
