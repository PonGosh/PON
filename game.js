const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

// ==============================
// Загрузка изображений
// ==============================
const bg = new Image();
bg.src = "images/background.png";

const cloud1 = new Image();
cloud1.src = "images/cloud1.png";

const cloud2 = new Image();
cloud2.src = "images/cloud2.png";

const ponya = new Image();
ponya.src = "images/ponya1.png";  // используем один кадр для Пони

// Изображения боссов / врагов
const magicKingImg = new Image();  // Король магии (при score < 8)
magicKingImg.src = "images/enemy.png";

const enemy2Img = new Image();     // Boss Краснуха (при 8 ≤ score < 12)
enemy2Img.src = "images/enemy2.png";

const zurganImg = new Image();     // Зурган (при score ≥ 12)
zurganImg.src = "images/zurgan.png";

// Изображение взрыва
const explosionImg = new Image();
explosionImg.src = "images/explosion.png";

// ==============================
// Загрузка звуков
// ==============================
const bgMusic = new Audio("sounds/bgMusic.mp3");
bgMusic.loop = true;
bgMusic.volume = 0.5; // громкость 50%

const explosionSound = new Audio("sounds/explosion.mp3");
const bossChange1Sound = new Audio("sounds/bossChange1.mp3");
const bossChange2Sound = new Audio("sounds/bossChange2.mp3");
const loseSound = new Audio("sounds/lose.mp3");
const victorySound = new Audio("sounds/Victory.mp3");

// Флаги для звуков
let bossChange1Triggered = false;
let bossChange2Triggered = false;
let loseSoundPlayed = false;

// ==============================
// Глобальные переменные игры
// ==============================

// Флаг, что игра уже запущена (начало игры)
let gameStarted = false;

// Параметры Пони (увеличены на 1.5 раза: изначально 50 → 75)
const pony = {
  x: 100,
  y: 280,
  width: 75,
  height: 75,
  velocityY: 0,
  jumpForce: -20,
  gravity: 0.4,  // уменьшенная гравитация — Поня дольше в воздухе
  isJumping: false,
};

// Параметры облаков
let cloud1X = 600;
let cloud2X = 900;

// Счёт и статус игры
const initialScore = 5;
let score = initialScore;
let gameEnded = false;  // может принимать значения false, "win" или "lose"

// Параметры врагов
let enemy = null;           // текущий враг (босс)
let enemyTimer = 0;         // таймер до появления врага
const enemySpawnThreshold = 200;  // число кадров до спауна врага
const enemySpeed = 2;       // скорость врага

// Массив для взрывов
let explosions = [];

// ==============================
// Функции управления запуском игры
// ==============================

// Функция запуска игры (при первом нажатии или касании)
function startGame() {
  if (!gameStarted) {
    gameStarted = true;
    bgMusic.currentTime = 0;
    bgMusic.play();
  }
}

// Обработчик клавиш (Space) и касаний (touchstart)
document.addEventListener("keydown", (e) => {
  if (e.code === "Space") {
    // Если игра еще не началась – стартуем
    if (!gameStarted) {
      startGame();
      return;
    }
    if (!pony.isJumping && !gameEnded) {
      pony.velocityY = pony.jumpForce;
      pony.isJumping = true;
    }
  }
});

document.addEventListener("touchstart", (e) => {
  // На мобильном устройстве: запуск игры при касании
  startGame();
  if (!pony.isJumping && !gameEnded) {
    pony.velocityY = pony.jumpForce;
    pony.isJumping = true;
  }
});

