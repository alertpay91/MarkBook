// Page helper for MarkBook (debug dump for now).
(() => {
  const port = browser.runtime.connectNative("markbook");
  const log = (text) => port.postMessage({ type: "log", text });
  port.onMessage.addListener((msg) => {
    if (msg.type === "dump") log("dump " + location.href + " " + document.title);
  });
  log("helper on " + location.href);
})();
