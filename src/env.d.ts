/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_MONOCO_API_URL: string;
  readonly VITE_APP_ENV: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
