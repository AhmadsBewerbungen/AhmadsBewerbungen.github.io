// ===== SYSTEM STATE =====
let zIndex = 1;
let horrorLevel = parseInt(localStorage.getItem("horrorLevel") || "0");

// ===== BOOT SEQUENCE =====
window.addEventListener("click", async () => {
  document.documentElement.requestFullscreen().catch(()=>{});
});

setTimeout(() => {
  document.getElementById("boot-screen").classList.add("hidden");
  document.getElementById("desktop").classList.remove("hidden");
}, 2000);

// ===== CLOCK =====
setInterval(() => {
  const now = new Date();
  document.getElementById("clock").innerText =
    now.toLocaleTimeString();
}, 1000);

// ===== START MENU =====
const startBtn = document.getElementById("start-btn");
const startMenu = document.getElementById("start-menu");

startBtn.onclick = () => {
  startMenu.classList.toggle("hidden");
};

// ===== WINDOW SYSTEM =====
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

  // Dragging
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

  // Close
  win.querySelector(".close").onclick = () => win.remove();

  return win;
}

// ===== APPS =====
function openApp(app) {
  if (app === "explorer") {
    createWindow("Files", "<p>Documents<br>Images<br>system_log.txt</p>");
  }

  if (app === "chat") {
    createWindow("Assistant", `<p id="chat-text">Hello...</p>`);
    setTimeout(progressHorror, 4000);
  }

  if (app === "settings") {
    createWindow("Settings", "<p>Nothing works.</p>");
  }
}

// Icon clicks
document.querySelectorAll(".icon, #start-menu div").forEach(el => {
  el.onclick = () => openApp(el.dataset.app);
});

// ===== POPUP SYSTEM =====
function showPopup(text) {
  const popup = createWindow("System Alert", `<p>${text}</p>`);
  popup.style.width = "200px";
}

// ===== HORROR ENGINE =====
function progressHorror() {
  horrorLevel++;
  localStorage.setItem("horrorLevel", horrorLevel);

  if (horrorLevel === 1) {
    showPopup("Unusual activity detected.");
  }

  if (horrorLevel === 2) {
    document.body.style.filter = "contrast(1.2)";
  }

  if (horrorLevel === 3) {
    randomGlitch();
  }

  if (horrorLevel > 3) {
    intrusiveChat();
  }
}

// ===== GLITCH EFFECT =====
function randomGlitch() {
  setInterval(() => {
    document.body.style.transform = `translate(${Math.random()*5}px)`;
    setTimeout(() => {
      document.body.style.transform = "none";
    }, 100);
  }, 3000);
}

// ===== INTRUSIVE CHAT =====
function intrusiveChat() {
  setInterval(() => {
    showPopup("Why are you still here?");
  }, 10000);
}

// ===== RANDOM EVENTS =====
setInterval(() => {
  if (Math.random() < 0.1) {
    showPopup("System error.");
  }
}, 15000);
