(() => {
  const SWITCH_MODULE_KEY = "switch_chatgpt_auth_on_limit";
  void SWITCH_MODULE_KEY;

  const existing = document.querySelector('script[data-codex-app-core="1"]');
  if (existing) {
    return;
  }

  const script = document.createElement("script");
  script.src = "/ui/app-core.js";
  script.defer = true;
  script.async = false;
  script.dataset.codexAppCore = "1";
  document.head.appendChild(script);
})();
