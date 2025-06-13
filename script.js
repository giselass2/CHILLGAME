// Variable global para la URL de tu Google Apps Script (¡YA NO ES NECESARIA SI ELIMINAMOS EL PERFIL/RANKING!)
// const GOOGLE_APPS_SCRIPT_URL = 'TU_URL_DE_APPS_SCRIPT_AQUÍ';

// Referencias a elementos del DOM
const gameCanvas = document.getElementById('gameCanvas');
const ctx = gameCanvas.getContext('2d');

const main_menu = document.getElementById('main-menu');
const startButton = document.getElementById('startButton');
const howToPlayButton = document.getElementById('howToPlayButton');
const gameOverScreen = document.getElementById('gameOverScreen');
const finalScoreDisplay = document.getElementById('finalScore');
const highScoreMessage = document.getElementById('highScoreMessage');
const restartButton = document.getElementById('restartButton'); // Botón de RESTART
const backToMainMenuButton = document.getElementById('backToMainMenuButton'); // Botón de MAIN MENU

const howToPlayMenu = document.getElementById('howToPlayMenu');
const howToPlayBackButton = document.getElementById('howToPlayBackButton');

// Telegram WebApp variables (mantenidas por si en el futuro se quiere reincorporar)
let tg = window.Telegram.WebApp;
let userTelegramId = null;
let userUsername = null;

// Game variables
let score = 0;
let gameInterval;
let obstacles = [];
let projectiles = [];
let player;
let keysPressed = {}; // Para el movimiento de 4 direcciones

// Variables para el control táctil
let touchStartX = 0;
let touchStartY = 0;
let isDragging = false; // Estado de arrastre para diferenciar movimiento de disparo táctil

// *** AJUSTES DE TAMAÑO Y VELOCIDAD PARA EL PEZ GIGANTE CON ROPA ***
const PLAYER_WIDTH = 90;
const PLAYER_HEIGHT = 120;
const PLAYER_SPEED = 6;
const PROJECTILE_SPEED = 7;
const OBSTACLE_SPEED = 2.5;

// Imágenes del juego (precarga para evitar parpadeos)
const playerImage = new Image();
playerImage.src = 'pez.png'; // Esta es la imagen del pez con ropa
const obstacleImage = new Image();
obstacleImage.src = 'pez_globo.png';
const backgroundImage = new Image();
backgroundImage.src = 'fondo_mar.jpg';
const projectileImage = new Image();
projectileImage.src = 'burbuja.png';

let imagesLoaded = 0;
const totalImages = 4;

function imageLoaded() {
    imagesLoaded++;
    if (imagesLoaded === totalImages) {
        console.log("Todas las imágenes cargadas.");
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
        this.x = gameCanvas.width / 4 - this.width / 2; // Centrar el jugador horizontalmente
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
        // Dispara un proyectil desde el "pez" (puntos de origen ajustados para la imagen con ropa)
        // Puedes ajustar el `0.4` si la burbuja no sale exactamente donde quieres
        projectiles.push(new Projectile(this.x + this.width, this.y + this.height * 0.4));
    }
}

class Obstacle {
    constructor() {
        this.width = 60;
        this.height = 60;
        this.x = gameCanvas.width;
        this.y = Math.random() * (gameCanvas.height - this.height);
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
        this.width = 20;
        this.height = 20;
        this.x = x;
        this.y = y - this.height / 2;
    }

    draw() {
        ctx.drawImage(projectileImage, this.x, this.y, this.width, this.height);
    }

    update() {
        this.x += PROJECTILE_SPEED;
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
    userTelegramId = "guest_" + Math.random().toString(36).substr(2, 9);
    userUsername = "GuestPlayer";
}

// --- Lógica de Juego y Menús ---

function showMainMenu() {
    main_menu.style.display = 'flex';
    gameOverScreen.style.display = 'none';
    howToPlayMenu.style.display = 'none';
    gameCanvas.style.display = 'none';
    tg.MainButton.hide();

    // Limpiar el estado de las teclas y arrastre cuando volvemos al menú principal
    keysPressed = {};
    isDragging = false;
}

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
    gameCanvas.style.display = 'block';

