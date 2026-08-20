import { BlocksHttpClient } from "../http/http-client.js";
import { BlocksDataCollection, BlocksDataCollectionOptions, BlocksDirectoryCreateRequest, BlocksDirectoryDeleteRequest, BlocksDirectoryMoveRequest, BlocksDirectoryUpdateRequest, BlocksFileCopyRequest, BlocksFileCreateVersionRequest, BlocksFileDeleteRequest, BlocksFileGetOptions, BlocksFileInfoListRequest, BlocksFileMoveRequest, BlocksFileRenameRequest, BlocksFileVersionsRequest, BlocksDataSchema, BlocksFileListRequest, BlocksFileUpdateAdditionalInfoRequest, BlocksFileUploadRequest, BlocksGraphqlRequest, BlocksLocalStorageUploadRequest, BlocksPagedResult, BlocksRegexGenerateRequest, BlocksSchemaFieldValidationOptions, BlocksSchemaListOptions, BlocksSchemaValidationListOptions, BlocksStorageAccessPolicyRequest, BlocksStorageObjectListRequest, BlocksStorageObjectPageRequest, BlocksStorageObjectSearchRequest, BlocksStorageObjectsResponse, BlocksStorageResourceRequest, BlocksStorageRevokeAccessRequest, BlocksStorageShareRequest, BlocksStorageToggleInheritanceRequest, BlocksUploadToUrlRequest } from "./types.js";
export declare class BlocksDataClient {
    private readonly http;
    constructor(http: BlocksHttpClient);
    schemas: {
        /**
         * What: lists Data schemas through `GET /data/v4/schemas`.
         * Why: runtime apps and form builders need to discover available collections/schema metadata.
         * How: pass optional paging/filter fields; tenant routing always uses the `x-blocks-key` header, never `ProjectKey`.
         */
        list: (options?: BlocksSchemaListOptions) => Promise<BlocksPagedResult<BlocksDataSchema>>;
        /**
         * What: looks up one schema by name through `GET /data/v4/schemas`.
         * Why: apps often need a compact schema lookup before rendering a single collection/form.
         * How: pass the schema name; the SDK sends `SchemaName`, `PageNo=1`, and `PageSize=1`.
         */
        get: (schemaName: string) => Promise<BlocksPagedResult<BlocksDataSchema>>;
        /**
         * What: reads schema summary/aggregation through `GET /data/v4/schemas/aggregation`.
         * Why: frontend admin/runtime dashboards may need schema list plus access-level summary in one response.
         * How: pass the same list filters as `schemas.list`; the SDK does not send `ProjectKey`.
         */
        aggregation: (options?: BlocksSchemaListOptions) => Promise<unknown>;
        /**
         * What: reads one schema definition by id through `GET /data/v4/schemas/get-by-id`.
         * Why: detail views need exact schema metadata when they already have the schema item id.
         * How: pass the schema id; the SDK sends it as the `id` query parameter.
         */
        getById: (id: string) => Promise<unknown>;
        /**
         * What: reads general schema info through `GET /data/v4/schemas/info`.
         * Why: generic runtime UIs can bootstrap schema metadata without naming a single schema.
         * How: call after configuring `accessToken`; the SDK sends only auth plus `x-blocks-key`.
         */
        info: () => Promise<unknown>;
        /**
         * What: reads detailed schema info through `GET /data/v4/schemas/info-by-name`.
         * Why: dynamic forms/tables need field-level metadata for one schema.
         * How: pass the schema name; the SDK sends it as `schemaName`.
         */
        infoByName: (schemaName: string) => Promise<unknown>;
    };
    files: {
        /**
         * What: reads one file record through the current file download operation.
         * Why: frontend views need file metadata or a downloadable reference by file id.
         * How: pass `fileId` and optional Data file configuration/version fields.
         */
        get: (fileId: string, options?: BlocksFileGetOptions) => Promise<unknown>;
        /**
         * What: batch-reads file metadata and download URLs.
         * Why: pages with many attachments should avoid one request per file.
         * How: pass the file-list payload exactly as Data expects; the SDK does not inject project fields.
         */
        getMany: (request: BlocksFileListRequest) => Promise<unknown>;
        /**
         * What: lists file records and metadata.
         * Why: storage browsers and attachment managers need paged file metadata before downloading content.
         * How: pass paging, sort, and filter fields; the SDK sends your request without any `projectKey`.
         */
        info: (request: BlocksFileInfoListRequest) => Promise<unknown>;
        /**
         * What: creates file/version metadata and requests a pre-signed upload URL.
         * Why: browser apps should upload binary content through the URL issued by Blocks Data.
         * How: pass file metadata plus a parent directory id or module default.
         */
        presignedUploadUrl: (request: BlocksFileUploadRequest) => Promise<unknown>;
        /**
         * What: uploads binary content to a pre-signed storage URL.
         * Why: the actual blob upload goes to cloud/object storage, not to the Blocks API host.
         * How: pass the `uploadUrl` returned by `presignedUploadUrl` plus a `Blob`, stream, or buffer; this call sends no `x-blocks-key` or bearer token.
         */
        uploadToUrl: (request: BlocksUploadToUrlRequest) => Promise<unknown>;
        /**
         * What: creates a file/version and uploads its bytes to local storage.
         * Why: local-storage deployments need multipart upload through Blocks Data instead of a pre-signed cloud URL.
         * How: pass a `Blob`/`File` and metadata; the SDK builds `FormData` and does not add `projectKey`.
         */
        uploadToLocalStorage: (request: BlocksLocalStorageUploadRequest) => Promise<unknown>;
        /**
         * What: moves a file to trash or permanently deletes it.
         * Why: storage UIs need to remove files when permissions and Data rules allow it.
         * How: pass `fileId` and an explicit `permanent` choice; false moves to trash.
         */
        delete: (request: BlocksFileDeleteRequest) => Promise<unknown>;
        /**
         * What: updates file additional properties.
         * Why: apps often need to attach searchable metadata such as agent status or business references to a file.
         * How: pass `itemId` and `additionalProperties`; the SDK forwards the request as-is except for not adding project fields.
         */
        updateAdditionalInfo: (request: BlocksFileUpdateAdditionalInfoRequest) => Promise<unknown>;
        versions: (request: BlocksFileVersionsRequest) => Promise<unknown>;
        createVersion: (request: BlocksFileCreateVersionRequest) => Promise<unknown>;
        copy: (request: BlocksFileCopyRequest) => Promise<unknown>;
        move: (request: BlocksFileMoveRequest) => Promise<unknown>;
        rename: (request: BlocksFileRenameRequest) => Promise<unknown>;
    };
    directories: {
        create: (request: BlocksDirectoryCreateRequest) => Promise<unknown>;
        get: (directoryId: string) => Promise<unknown>;
        update: (request: BlocksDirectoryUpdateRequest) => Promise<unknown>;
        delete: (request: BlocksDirectoryDeleteRequest) => Promise<unknown>;
        move: (request: BlocksDirectoryMoveRequest) => Promise<unknown>;
    };
    objects: {
        list: (request?: BlocksStorageObjectListRequest) => Promise<BlocksStorageObjectsResponse>;
        search: (request: BlocksStorageObjectSearchRequest) => Promise<BlocksStorageObjectsResponse>;
        trash: (request?: BlocksStorageObjectPageRequest) => Promise<BlocksStorageObjectsResponse>;
        shared: (request?: BlocksStorageObjectPageRequest) => Promise<BlocksStorageObjectsResponse>;
        restore: (request: BlocksStorageResourceRequest) => Promise<unknown>;
        deleteFromTrash: (request: BlocksStorageResourceRequest) => Promise<unknown>;
        accessPolicies: (resourceId: string) => Promise<unknown>;
        grantAccess: (request: BlocksStorageAccessPolicyRequest) => Promise<unknown>;
        updateAccess: (request: BlocksStorageAccessPolicyRequest) => Promise<unknown>;
        revokeAccess: (request: BlocksStorageRevokeAccessRequest) => Promise<unknown>;
        resolveAccess: (resourceId: string) => Promise<unknown>;
        toggleInheritance: (request: BlocksStorageToggleInheritanceRequest) => Promise<unknown>;
        share: (request: BlocksStorageShareRequest) => Promise<unknown>;
    };
    validations: {
        /**
         * What: lists field validation rules through `GET /data/v4/data-validations`.
         * Why: dynamic forms can render backend validation rules for schema fields.
         * How: pass optional schema/field/paging filters; the SDK does not send `ProjectKey`.
         */
        list: (options?: BlocksSchemaValidationListOptions) => Promise<unknown>;
        /**
         * What: reads one validation rule through `GET /data/v4/data-validations/get-by-id`.
         * Why: validation detail screens need one rule by id.
         * How: pass the validation id.
         */
        getById: (id: string) => Promise<unknown>;
        /**
         * What: reads all validations for a schema through `GET /data/v4/data-validations/by-schema-id`.
         * Why: form builders and runtime renderers need the validation set for one schema.
         * How: pass the schema id.
         */
        bySchemaId: (schemaId: string) => Promise<unknown>;
        /**
         * What: reads validation for one schema field through `GET /data/v4/data-validations/by-schema-and-field`.
         * Why: field renderers can load rules lazily for a single field.
         * How: pass `schemaId` and `fieldName`.
         */
        bySchemaAndField: (options: BlocksSchemaFieldValidationOptions) => Promise<unknown>;
    };
    /**
     * What: executes a GraphQL operation through `POST /data/v4/gateway`.
     * Why: the Data Gateway runtime exposes schema-backed collections through GraphQL with tenant-aware access controls.
     * How: pass `query`, optional `variables`, optional `operationName`, and optional headers such as `x-graphql-playground`.
     */
    graphql(request: BlocksGraphqlRequest): Promise<unknown>;
    utilities: {
        /**
         * What: generates a regex pattern through `POST /data/v4/regex/generate-regex`.
         * Why: schema/form builders can ask Blocks Data for a validation regex suggestion.
         * How: pass a text `description` and optional constraints; the SDK returns the generated pattern response.
         */
        generateRegex: (request: BlocksRegexGenerateRequest) => Promise<unknown>;
        /**
         * What: reads mock data through `GET /data/v4/mock-data`.
         * Why: development/test UIs may need sample data exposed by Blocks Data.
         * How: call with an authorized token; this is read-only and does not mutate stored mock data.
         */
        mockData: () => Promise<unknown>;
    };
    /**
     * What: creates CRUD helpers for a Data runtime collection.
     * Why: frontend code usually works with schema names rather than hand-written GraphQL operations.
     * How: pass the exact schema name, such as `Product`; returned helpers call `/data/v4/gateway` and never add `ProjectKey`.
     */
    collection<T = Record<string, unknown>>(schemaName: string, options?: BlocksDataCollectionOptions): BlocksDataCollection<T>;
}
