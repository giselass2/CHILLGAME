// Variable global para la URL de tu Google Apps Script (¡YA NO ES NECESARIA SI ELIMINAMOS EL PERFIL/RANKING!)
// const GOOGLE_APPS_SCRIPT_URL = 'TU_URL_DE_APPS_SCRIPT_AQUÍ';

// Referencias a elementos del DOM
const gameCanvas = document.getElementById('gameCanvas');
const ctx = gameCanvas.getContext('2d');

const main_menu = document.getElementById('main-menu');
const startButton = document.getElementById('startButton');
const howToPlayButton = document.getElementById('howToPlayButton'); // Botón Cómo Jugar
const gameOverScreen = document.getElementById('gameOverScreen');
const finalScoreDisplay = document.getElementById('finalScore');
const highScoreMessage = document.getElementById('highScoreMessage');
const restartButton = document.getElementById('restartButton');
const backToMainMenuButton = document.getElementById('backToMainMenuButton');

// Referencias a elementos de perfil y leaderboard eliminadas
// const profileMenu = document.getElementById('profileMenu');
// const profileTelegramId = document.getElementById('profileTelegramId');
// const profileUsername = document.getElementById('profileUsername');
// const profileHighScore = document.getElementById('profileHighScore');
// const profileBackButton = document.getElementById('profileBackButton');
// const leaderboardMenu = document.getElementById('leaderboardMenu');
// const leaderboardList = document.getElementById('leaderboardList');
// const leaderboardBackButton = document.getElementById('leaderboardBackButton');

const howToPlayMenu = document.getElementById('howToPlayMenu'); // Pantalla de instrucciones
const howToPlayBackButton = document.getElementById('howToPlayBackButton'); // Botón de vuelta en instrucciones

// Telegram WebApp variables (mantenidas por si en el futuro se quiere reincorporar)
let tg = window.Telegram.WebApp;
let userTelegramId = null;
let userUsername = null;

// Game variables
let score = 0;
let gameInterval;
let obstacles = [];
let projectiles = [];
let player; // Nuestro objeto jugador
let keysPressed = {}; // Para el movimiento de 4 direcciones

// *** AJUSTES DE TAMAÑO Y VELOCIDAD PARA EL PEZ GIGANTE CON ROPA ***
// Ajusta estos valores para que el pez se vea y se mueva bien
const PLAYER_WIDTH = 90; // Ajustado para el pez con ropa (más estrecho que el alto)
const PLAYER_HEIGHT = 120; // Tamaño del pez ahora es GIGANTE y con la proporción de la imagen
const PLAYER_SPEED = 6; // Ligeramente aumentada para que un pez grande sea más ágil
const PROJECTILE_SPEED = 7; // Las balas deben ir rápido
const OBSTACLE_SPEED = 2.5; // Ligeramente aumentada, pero aún manejable

// Imágenes del juego (precarga para evitar parpadeos)
const playerImage = new Image();
playerImage.src = 'pez.png'; // Esta es la imagen del pez con ropa
const obstacleImage = new Image();
obstacleImage.src = 'pez_globo.png';
const backgroundImage = new Image();
backgroundImage.src = 'fondo_mar.jpg';
const projectileImage = new Image();
projectileImage.src = 'burbuja.png';

// Asegúrate de que todas las imágenes se carguen antes de iniciar el juego
let imagesLoaded = 0;
const totalImages = 4; // Asegúrate de que este número coincide con las imágenes que tienes

function imageLoaded() {
    imagesLoaded++;
    if (imagesLoaded === totalImages) {
        console.log("Todas las imágenes cargadas.");
        // Una vez que todas las imágenes estén cargadas, muestra el menú principal.
        showMainMenu();
    }
}
playerImage.onload = imageLoaded;
obstacleImage.onload = imageLoaded;
backgroundImage.onload = imageLoaded;
projectileImage.onload = imageLoaded;


// --- Clases de Juego ---

class Player {
    constructor() {
        this.width = PLAYER_WIDTH;
        this.height = PLAYER_HEIGHT;
        this.x = gameCanvas.width / 4;
        this.y = gameCanvas.height / 2 - this.height / 2;
    }

    draw() {
        ctx.drawImage(playerImage, this.x, this.y, this.width, this.height);
    }

    update() {
        // Mover en 4 direcciones
        if (keysPressed['ArrowUp'] || keysPressed['KeyW']) {
            this.y -= PLAYER_SPEED;
        }
        if (keysPressed['ArrowDown'] || keysPressed['KeyS']) {
            this.y += PLAYER_SPEED;
        }
        if (keysPressed['ArrowLeft'] || keysPressed['KeyA']) {
            this.x -= PLAYER_SPEED;
        }
        if (keysPressed['ArrowRight'] || keysPressed['KeyD']) {
            this.x += PLAYER_SPEED;
        }

        // Limitar el movimiento dentro del canvas
        if (this.x < 0) this.x = 0;
        if (this.x + this.width > gameCanvas.width) this.x = gameCanvas.width - this.width;
        if (this.y < 0) this.y = 0;
        if (this.y + this.height > gameCanvas.height) this.y = gameCanvas.height - this.height;
    }

