import { BlocksAuthenticationClient } from "../auth/auth-client.js";
import { RequiredConfig } from "../client.js";
import { BlocksExternalRequestOptions, BlocksRequestOptions } from "../types.js";
export declare class BlocksHttpClient {
    private readonly config;
    private readonly auth;
    private readonly fetchImpl;
    constructor(config: RequiredConfig, auth: BlocksAuthenticationClient, fetchImpl?: typeof fetch);
    request<T>(path: string, options?: BlocksRequestOptions): Promise<T>;
    external<T = unknown>(url: string, options?: BlocksExternalRequestOptions): Promise<T>;
}
