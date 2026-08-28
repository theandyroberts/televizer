import {
  readSettings,
  writeSettings,
  type ExtensionSettings,
} from "./settings";
import type { ExtensionMessage } from "./messages";

const autoEverywhere = document.querySelector<HTMLInputElement>(
  "#auto-everywhere",
)!;
const siteList = document.querySelector<HTMLUListElement>("#site-list")!;
const emptySites = document.querySelector<HTMLElement>("#empty-sites")!;
const permissionStatus = document.querySelector<HTMLElement>(
  "#permission-status",
)!;

let settings: ExtensionSettings;

function originLabel(pattern: string): string {
  return pattern.replace(/\/\*$/, "");
}

function notifySettingsChanged(): void {
  const message: ExtensionMessage = { type: "televizer:settings-changed" };
  void chrome.runtime.sendMessage(message);
}

function render(): void {
  autoEverywhere.checked = settings.autoEverywhere;
  siteList.replaceChildren();
  emptySites.hidden = settings.autoSites.length > 0;

  for (const site of settings.autoSites) {
    const item = document.createElement("li");
    const label = document.createElement("span");
    label.textContent = originLabel(site);
    const remove = document.createElement("button");
    remove.type = "button";
    remove.textContent = "Remove";
    remove.addEventListener("click", () => void removeSite(site));
    item.append(label, remove);
    siteList.append(item);
  }
}

async function removeSite(site: string): Promise<void> {
  settings.autoSites = settings.autoSites.filter((item) => item !== site);
  await chrome.permissions.remove({ origins: [site] });
  settings = await writeSettings(settings);
  notifySettingsChanged();
  render();
}

autoEverywhere.addEventListener("change", async () => {
  permissionStatus.textContent = "";
  const enabled = autoEverywhere.checked;
  if (enabled) {
    const granted = await chrome.permissions.request({
      origins: ["<all_urls>"],
    });
    if (!granted) {
      autoEverywhere.checked = false;
      permissionStatus.textContent = "Chrome did not grant all-sites access.";
      return;
    }
  } else {
    await chrome.permissions.remove({ origins: ["<all_urls>"] });
  }

  settings.autoEverywhere = enabled;
  settings = await writeSettings(settings);
  notifySettingsChanged();
  permissionStatus.textContent = enabled
    ? "Automatic access is enabled everywhere."
    : "Televizer now uses on-demand and selected-site access.";
  render();
});

void readSettings().then((stored) => {
  settings = stored;
  render();
});
