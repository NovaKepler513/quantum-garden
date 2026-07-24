(() => {
  "use strict";

  const MODE_KEY = "qg_input_mode";
  const state = {
    loading: false, ready: false, active: false, observing: false,
    sx: 0, sy: 0, lastSample: 0, spd: 0, dwell: 0, fx: null, fy: null, warp: null
  };
  const canvas = document.querySelector("canvas");
  if (!canvas) return;
  const safe = fn => { try { fn(); } catch (_) {} };

  const style = document.createElement("style");
  style.textContent = `
    #qgGazeToggle{position:fixed;top:14px;right:66px;z-index:50;width:44px;height:44px;border:1px solid rgba(131,153,143,.35);
      border-radius:3px;background:rgba(11,24,20,.45);color:#83998f;opacity:.72;cursor:pointer;font:16px "Songti SC","STSong",serif;
      transition:color .2s ease,border-color .2s ease,opacity .2s ease,background-color .2s ease}
    #qgGazeToggle:hover,#qgGazeToggle[data-active="true"]{color:#c66858;border-color:rgba(198,104,88,.72);opacity:1;background:rgba(7,16,14,.72)}
    #qgGazeToggle:focus-visible{outline:2px solid #d2ae68;outline-offset:2px}
    #qgGazePoint{position:fixed;left:0;top:0;z-index:49;pointer-events:none;opacity:0;transform:translate(-50%,-50%);
      color:#d2ae68;font:18px "Songti SC","STSong",serif;text-shadow:0 0 14px rgba(210,174,104,.55);transition:opacity .12s ease}
    #qgGazePoint.on{opacity:.82}
    #webgazerVideoContainer,#webgazerVideoFeed,#webgazerFaceOverlay,#webgazerFaceFeedbackBox,#webgazerGazeDot{display:none!important}
  `;
  document.head.appendChild(style);

  const button = document.createElement("button");
  button.id = "qgGazeToggle";
  button.type = "button";
  button.textContent = "目";
  const point = document.createElement("div");
  point.id = "qgGazePoint";
  point.setAttribute("aria-hidden", "true");
  document.body.append(button, point);

  function remember(mode) {
    try { sessionStorage.setItem(MODE_KEY, mode); } catch (_) {}
  }
  function preferred() {
    try { return sessionStorage.getItem(MODE_KEY) === "gaze"; } catch (_) { return false; }
  }
  function hint(text) {
    const el = document.getElementById("hint");
    if (!el) return;
    el.textContent = text;
    el.classList.add("show");
    clearTimeout(el._qgGazeTimer);
    el._qgGazeTimer = setTimeout(() => el.classList.remove("show"), 7000);
  }
  function sync(active) {
    state.active = active;
    button.dataset.active = active ? "true" : "false";
    button.setAttribute("aria-pressed", String(active));
    button.setAttribute("aria-label", active ? "停止目光观照" : "开启目光观照");
    button.title = active ? "停止目光观照" : "开启目光观照";
    if (!active) clearSyntheticPointer();
  }
  function releaseObservation() {
    if (!state.observing) return;
    state.observing = false;
    canvas.dispatchEvent(new Event("pointerleave"));
  }
  function clearSyntheticPointer() {
    state.lastSample = 0;
    state.spd = 0;
    state.dwell = 0;
    state.fx = state.fy = null;
    releaseObservation();
    point.classList.remove("on");
  }
  function applyWarp(x, y) {
    if (!state.warp || state.warp.length < 7) return [x, y];
    const nx = x / Math.max(1, innerWidth), ny = y / Math.max(1, innerHeight);
    let wx = 0, wy = 0, ws = 0;
    for (const q of state.warp) {
      const w = 1 / Math.max(1e-5, (nx - q.px) ** 2 + (ny - q.py) ** 2);
      wx += w * q.dx; wy += w * q.dy; ws += w;
    }
    return [
      x + Math.max(-0.6, Math.min(0.6, wx / ws)) * innerWidth,
      y + Math.max(-0.6, Math.min(0.6, wy / ws)) * innerHeight
    ];
  }
  function loadLibrary() {
    if (typeof webgazer !== "undefined") return Promise.resolve();
    return new Promise((resolve, reject) => {
      const script = document.createElement("script");
      script.src = "../webgazer.js";
      script.onload = resolve;
      script.onerror = () => reject(new Error("webgazer.js 载入失败"));
      document.body.appendChild(script);
    });
  }
  async function configureCamera() {
    try {
      const devices = (await navigator.mediaDevices.enumerateDevices()).filter(d => d.kind === "videoinput");
      const saved = localStorage.getItem("qg_cam");
      const bad = /iphone|ipad|continuity|連續互通|连续互通|desk view/i;
      const good = /facetime|built-?in|内建|內建|integrated/i;
      const pick = (saved && devices.find(d => d.deviceId === saved)) ||
        devices.find(d => good.test(d.label)) || devices.find(d => d.label && !bad.test(d.label));
      if (pick && pick.deviceId) {
        webgazer.params.camConstraints = { video: { deviceId: { exact: pick.deviceId }, width: { ideal: 640 }, height: { ideal: 480 } } };
      }
    } catch (_) {}
  }
  async function start() {
    if (state.loading || state.active) return;
    if (state.ready) {
      try { await webgazer.resume(); } catch (_) {}
      remember("gaze"); sync(true); hint("目光觀照已開 —— 看定字粒使它顯現，精細動作仍用手");
      return;
    }
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      remember("pointer"); sync(false); hint("此環境無法啟用攝像頭，已回到指針觀遊");
      return;
    }
    state.loading = true;
    button.disabled = true;
    hint("正在重新接續目光觀照…");
    try {
      await loadLibrary();
      webgazer.params.showVideoPreview = false;
      webgazer.params.showVideo = false;
      webgazer.params.showFaceOverlay = false;
      webgazer.params.showFaceFeedbackBox = false;
      webgazer.params.showGazeDot = false;
      webgazer.params.saveDataAcrossSessions = true;
      webgazer.params.faceMeshSolutionPath = "../mediapipe/face_mesh";
      try { state.warp = JSON.parse(localStorage.getItem("qg_gaze_warp") || "null"); } catch (_) { state.warp = null; }
      if (!Array.isArray(state.warp) || state.warp.length < 7 || !state.warp.every(q => q && q.unit === "norm")) state.warp = null;
      try { webgazer.applyKalmanFilter(true); } catch (_) {}
      await configureCamera();
      webgazer.setGazeListener(data => {
        if (!data || !state.active) return;
        const now = performance.now();
        const first = !state.lastSample;
        const sampleDt = first ? 0 : Math.min(0.2, (now - state.lastSample) / 1000);
        let [gx, gy] = applyWarp(data.x, data.y);
        const step = first ? 0 : Math.hypot(gx - state.sx, gy - state.sy);
        const a = Math.max(0.05, Math.min(0.42, step / 110));
        if (first) { state.sx = gx; state.sy = gy; }
        else { state.sx += (gx - state.sx) * a; state.sy += (gy - state.sy) * a; }
        state.spd = first ? 120 : state.spd * 0.7 + step * 0.3;
        const focusR = Math.min(innerWidth, innerHeight) * 0.16;
        if (state.fx == null || Math.hypot(state.sx - state.fx, state.sy - state.fy) > focusR) {
          state.fx = state.sx; state.fy = state.sy; state.dwell = 0;
        } else {
          state.fx += (state.sx - state.fx) * 0.08;
          state.fy += (state.sy - state.fy) * 0.08;
          state.dwell += sampleDt;
        }
        const gStill = Math.max(0, Math.min(1, (120 - state.spd) / 105));
        const gain = Math.max(gStill, Math.min(1, state.dwell * 1.7));
        state.lastSample = now;
        point.style.left = state.sx + "px";
        point.style.top = state.sy + "px";
        point.classList.add("on");
        if (gain > 0.4) {
          state.observing = true;
          canvas.dispatchEvent(new PointerEvent("pointermove", {
            clientX: state.sx, clientY: state.sy, bubbles: true, pointerType: "mouse"
          }));
        } else {
          releaseObservation();
        }
      });
      await webgazer.begin();
      safe(() => webgazer.showVideoPreview(false));
      safe(() => webgazer.showVideo(false));
      safe(() => webgazer.showFaceOverlay(false));
      safe(() => webgazer.showFaceFeedbackBox(false));
      safe(() => webgazer.showPredictionPoints(false));
      safe(() => webgazer.removeMouseEventListeners());
      state.ready = true;
      remember("gaze");
      sync(true);
      hint(state.warp
        ? "目光觀照已接續 —— 看定字粒使它顯現，精細動作仍用手"
        : "目光觀照已開 —— 目前為粗略跟隨；回到預備幕完成九字校準可提升精度");
    } catch (error) {
      remember("pointer");
      sync(false);
      hint("目光未能接續，已回到指針觀遊");
      console.error("[gaze-runtime]", error);
    } finally {
      state.loading = false;
      button.disabled = false;
    }
  }
  function stop() {
    if (!state.active) return;
    try { webgazer.pause(); } catch (_) {}
    remember("pointer");
    sync(false);
    hint("目光觀照已停 —— 仍可用指針繼續");
  }

  button.addEventListener("click", event => {
    event.stopPropagation();
    state.active ? stop() : start();
  });
  sync(false);
  const staleTimer = setInterval(() => {
    if (state.active && state.lastSample && performance.now() - state.lastSample >= 650) clearSyntheticPointer();
  }, 250);
  if (preferred()) setTimeout(start, 260);
  addEventListener("pagehide", () => {
    clearInterval(staleTimer);
    clearSyntheticPointer();
    try {
      const video = document.getElementById("webgazerVideoFeed");
      if (video && video.srcObject) video.srcObject.getTracks().forEach(track => track.stop());
      if (typeof webgazer !== "undefined") webgazer.pause();
    } catch (_) {}
  }, { once: true });
})();
