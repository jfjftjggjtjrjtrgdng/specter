export const EXEC_TIMEOUT_MS: number = 15000;
export const ONLINE_ENDPOINTS: string[] = [
  'https://clients3.google.com/generate_204',
  'https://www.gstatic.com/generate_204',
];
export const STORAGE_KEY: string = 'specter_script_history';
export const MAX_ENTRIES: number = 240;
export const API_URLS: Record<string, string> = {
  KEY_CATALOG: 'https://rawbin.netlify.app/key/catalog',
  APP_CATALOG: 'https://rawbin.netlify.app/apps/catalog',
  INFO: '/json/info.json',
  KEYBOX_INFO: '/json/keybox_info.json',
  GITHUB: 'https://github.com/dpejoh/specter',
  TELEGRAM: 'https://t.me/dpejoh',
};
