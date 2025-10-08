/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_ML_DETECTOR_URL: string;
  readonly VITE_AI_ASSISTANT_URL: string;
  readonly VITE_ANOMALIES_REFRESH_INTERVAL: string;
  readonly VITE_IPS_REFRESH_INTERVAL: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}


