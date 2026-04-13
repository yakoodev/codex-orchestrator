(() => {
  const existing = document.querySelector('script[data-codex-app-core-main="1"]');
  if (existing) {
    return;
  }

  const script = document.createElement("script");
  script.src = "/ui/app-core-main.js";
  script.defer = true;
  script.async = false;
  script.dataset.codexAppCoreMain = "1";
  document.head.appendChild(script);
})();
