// Утилиты

window.setAIButtonState = function(button, state) {
  if (!button) return;
  button.classList.remove("state-nokey", "state-ready", "state-loading");
  button.classList.add("state-" + state);
  button.textContent = state === "loading" ? "Думает…" : "AI →";
};

window.hasValidApiKey = function() {
  var key = localStorage.getItem("herbarium_ai_key");
  return Boolean(key) && key.length > 10;
};
