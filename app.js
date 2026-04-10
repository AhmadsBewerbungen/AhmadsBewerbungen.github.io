let zIndex = 1;

// FULLSCREEN
window.addEventListener("click", async () => {
  document.documentElement.requestFullscreen().catch(()=>{});
});

// BOOT
setTimeout(() => {
  document.getElementById("boot-screen").classList.add("hidden");
  document.getElementById("desktop").classList.remove("hidden");
}, 2000);

// CLOCK
setInterval(() => {
  const now = new Date();
  document.getElementById("clock").innerText =
    now.toLocaleTimeString();
}, 1000);

// START MENU
const startBtn = document.getElementById("start-btn");
const startMenu = document.getElementById("start-menu");

startBtn.onclick = () => {
  startMenu.classList.toggle("hidden");
};

// WINDOW SYSTEM
function createWindow(title, content) {
  const win = document.createElement("div");
  win.className = "window";
  win.style.top = "100px";
  win.style.left = "100px";
  win.style.zIndex = zIndex++;

  win.innerHTML = `
    <div class="titlebar">${title}
      <button class="close">X</button>
    </div>
    <div class="content">${content}</div>
  `;

  document.getElementById("windows").appendChild(win);

  const bar = win.querySelector(".titlebar");

  bar.onmousedown = (e) => {
    let offsetX = e.clientX - win.offsetLeft;
    let offsetY = e.clientY - win.offsetTop;

    function move(e) {
      win.style.left = e.clientX - offsetX + "px";
      win.style.top = e.clientY - offsetY + "px";
    }

    document.addEventListener("mousemove", move);
    document.onmouseup = () => {
      document.removeEventListener("mousemove", move);
    };
  };

  win.querySelector(".close").onclick = () => win.remove();

  return win;
}

// APPS
function openApp(app) {
  if (app === "explorer") {
    createWindow("Files", `
      <p>Documents</p>
      <p>Images</p>
      <p style="color:red;">system_log.txt</p>
    `);
  }

  if (app === "settings") {
    createWindow("Settings", "<p>Nothing works.</p>");
  }
}

// ICON CLICK
document.querySelectorAll(".icon, #start-menu div").forEach(el => {
  el.onclick = () => openApp(el.dataset.app);
});
