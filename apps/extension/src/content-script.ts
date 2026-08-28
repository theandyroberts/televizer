import { Televizer, type TelevizerState } from "@televizer/core";
import type {
  ContentCommand,
  ContentResponse,
  ExtensionMessage,
} from "./messages";
import { isAutomaticForUrl, readSettings } from "./settings";

interface ContentRuntime {
  televizer: Televizer;
  ready: Promise<void>;
}

declare global {
  interface Window {
    __televizerExtensionRuntime__?: ContentRuntime;
  }
}

function reportState(state: Readonly<TelevizerState>): void {
  const message: ExtensionMessage = {
    type: "televizer:state",
    state: { ...state },
  };
  void chrome.runtime.sendMessage(message).catch(() => undefined);
}

if (!window.__televizerExtensionRuntime__) {
  const televizer = new Televizer().mount();
  const runtime: ContentRuntime = {
    televizer,
    ready: Promise.resolve(),
  };
  window.__televizerExtensionRuntime__ = runtime;

  document.addEventListener("televizer:statechange", (event) => {
    reportState((event as CustomEvent<TelevizerState>).detail);
  });

  chrome.runtime.onMessage.addListener(
    (
      message: ContentCommand,
      _sender,
      sendResponse: (response: ContentResponse) => void,
    ) => {
      if (!message.type.startsWith("televizer:")) return false;

      void runtime.ready.then(() => {
        if (message.type === "televizer:toggle") televizer.toggle();
        else if (message.type === "televizer:start") televizer.start();
        else if (message.type === "televizer:stop") televizer.stop();
        sendResponse({ ok: true, state: { ...televizer.getState() } });
      });
      return true;
    },
  );

  runtime.ready = readSettings()
    .then((settings) => {
      if (isAutomaticForUrl(settings, window.location.href)) televizer.start();
    })
    .finally(() => reportState(televizer.getState()));
}
