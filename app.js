let zIndex = 1;

const clockEl = document.getElementById("clock");

function updateClock() {
  clockEl.textContent = new Date().toLocaleTimeString();
}

updateClock();
setInterval(updateClock, 1000);

const startBtn = document.getElementById("start-btn");
const startMenu = document.getElementById("start-menu");

startBtn.addEventListener("click", (e) => {
  e.stopPropagation();
  startMenu.classList.toggle("hidden");
});

document.addEventListener("click", () => {
  if (!startMenu.classList.contains("hidden")) {
    startMenu.classList.add("hidden");
  }
});

startMenu.addEventListener("click", (e) => e.stopPropagation());

const bgImg = document.getElementById("bg-img");
if (bgImg) {
  bgImg.addEventListener("load", () => {
    bgImg.classList.remove("is-hidden");
  });
  bgImg.addEventListener("error", () => {
    bgImg.classList.add("is-hidden");
  });
  if (bgImg.complete && bgImg.naturalWidth > 0) {
    bgImg.classList.remove("is-hidden");
  }
}

function createWindow(title, content) {
  const win = document.createElement("div");
  win.className = "window";
  win.style.top = "120px";
  win.style.left = "120px";
  win.style.zIndex = String(zIndex++);

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
  body.innerHTML = content;

  win.appendChild(titlebar);
  win.appendChild(body);

  document.getElementById("windows").appendChild(win);

  closeBtn.addEventListener("click", (e) => {
    e.stopPropagation();
    win.remove();
  });

  titlebar.addEventListener("mousedown", (e) => {
    if (e.target.closest(".close")) return;

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
}

function openApp(app) {
  if (app === "explorer") {
    createWindow("Files", `
      <p>Documents</p>
      <p>Images</p>
      <p style="color:red;">system_log.txt</p>
    `);
  } else if (app === "settings") {
    createWindow("Settings", "<p>Nothing works.</p>");
  }
}

document.querySelectorAll(".icon").forEach((el) => {
  el.addEventListener("click", () => openApp(el.dataset.app));
});

document.querySelectorAll("#start-menu div").forEach((el) => {
  el.addEventListener("click", () => {
    openApp(el.dataset.app);
    startMenu.classList.add("hidden");
  });
});