    shoot() {
        // Dispara un proyectil desde el centro del pez, moviéndose a la derecha
        projectiles.push(new Projectile(this.x + this.width, this.y + this.height / 2));
    }
}

class Obstacle {
    constructor() {
        this.width = 60; // Tamaño del pez globo
        this.height = 60;
        this.x = gameCanvas.width; // Empieza desde la derecha
        this.y = Math.random() * (gameCanvas.height - this.height); // Posición Y aleatoria
    }

    draw() {
        ctx.drawImage(obstacleImage, this.x, this.y, this.width, this.height);
    }

    update() {
        this.x -= OBSTACLE_SPEED;
    }
}

class Projectile {
    constructor(x, y) {
        this.width = 20; // Tamaño de la burbuja/proyectil
        this.height = 20;
        this.x = x;
        this.y = y - this.height / 2; // Centrar verticalmente con respecto al disparo del pez
    }

    draw() {
        ctx.drawImage(projectileImage, this.x, this.y, this.width, this.height);
    }

    update() {
        this.x += PROJECTILE_SPEED; // Se mueve hacia la derecha
    }
}

// --- Inicialización de Telegram WebApp ---
tg.ready();

if (tg.initDataUnsafe && tg.initDataUnsafe.user) {
    userTelegramId = tg.initDataUnsafe.user.id;
    userUsername = tg.initDataUnsafe.user.username || tg.initDataUnsafe.user.first_name;
    console.log("Telegram User ID:", userTelegramId);
    console.log("Telegram Username:", userUsername);
} else {
    console.warn("Telegram WebApp user data not available. Running in standalone mode.");
    userTelegramId = "guest_" + Math.random().toString(36).substr(2, 9); // Fallback for testing
    userUsername = "GuestPlayer";
}

// --- Funciones de comunicación con Google Apps Script (ELIMINADAS/COMENTADAS) ---
// Ya no son necesarias si no se usan los botones de perfil/leaderboard
/*
async function sendScoreToAppsScript(telegramId, username, currentScore) { ... }
async function getScoresFromAppsScript() { ... }
*/

// --- Lógica de Juego y Menús ---

function showMainMenu() {
    main_menu.style.display = 'flex';
    gameOverScreen.style.display = 'none';
    howToPlayMenu.style.display = 'none';
    gameCanvas.style.display = 'none';
    tg.MainButton.hide();
}

// Funciones de perfil y leaderboard eliminadas
/*
function showProfileMenu() { ... }
async function showLeaderboardMenu() { ... }
*/

function showHowToPlayMenu() {
    howToPlayMenu.style.display = 'flex';
    main_menu.style.display = 'none';
    gameOverScreen.style.display = 'none';
    gameCanvas.style.display = 'none';
}

function startGame() {
    main_menu.style.display = 'none';
    gameOverScreen.style.display = 'none';
    howToPlayMenu.style.display = 'none';
    gameCanvas.style.display = 'block'; // Asegura que el canvas se muestre

    // MUY IMPORTANTE: Asegurar que el canvas tenga un tamaño explícito en JS o CSS
    // Si tu CSS no define un width y height fijo, es mejor hacerlo aquí.
    // Esto asegura que el canvas no sea de 0x0 y no se vea la pantalla azul.
    gameCanvas.width = window.innerWidth;  // O un valor fijo como 800
    gameCanvas.height = window.innerHeight; // O un valor fijo como 600

    score = 0;
    obstacles = [];
    projectiles = [];
    player = new Player(); // Reiniciar el jugador
    highScoreMessage.textContent = "";

    if (gameInterval) clearInterval(gameInterval);
    gameInterval = setInterval(gameLoop, 1000 / 60); // ~60 FPS
}

function endGame() {
    clearInterval(gameInterval);
    gameOverScreen.style.display = 'flex';
    gameCanvas.style.display = 'none';
    finalScoreDisplay.textContent = score;

    // Ya no se llama a sendScoreToAppsScript
    highScoreMessage.textContent = "Great job!"; // Mensaje simple sin Apps Script
}

// --- Colisión (AABB - Axis-Aligned Bounding Box) ---
function checkCollision(obj1, obj2) {
    return obj1.x < obj2.x + obj2.width &&
           obj1.x + obj1.width > obj2.x &&
           obj1.y < obj2.y + obj2.height &&
           obj1.y + obj1.height > obj2.y;
}

