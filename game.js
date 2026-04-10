const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

// ========== INPUT HANDLER ==========
class InputHandler {
    constructor() {
        this.keys = {};
        window.addEventListener('keydown', (e) => this.keys[e.key] = true);
        window.addEventListener('keyup', (e) => this.keys[e.key] = false);
    }

    isPressed(key) {
        return this.keys[key] || false;
    }
}

// ========== PHYSICS BODY ==========
class PhysicsBody {
    constructor(x, y, width, height) {
        this.x = x;
        this.y = y;
        this.width = width;
        this.height = height;
        this.velocityX = 0;
        this.velocityY = 0;
        this.gravity = 0.6;
        this.friction = 0.9;
        this.isGrounded = false;
    }

    update(groundY) {
        // Apply gravity
        this.velocityY += this.gravity;

        // Update position
        this.x += this.velocityX;
        this.y += this.velocityY;

        // Ground collision
        if (this.y + this.height >= groundY) {
            this.y = groundY - this.height;
            this.velocityY = 0;
            this.isGrounded = true;
        } else {
            this.isGrounded = false;
        }

        // Friction on ground
        if (this.isGrounded) {
            this.velocityX *= this.friction;
        }
    }

    jump(power) {
        if (this.isGrounded) {
            this.velocityY = -power;
            this.isGrounded = false;
        }
    }
}

// ========== ANIMATION SYSTEM ==========
class Animation {
    constructor(frames, frameRate = 0.15) {
        this.frames = frames;
        this.frameRate = frameRate;
        this.currentFrame = 0;
        this.time = 0;
    }

    update() {
        this.time += this.frameRate;
        if (this.time >= 1) {
            this.time = 0;
            this.currentFrame = (this.currentFrame + 1) % this.frames.length;
        }
    }

    reset() {
        this.currentFrame = 0;
        this.time = 0;
    }

    getCurrentFrame() {
        return this.frames[this.currentFrame];
    }
}

// ========== PLAYER CHARACTER ==========
class Player {
    constructor(x, y) {
        this.body = new PhysicsBody(x, y, 30, 50);
        this.width = 30;
        this.height = 50;
        this.speed = 5;
        this.jumpPower = 15;
        this.state = 'idle'; // idle, running, jumping, falling
        this.direction = 1; // 1 for right, -1 for left
        this.squashScale = 1;

        // Create animations
        this.animations = {
            idle: new Animation(['idle'], 0.1),
            running: new Animation(['run1', 'run2', 'run3', 'run4'], 0.15),
            jumping: new Animation(['jump'], 0.1),
            falling: new Animation(['fall'], 0.1)
        };

        this.currentAnimation = this.animations.idle;
    }

    update(input, groundY) {
        const previousState = this.state;

        // Input handling
        let moving = false;
        if (input.isPressed('a') || input.isPressed('ArrowLeft')) {
            this.body.velocityX = -this.speed;
            this.direction = -1;
            moving = true;
        } else if (input.isPressed('d') || input.isPressed('ArrowRight')) {
            this.body.velocityX = this.speed;
            this.direction = 1;
            moving = true;
        } else {
            this.body.velocityX *= 0.85;
        }

        // Jump input
        if (input.isPressed(' ')) {
            this.body.jump(this.jumpPower);
        }

        // Update physics
        this.body.update(groundY);

        // Update state
        if (!this.body.isGrounded) {
            if (this.body.velocityY < 0) {
                this.state = 'jumping';
            } else {
                this.state = 'falling';
            }
        } else {
            if (moving) {
                this.state = 'running';
            } else {
                this.state = 'idle';
            }
        }

        // Handle landing squash
        if (previousState !== 'idle' && this.state === 'idle') {
            this.squashScale = 0.8;
        }

        // Squash animation
        this.squashScale += (1 - this.squashScale) * 0.1;

        // Update animation
        if (previousState !== this.state) {
            this.currentAnimation = this.animations[this.state];
            this.currentAnimation.reset();
        }

        this.currentAnimation.update();

        // Clamp position to world bounds
        if (this.body.x < 0) this.body.x = 0;
        if (this.body.x + this.width > 3200) this.body.x = 3200 - this.width;
    }

