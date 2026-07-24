(() => {
  "use strict";

  const script = document.currentScript;
  if (!script) return;
  const root = new URL(".", script.src);
  const params = new URLSearchParams(location.search);
  let debug = params.get("debug") === "1";
  try {
    if (window.self !== window.top) {
      const topParams = new URLSearchParams(window.top.location.search);
      debug = debug || topParams.has("scene");
    }
  } catch (_) {}

  const style = document.createElement("style");
  style.textContent = `
    #qgJourneyExit:not(.tool){position:fixed;top:14px;right:116px;z-index:50;width:44px;height:44px;border:1px solid rgba(131,153,143,.35);
      border-radius:3px;background:rgba(11,24,20,.45);color:#83998f;opacity:.72;cursor:pointer;font:20px -apple-system,BlinkMacSystemFont,"PingFang SC",sans-serif;
      transition:color .2s ease,border-color .2s ease,opacity .2s ease,background-color .2s ease}
    #qgJourneyExit:not(.tool):hover{color:#c66858;border-color:rgba(198,104,88,.72);opacity:1;background:rgba(7,16,14,.72)}
    #qgJourneyExit:focus-visible,#qgExitDialog button:focus-visible{outline:2px solid #d2ae68;outline-offset:2px}
    #qgExitDialog{position:fixed;inset:0;z-index:120;display:grid;place-items:center;padding:24px;background:rgba(6,9,8,.9);
      color:#ede7d8;font-family:"Songti SC","STSong","SimSun",serif;opacity:0;visibility:hidden;pointer-events:none;
      transition:opacity .22s ease,visibility .22s ease}
    #qgExitDialog.open{opacity:1;visibility:visible;pointer-events:auto}
    #qgExitDialog .qg-exit-inner{width:min(520px,calc(100vw - 40px));padding:34px 30px;border-top:1px solid rgba(198,104,88,.65);
      border-bottom:1px solid rgba(198,104,88,.65);text-align:center;background:#07100e}
    #qgExitDialog h2{margin:0;font-size:28px;font-weight:400;letter-spacing:0}
    #qgExitDialog p{margin:18px auto 0;max-width:410px;color:#83998f;font:13px/1.9 -apple-system,BlinkMacSystemFont,"PingFang SC",sans-serif}
    #qgExitDialog .qg-exit-actions{display:flex;justify-content:center;gap:12px;margin-top:28px}
    #qgExitDialog button{min-height:44px;padding:0 18px;border:1px solid rgba(131,153,143,.42);border-radius:0;background:transparent;
      color:#ede7d8;cursor:pointer;font:13px -apple-system,BlinkMacSystemFont,"PingFang SC",sans-serif}
    #qgExitDialog .qg-exit-confirm{border-color:rgba(198,104,88,.75);color:#d2ae68}
    @media(max-width:540px){#qgExitDialog .qg-exit-actions{flex-direction:column}#qgExitDialog button{width:100%}}
    @media(prefers-reduced-motion:reduce){#qgJourneyExit,#qgExitDialog{transition:none!important}}
  `;
  document.head.appendChild(style);

  const button = document.createElement("button");
  button.id = "qgJourneyExit";
  button.type = "button";
  button.innerHTML = '<span aria-hidden="true">×</span>';
  button.setAttribute("aria-label", "结束本次游园");
  button.title = "结束本次游园";
  const rail = document.querySelector(".toolrail");
  if (rail) button.className = "tool";
  (rail || document.body).appendChild(button);

  const dialog = document.createElement("div");
  dialog.id = "qgExitDialog";
  dialog.setAttribute("role", "dialog");
  dialog.setAttribute("aria-modal", "true");
  dialog.setAttribute("aria-labelledby", "qgExitTitle");
  dialog.innerHTML = `
    <div class="qg-exit-inner">
      <h2 id="qgExitTitle">暫 離 此 園？</h2>
      <p>${debug ? "将结束当前单幕测试、关闭摄像头与麦克风，并返回测试总览。" : "将结束本次游园、关闭摄像头与麦克风，并退出全屏。下次从预备幕重新选择观游方式。"}</p>
      <div class="qg-exit-actions">
        <button type="button" data-qg-exit-cancel>繼 續 游 園</button>
        <button type="button" class="qg-exit-confirm" data-qg-exit-confirm>${debug ? "返 回 測 試 總 覽" : "結 束 並 返 回"}</button>
      </div>
    </div>`;
  document.body.appendChild(dialog);

  const cancel = dialog.querySelector("[data-qg-exit-cancel]");
  const confirm = dialog.querySelector("[data-qg-exit-confirm]");
  let previousFocus = null;
  function closeDialog() {
    dialog.classList.remove("open");
    button.removeAttribute("aria-expanded");
    if (previousFocus && previousFocus.focus) previousFocus.focus();
  }
  function openDialog(event) {
    if (event) { event.stopPropagation(); event.preventDefault(); }
    previousFocus = document.activeElement;
    dialog.classList.add("open");
    button.setAttribute("aria-expanded", "true");
    cancel.focus();
  }
  function leaveJourney() {
    try {
      sessionStorage.removeItem("qg_journey_active");
      sessionStorage.removeItem("qg_input_mode");
    } catch (_) {}
    window.dispatchEvent(new CustomEvent("qg:journey-exit"));
    try {
      const doc = window.self !== window.top ? window.top.document : document;
      if (doc.fullscreenElement && doc.exitFullscreen) {
        const result = doc.exitFullscreen();
        if (result && result.catch) result.catch(() => {});
      }
    } catch (_) {}
    const destination = new URL(debug ? "测试总览.html" : "量子游园·丙·交互体验.html?prelude=1", root);
    setTimeout(() => {
      try {
        if (debug && window.self !== window.top) window.top.location.replace(destination.href);
        else location.replace(destination.href);
      } catch (_) {
        location.replace(destination.href);
      }
    }, 90);
  }

  button.addEventListener("click", openDialog);
  cancel.addEventListener("click", event => { event.stopPropagation(); closeDialog(); });
  confirm.addEventListener("click", event => { event.stopPropagation(); leaveJourney(); });
  dialog.addEventListener("click", event => { if (event.target === dialog) closeDialog(); });
  addEventListener("keydown", event => {
    if (event.key === "Escape" && dialog.classList.contains("open")) {
      event.preventDefault();
      event.stopPropagation();
      closeDialog();
    }
  }, { capture: true });
})();