// ==============================
// Функция обновления (update)
// ==============================
function update() {
  // Если игра не началась, не обновляем (только стартовый экран рисуем)
  if (!gameStarted) return;
  if (gameEnded) return;
  
  // Обновляем положение Пони
  pony.velocityY += pony.gravity;
  pony.y += pony.velocityY;
  if (pony.y > 280) {
    pony.y = 280;
    pony.velocityY = 0;
    pony.isJumping = false;
  }
  
  // Обновляем облака
  cloud1X -= 0.5;
  cloud2X -= 0.3;
  if (cloud1X < -100) {
    cloud1X = canvas.width + Math.random() * 100;
  }
  if (cloud2X < -100) {
    cloud2X = canvas.width + Math.random() * 100;
  }
  
  // Логика появления врага
  if (enemy === null) {
    enemyTimer++;
    if (enemyTimer >= enemySpawnThreshold) {
      // Выбираем тип врага по счёту
      let enemyType;
      if (score < 8) {
        enemyType = "king";       // Король магии
      } else if (score < 12) {
        enemyType = "boss2";      // Boss Краснуха
      } else {
        enemyType = "zurgan";     // Зурган
      }
      enemy = {
        x: canvas.width,
        y: 280,
        width: pony.width,    // 75
        height: pony.height,  // 75
        speed: enemySpeed,
        collided: false,
        type: enemyType,
      };
      enemyTimer = 0;
      
      // При смене босса воспроизводим звуки, если это первый раз
      if (score >= 8 && !bossChange1Triggered) {
        bossChange1Triggered = true;
        bossChange1Sound.currentTime = 0;
        bossChange1Sound.play();
      }
      if (score >= 12 && !bossChange2Triggered) {
        bossChange2Triggered = true;
        bossChange2Sound.currentTime = 0;
        bossChange2Sound.play();
      }
    }
  } else {
    // Двигаем врага влево
    enemy.x -= enemy.speed;
    
    // Проверяем столкновение Пони с врагом (с уменьшенной зоной соприкосновения)
    if (!enemy.collided && checkCollision(pony, enemy)) {
      enemy.collided = true;
      score -= 2; // штраф за столкновение
      
      // Проигрываем звук взрыва
      explosionSound.currentTime = 0;
      explosionSound.play();
      
      // Создаём объект взрыва в позиции врага
      explosions.push({
        x: enemy.x,
        y: enemy.y,
        width: enemy.width,
        height: enemy.height,
        start: Date.now(),
        duration: 500  // длительность взрыва: 500 мс
      });
    }
    
    // Если враг прошёл Поню (его правый край ушёл левее Pony.x)
    if (enemy.x + enemy.width < pony.x) {
      if (!enemy.collided) {
        score += 1;
      }
      enemy = null;
    }
  }
  
  // Обновляем активные взрывы: оставляем только те, чьё время ещё не истекло
  explosions = explosions.filter(expl => (Date.now() - expl.start) < expl.duration);
  
  // Проверяем условия окончания игры
  if (score >= 15) {
    gameEnded = "win";
    // Останавливаем фоновую музыку и запускаем звук победы
    bgMusic.pause();
    bgMusic.currentTime = 0;
    victorySound.currentTime = 0;
    victorySound.play();
  } else if (score <= 0) {
    gameEnded = "lose";
    bgMusic.pause();
    bgMusic.currentTime = 0;
    if (!loseSoundPlayed) {
      loseSoundPlayed = true;
      loseSound.currentTime = 0;
      loseSound.play();
    }
  }
}

