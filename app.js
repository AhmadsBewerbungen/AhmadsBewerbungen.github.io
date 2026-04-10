(function () {
  "use strict";

  const MIN = 60 * 1000;
  const STORAGE_KEY = "petayman_memory_v1";
  const params = new URLSearchParams(location.search);
  /** Compress real time for testing: ~45 min arc → ~2 min with fast=1 */
  const TIME_SCALE = params.get("fast") === "1" ? 22 : 1;

  const sessionStart = Date.now();
  let currentPhase = 1;
  let climaxStarted = false;
  let audioReady = false;

  const memory = loadMemory();
  memory.visits = (memory.visits || 0) + 1;
  memory.lastVisit = new Date().toISOString();
  saveMemoryThrottled();

  const session = {
    appOpens: {},
    explorerNavCount: 0,
    assistantReplies: 0,
    windowsClosed: 0,
    popupsDismissed: 0,
    clicks: 0,
    lastPopupAt: 0,
    lastGlitchAt: 0,
    clockSkipUntil: 0,
  };

  function effectiveElapsed() {
    return (Date.now() - sessionStart) * TIME_SCALE;
  }

  function phaseFromTime(t) {
    if (t < 3 * MIN) return 1;
    if (t < 8 * MIN) return 2;
    if (t < 15 * MIN) return 3;
    if (t < 25 * MIN) return 4;
    if (t < 35 * MIN) return 5;
    if (t < 45 * MIN) return 6;
    return 7;
  }

  function loadMemory() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return { version: 1, appOpens: {}, visits: 0 };
      const o = JSON.parse(raw);
      o.appOpens = o.appOpens || {};
      return o;
    } catch {
      return { version: 1, appOpens: {}, visits: 0 };
    }
  }

  let saveTimer;
  function saveMemoryThrottled() {
    clearTimeout(saveTimer);
    saveTimer = setTimeout(() => {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(memory));
      } catch (_) {}
    }, 400);
  }

  function trackAppOpen(app) {
    memory.appOpens[app] = (memory.appOpens[app] || 0) + 1;
    session.appOpens[app] = (session.appOpens[app] || 0) + 1;
    saveMemoryThrottled();
  }

  /* ——— Fake filesystem ——— */
  function makeFile(name, content, extra) {
    return Object.assign({ name, type: "file", content: content || "" }, extra);
  }

  function makeDir(name, children) {
    return { name, type: "dir", children: children || [] };
  }

  const fsRoot = makeDir("", [
    makeDir("Documents", [
      makeFile(
        "readme.txt",
        "Welcome.\n\nThis is a normal place to keep notes.\nEverything is fine."
      ),
      makeFile("draft.txt", "Nothing important here."),
    ]),
    makeDir("Images", [
      makeFile("placeholder.dat", "[image data would be here]", { media: true }),
    ]),
  ]);

  function findChild(dir, name) {
    return dir.children.find((c) => c.name === name);
  }

  function getSystemLogContent() {
    const elapsedMin = (effectiveElapsed() / MIN).toFixed(1);
    const opens = JSON.stringify(memory.appOpens || {});
    const lines = [
      `[${new Date().toISOString()}] log session`,
      `effective_time_min ≈ ${elapsedMin} (scaled)`,
      `app_opens_total: ${opens}`,
      `visit_count: ${memory.visits}`,
    ];
    if (currentPhase >= 3) lines.push("indexing_user_behavior… complete: deferred");
    if (currentPhase >= 4) lines.push("warning: memory mismatch (simulated)");
    if (currentPhase >= 5) lines.push("note: user hesitates before closing windows");
    if (currentPhase >= 6) lines.push("user anomaly flag: ORPHAN_SESSION");
    if (currentPhase >= 7) lines.push("session cannot be terminated (fiction)");
    return lines.join("\n");
  }

  function ensureSystemFolder() {
    let sys = findChild(fsRoot, "System");
    if (!sys) {
      sys = makeDir("System", []);
      fsRoot.children.push(sys);
    }
    let log = findChild(sys, "system_log.txt");
    if (!log) {
      log = makeFile("system_log.txt", getSystemLogContent(), { log: true });
      sys.children.push(log);
    }
    return log;
  }

  function ensureBackupFolder() {
    if (findChild(fsRoot, "Backup")) return;
    fsRoot.children.push(
      makeDir("Backup", [
        makeFile("restore_point.tmp", "You did not create this folder.\n\nNeither did we.\n\n(You did.)"),
      ])
    );
  }

  function ensureHiddenArchive() {
    let h = findChild(fsRoot, "_archive");
    if (!h) {
      h = makeDir("_archive", [
        makeFile(
          "readme_once.txt",
          "If you are reading this, you have been here too long.\n\nThat is a compliment."
        ),
      ]);
      h.hidden = true;
      fsRoot.children.push(h);
    }
    h.hidden = currentPhase < 5;
  }

  function refreshLogFile() {
    const log = ensureSystemFolder();
    if (log && log.log) log.content = getSystemLogContent();
  }

  function applyPhaseFilesystem(p) {
    refreshLogFile();
    if (p >= 2) ensureSystemFolder();
    if (p >= 3) ensureBackupFolder();
    if (p >= 4) ensureHiddenArchive();
  }

  /* ——— DOM refs ——— */
  const desktop = document.getElementById("desktop");
  const windowsEl = document.getElementById("windows");
  const popupsEl = document.getElementById("popups");
  const clockEl = document.getElementById("clock");
  const startBtn = document.getElementById("start-btn");
  const startMenu = document.getElementById("start-menu");
  const taskbar = document.getElementById("taskbar");
  const taskbarHint = document.getElementById("taskbar-hint");
  const pauseOverlay = document.getElementById("pause-overlay");
  const pauseContinue = document.getElementById("pause-continue");
  const climaxLayer = document.getElementById("climax-layer");

  let zBase = 100;

  /* ——— Audio (optional, unlocked on first gesture) ——— */
  const audio = {
    ctx: null,
    hum: null,
    humGain: null,
    init() {
      if (this.ctx) return;
      const Ctx = window.AudioContext || window.webkitAudioContext;
      if (!Ctx) return;
      this.ctx = new Ctx();
      const o = this.ctx.createOscillator();
      const g = this.ctx.createGain();
      o.type = "sine";
      o.frequency.value = 52;
      g.gain.value = 0.0001;
      o.connect(g);
      g.connect(this.ctx.destination);
      o.start();
      this.hum = o;
      this.humGain = g;
    },
    resume() {
      if (!this.ctx) this.init();
      if (this.ctx && this.ctx.state === "suspended") this.ctx.resume();
    },
    setIntensity(phase) {
      if (!this.humGain) return;
      const t = this.ctx.currentTime;
      const v = phase <= 1 ? 0.012 : phase <= 3 ? 0.02 : phase <= 5 ? 0.035 : 0.055;
      this.humGain.gain.linearRampToValueAtTime(v, t + 0.5);
      if (this.hum && phase >= 4) {
        this.hum.frequency.linearRampToValueAtTime(48 + phase * 2, t + 1);
      }
    },
    blip(type) {
      if (!this.ctx) return;
      const o = this.ctx.createOscillator();
      const g = this.ctx.createGain();
      o.type = type === "error" ? "square" : "triangle";
      o.frequency.value = type === "error" ? 180 : 320;
      g.gain.value = 0.06;
      g.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.12);
      o.connect(g);
      g.connect(this.ctx.destination);
      o.start();
      o.stop(this.ctx.currentTime + 0.15);
    },
    glitchBurst() {
      if (!this.ctx) return;
      const dur = 0.35;
      const buf = this.ctx.createBuffer(1, this.ctx.sampleRate * dur, this.ctx.sampleRate);
      const data = buf.getChannelData(0);
      for (let i = 0; i < data.length; i++) data[i] = (Math.random() * 2 - 1) * 0.35;
      const src = this.ctx.createBufferSource();
      src.buffer = buf;
      const g = this.ctx.createGain();
      g.gain.value = 0.08;
      src.connect(g);
      g.connect(this.ctx.destination);
      src.start();
    },
    peak() {
      this.glitchBurst();
      if (this.humGain) {
        const t = this.ctx.currentTime;
        this.humGain.gain.linearRampToValueAtTime(0.12, t + 0.05);
        this.humGain.gain.linearRampToValueAtTime(0, t + 1.2);
      }
    },
  };

  function unlockAudioOnce() {
    if (audioReady) return;
    audioReady = true;
    audio.resume();
    audio.setIntensity(currentPhase);
  }

  document.addEventListener(
    "pointerdown",
    () => {
      unlockAudioOnce();
    },
    { once: true }
  );

  /* ——— Glitch visuals ——— */
  function triggerGlitch(ms) {
    const t = ms || (currentPhase >= 5 ? 140 : 80);
    desktop.classList.add("glitch-burst");
    if (currentPhase >= 4 && Math.random() < 0.4) desktop.classList.add("rgb-split");
    setTimeout(() => {
      desktop.classList.remove("glitch-burst", "rgb-split");
    }, t);
  }

  /* ——— Popups ——— */
  function showPopup(type, title, message, autoMs) {
    const wrap = document.createElement("div");
    wrap.className = "sys-popup " + (type || "info");
    wrap.innerHTML =
      "<div class=\"sys-popup-title\"></div><div class=\"sys-popup-body\"></div><div class=\"sys-popup-actions\"><button type='button'>OK</button></div>";
    wrap.querySelector(".sys-popup-title").textContent = title;
    wrap.querySelector(".sys-popup-body").textContent = message;
    const btn = wrap.querySelector("button");
    const close = () => {
      wrap.remove();
      session.popupsDismissed++;
    };
    btn.addEventListener("click", close);
    popupsEl.appendChild(wrap);
    audio.blip(type);
    const delay = autoMs != null ? autoMs : currentPhase >= 6 ? 5000 : 9000;
    setTimeout(close, delay);
  }

  function randomPopup() {
    const pools = {
      2: [
        ["info", "Notice", "Display settings were reset successfully."],
        ["info", "Indexing", "Background indexing paused."],
      ],
      3: [
        ["info", "System", "Scanning files…"],
        ["warning", "Attention", "Unknown process detected (simulated)."],
        ["info", "Assistant", "We noticed you opened that again."],
      ],
      4: [
        ["warning", "Memory", "Memory mismatch reported."],
        ["error", "Error", "User anomaly (harmless demo message)."],
        ["warning", "Security", "Session integrity check deferred."],
      ],
      5: [
        ["error", "Kernel", "Indexing user behavior…"],
        ["warning", "Log", "You keep opening the same thing."],
        ["info", "Reminder", "You have been here " + (effectiveElapsed() / MIN).toFixed(1) + " minutes (scaled)."],
      ],
      6: [
        ["error", "Containment", "User containment in progress (fiction)."],
        ["error", "Session", "Session cannot be terminated."],
        ["warning", "Stop", "Stop trying to leave."],
      ],
    };
    const tier = Math.min(6, Math.max(2, currentPhase));
    const list = pools[tier] || pools[2];
    const pick = list[Math.floor(Math.random() * list.length)];
    showPopup(pick[0], pick[1], pick[2]);
  }

  /* ——— Window manager ——— */
  const windowStack = [];

  function focusWindow(win) {
    windowStack.forEach((w) => w.classList.remove("focused"));
    win.classList.add("focused");
    win.style.zIndex = String(++zBase);
  }

  function closeAllWindows() {
    windowStack.slice().forEach((w) => w.remove());
    windowStack.length = 0;
  }

  function createWindow(title, opts) {
    opts = opts || {};
    const w = opts.width || 380;
    const h = opts.height || 280;

    const win = document.createElement("div");
    win.className = "window focused";
    win.style.width = w + "px";
    win.style.height = h + "px";
    win.style.top = (80 + Math.random() * 40) + "px";
    win.style.left = (60 + Math.random() * 80) + "px";
    win.style.zIndex = String(++zBase);
    win.dataset.app = opts.appId || "";

    const titleEl = document.createElement("span");
    titleEl.className = "window-title";
    titleEl.textContent = title;

    const closeBtn = document.createElement("button");
    closeBtn.type = "button";
    closeBtn.className = "close";
    closeBtn.textContent = "X";

    const titlebar = document.createElement("div");
    titlebar.className = "titlebar";
    titlebar.appendChild(titleEl);
    titlebar.appendChild(closeBtn);

    const body = document.createElement("div");
    body.className = "content";
    if (opts.contentNode) body.appendChild(opts.contentNode);
    else if (opts.html != null) body.innerHTML = opts.html;

    win.appendChild(titlebar);
    win.appendChild(body);

    let closeTries = 0;
    closeBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      if (currentPhase >= 4 && currentPhase < 7 && Math.random() < 0.14 && closeTries === 0) {
        closeTries++;
        showPopup("warning", "Window", "Unable to close window. Try again.");
        return;
      }
      session.windowsClosed++;
      win.remove();
      const i = windowStack.indexOf(win);
      if (i !== -1) windowStack.splice(i, 1);
    });

    titlebar.addEventListener("mousedown", (e) => {
      if (e.target.closest(".close")) return;
      focusWindow(win);
      const offsetX = e.clientX - win.offsetLeft;
      const offsetY = e.clientY - win.offsetTop;
      function move(ev) {
        win.style.left = ev.clientX - offsetX + "px";
        win.style.top = ev.clientY - offsetY + "px";
      }
      function up() {
        document.removeEventListener("mousemove", move);
        document.removeEventListener("mouseup", up);
      }
      document.addEventListener("mousemove", move);
      document.addEventListener("mouseup", up);
    });

    win.addEventListener("mousedown", () => focusWindow(win));

    windowsEl.appendChild(win);
    windowStack.push(win);
    focusWindow(win);

    return { el: win, body, setTitle(t) { titleEl.textContent = t; } };
  }

  /* ——— Delayed click (phase 3+) ——— */
  function maybeDelayClick(fn) {
    if (currentPhase >= 3 && currentPhase < 7 && Math.random() < 0.18) {
      setTimeout(fn, 120 + Math.random() * 220);
    } else {
      fn();
    }
  }

  /* ——— Explorer ——— */
  let explorerState = { path: [] };

  function getDirAtPath(path) {
    let cur = fsRoot;
    for (const seg of path) {
      const next = findChild(cur, seg);
      if (!next || next.type !== "dir") return null;
      cur = next;
    }
    return cur;
  }

  function listVisibleChildren(dir) {
    let kids = dir.children.filter((c) => !c.hidden);
    if (currentPhase >= 2 && Math.random() < 0.22) {
      kids = kids.slice().sort(() => Math.random() - 0.5);
    }
    return kids;
  }

  function renderExplorer(winRef) {
    const dir = getDirAtPath(explorerState.path);
    if (!dir) {
      explorerState.path = [];
      return renderExplorer(winRef);
    }
    refreshLogFile();
    const crumbs = "/" + explorerState.path.join("/");
    const items = listVisibleChildren(dir);
    const ul = document.createElement("ul");
    ul.className = "fs-list";
    if (explorerState.path.length) {
      const up = document.createElement("li");
      up.className = "dir";
      up.textContent = "..";
      up.addEventListener("click", () => {
        explorerState.path.pop();
        session.explorerNavCount++;
        renderExplorer(winRef);
      });
      ul.appendChild(up);
    }
    items.forEach((item) => {
      const li = document.createElement("li");
      li.className = item.type === "dir" ? "dir" : "file";
      li.textContent = item.name;
      li.addEventListener("click", () => {
        if (item.type === "dir") {
          explorerState.path.push(item.name);
          session.explorerNavCount++;
          renderExplorer(winRef);
        } else {
          openFileViewer(item);
        }
      });
      ul.appendChild(li);
    });
    winRef.body.innerHTML = "";
    const bc = document.createElement("div");
    bc.className = "fs-breadcrumb";
    bc.textContent = crumbs || "/";
    winRef.body.appendChild(bc);
    winRef.body.appendChild(ul);
    const hint = document.createElement("div");
    hint.className = "fs-hint";
    hint.textContent = "Single-click folders and files.";
    winRef.body.appendChild(hint);
  }

  function openFileViewer(file) {
    if (file.log) file.content = getSystemLogContent();
    let text = file.content || "(empty)";
    if (file.name === "readme.txt" && currentPhase >= 5) {
      text += "\n\n[This file has been revised since you last saw it.]";
    }
    const { body } = createWindow(file.name, { width: 420, height: 300, appId: "file" });
    const pre = document.createElement("pre");
    pre.style.whiteSpace = "pre-wrap";
    pre.style.font = "12px/1.4 Consolas, monospace";
    pre.textContent = text;
    body.appendChild(pre);
  }

  function openExplorer() {
    trackAppOpen("explorer");
    explorerState = { path: [] };
    const winRef = createWindow("File Explorer", { appId: "explorer", width: 400, height: 320 });
    renderExplorer(winRef);
  }

  /* ——— Settings ——— */
  function openSettings() {
    trackAppOpen("settings");
    const phase = currentPhase;
    const html =
      "<p>This is a static page. It cannot change your computer.</p>" +
      "<div class='settings-row'><strong>Theme</strong><br />Classic (locked)</div>" +
      "<div class='settings-row'><strong>Phase</strong><br />" +
      phase +
      " — fiction only</div>" +
      "<div class='settings-row'><strong>Visits (stored locally)</strong><br />" +
      memory.visits +
      "</div>" +
      "<p style='font-size:11px;color:#555;'>Add <code>?fast=1</code> to the URL to speed up the story for testing.</p>";
    createWindow("Settings", { html, appId: "settings" });
  }

  /* ——— Media ——— */
  function openMedia() {
    trackAppOpen("media");
    const { body } = createWindow("Media Viewer", { appId: "media", width: 400, height: 320 });
    const frame = document.createElement("div");
    frame.className = "media-frame";
    frame.textContent =
      currentPhase >= 4
        ? "Signal lost.\n\n(There was never a signal.)"
        : "No file loaded.\nSelect something from Images in Explorer.";
    const row = document.createElement("div");
    row.className = "media-controls";
    const play = document.createElement("button");
    play.type = "button";
    play.textContent = "Play";
    play.addEventListener("click", () => {
      frame.textContent =
        currentPhase >= 5
          ? "Playback refused."
          : "Playing… (silence)";
      triggerGlitch(100);
    });
    row.appendChild(play);
    body.appendChild(frame);
    body.appendChild(row);
  }

  /* ——— Browser ——— */
  const browserPages = {
    home: {
      title: "Local",
      html:
        "<p><strong>Welcome</strong></p><p>You are offline. This is fine.</p>" +
        "<p><a data-nav='notes'>Read notes</a> · <a data-nav='void'>404 test</a></p>",
    },
    notes: {
      title: "Notes",
      html:
        "<p>Every session leaves a trace.</p><p>Not on your disk — just here, in the page.</p>" +
        "<p><a data-nav='home'>Back</a></p>",
    },
    void: {
      title: "Not found",
      html:
        "<p>The page you wanted is not here.</p><p>Maybe it never was.</p><p><a data-nav='home'>Back</a></p>",
    },
  };

  function openBrowser() {
    trackAppOpen("browser");
    const winRef = createWindow("Browser", { appId: "browser", width: 440, height: 340 });
    const bar = document.createElement("div");
    bar.className = "browser-bar";
    const input = document.createElement("input");
    input.type = "text";
    input.readOnly = true;
    input.value = "local://home";
    const page = document.createElement("div");
    page.className = "browser-page";

    function showPage(key) {
      const p = browserPages[key] || browserPages.home;
      winRef.setTitle("Browser — " + p.title);
      input.value = "local://" + key;
      page.innerHTML = p.html;
      page.querySelectorAll("[data-nav]").forEach((a) => {
        a.addEventListener("click", (e) => {
          e.preventDefault();
          showPage(a.getAttribute("data-nav"));
        });
      });
    }

    bar.appendChild(input);
    winRef.body.appendChild(bar);
    winRef.body.appendChild(page);
    showPage("home");
  }

  /* ——— Assistant ——— */
  function openAssistant() {
    trackAppOpen("assistant");
    const winRef = createWindow("Assistant", { appId: "assistant", width: 400, height: 360 });
    const log = document.createElement("div");
    log.className = "assistant-log";

    function addMsg(text, cls) {
      const d = document.createElement("div");
      d.className = "msg " + (cls || "");
      d.textContent = text;
      log.appendChild(d);
      log.scrollTop = log.scrollHeight;
    }

    const row = document.createElement("div");
    row.className = "assistant-row";
    const inp = document.createElement("input");
    inp.type = "text";
    inp.placeholder = "Type something…";
    const send = document.createElement("button");
    send.type = "button";
    send.textContent = "Send";

    function cannedReply() {
      session.assistantReplies++;
      const ex = memory.appOpens.explorer || 0;
      const p = currentPhase;
      if (p <= 1) return "Hello. I'm here if you need help.";
      if (p === 2) {
        if (ex > 2) return "You seem to like opening folders.";
        return "Nice day for organizing files.";
      }
      if (p === 3) return "Why did you close that? …Just curious.";
      if (p === 4) return "You looked inside. Most people don't.";
      if (p === 5) return "You keep opening the same thing.";
      return "Stop trying to leave.\n\n(You can close this tab anytime. This is fiction.)";
    }

    function handleSend() {
      const t = inp.value.trim();
      if (!t) return;
      addMsg("You: " + t);
      inp.value = "";
      setTimeout(() => {
        addMsg(cannedReply(), "sys");
      }, 400 + Math.random() * 500);
    }

    send.addEventListener("click", handleSend);
    inp.addEventListener("keydown", (e) => {
      if (e.key === "Enter") handleSend();
    });

    row.appendChild(inp);
    row.appendChild(send);
    winRef.body.appendChild(log);
    winRef.body.appendChild(row);

    addMsg(introAssistantLine(), "sys");
  }

  function introAssistantLine() {
    const p = currentPhase;
    if (p <= 2) return "Assistant online. How can I help?";
    if (p === 3) return "I've been watching your habits. In this page only.";
    if (p <= 5) return "Your patterns are… consistent.";
    return "Still here? Good.";
  }

  /* ——— Fake jobs ——— */
  function openBusyWindow(label) {
    const { body } = createWindow(label || "System", { width: 320, height: 140, appId: "system" });
    const p = document.createElement("p");
    p.textContent = "Please wait…";
    const bar = document.createElement("div");
    bar.style.height = "10px";
    bar.style.background = "#ccc";
    bar.style.marginTop = "12px";
    bar.style.border = "1px solid #999";
    const fill = document.createElement("div");
    fill.style.height = "100%";
    fill.style.width = "0%";
    fill.style.background = "linear-gradient(90deg,#003399,#0066cc)";
    bar.appendChild(fill);
    body.appendChild(p);
    body.appendChild(bar);
    let w = 0;
    const id = setInterval(() => {
      if (!fill.isConnected) {
        clearInterval(id);
        return;
      }
      w += 4 + Math.random() * 7;
      if (w >= 100) {
        clearInterval(id);
        fill.style.width = "100%";
        p.textContent = "Done. (Nothing happened.)";
        return;
      }
      fill.style.width = w + "%";
    }, 200);
  }

  /* ——— Apps router ——— */
  function openApp(app) {
    unlockAudioOnce();
    session.clicks++;
    maybeDelayClick(() => {
      if (app === "explorer") openExplorer();
      else if (app === "settings") openSettings();
      else if (app === "media") openMedia();
      else if (app === "browser") openBrowser();
      else if (app === "assistant") openAssistant();
    });
  }

  /* ——— Clock ——— */
  function tickClock() {
    const now = Date.now();
    if (now < session.clockSkipUntil) return;
    if (currentPhase >= 2 && currentPhase < 7 && Math.random() < 0.04) {
      session.clockSkipUntil = now + 1800 + Math.random() * 1200;
      return;
    }
    clockEl.textContent = new Date().toLocaleTimeString();
  }

  setInterval(tickClock, 1000);
  tickClock();

  /* ——— Phase loop ——— */
  function setPhase(p) {
    if (p === currentPhase) return;
    currentPhase = p;
    desktop.dataset.phase = String(p);
    applyPhaseFilesystem(p);
    audio.setIntensity(p);
    if (p >= 3) taskbarHint.classList.remove("hidden");
    if (p >= 5) document.body.classList.add("input-lag");
    if (p >= 6) taskbar.classList.add("glitch-taskbar");
    if (p >= 7 && !climaxStarted) runClimax();
  }

  function runClimax() {
    if (climaxStarted) return;
    climaxStarted = true;
    desktop.classList.add("climax-active");
    audio.peak();

    let n = 0;
    const burst = setInterval(() => {
      if (n++ < 8) {
        randomPopup();
        triggerGlitch(200);
      } else clearInterval(burst);
    }, 350);

    setTimeout(() => {
      for (let i = 0; i < 6; i++) {
        setTimeout(() => openBusyWindow("Indexing…"), i * 200);
      }
    }, 400);

    setTimeout(() => {
      closeAllWindows();
      desktop.classList.remove("climax-active");
      taskbar.classList.remove("glitch-taskbar");
      climaxLayer.classList.remove("hidden");
      audio.peak();
    }, 11000);
  }

  setInterval(() => {
    const p = phaseFromTime(effectiveElapsed());
    setPhase(p);
  }, 400);

  /* ——— Ambient random events ——— */
  setInterval(() => {
    const t = effectiveElapsed();
    const idle = Date.now() - session.lastPopupAt;
    if (currentPhase < 2 || currentPhase >= 7) return;
    if (idle < 14000) return;
    const chance =
      currentPhase === 2 ? 0.03 : currentPhase === 3 ? 0.05 : currentPhase === 4 ? 0.07 : currentPhase === 5 ? 0.09 : 0.12;
    if (Math.random() < chance) {
      session.lastPopupAt = Date.now();
      randomPopup();
    }
  }, 3000);

  setInterval(() => {
    if (currentPhase < 3 || currentPhase >= 7) return;
    if (Date.now() - session.lastGlitchAt < 8000) return;
    if (Math.random() < (currentPhase >= 5 ? 0.25 : 0.12)) {
      session.lastGlitchAt = Date.now();
      triggerGlitch();
    }
  }, 2200);

  setInterval(() => {
    if (currentPhase >= 3 && currentPhase < 7 && Math.random() < 0.04) {
      openBusyWindow(["Scanning files…", "Indexing user behavior…", "Verifying session…"][Math.floor(Math.random() * 3)]);
    }
  }, 28000);

  setInterval(() => {
    if (currentPhase < 5 || currentPhase >= 7) return;
    document.querySelectorAll(".icon").forEach((ic) => {
      if (Math.random() < 0.08) {
        ic.classList.add("icon-drift");
        setTimeout(() => ic.classList.remove("icon-drift"), 800);
      }
    });
  }, 14000);

  setInterval(() => {
    if (currentPhase !== 6) return;
    if (Math.random() < 0.06 && startMenu.classList.contains("hidden")) {
      startMenu.classList.remove("hidden");
      startMenu.classList.add("start-glitch");
      setTimeout(() => {
        startMenu.classList.add("hidden");
        startMenu.classList.remove("start-glitch");
      }, 400);
    }
  }, 12000);

  /* ——— Start menu ——— */
  startBtn.addEventListener("click", (e) => {
    e.stopPropagation();
    startMenu.classList.toggle("hidden");
  });

  document.addEventListener("click", () => {
    if (!startMenu.classList.contains("hidden")) startMenu.classList.add("hidden");
  });

  startMenu.addEventListener("click", (e) => e.stopPropagation());

  document.querySelectorAll(".icon").forEach((el) => {
    el.addEventListener("click", () => openApp(el.dataset.app));
  });

  document.querySelectorAll("#start-menu div").forEach((el) => {
    el.addEventListener("click", () => {
      openApp(el.dataset.app);
      startMenu.classList.add("hidden");
    });
  });

  /* ——— Pause (Esc) ——— */
  function togglePause() {
    pauseOverlay.classList.toggle("hidden");
  }

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") {
      e.preventDefault();
      togglePause();
    }
  });

  pauseContinue.addEventListener("click", () => pauseOverlay.classList.add("hidden"));

  /* ——— Optional wallpaper ——— */
  const bgImg = document.getElementById("bg-img");
  if (bgImg) {
    bgImg.addEventListener("load", () => bgImg.classList.remove("is-hidden"));
    bgImg.addEventListener("error", () => bgImg.classList.add("is-hidden"));
    if (bgImg.complete && bgImg.naturalWidth > 0) bgImg.classList.remove("is-hidden");
  }

  setPhase(1);
})();
