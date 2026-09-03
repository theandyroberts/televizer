import { Televizer, type TelevizerState } from "@televizer/core";
import Chart from "chart.js/auto";
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
      ? ` ${state.scope}${transformLabels[state.transform]}${
          state.comparisonDirection === "lower" ? " · lower wins" : ""
        }`
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

const chartCanvas = document.querySelector<HTMLCanvasElement>("#performance-chart");
if (chartCanvas) {
  new Chart(chartCanvas, {
    type: "bar",
    data: {
      labels: ["Codex", "Muse", "Claude", "Kimi", "OpenCode", "Grok", "Cursor"],
      datasets: [
        {
          label: "DeepSWE score",
          data: [69, 68, 66, 64, 60, 52, 29],
          backgroundColor: [
            "#17191d",
            "#2789ed",
            "#ce6743",
            "#287cf5",
            "#36a657",
            "#7469cf",
            "#737b89",
          ],
          borderRadius: 7,
          borderSkipped: false,
        },
      ],
    },
    options: {
      animation: false,
      maintainAspectRatio: false,
      interaction: { intersect: true, mode: "nearest" },
      plugins: {
        legend: { display: false },
        tooltip: {
          displayColors: false,
          padding: 13,
          titleFont: { size: 14, weight: "bold" },
          bodyFont: { size: 15, weight: "bold" },
          callbacks: {
            label: (context) => `Score: ${context.formattedValue}`,
          },
        },
      },
      scales: {
        x: {
          border: { display: false },
          grid: { display: false },
          ticks: { color: "#343941", font: { size: 12, weight: 600 } },
        },
        y: {
          beginAtZero: true,
          suggestedMax: 75,
          border: { display: false },
          grid: { color: "#dfe3e8" },
          ticks: { color: "#737983", font: { size: 11 } },
        },
      },
    },
  });
}
