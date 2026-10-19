/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** "local" (default) or "remote". See .env.example. */
  readonly VITE_DATA_SOURCE?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
