/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** Unset for the main marketplace; a campus slug (e.g. "ashesi") for a campus site. */
  readonly VITE_APP_MODE?: string;
}
