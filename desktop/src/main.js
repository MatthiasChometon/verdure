const { invoke } = window.__TAURI__.core;
const { listen } = window.__TAURI__.event;

const dot = document.getElementById("dot");
const stateEl = document.getElementById("state");
const btnOpen = document.getElementById("btn-open");

const LABELS = { up: "En ligne", starting: "Démarrage…", down: "Arrêté" };

const render = (status) => {
  dot.className = "dot " + status;
  stateEl.textContent = LABELS[status] || status;
  btnOpen.disabled = status !== "up";
};

document.getElementById("btn-start").addEventListener("click", () => {
  invoke("start_stack");
  render("starting");
});

document.getElementById("btn-stop").addEventListener("click", () => {
  invoke("stop_stack");
  render("down");
});

btnOpen.addEventListener("click", () => invoke("open_app"));

listen("status", (event) => render(event.payload));
invoke("status").then(render).catch(() => {});
