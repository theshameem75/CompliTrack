import { BlocksApiError } from "./errors.js";
export class BlocksHttpClient {
    config;
    auth;
    fetchImpl;
    constructor(config, auth, fetchImpl = globalThis.fetch?.bind(globalThis)) {
        this.config = config;
        this.auth = auth;
        this.fetchImpl = fetchImpl;
        if (!this.fetchImpl)
            throw new Error("Blocks client requires fetch.");
    }
    async request(path, options = {}) {
        const url = buildUrl(this.config.apiUrl, path, options.query);
        const headers = new Headers(options.headers);
        const rawBody = isBodyInit(options.body) ? options.body : undefined;
        headers.set("Accept", "application/json");
        headers.set("x-blocks-key", this.config.xBlocksKey);
        if (options.body !== undefined && !rawBody && !headers.has("Content-Type")) {
            headers.set("Content-Type", "application/json");
        }
        if (options.auth !== false) {
            const token = options.accessToken ?? await this.auth.accessToken();
            if (token)
                headers.set("Authorization", `Bearer ${token}`);
        }
        const response = await this.fetchImpl(url, {
            body: rawBody ?? (options.body === undefined ? undefined : JSON.stringify(options.body)),
            // IAM's hosted IdP flow sets the session as a Secure, httpOnly cookie by default;
            // without this the browser never sends it back on subsequent Blocks API calls.
            credentials: "include",
            headers,
            method: options.method ?? (options.body === undefined ? "GET" : "POST")
        });
        const body = await parseBody(response);
        if (!response.ok)
            throw new BlocksApiError(response.status, response.statusText, body);
        return body;
    }
    async external(url, options = {}) {
        const response = await this.fetchImpl(url, {
            body: options.body,
            headers: options.headers,
            method: options.method ?? "GET"
        });
        const body = await parseBody(response);
        if (!response.ok)
            throw new BlocksApiError(response.status, response.statusText, body);
        return body;
    }
}
function isBodyInit(value) {
    return typeof Blob !== "undefined" && value instanceof Blob
        || typeof FormData !== "undefined" && value instanceof FormData
        || typeof URLSearchParams !== "undefined" && value instanceof URLSearchParams
        || typeof ReadableStream !== "undefined" && value instanceof ReadableStream
        || value instanceof ArrayBuffer
        || ArrayBuffer.isView(value);
}
function buildUrl(baseUrl, path, query) {
    const url = /^https?:\/\//i.test(path)
        ? new URL(path)
        : new URL(path.replace(/^\/+/, ""), `${baseUrl}/`);
    for (const [key, value] of Object.entries(query ?? {})) {
        if (value !== undefined)
            url.searchParams.set(key, String(value));
    }
    return url.toString();
}
async function parseBody(response) {
    if (response.status === 204)
        return undefined;
    const text = await response.text();
    if (!text)
        return undefined;
    const contentType = response.headers.get("content-type") ?? "";
    if (contentType.includes("application/json"))
        return JSON.parse(text);
    try {
        return JSON.parse(text);
    }
    catch {
        return text;
    }
}
