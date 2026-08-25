const projectDefaults = {
  apiUrl: "https://blocksapi.slsblx.com",
  appDomain: "https://sbgmze-eiuwy.slsblx.com",
  oidcUrl: "https://iam.seliseblocks.com",
  oidcClientId: "4488fa83-b98b-4ab1-a3a6-fe9a4ae6ccf0",
  xBlocksKey: "Sba0c99247e2e4e4091e1bfbcc3648396"
} as const;

export const blocksConfig = {
  apiUrl: (import.meta.env.VITE_BLOCKS_API_URL as string) || projectDefaults.apiUrl,
  appDomain: (import.meta.env.VITE_BLOCKS_APP_DOMAIN as string) || projectDefaults.appDomain,
  oidcUrl: (import.meta.env.VITE_BLOCKS_OIDC_URL as string) || projectDefaults.oidcUrl,
  oidcClientId: (import.meta.env.VITE_BLOCKS_OIDC_CLIENT_ID as string) || projectDefaults.oidcClientId,
  oidcScope: (import.meta.env.VITE_BLOCKS_OIDC_SCOPE as string) || "openid profile",
  // This project's tenant id -- sent as the x-blocks-key header on every
  // Blocks API call, and as tenant_id on the OIDC login request.
  xBlocksKey: (import.meta.env.VITE_BLOCKS_X_BLOCKS_KEY as string) || projectDefaults.xBlocksKey
};

export function isBlocksConfigured(): boolean {
  return Boolean(blocksConfig.apiUrl && blocksConfig.xBlocksKey && blocksConfig.appDomain);
}

export function isLoginConfigured(): boolean {
  return Boolean(blocksConfig.apiUrl && blocksConfig.oidcUrl && blocksConfig.oidcClientId);
}
