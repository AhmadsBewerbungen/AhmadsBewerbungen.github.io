let zIndex = 1;

window.addEventListener("click", () => {
  document.documentElement.requestFullscreen().catch(()=>{});
});

setInterval(() => {
  const now = new Date();
  document.getElementById("clock").innerText =
    now.toLocaleTimeString();
}, 1000);

const startBtn = document.getElementById("start-btn");
const startMenu = document.getElementById("start-menu");

startBtn.onclick = () => {
  startMenu.classList.toggle("hidden");
};

function createWindow(title, content) {
  const win = document.createElement("div");
  win.className = "window";
  win.style.top = "120px";
  win.style.left = "120px";
  win.style.zIndex = zIndex++;

  win.innerHTML = `
    <div class="titlebar">
      ${title}
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
}

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

document.querySelectorAll(".icon, #start-menu div").forEach(el => {
  el.onclick = () => openApp(el.dataset.app);
});