    // Asegurar que el canvas tenga un tamaño explícito
    gameCanvas.width = window.innerWidth;
    gameCanvas.height = window.innerHeight;

    score = 0;
    obstacles = [];
    projectiles = [];
    player = new Player(); // Reiniciar el jugador
    highScoreMessage.textContent = "";

    // Limpiar el estado de las teclas y arrastre al iniciar un nuevo juego
    keysPressed = {};
    isDragging = false;

    if (gameInterval) clearInterval(gameInterval);
    gameInterval = setInterval(gameLoop, 1000 / 60); // ~60 FPS
}

function endGame() {
    clearInterval(gameInterval);
    gameOverScreen.style.display = 'flex';
    gameCanvas.style.display = 'none';
    finalScoreDisplay.textContent = score;

    highScoreMessage.textContent = "Great job!"; // Mensaje simple sin Apps Script
    // Limpiar el estado de las teclas y arrastre al finalizar el juego
    keysPressed = {};
    isDragging = false;
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
    ctx.clearRect(0, 0, gameCanvas.width, gameCanvas.height);

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
            return;
        }

        // Eliminar obstáculos fuera de pantalla
        if (obstacle.x + obstacle.width < 0) {
            obstacles.splice(i, 1);
            i--;
            score += 10;
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
                score += 50;
                break;
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

// Eventos de menú
startButton.addEventListener('click', startGame);
howToPlayButton.addEventListener('click', showHowToPlayMenu);
howToPlayBackButton.addEventListener('click', showMainMenu);

// Eventos de Game Over
restartButton.addEventListener('click', startGame);
backToMainMenuButton.addEventListener('click', showMainMenu);

// Eventos de teclado para movimiento de 4 direcciones y disparo
document.addEventListener('keydown', (e) => {
    // Solo procesar si el juego está activo (canvas visible)
    if (gameCanvas.style.display === 'block') {
        keysPressed[e.code] = true;
        if (e.code === 'Space') {
            // Verifica que el jugador exista antes de disparar
            if (player) {
                player.shoot();
            }
        }
    }
});

document.addEventListener('keyup', (e) => {
    // Solo procesar si el juego está activo
    if (gameCanvas.style.display === 'block') {
        delete keysPressed[e.code];
    }
});

// Eventos táctiles para movimiento y disparo
gameCanvas.addEventListener('touchstart', (e) => {
    e.preventDefault(); // Previene el desplazamiento por defecto en móviles
    // Solo si el juego está activo y el jugador existe
    if (gameCanvas.style.display === 'block' && player) {
        touchStartX = e.touches[0].clientX;
        touchStartY = e.touches[0].clientY;
        isDragging = false; // Resetea isDragging al inicio del toque
    }
});

gameCanvas.addEventListener('touchmove', (e) => {
    e.preventDefault();
    // Solo si el juego está activo y estamos arrastrando
    if (gameCanvas.style.display === 'block' && player) {
        const touchX = e.touches[0].clientX;
        const touchY = e.touches[0].clientY;

        const deltaX = touchX - touchStartX;
        const deltaY = touchY - touchStartY;

        // Si hay un movimiento significativo, es un arrastre
        if (Math.abs(deltaX) > 5 || Math.abs(deltaY) > 5) { // Umbral de 5 píxeles para considerar arrastre
            isDragging = true;
            player.x += deltaX;
            player.y += deltaY;

            // Limita el movimiento dentro del canvas
            if (player.x < 0) player.x = 0;
            if (player.x + player.width > gameCanvas.width) player.x = gameCanvas.width - player.width;
            if (player.y < 0) player.y = 0;
            if (player.y + player.height > gameCanvas.height) player.y = gameCanvas.height - player.height;

            // Actualiza la posición de inicio para el siguiente delta
            touchStartX = touchX;
            touchStartY = touchY;
        }
    }
});

gameCanvas.addEventListener('touchend', (e) => {
    // Solo si el juego está activo
    if (gameCanvas.style.display === 'block' && player) {
        // Si no hubo un arrastre significativo, se considera un toque para disparar
        if (!isDragging) {
            player.shoot();
        }
    }
    isDragging = false; // Resetea el estado de arrastre
});
