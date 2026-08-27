import { Televizer, type TelevizerState } from "@televizer/core";
import "./styles.css";

const televizer = new Televizer().mount();
const activate = document.querySelector<HTMLButtonElement>("#activate");
const modeState = document.querySelector<HTMLElement>("#mode-state");

function renderState(state: TelevizerState): void {
  document.body.classList.toggle("televizer-active", state.active);
  if (modeState) {
    modeState.classList.toggle("on", state.active);
    const transformLabels: Record<TelevizerState["transform"], string> = {
      values: "",
      rank: " · ordinal",
      difference: " · gap",
      percent: " · % gap",
    };
    modeState.lastChild!.textContent = state.active
      ? ` ${state.scope}${transformLabels[state.transform]}`
      : " Off";
  }
  if (activate) {
    activate.firstChild!.textContent = state.active
      ? "Stop Televizer "
      : "Start Televizer ";
  }
}

activate?.addEventListener("click", () => televizer.toggle());
document.addEventListener("televizer:statechange", (event) => {
  renderState((event as CustomEvent<TelevizerState>).detail);
});
renderState(televizer.getState() as TelevizerState);

Object.assign(window, { televizer });
