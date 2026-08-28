import type {
  ContentCommand,
  ContentResponse,
  ExtensionMessage,
} from "./messages";
import {
  readSettings,
  sitePatternForUrl,
  writeSettings,
  type ExtensionSettings,
} from "./settings";

const AUTO_SCRIPT_ID = "televizer-auto";
const MENU_AUTO_SITE = "televizer-auto-site";
const MENU_AUTO_EVERYWHERE = "televizer-auto-everywhere";
const MENU_SETTINGS = "televizer-settings";

async function updateBadge(tabId: number, active: boolean): Promise<void> {
  await chrome.action.setBadgeBackgroundColor({
    tabId,
    color: active ? "#38d9f5" : "#5b6474",
  });
  await chrome.action.setBadgeText({ tabId, text: active ? "ON" : "" });
  await chrome.action.setTitle({
    tabId,
    title: active ? "Turn Televizer off" : "Turn Televizer on",
  });
}

async function sendToTab(
  tabId: number,
  command: ContentCommand,
): Promise<ContentResponse> {
  try {
    return (await chrome.tabs.sendMessage(tabId, command)) as ContentResponse;
  } catch {
    await chrome.scripting.executeScript({
      target: { tabId },
      files: ["content-script.js"],
    });
    return (await chrome.tabs.sendMessage(tabId, command)) as ContentResponse;
  }
}

async function runCommandOnTab(
  tab: chrome.tabs.Tab,
  command: ContentCommand,
): Promise<void> {
  if (tab.id === undefined) return;
  try {
    const response = await sendToTab(tab.id, command);
    await updateBadge(tab.id, response.state.active);
  } catch {
    await chrome.action.setBadgeBackgroundColor({
      tabId: tab.id,
      color: "#c54b62",
    });
    await chrome.action.setBadgeText({ tabId: tab.id, text: "!" });
    await chrome.action.setTitle({
      tabId: tab.id,
      title: "Televizer cannot run on this browser-controlled page",
    });
  }
}

async function refreshAutomaticContentScript(
  settings?: ExtensionSettings,
): Promise<void> {
  const currentSettings = settings ?? (await readSettings());
  await chrome.scripting
    .unregisterContentScripts({ ids: [AUTO_SCRIPT_ID] })
    .catch(() => undefined);

  const matches = currentSettings.autoEverywhere
    ? ["<all_urls>"]
    : currentSettings.autoSites;
  if (matches.length === 0) return;

  await chrome.scripting.registerContentScripts([
    {
      id: AUTO_SCRIPT_ID,
      matches,
      js: ["content-script.js"],
      runAt: "document_idle",
      persistAcrossSessions: true,
    },
  ]);
}

async function reconcilePermissions(): Promise<ExtensionSettings> {
  const settings = await readSettings();
  const autoEverywhere = settings.autoEverywhere
    ? await chrome.permissions.contains({ origins: ["<all_urls>"] })
    : false;
  const permissionChecks = await Promise.all(
    settings.autoSites.map(async (site) => ({
      site,
      allowed: await chrome.permissions.contains({ origins: [site] }),
    })),
  );
  const reconciled = {
    autoEverywhere,
    autoSites: permissionChecks
      .filter(({ allowed }) => allowed)
      .map(({ site }) => site),
  };
  return writeSettings(reconciled);
}

async function installMenus(): Promise<void> {
  await chrome.contextMenus.removeAll();
  chrome.contextMenus.create({
    id: MENU_AUTO_SITE,
    contexts: ["action"],
    title: "Automatically enable on this website",
  });
  chrome.contextMenus.create({
    id: MENU_AUTO_EVERYWHERE,
    contexts: ["action"],
    title: "Automatically enable everywhere",
  });
  chrome.contextMenus.create({
    id: "televizer-separator",
    contexts: ["action"],
    type: "separator",
  });
  chrome.contextMenus.create({
    id: MENU_SETTINGS,
    contexts: ["action"],
    title: "Manage Televizer settings",
  });
}

async function setAutoSite(
  tab: chrome.tabs.Tab,
  enabled: boolean,
): Promise<void> {
  if (!tab.url) return;
  const pattern = sitePatternForUrl(tab.url);
  if (!pattern) return;

  if (enabled) {
    const granted = await chrome.permissions.request({ origins: [pattern] });
    if (!granted) return;
  }

  const settings = await readSettings();
  if (enabled) {
    settings.autoSites = [...settings.autoSites, pattern];
  } else {
    settings.autoSites = settings.autoSites.filter((site) => site !== pattern);
    await chrome.permissions.remove({ origins: [pattern] });
  }

  const updated = await writeSettings(settings);
  await refreshAutomaticContentScript(updated);
  if (enabled) await runCommandOnTab(tab, { type: "televizer:start" });
}

async function setAutoEverywhere(
  tab: chrome.tabs.Tab | undefined,
  enabled: boolean,
): Promise<void> {
  if (enabled) {
    const granted = await chrome.permissions.request({
      origins: ["<all_urls>"],
    });
    if (!granted) return;
  } else {
    await chrome.permissions.remove({ origins: ["<all_urls>"] });
  }
  const settings = await readSettings();
  settings.autoEverywhere = enabled;
  const updated = await writeSettings(settings);
  await refreshAutomaticContentScript(updated);
  if (enabled && tab) {
    await runCommandOnTab(tab, { type: "televizer:start" });
  }
}

chrome.action.onClicked.addListener((tab) => {
  void runCommandOnTab(tab, { type: "televizer:toggle" });
});

chrome.commands.onCommand.addListener((command, tab) => {
  if (command === "toggle-televizer" && tab) {
    void runCommandOnTab(tab, { type: "televizer:toggle" });
  }
});

chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (info.menuItemId === MENU_AUTO_SITE && tab) {
    void setAutoSite(tab, true);
  } else if (info.menuItemId === MENU_AUTO_EVERYWHERE) {
    void setAutoEverywhere(tab, true);
  } else if (info.menuItemId === MENU_SETTINGS) {
    void chrome.runtime.openOptionsPage();
  }
});

chrome.runtime.onMessage.addListener(
  (message: ExtensionMessage, sender) => {
    if (message.type === "televizer:state" && sender.tab?.id !== undefined) {
      void updateBadge(sender.tab.id, message.state.active);
    } else if (message.type === "televizer:settings-changed") {
      void reconcilePermissions().then(refreshAutomaticContentScript);
    }
  },
);

chrome.runtime.onInstalled.addListener(() => {
  void installMenus().then(async () => {
    const settings = await reconcilePermissions();
    await refreshAutomaticContentScript(settings);
  });
});

chrome.runtime.onStartup.addListener(() => {
  void reconcilePermissions().then(refreshAutomaticContentScript);
});

chrome.permissions.onRemoved.addListener(() => {
  void reconcilePermissions().then(refreshAutomaticContentScript);
});

chrome.tabs.onUpdated.addListener((tabId, changeInfo) => {
  if (changeInfo.status === "loading") void updateBadge(tabId, false);
});
