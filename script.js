// Variable global para la URL de tu Google Apps Script (¡CAMBIA ESTA URL!)
const GOOGLE_APPS_SCRIPT_URL = 'TU_URL_DE_APPS_SCRIPT_AQUÍ'; // ¡¡Pega la URL que copiaste de Apps Script!!

// Referencias a elementos del DOM
const gameCanvas = document.getElementById('gameCanvas');
const ctx = gameCanvas.getContext('2d'); // Obtén el contexto 2D aquí

const main_menu = document.getElementById('main-menu');
const startButton = document.getElementById('startButton');
const profileButton = document.getElementById('profileButton');
const leaderboardButton = document.getElementById('leaderboardButton');
const gameOverScreen = document.getElementById('gameOverScreen');
const finalScoreDisplay = document.getElementById('finalScore');
const highScoreMessage = document.getElementById('highScoreMessage');
const restartButton = document.getElementById('restartButton');
const backToMainMenuButton = document.getElementById('backToMainMenuButton');

const profileMenu = document.getElementById('profileMenu');
const profileTelegramId = document.getElementById('profileTelegramId');
const profileUsername = document.getElementById('profileUsername');
const profileHighScore = document.getElementById('profileHighScore');
const profileBackButton = document.getElementById('profileBackButton');

const leaderboardMenu = document.getElementById('leaderboardMenu');
const leaderboardList = document.getElementById('leaderboardList');
const leaderboardBackButton = document.getElementById('leaderboardBackButton');

// Telegram WebApp variables
let tg = window.Telegram.WebApp;
let userTelegramId = null;
let userUsername = null;

// Game variables
let score = 0;
let gameInterval;
let obstacles = [];
let projectiles = []; // ¡Nueva array para proyectiles!
let player; // Nuestro objeto jugador
let keysPressed = {}; // Para el movimiento de 4 direcciones
const PLAYER_SPEED = 3; // Velocidad del pez
const PROJECTILE_SPEED = 5; // Velocidad de las balas
const OBSTACLE_SPEED = 2; // Velocidad de los obstáculos

// Imágenes del juego (precarga para evitar parpadeos)
const playerImage = new Image();
playerImage.src = 'pez.png';
const obstacleImage = new Image();
obstacleImage.src = 'pez_globo.png';
const backgroundImage = new Image();
backgroundImage.src = 'fondo_mar.jpg';
const projectileImage = new Image(); // ¡Nueva imagen para proyectiles!
projectileImage.src = 'burbuja.png'; // Asegúrate de tener esta imagen (o usa un círculo dibujado)

// Asegúrate de que todas las imágenes se carguen antes de iniciar el juego
let imagesLoaded = 0;
const totalImages = 4; // Ajusta este número si añades/quitas imágenes

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
        this.width = 50; // Ajusta el tamaño de tu pez
        this.height = 50;
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

// --- Funciones de comunicación con Google Apps Script ---
async function sendScoreToAppsScript(telegramId, username, currentScore) {
    if (!GOOGLE_APPS_SCRIPT_URL) {
        console.error("GOOGLE_APPS_SCRIPT_URL is not set.");
        return;
    }
    try {
        const response = await fetch(`${GOOGLE_APPS_SCRIPT_URL}?action=save_score`, {
            method: 'POST',
            mode: 'cors',
            headers: { 'Content-Type': 'text/plain;charset=utf-8' },
            body: JSON.stringify({ telegram_id: telegramId, username: username, score: currentScore })
        });
        const data = await response.json();
        console.log("Score save response:", data);
        return data;
    } catch (error) {
        console.error("Error sending score to Apps Script:", error);
        return { status: "error", message: error.message };
    }
}

async function getScoresFromAppsScript() {
    if (!GOOGLE_APPS_SCRIPT_URL) {
        console.error("GOOGLE_APPS_SCRIPT_URL is not set.");
        return [];
    }
    try {
        const response = await fetch(`${GOOGLE_APPS_SCRIPT_URL}?action=get_scores`, {
            method: 'GET',
            mode: 'cors'
        });
        const data = await response.json();
        console.log("Scores received from Apps Script:", data);
        return data;
    } catch (error) {
        console.error("Error getting scores from Apps Script:", error);
        return [];
    }
}

// --- Lógica de Juego y Menús ---

function showMainMenu() {
    main_menu.style.display = 'flex';
    profileMenu.style.display = 'none';
    leaderboardMenu.style.display = 'none';
    gameOverScreen.style.display = 'none';
    gameCanvas.style.display = 'none';
    tg.MainButton.hide();
}