// ==============================
// Функция отрисовки (draw)
// ==============================
function draw() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  
  // Если игра ещё не началась, показываем стартовое окно
  if (!gameStarted) {
    ctx.fillStyle = "black";
    ctx.font = "40px Courier New";
    ctx.textAlign = "center";
    ctx.fillText("Pongosh, пиксельное приключение", canvas.width / 2, canvas.height / 2 - 40);
    ctx.font = "20px Courier New";
    ctx.fillText("Нажми Space или коснись экрана, чтобы начать", canvas.width / 2, canvas.height / 2);
    return;
  }
  
  // Рисуем фон
  if (bg.complete) {
    ctx.drawImage(bg, 0, 0, canvas.width, canvas.height);
  }
  
  // Рисуем облака
  if (cloud1.complete) {
    ctx.drawImage(cloud1, cloud1X, 50, 100, 50);
  }
  if (cloud2.complete) {
    ctx.drawImage(cloud2, cloud2X, 100, 120, 60);
  }
  
  // Рисуем Поню
  if (ponya.complete) {
    ctx.drawImage(ponya, pony.x, pony.y, pony.width, pony.height);
  } else {
    ctx.fillStyle = "orange";
    ctx.fillRect(pony.x, pony.y, pony.width, pony.height);
  }
  
  // Рисуем врага, выбираем изображение по типу
  if (enemy !== null) {
    if (enemy.type === "king") {
      if (magicKingImg.complete) {
        ctx.drawImage(magicKingImg, enemy.x, enemy.y, enemy.width, enemy.height);
      } else {
        ctx.fillStyle = "red";
        ctx.fillRect(enemy.x, enemy.y, enemy.width, enemy.height);
      }
    } else if (enemy.type === "boss2") {
      if (enemy2Img.complete) {
        ctx.drawImage(enemy2Img, enemy.x, enemy.y, enemy.width, enemy.height);
      } else {
        ctx.fillStyle = "red";
        ctx.fillRect(enemy.x, enemy.y, enemy.width, enemy.height);
      }
    } else if (enemy.type === "zurgan") {
      if (zurganImg.complete) {
        ctx.drawImage(zurganImg, enemy.x, enemy.y, enemy.width, enemy.height);
      } else {
        ctx.fillStyle = "red";
        ctx.fillRect(enemy.x, enemy.y, enemy.width, enemy.height);
      }
    }
  }
  
  // Рисуем активные взрывы
  explosions.forEach(expl => {
    if (explosionImg.complete) {
      ctx.drawImage(explosionImg, expl.x, expl.y, expl.width, expl.height);
    } else {
      ctx.fillStyle = "yellow";
      ctx.fillRect(expl.x, expl.y, expl.width, expl.height);
    }
  });
  
  // Выводим счёт
  ctx.fillStyle = "black";
  ctx.font = "20px Courier New";
  ctx.textAlign = "left";
  ctx.fillText("Счёт: " + score, 10, 30);
  
  // Если игра окончена — выводим сообщение
  if (gameEnded === "win") {
    ctx.fillStyle = "green";
    ctx.font = "40px Courier New";
    ctx.textAlign = "center";
    ctx.fillText("Понгош победил!", canvas.width / 2, canvas.height / 2);
    ctx.font = "20px Courier New";
    ctx.fillText("Нажми F5 для рестарта", canvas.width / 2, canvas.height / 2 + 40);
  } else if (gameEnded === "lose") {
    ctx.fillStyle = "red";
    ctx.font = "40px Courier New";
    ctx.textAlign = "center";
    ctx.fillText("Тьма победила...", canvas.width / 2, canvas.height / 2);
    ctx.font = "20px Courier New";
    ctx.fillText("Нажми F5 для рестарта", canvas.width / 2, canvas.height / 2 + 40);
  }
}

// ==============================
// Функция проверки столкновения (с уменьшённой зоной соприкосновения)
// ==============================
function checkCollision(a, b) {
  // Уменьшаем зону столкновения врага на 20%
  const marginX = b.width * 0.2;
  const marginY = b.height * 0.2;
  const effectiveX = b.x + marginX / 2;
  const effectiveY = b.y + marginY / 2;
  const effectiveWidth = b.width - marginX;
  const effectiveHeight = b.height - marginY;
  
  return (
    a.x < effectiveX + effectiveWidth &&
    a.x + a.width > effectiveX &&
    a.y < effectiveY + effectiveHeight &&
    a.y + a.height > effectiveY
  );
}

// ==============================
// Игровой цикл
// ==============================
function gameLoop() {
  update();
  draw();
  requestAnimationFrame(gameLoop);
}

gameLoop();

