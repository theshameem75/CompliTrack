import { BlocksHttpClient } from "../http/http-client.js";
import { BlocksLocalizationDictionary, BlocksLocalizationKeysByNamesRequest, BlocksLocalizationKeysByNamesResponse, BlocksLocalizationLanguage, BlocksLocalizationModule } from "./types.js";
export declare class BlocksLocalizationClient {
    private readonly http;
    private readonly dictionaries;
    private activeLanguage;
    constructor(http: BlocksHttpClient);
    /**
     * What: lists available languages through `GET /localization/v4/Language/Gets`.
     * Why: apps need tenant-supported cultures for language pickers and startup locale selection.
     * How: call without an access token; the SDK still sends `x-blocks-key`.
     */
    languages(): Promise<BlocksLocalizationLanguage[]>;
    /**
     * What: lists available localization modules through `GET /localization/v4/Module/Gets`.
     * Why: apps can discover which translation bundles exist for the tenant.
     * How: call without an access token; the SDK still sends `x-blocks-key`.
     */
    modules(): Promise<BlocksLocalizationModule[]>;
    /**
     * What: loads one module dictionary through `GET /localization/v4/Key/GetUilmFile`.
     * Why: framework-neutral apps need raw translation dictionaries without adopting a specific i18n library.
     * How: pass `moduleName` and `language`; the SDK normalizes string values and caches the dictionary in this client instance.
     */
    translations(moduleName: string, language: string): Promise<BlocksLocalizationDictionary>;
    /**
     * What: lists languages resolved for the active Blocks tenant through `GET /localization/v4/Language/GetLanguagesForCurrentTenant`.
     * Why: multi-tenant apps should show the languages actually enabled for the tenant behind the current `x-blocks-key`.
     * How: call during app startup or settings screen load; the SDK sends `x-blocks-key` and the caller access token when configured.
     */
    languagesForCurrentTenant(): Promise<BlocksLocalizationLanguage[]>;
    /**
     * What: lists localization modules resolved for the active Blocks tenant through `GET /localization/v4/Module/GetModulesForCurrentTenant`.
     * Why: apps can discover tenant-scoped bundles such as `common`, `dashboard`, or feature modules before loading translations.
     * How: call with the configured client; the tenant is selected by `x-blocks-key`, not by a `ProjectKey` query/body value.
     */
    modulesForCurrentTenant(): Promise<BlocksLocalizationModule[]>;
    /**
     * What: loads the authorized cloud UILM dictionary through `GET /localization/v4/Key/GetCloudUilmFile`.
     * Why: signed-in app surfaces can load protected tenant dictionaries while keeping session/token ownership in the caller app.
     * How: pass `moduleName` and `language`; the SDK sends the caller access token when configured, normalizes string values, and caches the result for `t()`.
     */
    cloudTranslations(moduleName: string, language: string): Promise<BlocksLocalizationDictionary>;
    /**
     * What: retrieves exact localization key records through `POST /localization/v4/Key/GetsByKeyNames`.
     * Why: apps sometimes need key metadata or selected translations without downloading a whole module dictionary.
     * How: pass `keyNames` and optional `moduleId`; the SDK posts the body as-is except it removes any accidental `ProjectKey`/`projectKey`.
     */
    keysByNames(request: BlocksLocalizationKeysByNamesRequest): Promise<BlocksLocalizationKeysByNamesResponse>;
    /**
     * What: loads multiple module dictionaries and merges them.
     * Why: most apps need several translation modules during startup.
     * How: pass a language and module list; later modules overwrite earlier keys if the same key appears twice.
     */
    load(language: string, modules: string[]): Promise<BlocksLocalizationDictionary>;
    /**
     * What: loads multiple authorized cloud UILM dictionaries and merges them.
     * Why: signed-in runtime areas can hydrate all protected translation modules needed for a screen in one app-level call.
     * How: pass a language and module list; later modules overwrite earlier keys if the same key appears twice.
     */
    loadCloud(language: string, modules: string[]): Promise<BlocksLocalizationDictionary>;
    /**
     * What: resolves a translated string from dictionaries already loaded by `translations()` or `load()`.
     * Why: simple apps can read labels without adding a framework-specific localization package.
     * How: pass a key, optional fallback, and optional `language`/`moduleName`; missing keys return fallback or the key.
     */
    t(key: string, fallback?: string, options?: {
        language?: string;
        moduleName?: string;
    }): string;
}