function showProfileMenu() {
    profileMenu.style.display = 'flex';
    main_menu.style.display = 'none';
    gameOverScreen.style.display = 'none';
    leaderboardMenu.style.display = 'none';
    gameCanvas.style.display = 'none';

    profileTelegramId.textContent = userTelegramId;
    profileUsername.textContent = userUsername;
    getScoresFromAppsScript().then(scores => {
        const currentUserScore = scores.find(s => s.telegram_id == userTelegramId);
        profileHighScore.textContent = currentUserScore ? currentUserScore.high_score : 0;
    });
}

async function showLeaderboardMenu() {
    leaderboardMenu.style.display = 'flex';
    main_menu.style.display = 'none';
    profileMenu.style.display = 'none';
    gameOverScreen.style.display = 'none';
    gameCanvas.style.display = 'none';

    leaderboardList.innerHTML = '';
    const scores = await getScoresFromAppsScript();

    if (scores.length === 0) {
        leaderboardList.innerHTML = '<li>No scores yet. Be the first!</li>';
        return;
    }

    scores.slice(0, 10).forEach((s, index) => {
        const listItem = document.createElement('li');
        // Para que se vea bien, acorta el username si es muy largo
        const displayUsername = s.username.length > 15 ? s.username.substring(0, 12) + '...' : s.username;
        listItem.textContent = `${index + 1}. ${displayUsername} - ${s.high_score}`;
        leaderboardList.appendChild(listItem);
    });
}


function startGame() {
    main_menu.style.display = 'none';
    gameOverScreen.style.display = 'none';
    gameCanvas.style.display = 'block';
    score = 0;
    obstacles = [];
    projectiles = []; // Limpiar proyectiles
    player = new Player(); // Reiniciar el jugador
    highScoreMessage.textContent = "";

    // Asegúrate de que el canvas tiene el tamaño correcto
    gameCanvas.width = gameCanvas.clientWidth;
    gameCanvas.height = gameCanvas.clientHeight;

    if (gameInterval) clearInterval(gameInterval);
    gameInterval = setInterval(gameLoop, 1000 / 60); // ~60 FPS
}

function endGame() {
    clearInterval(gameInterval);
    gameOverScreen.style.display = 'flex';
    gameCanvas.style.display = 'none';
    finalScoreDisplay.textContent = score;

    sendScoreToAppsScript(userTelegramId, userUsername, score).then(response => {
        if (response && response.status === "success") {
            getScoresFromAppsScript().then(scores => {
                const currentUserScore = scores.find(s => s.telegram_id == userTelegramId);
                if (currentUserScore && score == currentUserScore.high_score) {
                    highScoreMessage.textContent = "New High Score!";
                } else if (currentUserScore) {
                    highScoreMessage.textContent = `Your High Score: ${currentUserScore.high_score}`;
                }
            });
        }
    });
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

    // Colisión proyectil-obstáculo (NUEVA LÓGICA)
    for (let i = 0; i < projectiles.length; i++) {
        for (let j = 0; j < obstacles.length; j++) {
            let projectile = projectiles[i];
            let obstacle = obstacles[j];

            if (checkCollision(projectile, obstacle)) {
                // Colisión detectada: elimina ambos
                projectiles.splice(i, 1);
                obstacles.splice(j, 1);
                i--; // Ajusta el índice del proyectil
                j--; // Ajusta el índice del obstáculo
                score += 50; // Puntos por destruir
                break; // Un proyectil solo puede destruir un obstáculo
            }
        }
    }


    // Generar nuevos obstáculos
    if (Math.random() < 0.015) { // Ajusta la probabilidad de aparición
        obstacles.push(new Obstacle());
    }

    // Muestra el score
    ctx.fillStyle = 'white';
    ctx.font = '24px Arial';
    ctx.fillText(`Score: ${score}`, 10, 30);
}

// --- Event Listeners ---
startButton.addEventListener('click', startGame);
profileButton.addEventListener('click', showProfileMenu);
leaderboardButton.addEventListener('click', showLeaderboardMenu);
restartButton.addEventListener('click', startGame);
backToMainMenuButton.addEventListener('click', showMainMenu);
profileBackButton.addEventListener('click', showMainMenu);
leaderboardBackButton.addEventListener('click', showMainMenu);

// Eventos de teclado para movimiento de 4 direcciones
document.addEventListener('keydown', (e) => {
    keysPressed[e.code] = true;
    // Disparo con espacio o clic (para teclado)
    if (e.code === 'Space') {
        player.shoot();
    }
});

document.addEventListener('keyup', (e) => {
    delete keysPressed[e.code];
});

// Evento de clic/toque para disparo (para móviles/pantallas táctiles)
gameCanvas.addEventListener('click', (e) => {
    if (gameCanvas.style.display === 'block') { // Solo permite disparar si el juego está activo
        if (player) { // Asegúrate de que el jugador exista
            player.shoot();
        }
    }
});


// Se ejecuta al cargar la página (muestra el menú principal después de que las imágenes estén cargadas)
// Ya manejado por imageLoaded()
// showMainMenu();
