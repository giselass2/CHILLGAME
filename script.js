const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

const startScreen = document.getElementById('start-screen');
const startButton = document.getElementById('startButton');
const gameOverScreen = document.getElementById('game-over-screen');
const restartButton = document.getElementById('restartButton');
const finalScoreDisplay = document.getElementById('finalScore');

// Game variables
let player;
let obstacles = [];
let score = 0;
let gameOver = false;
let gameInterval;
let obstacleSpawnInterval;
let gameStartTime;
let backgroundY = 0; // For scrolling background
const BACKGROUND_SCROLL_SPEED = 0.5; // Adjust for slower/faster scroll

// Image assets
const playerImg = new Image();
playerImg.src = 'pez.png'; // Your ChillFish image
const obstacleImg = new Image();
obstacleImg.src = 'pez_globo.png'; // Your Pufferfish image
const backgroundImg = new Image();
backgroundImg.src = 'fondo_mar.jpg'; // Your ocean background image

// Wait for images to load before starting anything
let imagesLoaded = 0;
const totalImages = 3;

playerImg.onload = obstacleImg.onload = backgroundImg.onload = () => {
    imagesLoaded++;
    if (imagesLoaded === totalImages) {
        initGame(); // Initialize game once all images are loaded
    }
};

// Game object classes (simple for this example)
class Player {
    constructor() {
        this.width = 100; // AHORA ES MÁS GRANDE: 100px
        this.height = 100; // AHORA ES MÁS GRANDE: 100px
        this.x = canvas.width / 2 - this.width / 2;
        this.y = canvas.height - this.height - 30; // Position near bottom
        this.targetX = this.x; // Target position for smooth movement
        this.speed = 0.1; // Adjust for slower/faster smooth movement
    }

    draw() {
        ctx.drawImage(playerImg, this.x, this.y, this.width, this.height);
    }

    update() {
        this.x += (this.targetX - this.x) * this.speed;
        this.x = Math.max(0, Math.min(canvas.width - this.width, this.x));
    }
}

class Obstacle {
    constructor() {
        this.width = 90; // AHORA ES MÁS GRANDE: 90px
        this.height = 90; // AHORA ES MÁS GRANDE: 90px
        this.x = Math.random() * (canvas.width - this.width);
        this.y = -this.height; // Start above canvas
        this.speed = Math.random() * 2 + 3; // Random speed for variety
    }

    draw() {
        ctx.drawImage(obstacleImg, this.x, this.y, this.width, this.height);
    }

    update() {
        this.y += this.speed;
    }
}

// Initialization and Reset
function initGame() {
    canvas.width = window.innerWidth > 400 ? 400 : window.innerWidth;
    canvas.height = window.innerHeight > 700 ? 700 : window.innerHeight; 

    player = new Player();
    obstacles = [];
    score = 0;
    gameOver = false;
    backgroundY = 0;

    startScreen.classList.remove('hidden');
    gameOverScreen.classList.add('hidden');
}

// Game Loop
function gameLoop() {
    if (gameOver) {
        clearInterval(gameInterval);
        cancelAnimationFrame(gameInterval);
        return;
    }

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Draw scrolling background
    backgroundY += BACKGROUND_SCROLL_SPEED;
    if (backgroundY >= canvas.height) {
        backgroundY = 0;
    }
    ctx.drawImage(backgroundImg, 0, backgroundY - canvas.height, canvas.width, canvas.height);
    ctx.drawImage(backgroundImg, 0, backgroundY, canvas.width, canvas.height);

    player.update();
    player.draw();

    // Update and draw obstacles
    for (let i = 0; i < obstacles.length; i++) {
        obstacles[i].update();
        obstacles[i].draw();

        // Check for collision
        if (
            player.x < obstacles[i].x + obstacles[i].width &&
            player.x + player.width > obstacles[i].x &&
            player.y < obstacles[i].y + obstacles[i].height &&
            player.y + player.height > obstacles[i].y
        ) {
            endGame();
            return;
        }

        // Remove obstacles that go off-screen
        if (obstacles[i].y > canvas.height) {
            obstacles.splice(i, 1);
            i--;
        }
    }

    // Update score
    score = Math.floor((Date.now() - gameStartTime) / 1000);
    ctx.fillStyle = 'white';
    ctx.font = '20px Arial';
    ctx.fillText(`Time: ${score}s`, 10, 30);

    gameInterval = requestAnimationFrame(gameLoop);
}

// Spawn obstacles
function spawnObstacle() {
    if (!gameOver) {
        obstacles.push(new Obstacle());
    }
}

// Start Game
function startGame() {
    startScreen.classList.add('hidden');
    gameOverScreen.classList.add('hidden');
    gameOver = false;
    score = 0;
    obstacles = [];
    gameStartTime = Date.now();
    player = new Player();
    backgroundY = 0;

    if (gameInterval) cancelAnimationFrame(gameInterval);
    if (obstacleSpawnInterval) clearInterval(obstacleSpawnInterval);

    gameInterval = requestAnimationFrame(gameLoop);
    obstacleSpawnInterval = setInterval(spawnObstacle, 1500);
}

// End Game
function endGame() {
    gameOver = true;
    finalScoreDisplay.textContent = score;
    gameOverScreen.classList.remove('hidden');
    clearInterval(obstacleSpawnInterval);
    cancelAnimationFrame(gameInterval);
}

// Event Listeners
startButton.addEventListener('click', startGame);
restartButton.addEventListener('click', startGame);

// Player movement on mouse/touch click/tap
canvas.addEventListener('click', (e) => {
    if (gameOver) return;
    const rect = canvas.getBoundingClientRect();
    const clickX = e.clientX - rect.left;

    player.targetX = clickX - player.width / 2;
});

// Adjust canvas size on window resize
window.addEventListener('resize', initGame);