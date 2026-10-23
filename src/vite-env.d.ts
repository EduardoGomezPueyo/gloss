/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** "local" (default) or "remote". See .env.example. */
  readonly VITE_DATA_SOURCE?: string;
  /** URL of the demo workspace snapshot; without it there is no "Load demo" button. */
  readonly VITE_DEMO_URL?: string;
  /** Optional link to real scene images, shown next to "Load demo". */
  readonly VITE_DEMO_IMAGES_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
