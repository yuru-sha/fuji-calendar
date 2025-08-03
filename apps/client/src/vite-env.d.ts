/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly APP_VERSION: string;
  readonly APP_NAME: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}