const player = document.getElementById("player");
let keys = {};
let x = 50;
let y = 0;
let vy = 0;
let onGround = true;

document.addEventListener("keydown", e => keys[e.code] = true);
document.addEventListener("keyup", e => keys[e.code] = false);

function gameLoop() {
  // horizontal movement
  if(keys["KeyA"]) {
    x -= 3;
    if(onGround) player.className = "character run";
    player.style.transform = `translateX(${x}px) translateY(${-y}px)`;
  } else if(keys["KeyS"]) {
    x += 3;
    if(onGround) player.className = "character run";
    player.style.transform = `translateX(${x}px) translateY(${-y}px)`;
  } else if(onGround) {
    player.className = "character idle";
    player.style.transform = `translateX(${x}px) translateY(${-y}px)`;
  }

  // jumping
  if(keys["Space"] && onGround) {
    vy = 12;
    onGround = false;
    player.className = "character jump";
  }

  // gravity
  vy -= 0.8;
  y += vy;
  if(y < 0) {
    y = 0;
    vy = 0;
    onGround = true;
  }

  player.style.transform = `translateX(${x}px) translateY(${-y}px)`;

  requestAnimationFrame(gameLoop);
}

gameLoop();
