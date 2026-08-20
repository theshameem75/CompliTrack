const LOCALIZATION_API = "/localization/v4";
export class BlocksLocalizationClient {
    http;
    dictionaries = new Map();
    activeLanguage = "";
    constructor(http) {
        this.http = http;
    }
    /**
     * What: lists available languages through `GET /localization/v4/Language/Gets`.
     * Why: apps need tenant-supported cultures for language pickers and startup locale selection.
     * How: call without an access token; the SDK still sends `x-blocks-key`.
     */
    languages() {
        return this.http.request(`${LOCALIZATION_API}/Language/Gets`, {
            auth: false
        });
    }
    /**
     * What: lists available localization modules through `GET /localization/v4/Module/Gets`.
     * Why: apps can discover which translation bundles exist for the tenant.
     * How: call without an access token; the SDK still sends `x-blocks-key`.
     */
    modules() {
        return this.http.request(`${LOCALIZATION_API}/Module/Gets`, {
            auth: false
        });
    }
    /**
     * What: loads one module dictionary through `GET /localization/v4/Key/GetUilmFile`.
     * Why: framework-neutral apps need raw translation dictionaries without adopting a specific i18n library.
     * How: pass `moduleName` and `language`; the SDK normalizes string values and caches the dictionary in this client instance.
     */
    async translations(moduleName, language) {
        const result = await this.http.request(`${LOCALIZATION_API}/Key/GetUilmFile`, {
            auth: false,
            query: { Language: language, ModuleName: moduleName }
        });
        const dictionary = normalizeDictionary(result);
        this.dictionaries.set(cacheKey(language, moduleName), dictionary);
        this.activeLanguage = language;
        return dictionary;
    }
    /**
     * What: lists languages resolved for the active Blocks tenant through `GET /localization/v4/Language/GetLanguagesForCurrentTenant`.
     * Why: multi-tenant apps should show the languages actually enabled for the tenant behind the current `x-blocks-key`.
     * How: call during app startup or settings screen load; the SDK sends `x-blocks-key` and the caller access token when configured.
     */
    languagesForCurrentTenant() {
        return this.http.request(`${LOCALIZATION_API}/Language/GetLanguagesForCurrentTenant`);
    }
    /**
     * What: lists localization modules resolved for the active Blocks tenant through `GET /localization/v4/Module/GetModulesForCurrentTenant`.
     * Why: apps can discover tenant-scoped bundles such as `common`, `dashboard`, or feature modules before loading translations.
     * How: call with the configured client; the tenant is selected by `x-blocks-key`, not by a `ProjectKey` query/body value.
     */
    modulesForCurrentTenant() {
        return this.http.request(`${LOCALIZATION_API}/Module/GetModulesForCurrentTenant`);
    }
    /**
     * What: loads the authorized cloud UILM dictionary through `GET /localization/v4/Key/GetCloudUilmFile`.
     * Why: signed-in app surfaces can load protected tenant dictionaries while keeping session/token ownership in the caller app.
     * How: pass `moduleName` and `language`; the SDK sends the caller access token when configured, normalizes string values, and caches the result for `t()`.
     */
    async cloudTranslations(moduleName, language) {
        const result = await this.http.request(`${LOCALIZATION_API}/Key/GetCloudUilmFile`, {
            query: { Language: language, ModuleName: moduleName }
        });
        const dictionary = normalizeDictionary(result);
        this.dictionaries.set(cacheKey(language, moduleName), dictionary);
        this.activeLanguage = language;
        return dictionary;
    }
    /**
     * What: retrieves exact localization key records through `POST /localization/v4/Key/GetsByKeyNames`.
     * Why: apps sometimes need key metadata or selected translations without downloading a whole module dictionary.
     * How: pass `keyNames` and optional `moduleId`; the SDK posts the body as-is except it removes any accidental `ProjectKey`/`projectKey`.
     */
    keysByNames(request) {
        return this.http.request(`${LOCALIZATION_API}/Key/GetsByKeyNames`, {
            body: withoutProjectKey(request),
            method: "POST"
        });
    }
    /**
     * What: loads multiple module dictionaries and merges them.
     * Why: most apps need several translation modules during startup.
     * How: pass a language and module list; later modules overwrite earlier keys if the same key appears twice.
     */
    async load(language, modules) {
        const dictionaries = await Promise.all(modules.map((moduleName) => this.translations(moduleName, language)));
        return Object.assign({}, ...dictionaries);
    }
    /**
     * What: loads multiple authorized cloud UILM dictionaries and merges them.
     * Why: signed-in runtime areas can hydrate all protected translation modules needed for a screen in one app-level call.
     * How: pass a language and module list; later modules overwrite earlier keys if the same key appears twice.
     */
    async loadCloud(language, modules) {
        const dictionaries = await Promise.all(modules.map((moduleName) => this.cloudTranslations(moduleName, language)));
        return Object.assign({}, ...dictionaries);
    }
    /**
     * What: resolves a translated string from dictionaries already loaded by `translations()` or `load()`.
     * Why: simple apps can read labels without adding a framework-specific localization package.
     * How: pass a key, optional fallback, and optional `language`/`moduleName`; missing keys return fallback or the key.
     */
    t(key, fallback, options = {}) {
        const language = options.language ?? this.activeLanguage;
        if (options.moduleName) {
            return this.dictionaries.get(cacheKey(language, options.moduleName))?.[key] ?? fallback ?? key;
        }
        for (const [dictionaryKey, dictionary] of this.dictionaries) {
            if (language && !dictionaryKey.startsWith(`${language}:`))
                continue;
            const value = dictionary[key];
            if (value)
                return value;
        }
        return fallback ?? key;
    }
}
function normalizeDictionary(value) {
    if (typeof value === "object" && value) {
        const record = value;
        if (typeof record.data === "object" && record.data)
            return stringifyValues(record.data);
        return stringifyValues(record);
    }
    return {};
}
function stringifyValues(record) {
    const result = {};
    for (const [key, value] of Object.entries(record)) {
        if (typeof value === "string")
            result[key] = value;
    }
    return result;
}
function cacheKey(language, moduleName) {
    return `${language}:${moduleName}`;
}
function withoutProjectKey(value) {
    const clone = { ...value };
    delete clone.ProjectKey;
    delete clone.projectKey;
    return clone;
}
