export declare class BlocksApiError extends Error {
    readonly status: number;
    readonly statusText: string;
    readonly body: unknown;
    constructor(status: number, statusText: string, body: unknown);
}
