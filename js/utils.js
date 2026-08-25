// Утилиты

export function setAIButtonState(button, state) {
  if (!button) return;
  button.classList.remove("state-nokey", "state-ready", "state-loading");
  button.classList.add(`state-${state}`);
  button.textContent = state === "loading" ? "Думает…" : "AI →";
}

export function hasValidApiKey() {
  const key = localStorage.getItem('herbarium_ai_key');
  return Boolean(key) && key.length > 10;
}

export function debounce(fn, ms) {
  let t;
  return (...args) => {
    clearTimeout(t);
    t = setTimeout(() => fn(...args), ms);
  };
}
