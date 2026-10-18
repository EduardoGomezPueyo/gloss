import 'i18next';
import type { resources } from './index';

// Type-safe translation keys, using English as the reference locale.
declare module 'i18next' {
  interface CustomTypeOptions {
    defaultNS: 'translation';
    resources: (typeof resources)['en'];
  }
}