    draw(ctx, cameraX) {
        const screenX = this.body.x - cameraX;
        const screenY = this.body.y;
        const frameData = this.currentAnimation.getCurrentFrame();

        ctx.save();
        ctx.translate(screenX + this.width / 2, screenY + this.height / 2);
        ctx.scale(this.direction, 1);
        ctx.scale(1, this.squashScale);
        ctx.translate(-(this.width / 2), -(this.height / 2));

        // Draw based on animation frame
        if (frameData === 'idle') {
            this.drawIdle(ctx);
        } else if (frameData.startsWith('run')) {
            const runFrame = parseInt(frameData[3]);
            this.drawRunning(ctx, runFrame);
        } else if (frameData === 'jump') {
            this.drawJump(ctx);
        } else if (frameData === 'fall') {
            this.drawFall(ctx);
        }

        ctx.restore();
    }

    drawIdle(ctx) {
        // Head (yellow)
        ctx.fillStyle = '#FFD700';
        ctx.fillRect(5, 0, 20, 15);

        // Face
        ctx.fillStyle = '#000';
        ctx.fillRect(8, 3, 3, 3);
        ctx.fillRect(15, 3, 3, 3);
        ctx.fillRect(9, 9, 12, 2);

        // Torso (blue)
        ctx.fillStyle = '#1E90FF';
        ctx.fillRect(6, 15, 18, 18);

        // Arms (yellow)
        ctx.fillStyle = '#FFD700';
        ctx.fillRect(0, 16, 6, 8);
        ctx.fillRect(24, 16, 6, 8);

        // Legs (green)
        ctx.fillStyle = '#32CD32';
        ctx.fillRect(8, 33, 7, 17);
        ctx.fillRect(15, 33, 7, 17);
    }

    drawRunning(ctx, frame) {
        // Head (yellow)
        ctx.fillStyle = '#FFD700';
        ctx.fillRect(5, 0, 20, 15);

        // Face
        ctx.fillStyle = '#000';
        ctx.fillRect(8, 3, 3, 3);
        ctx.fillRect(15, 3, 3, 3);
        ctx.fillRect(9, 9, 12, 2);

        // Torso (blue)
        ctx.fillStyle = '#1E90FF';
        ctx.fillRect(6, 15, 18, 18);

        // Arms (yellow) - animated swing
        ctx.fillStyle = '#FFD700';
        if (frame === 1 || frame === 3) {
            ctx.fillRect(-2, 16, 6, 8);
            ctx.fillRect(26, 16, 6, 8);
        } else {
            ctx.fillRect(0, 12, 6, 8);
            ctx.fillRect(24, 20, 6, 8);
        }

        // Legs (green) - animated stride
        ctx.fillStyle = '#32CD32';
        if (frame === 1 || frame === 3) {
            ctx.fillRect(8, 36, 7, 14);
            ctx.fillRect(15, 30, 7, 20);
        } else {
            ctx.fillRect(8, 30, 7, 20);
            ctx.fillRect(15, 36, 7, 14);
        }
    }

    drawJump(ctx) {
        // Head (yellow)
        ctx.fillStyle = '#FFD700';
        ctx.fillRect(5, 0, 20, 15);

        // Face
        ctx.fillStyle = '#000';
        ctx.fillRect(8, 3, 3, 3);
        ctx.fillRect(15, 3, 3, 3);
        ctx.fillRect(9, 8, 12, 2);

        // Torso (blue)
        ctx.fillStyle = '#1E90FF';
        ctx.fillRect(6, 15, 18, 18);

        // Arms (yellow) - raised
        ctx.fillStyle = '#FFD700';
        ctx.fillRect(0, 12, 6, 8);
        ctx.fillRect(24, 12, 6, 8);

        // Legs (green) - bent
        ctx.fillStyle = '#32CD32';
        ctx.fillRect(8, 36, 7, 10);
        ctx.fillRect(15, 36, 7, 10);
    }

    drawFall(ctx) {
        // Head (yellow)
        ctx.fillStyle = '#FFD700';
        ctx.fillRect(5, 0, 20, 15);

        // Face - surprised
        ctx.fillStyle = '#000';
        ctx.fillRect(8, 3, 3, 3);
        ctx.fillRect(15, 3, 3, 3);
        ctx.fillRect(10, 10, 10, 2);

        // Torso (blue)
        ctx.fillStyle = '#1E90FF';
        ctx.fillRect(6, 15, 18, 18);

        // Arms (yellow) - spread
        ctx.fillStyle = '#FFD700';
        ctx.fillRect(-1, 18, 6, 8);
        ctx.fillRect(25, 18, 6, 8);

        // Legs (green) - extended
        ctx.fillStyle = '#32CD32';
        ctx.fillRect(8, 36, 7, 14);
        ctx.fillRect(15, 36, 7, 14);
    }
}

