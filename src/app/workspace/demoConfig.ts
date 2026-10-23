/** Where the demo comes from (DECISIONS D34). Both are optional: forks run without a demo. */
export interface DemoConfig {
  /** URL of the demo workspace snapshot (JSON). */
  url: string;
  /** Optional link to real scene images people can upload themselves. */
  imagesUrl: string | null;
}

export function readDemoConfig(
  url = import.meta.env.VITE_DEMO_URL,
  imagesUrl = import.meta.env.VITE_DEMO_IMAGES_URL,
): DemoConfig | null {
  if (!url) return null;
  return { url, imagesUrl: imagesUrl || null };
}
