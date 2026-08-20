import { createBlocksClient } from '/vendor/blocks-client/index.js';

const SESSION_KEY = 'complitrack.session';
export const getSession = () => JSON.parse(localStorage.getItem(SESSION_KEY) || 'null');
export const setSession = session => localStorage.setItem(SESSION_KEY, JSON.stringify(session));
export const clearSession = () => localStorage.removeItem(SESSION_KEY);

export const blocks = createBlocksClient({
  apiUrl: 'https://blocksapi.slsblx.com',
  xBlocksKey: 'Dba0c99247e2e4e4091e1bfbcc3648396',
  accessToken: () => getSession()?.access_token || getSession()?.accessToken
});
