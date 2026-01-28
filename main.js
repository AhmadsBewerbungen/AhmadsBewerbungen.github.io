console.log("game.js loaded");

const canvas = document.getElementById("game");
if (!canvas) {
  alert("Canvas not found!");
}

const ctx = canvas.getContext("2d");

// CONSTANTS
const GRAVITY = 0.4;
const GROUND_Y = 130;

// INPUT
const keys = {};
window.addEventListener("keydown", e => keys[e.code] = true);
window.addEventListener("keyup", e => keys[e.code] = false);

// PLAYER
const player = {
  x: 160,
  y: GROUND_Y,
  vx: 0,
  vy: 0,
  onGround: true,
  dir: 1
};

// CLOUDS
const clouds = [
  { x: 40, y: 30 },
  { x: 140, y: 20 },
  { x: 240, y: 35 }
];

// UPDATE
function update() {
  player.vx = 0;

  if (keys["KeyA"]) {
    player.vx = -1.5;
    player.dir = -1;
  }
  if (keys["KeyD"]) {
    player.vx = 1.5;
    player.dir = 1;
  }

  if (keys["Space"] && player.onGround) {
    player.vy = -6;
    player.onGround = false;
  }

  player.vy += GRAVITY;
  player.x += player.vx;
  player.y += player.vy;

  if (player.y >= GROUND_Y) {
    player.y = GROUND_Y;
    player.vy = 0;
    player.onGround = true;
  }

  clouds.forEach(c => {
    c.x -= 0.2;
    if (c.x < -40) c.x = 360;
  });
}

// DRAW
function draw() {
  // SKY
  ctx.fillStyle = "#6ec6ff";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // CLOUDS
  ctx.fillStyle = "#ffffff";
  clouds.forEach(c => {
    ctx.fillRect(c.x, c.y, 20, 8);
    ctx.fillRect(c.x + 6, c.y - 4, 18, 8);
  });

  // GROUND
  ctx.fillStyle = "#3fa34d";
  ctx.fillRect(0, GROUND_Y + 8, canvas.width, canvas.height);

  // PLAYER
  ctx.save();
  ctx.translate(player.x, player.y);
  ctx.scale(player.dir, 1);

  // HEAD
  ctx.fillStyle = "#FFD800";
  ctx.strokeStyle = "#000";
  ctx.lineWidth = 1;
  ctx.fillRect(-6, -20, 12, 12);
  ctx.strokeRect(-6, -20, 12, 12);

  // EYES
  ctx.fillStyle = "#000";
  ctx.fillRect(-3, -16, 2, 2);
  ctx.fillRect(1, -16, 2, 2);

  // SMILE
  ctx.fillRect(-3, -12, 6, 1);

  // HANDS
  ctx.fillStyle = "#FFD800";
  ctx.fillRect(-10, -6, 4, 4);
  ctx.fillRect(6, -6, 4, 4);
  ctx.strokeRect(-10, -6, 4, 4);
  ctx.strokeRect(6, -6, 4, 4);

  // LEGS
  ctx.fillRect(-4, 0, 3, 8);
  ctx.fillRect(1, 0, 3, 8);
  ctx.strokeRect(-4, 0, 3, 8);
  ctx.strokeRect(1, 0, 3, 8);

  ctx.restore();
}

// LOOP
function loop() {
  update();
  draw();
  requestAnimationFrame(loop);
}

loop();