// --- Bucle principal del juego ---
function gameLoop() {
    ctx.clearRect(0, 0, gameCanvas.width, gameCanvas.height); // Limpiar canvas

    // Dibuja el fondo
    ctx.drawImage(backgroundImage, 0, 0, gameCanvas.width, gameCanvas.height);

    player.update();
    player.draw();

    // Actualiza y dibuja obstáculos
    for (let i = 0; i < obstacles.length; i++) {
        let obstacle = obstacles[i];
        obstacle.update();
        obstacle.draw();

        // Colisión jugador-obstáculo
        if (checkCollision(player, obstacle)) {
            endGame();
            return; // Termina el bucle si el juego termina
        }

        // Eliminar obstáculos fuera de pantalla
        if (obstacle.x + obstacle.width < 0) {
            obstacles.splice(i, 1);
            i--;
            score += 10; // Puntos por esquivar
        }
    }

    // Actualiza y dibuja proyectiles
    for (let i = 0; i < projectiles.length; i++) {
        let projectile = projectiles[i];
        projectile.update();
        projectile.draw();

        // Eliminar proyectiles fuera de pantalla
        if (projectile.x > gameCanvas.width) {
            projectiles.splice(i, 1);
            i--;
        }
    }

    // Colisión proyectil-obstáculo
    for (let i = 0; i < projectiles.length; i++) {
        for (let j = 0; j < obstacles.length; j++) {
            let projectile = projectiles[i];
            let obstacle = obstacles[j];

            if (checkCollision(projectile, obstacle)) {
                // Colisión detectada: elimina ambos
                projectiles.splice(i, 1);
                obstacles.splice(j, 1);
                i--;
                j--;
                score += 50; // Puntos por destruir
                break; // Un proyectil solo puede destruir un obstáculo
            }
        }
    }

    // Generar nuevos obstáculos
    if (Math.random() < 0.015) {
        obstacles.push(new Obstacle());
    }

    // Muestra el score
    ctx.fillStyle = 'white';
    ctx.font = '24px Arial';
    ctx.fillText(`Score: ${score}`, 10, 30);
}

// --- Event Listeners ---
startButton.addEventListener('click', startGame);
howToPlayButton.addEventListener('click', showHowToPlayMenu);
restartButton.addEventListener('click', startGame);
backToMainMenuButton.addEventListener('click', showMainMenu);
howToPlayBackButton.addEventListener('click', showMainMenu);

// Eventos de teclado para movimiento de 4 direcciones
document.addEventListener('keydown', (e) => {
    if (gameCanvas.style.display === 'block') { // Solo si el juego está activo
        keysPressed[e.code] = true;
        if (e.code === 'Space') {
            if (player) {
                player.shoot();
            }
        }
    }
});

document.addEventListener('keyup', (e) => {
    if (gameCanvas.style.display === 'block') { // Solo si el juego está activo
        delete keysPressed[e.code];
    }
});

// Variables para el control táctil
let touchStartX = 0;
let touchStartY = 0;
let isDragging = false;

// Evento de toque/clic para movimiento y disparo
gameCanvas.addEventListener('touchstart', (e) => {
    e.preventDefault(); // Previene el desplazamiento por defecto en móviles
    if (gameCanvas.style.display === 'block' && player) {
        touchStartX = e.touches[0].clientX;
        touchStartY = e.touches[0].clientY;
        isDragging = true;
    }
});

gameCanvas.addEventListener('touchmove', (e) => {
    e.preventDefault();
    if (gameCanvas.style.display === 'block' && isDragging && player) {
        const touchX = e.touches[0].clientX;
        const touchY = e.touches[0].clientY;

        const deltaX = touchX - touchStartX;
        const deltaY = touchY - touchStartY;

        player.x += deltaX;
        player.y += deltaY;

        touchStartX = touchX;
        touchStartY = touchY;

        // Limita el movimiento dentro del canvas
        if (player.x < 0) player.x = 0;
        if (player.x + player.width > gameCanvas.width) player.x = gameCanvas.width - player.width;
        if (player.y < 0) player.y = 0;
        if (player.y + player.height > gameCanvas.height) player.y = gameCanvas.height - player.height;
    }
});

gameCanvas.addEventListener('touchend', (e) => {
    if (gameCanvas.style.display === 'block') {
        // Si no hubo un arrastre significativo, se considera un toque para disparar
        if (!isDragging || Math.abs(e.changedTouches[0].clientX - touchStartX) < 10 && Math.abs(e.changedTouches[0].clientY - touchStartY) < 10) {
            if (player) {
                player.shoot();
            }
        }
        isDragging = false;
    }
});
