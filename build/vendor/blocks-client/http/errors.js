export class BlocksApiError extends Error {
    status;
    statusText;
    body;
    constructor(status, statusText, body) {
        super(buildMessage(status, statusText, body));
        this.status = status;
        this.statusText = statusText;
        this.body = body;
        this.name = "BlocksApiError";
    }
}
function buildMessage(status, statusText, body) {
    if (typeof body === "object" && body) {
        const record = body;
        const message = record.message ?? record.detail ?? record.error_description ?? record.error;
        if (typeof message === "string" && message)
            return `Blocks API ${status} ${statusText}: ${message}`;
    }
    if (typeof body === "string" && body)
        return `Blocks API ${status} ${statusText}: ${body}`;
    return `Blocks API ${status} ${statusText}`;
}
