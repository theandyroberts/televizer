export const SETTINGS_KEY = "televizerSettings";

export interface ExtensionSettings {
  autoEverywhere: boolean;
  autoSites: string[];
}

export const DEFAULT_SETTINGS: ExtensionSettings = {
  autoEverywhere: false,
  autoSites: [],
};

export function sitePatternForUrl(url: string): string | null {
  try {
    const parsed = new URL(url);
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
      return null;
    }
    return `${parsed.origin}/*`;
  } catch {
    return null;
  }
}

export function normalizeSettings(
  value: Partial<ExtensionSettings> | undefined,
): ExtensionSettings {
  const autoSites = Array.from(
    new Set(
      (Array.isArray(value?.autoSites) ? value.autoSites : []).filter(
        (site): site is string =>
          typeof site === "string" && sitePatternForUrl(site) === site,
      ),
    ),
  ).sort();

  return {
    autoEverywhere: value?.autoEverywhere === true,
    autoSites,
  };
}

export async function readSettings(): Promise<ExtensionSettings> {
  const stored = await chrome.storage.local.get(SETTINGS_KEY);
  return normalizeSettings(
    stored[SETTINGS_KEY] as Partial<ExtensionSettings> | undefined,
  );
}

export async function writeSettings(
  settings: ExtensionSettings,
): Promise<ExtensionSettings> {
  const normalized = normalizeSettings(settings);
  await chrome.storage.local.set({ [SETTINGS_KEY]: normalized });
  return normalized;
}

export function isAutomaticForUrl(
  settings: ExtensionSettings,
  url: string,
): boolean {
  if (settings.autoEverywhere) return true;
  const pattern = sitePatternForUrl(url);
  return pattern !== null && settings.autoSites.includes(pattern);
}
