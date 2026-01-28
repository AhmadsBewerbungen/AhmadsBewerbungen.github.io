const canvas = document.getElementById("game");
const ctx = canvas.getContext("2d");

const GRAVITY = 0.4;
const GROUND_Y = 140;

const keys = {};
addEventListener("keydown", e => keys[e.code] = true);
addEventListener("keyup", e => keys[e.code] = false);

let clouds = [
  { x: 20, y: 20 },
  { x: 120, y: 35 },
  { x: 220, y: 25 }
];

const player = {
  x: 80,
  y: GROUND_Y,
  vx: 0,
  vy: 0,
  onGround: true,
  dir: 1,
  frame: 0,
  animTimer: 0,
  state: "idle" // idle, run, jump
};

function update() {
  // INPUT
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

  // STATE
  if (!player.onGround) player.state = "jump";
  else if (player.vx !== 0) player.state = "run";
  else player.state = "idle";

  // PHYSICS
  player.vy += GRAVITY;
  player.x += player.vx;
  player.y += player.vy;

  if (player.y >= GROUND_Y) {
    player.y = GROUND_Y;
    player.vy = 0;
    player.onGround = true;
  }

  // ANIMATION
  player.animTimer++;
  if (player.animTimer > 4) {
    player.frame = (player.frame + 1) % 12;
    player.animTimer = 0;
  }

  // CLOUDS
  clouds.forEach(c => {
    c.x -= 0.1;
    if (c.x < -40) c.x = 340;
  });
}

function drawCloud(x, y) {
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(x, y, 20, 8);
  ctx.fillRect(x + 6, y - 4, 18, 8);
}

function drawPlayer() {
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
  ctx.strokeStyle = "#000";
  ctx.fillRect(-10, -6, 4, 4);
  ctx.fillRect(6, -6, 4, 4);
  ctx.strokeRect(-10, -6, 4, 4);
  ctx.strokeRect(6, -6, 4, 4);

  // LEGS (animated offset)
  const legOffset = player.state === "run" ? (player.frame % 6 < 3 ? 1 : -1) : 0;
  ctx.fillRect(-4, 0, 3, 8 + legOffset);
  ctx.fillRect(1, 0, 3, 8 - legOffset);
  ctx.strokeRect(-4, 0, 3, 8 + legOffset);
  ctx.strokeRect(1, 0, 3, 8 - legOffset);

  ctx.restore();
}

function draw() {
  // SKY
  ctx.fillStyle = "#6ec6ff";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // CLOUDS
  clouds.forEach(c => drawCloud(c.x, c.y));

  // GRASS
  ctx.fillStyle = "#3fa34d";
  ctx.fillRect(0, GROUND_Y + 8, canvas.width, canvas.height);
  for (let i = 0; i < canvas.width; i += 6) {
    ctx.fillRect(i, GROUND_Y + 4, 2, 4);
  }

  drawPlayer();
}

function loop() {
  update();
  draw();
  requestAnimationFrame(loop);
}

loop();