// ========== ENVIRONMENT OBJECTS ==========
class Cloud {
    constructor(x, y, width, height, speed) {
        this.x = x;
        this.y = y;
        this.width = width;
        this.height = height;
        this.speed = speed;
    }

    update() {
        this.x += this.speed;
        if (this.x > canvas.width + 100) {
            this.x = -this.width - 100;
        }
    }

    draw(ctx) {
        ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
        ctx.beginPath();
        ctx.arc(this.x, this.y, 20, 0, Math.PI * 2);
        ctx.arc(this.x + 25, this.y - 10, 25, 0, Math.PI * 2);
        ctx.arc(this.x + 50, this.y, 20, 0, Math.PI * 2);
        ctx.fill();
    }
}

class Sun {
    constructor() {
        this.x = 900;
        this.y = 80;
        this.radius = 40;
    }

    draw(ctx) {
        // Sun rays
        ctx.strokeStyle = 'rgba(255, 215, 0, 0.3)';
        ctx.lineWidth = 3;
        for (let i = 0; i < 8; i++) {
            const angle = (i / 8) * Math.PI * 2;
            const x1 = this.x + Math.cos(angle) * 50;
            const y1 = this.y + Math.sin(angle) * 50;
            const x2 = this.x + Math.cos(angle) * 70;
            const y2 = this.y + Math.sin(angle) * 70;
            ctx.beginPath();
            ctx.moveTo(x1, y1);
            ctx.lineTo(x2, y2);
            ctx.stroke();
        }

        // Sun circle
        ctx.fillStyle = '#FFD700';
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
        ctx.fill();
    }
}

// ========== MAIN GAME ENGINE ==========
class Game {
    constructor() {
        this.input = new InputHandler();
        this.player = new Player(100, 400);
        this.groundY = 480;
        this.cameraX = 0;
        this.cameraVelocity = 0;
        
        // Environment
        this.sun = new Sun();
        this.clouds = [
            new Cloud(100, 100, 60, 30, 0.2),
            new Cloud(400, 150, 60, 30, 0.15),
            new Cloud(700, 120, 60, 30, 0.25),
        ];

        this.running = true;
    }

    update() {
        this.player.update(this.input, this.groundY);

        // Update clouds
        this.clouds.forEach(cloud => cloud.update());

        // Smooth camera follow
        const targetCameraX = this.player.body.x - canvas.width / 3;
        this.cameraVelocity += (targetCameraX - this.cameraX) * 0.05;
        this.cameraVelocity *= 0.9;
        this.cameraX += this.cameraVelocity;

        // Clamp camera
        this.cameraX = Math.max(0, Math.min(this.cameraX, 3200 - canvas.width));
    }

    draw() {
        // Clear canvas
        ctx.fillStyle = 'rgb(135, 206, 235)';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        // Draw sky gradient
        const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
        gradient.addColorStop(0, '#87CEEB');
        gradient.addColorStop(1, '#E0F6FF');
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        // Draw sun (no parallax)
        this.sun.draw(ctx);

        // Draw clouds with parallax
        ctx.save();
        ctx.translate(-this.cameraX * 0.3, 0);
        this.clouds.forEach(cloud => cloud.draw(ctx));
        ctx.restore();

        // Draw ground
        ctx.fillStyle = '#228B22';
        ctx.fillRect(-this.cameraX, this.groundY, 3200, 96);

        // Ground detail lines
        ctx.strokeStyle = 'rgba(0, 100, 0, 0.3)';
        ctx.lineWidth = 1;
        for (let i = 0; i < 16; i++) {
            ctx.beginPath();
            ctx.moveTo(i * 200 - this.cameraX, this.groundY);
            ctx.lineTo(i * 200 - this.cameraX, this.groundY + 5);
            ctx.stroke();
        }

        // Draw player
        this.player.draw(ctx, this.cameraX);
    }

    run() {
        const gameLoop = () => {
            this.update();
            this.draw();
            requestAnimationFrame(gameLoop);
        };
        gameLoop();
    }
}

// Initialize and run game
const game = new Game();
game.run();
