/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_ANALYTICS_DEBUG?: string;
  readonly VITE_POSTHOG_PROJECT_TOKEN?: string;
  readonly VITE_POSTHOG_HOST?: string;
}
