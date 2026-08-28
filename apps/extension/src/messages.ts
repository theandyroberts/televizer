import type { TelevizerState } from "@televizer/core";

export type ContentCommand =
  | { type: "televizer:toggle" }
  | { type: "televizer:start" }
  | { type: "televizer:stop" }
  | { type: "televizer:get-state" };

export type ExtensionMessage =
  | ContentCommand
  | { type: "televizer:state"; state: TelevizerState }
  | { type: "televizer:settings-changed" };

export interface ContentResponse {
  ok: true;
  state: TelevizerState;
}
