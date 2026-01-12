// ========================================
// グローバル変数とゲーム設定
// ========================================

const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

// ゲーム状態
const GameState = {
    START: 'start',
    PLAYING: 'playing',
    PAUSED: 'paused',
    GAME_OVER: 'gameover'
};

let gameState = GameState.START;
let score = 0;
let lives = 3;
let lastTime = 0;

// キャンバスサイズ設定
function resizeCanvas() {
    const container = document.getElementById('game-container');
    const aspectRatio = 9 / 16; // 縦長スクリーン

    let width = container.clientWidth;
    let height = container.clientHeight;

    // アスペクト比を維持
    if (width / height > aspectRatio) {
        width = height * aspectRatio;
    } else {
        height = width / aspectRatio;
    }

    canvas.width = Math.floor(width);
    canvas.height = Math.floor(height);
}

// ========================================
// プレイヤー（自機）
// ========================================

const player = {
    x: 0,
    y: 0,
    width: 30,
    height: 40,
    speed: 5,
    invincible: false,
    invincibleTime: 0,
    shootCooldown: 0,
    shootDelay: 8, // フレーム数
    powerLevel: 0, // パワーアップレベル

    init() {
        this.x = canvas.width / 2;
        this.y = canvas.height - 100;
        this.invincible = false;
        this.invincibleTime = 0;
        this.shootCooldown = 0;
        this.powerLevel = 0;
    },

    update() {
        // 移動処理
        this.x += input.moveX * this.speed;
        this.y += input.moveY * this.speed;

        // 画面外に出ないように制限
        this.x = Math.max(this.width / 2, Math.min(canvas.width - this.width / 2, this.x));
        this.y = Math.max(this.height / 2, Math.min(canvas.height - this.height / 2, this.y));

        // 無敵時間の更新
        if (this.invincible) {
            this.invincibleTime--;
            if (this.invincibleTime <= 0) {
                this.invincible = false;
            }
        }

        // ショット処理
        if (this.shootCooldown > 0) {
            this.shootCooldown--;
        }

        if (input.shooting && this.shootCooldown <= 0) {
            this.shoot();
            this.shootCooldown = this.shootDelay;
        }
    },

    shoot() {
        if (this.powerLevel === 0) {
            // 通常ショット
            bullets.push({
                x: this.x,
                y: this.y - this.height / 2,
                width: 4,
                height: 12,
                speed: 10,
                color: '#00ffff',
                damage: 1
            });
        } else {
            // パワーアップショット（2方向）
            bullets.push({
                x: this.x - 10,
                y: this.y - this.height / 2,
                width: 4,
                height: 12,
                speed: 10,
                color: '#00ff00',
                damage: 1
            });
            bullets.push({
                x: this.x + 10,
                y: this.y - this.height / 2,
                width: 4,
                height: 12,
                speed: 10,
                color: '#00ff00',
                damage: 1
            });
        }
    },

    hit() {
        if (!this.invincible) {
            lives--;
            updateHUD();

            if (lives <= 0) {
                gameOver();
            } else {
                this.invincible = true;
                this.invincibleTime = 60; // 約1秒（60fps想定）
            }
        }
    },

    draw() {
        // 無敵時の点滅
        if (this.invincible && Math.floor(this.invincibleTime / 5) % 2 === 0) {
            return;
        }

        // 自機の描画（三角形）
        ctx.save();
        ctx.translate(this.x, this.y);

        // 機体
        ctx.fillStyle = '#00aaff';
        ctx.beginPath();
        ctx.moveTo(0, -this.height / 2);
        ctx.lineTo(-this.width / 2, this.height / 2);
        ctx.lineTo(this.width / 2, this.height / 2);
        ctx.closePath();
        ctx.fill();

        // 機体の輪郭
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 2;
        ctx.stroke();

        // コックピット
        ctx.fillStyle = '#ffff00';
        ctx.beginPath();
        ctx.arc(0, 0, 6, 0, Math.PI * 2);
        ctx.fill();

        ctx.restore();
    }
};

// ========================================
// 弾丸
// ========================================

const bullets = [];

function updateBullets() {
    for (let i = bullets.length - 1; i >= 0; i--) {
        const bullet = bullets[i];
        bullet.y -= bullet.speed;

        // 画面外に出たら削除
        if (bullet.y < -bullet.height) {
            bullets.splice(i, 1);
        }
    }
}

function drawBullets() {
    bullets.forEach(bullet => {
        ctx.fillStyle = bullet.color;
        ctx.fillRect(
            bullet.x - bullet.width / 2,
            bullet.y - bullet.height / 2,
            bullet.width,
            bullet.height
        );

        // 光のエフェクト
        ctx.shadowBlur = 10;
        ctx.shadowColor = bullet.color;
        ctx.fillRect(
            bullet.x - bullet.width / 2,
            bullet.y - bullet.height / 2,
            bullet.width,
            bullet.height
        );
        ctx.shadowBlur = 0;
    });
}

// ========================================
// 敵
// ========================================

const enemies = [];
let enemySpawnTimer = 0;
const enemySpawnInterval = 60; // フレーム数

function spawnEnemy() {
    const types = [
        { width: 30, height: 30, hp: 1, speed: 2, color: '#ff4444', points: 100 },
        { width: 40, height: 40, hp: 2, speed: 1.5, color: '#ff8844', points: 200 },
        { width: 35, height: 35, hp: 3, speed: 1, color: '#ff44ff', points: 300 }
    ];

    const type = types[Math.floor(Math.random() * types.length)];

    enemies.push({
        x: Math.random() * (canvas.width - type.width) + type.width / 2,
        y: -type.height,
        width: type.width,
        height: type.height,
        hp: type.hp,
        maxHp: type.hp,
        speed: type.speed,
        color: type.color,
        points: type.points,
        movePattern: Math.random() > 0.5 ? 'straight' : 'sine',
        time: 0
    });
}

function updateEnemies() {
    // 敵の生成
    if (gameState === GameState.PLAYING) {
        enemySpawnTimer++;
        if (enemySpawnTimer >= enemySpawnInterval) {
            spawnEnemy();
            enemySpawnTimer = 0;
        }
    }

    // 敵の更新
    for (let i = enemies.length - 1; i >= 0; i--) {
        const enemy = enemies[i];
        enemy.time++;

        // 移動パターン
        if (enemy.movePattern === 'straight') {
            enemy.y += enemy.speed;
        } else if (enemy.movePattern === 'sine') {
            enemy.y += enemy.speed;
            enemy.x += Math.sin(enemy.time * 0.05) * 2;
        }

        // 画面外に出たら削除
        if (enemy.y > canvas.height + enemy.height) {
            enemies.splice(i, 1);
            continue;
        }

        // 弾との衝突判定
        for (let j = bullets.length - 1; j >= 0; j--) {
            const bullet = bullets[j];
            if (checkCollision(enemy, bullet)) {
                enemy.hp -= bullet.damage;
                bullets.splice(j, 1);

                if (enemy.hp <= 0) {
                    // 敵を倒した
                    score += enemy.points;
                    updateHUD();

                    // パワーアップアイテムをドロップ（20%の確率）
                    if (Math.random() < 0.2) {
                        spawnPowerUp(enemy.x, enemy.y);
                    }

                    enemies.splice(i, 1);
                }
                break;
            }
        }

        // プレイヤーとの衝突判定
        if (checkCollision(enemy, player)) {
            player.hit();
            enemies.splice(i, 1);
        }
    }
}

function drawEnemies() {
    enemies.forEach(enemy => {
        // 敵機体（四角形）
        ctx.fillStyle = enemy.color;
        ctx.fillRect(
            enemy.x - enemy.width / 2,
            enemy.y - enemy.height / 2,
            enemy.width,
            enemy.height
        );

        // 輪郭
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 2;
        ctx.strokeRect(
            enemy.x - enemy.width / 2,
            enemy.y - enemy.height / 2,
            enemy.width,
            enemy.height
        );

        // HPバー
        if (enemy.hp < enemy.maxHp) {
            const barWidth = enemy.width;
            const barHeight = 4;
            const hpRatio = enemy.hp / enemy.maxHp;

            // 背景
            ctx.fillStyle = '#333333';
            ctx.fillRect(
                enemy.x - barWidth / 2,
                enemy.y - enemy.height / 2 - 10,
                barWidth,
                barHeight
            );

            // HP
            ctx.fillStyle = '#00ff00';
            ctx.fillRect(
                enemy.x - barWidth / 2,
                enemy.y - enemy.height / 2 - 10,
                barWidth * hpRatio,
                barHeight
            );
        }
    });
}

// ========================================
// パワーアップアイテム
// ========================================

const powerUps = [];

function spawnPowerUp(x, y) {
    powerUps.push({
        x: x,
        y: y,
        width: 20,
        height: 20,
        speed: 2,
        color: '#ffff00'
    });
}

function updatePowerUps() {
    for (let i = powerUps.length - 1; i >= 0; i--) {
        const powerUp = powerUps[i];
        powerUp.y += powerUp.speed;

        // 画面外に出たら削除
        if (powerUp.y > canvas.height + powerUp.height) {
            powerUps.splice(i, 1);
            continue;
        }

        // プレイヤーとの衝突判定
        if (checkCollision(powerUp, player)) {
            player.powerLevel = Math.min(player.powerLevel + 1, 1); // 最大レベル1
            powerUps.splice(i, 1);
        }
    }
}

function drawPowerUps() {
    powerUps.forEach(powerUp => {
        // 回転するアニメーション
        const time = Date.now() * 0.005;
        ctx.save();
        ctx.translate(powerUp.x, powerUp.y);
        ctx.rotate(time);

        // 星型アイテム
        ctx.fillStyle = powerUp.color;
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 2;

        ctx.beginPath();
        for (let i = 0; i < 5; i++) {
            const angle = (i * 4 * Math.PI) / 5 - Math.PI / 2;
            const x = Math.cos(angle) * powerUp.width / 2;
            const y = Math.sin(angle) * powerUp.height / 2;
            if (i === 0) {
                ctx.moveTo(x, y);
            } else {
                ctx.lineTo(x, y);
            }
        }
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        // 光のエフェクト
        ctx.shadowBlur = 15;
        ctx.shadowColor = powerUp.color;
        ctx.fill();

        ctx.restore();
    });
}

// ========================================
// 背景（スクロール）
// ========================================

const stars = [];

function initStars() {
    stars.length = 0;
    for (let i = 0; i < 100; i++) {
        stars.push({
            x: Math.random() * canvas.width,
            y: Math.random() * canvas.height,
            size: Math.random() * 2 + 1,
            speed: Math.random() * 2 + 1
        });
    }
}

function updateStars() {
    stars.forEach(star => {
        star.y += star.speed;
        if (star.y > canvas.height) {
            star.y = 0;
            star.x = Math.random() * canvas.width;
        }
    });
}

function drawStars() {
    ctx.fillStyle = '#ffffff';
    stars.forEach(star => {
        ctx.fillRect(star.x, star.y, star.size, star.size);
    });
}

// ========================================
// 衝突判定
// ========================================

function checkCollision(obj1, obj2) {
    return obj1.x - obj1.width / 2 < obj2.x + obj2.width / 2 &&
           obj1.x + obj1.width / 2 > obj2.x - obj2.width / 2 &&
           obj1.y - obj1.height / 2 < obj2.y + obj2.height / 2 &&
           obj1.y + obj1.height / 2 > obj2.y - obj2.height / 2;
}

// ========================================
// 入力処理
// ========================================

const input = {
    moveX: 0,
    moveY: 0,
    shooting: false,
    keys: {}
};

// キーボード入力
document.addEventListener('keydown', (e) => {
    input.keys[e.key.toLowerCase()] = true;

    if (e.key.toLowerCase() === 'p' && gameState === GameState.PLAYING) {
        pauseGame();
    }
});

document.addEventListener('keyup', (e) => {
    input.keys[e.key.toLowerCase()] = false;
});

function updateKeyboardInput() {
    input.moveX = 0;
    input.moveY = 0;

    if (input.keys['arrowleft'] || input.keys['a']) input.moveX = -1;
    if (input.keys['arrowright'] || input.keys['d']) input.moveX = 1;
    if (input.keys['arrowup'] || input.keys['w']) input.moveY = -1;
    if (input.keys['arrowdown'] || input.keys['s']) input.moveY = 1;

    input.shooting = input.keys[' '];

    // 斜め移動の速度調整
    if (input.moveX !== 0 && input.moveY !== 0) {
        input.moveX *= 0.707;
        input.moveY *= 0.707;
    }
}

// ========================================
// デバッグログ（iPhone確認用）
// ========================================

const debugLog = document.getElementById('debug-log');
let debugMessages = [];

function addDebugLog(message) {
    debugMessages.push(`${new Date().toLocaleTimeString()}: ${message}`);
    if (debugMessages.length > 3) {
        debugMessages.shift();
    }
    if (debugLog) {
        debugLog.innerHTML = debugMessages.join('<br>');
    }
}

// ========================================
// タッチ/ポインター入力（バーチャルスティック）
// ========================================

let joystickActive = false;
let joystickStartX = 0;
let joystickStartY = 0;
let joystickPointerId = null;

const joystickBase = document.getElementById('joystick-base');
const joystickStick = document.getElementById('joystick-stick');
const virtualJoystick = document.getElementById('virtual-joystick');

function handleJoystickStart(clientX, clientY, pointerId) {
    joystickActive = true;
    joystickPointerId = pointerId;
    const rect = virtualJoystick.getBoundingClientRect();
    joystickStartX = rect.left + rect.width / 2;
    joystickStartY = rect.top + rect.height / 2;
    updateJoystick(clientX, clientY);
    addDebugLog('Stick DOWN');
}

function handleJoystickMove(clientX, clientY, pointerId) {
    if (joystickActive && (joystickPointerId === null || joystickPointerId === pointerId)) {
        updateJoystick(clientX, clientY);
    }
}

function handleJoystickEnd() {
    joystickActive = false;
    joystickPointerId = null;
    input.moveX = 0;
    input.moveY = 0;

    // スティックを中央に戻す
    joystickStick.style.left = '40px';
    joystickStick.style.top = '40px';
    addDebugLog('Stick UP');
}

// Pointerイベント（推奨）
virtualJoystick.addEventListener('pointerdown', (e) => {
    e.preventDefault();
    virtualJoystick.setPointerCapture(e.pointerId);
    handleJoystickStart(e.clientX, e.clientY, e.pointerId);
}, { passive: false });

virtualJoystick.addEventListener('pointermove', (e) => {
    e.preventDefault();
    handleJoystickMove(e.clientX, e.clientY, e.pointerId);
}, { passive: false });

virtualJoystick.addEventListener('pointerup', (e) => {
    e.preventDefault();
    if (e.pointerId === joystickPointerId) {
        handleJoystickEnd();
    }
}, { passive: false });

virtualJoystick.addEventListener('pointercancel', (e) => {
    e.preventDefault();
    if (e.pointerId === joystickPointerId) {
        handleJoystickEnd();
    }
}, { passive: false });

// Touchイベント（保険）
virtualJoystick.addEventListener('touchstart', (e) => {
    e.preventDefault();
    const touch = e.touches[0];
    handleJoystickStart(touch.clientX, touch.clientY, null);
}, { passive: false });

virtualJoystick.addEventListener('touchmove', (e) => {
    e.preventDefault();
    if (joystickActive && e.touches.length > 0) {
        const touch = e.touches[0];
        handleJoystickMove(touch.clientX, touch.clientY, null);
    }
}, { passive: false });

virtualJoystick.addEventListener('touchend', (e) => {
    e.preventDefault();
    handleJoystickEnd();
}, { passive: false });

virtualJoystick.addEventListener('touchcancel', (e) => {
    e.preventDefault();
    handleJoystickEnd();
}, { passive: false });

function updateJoystick(clientX, clientY) {
    const dx = clientX - joystickStartX;
    const dy = clientY - joystickStartY;
    const distance = Math.sqrt(dx * dx + dy * dy);
    const maxDistance = 40;

    if (distance > maxDistance) {
        const angle = Math.atan2(dy, dx);
        input.moveX = Math.cos(angle);
        input.moveY = Math.sin(angle);

        joystickStick.style.left = (40 + Math.cos(angle) * maxDistance) + 'px';
        joystickStick.style.top = (40 + Math.sin(angle) * maxDistance) + 'px';
    } else {
        input.moveX = dx / maxDistance;
        input.moveY = dy / maxDistance;

        joystickStick.style.left = (40 + dx) + 'px';
        joystickStick.style.top = (40 + dy) + 'px';
    }
}

// ========================================
// ショットボタン
// ========================================

const shootBtn = document.getElementById('shoot-btn');
let shootPointerId = null;

function handleShootStart(pointerId) {
    shootPointerId = pointerId;
    input.shooting = true;
    addDebugLog('SHOT DOWN');
}

function handleShootEnd(pointerId) {
    if (shootPointerId === null || shootPointerId === pointerId) {
        shootPointerId = null;
        input.shooting = false;
        addDebugLog('SHOT UP');
    }
}

// Pointerイベント（推奨）
shootBtn.addEventListener('pointerdown', (e) => {
    e.preventDefault();
    shootBtn.setPointerCapture(e.pointerId);
    handleShootStart(e.pointerId);
}, { passive: false });

shootBtn.addEventListener('pointerup', (e) => {
    e.preventDefault();
    handleShootEnd(e.pointerId);
}, { passive: false });

shootBtn.addEventListener('pointercancel', (e) => {
    e.preventDefault();
    handleShootEnd(e.pointerId);
}, { passive: false });

// Touchイベント（保険）
shootBtn.addEventListener('touchstart', (e) => {
    e.preventDefault();
    handleShootStart(null);
}, { passive: false });

shootBtn.addEventListener('touchend', (e) => {
    e.preventDefault();
    handleShootEnd(null);
}, { passive: false });

shootBtn.addEventListener('touchcancel', (e) => {
    e.preventDefault();
    handleShootEnd(null);
}, { passive: false });

// ========================================
// UI更新
// ========================================

function updateHUD() {
    document.getElementById('score-value').textContent = score;
    document.getElementById('lives-value').textContent = lives;
}

// ========================================
// ゲーム状態管理
// ========================================

function startGame() {
    gameState = GameState.PLAYING;
    score = 0;
    lives = 3;

    // 初期化
    player.init();
    bullets.length = 0;
    enemies.length = 0;
    powerUps.length = 0;
    enemySpawnTimer = 0;

    initStars();
    updateHUD();

    // 画面切り替え
    document.getElementById('start-screen').classList.add('hidden');
    document.getElementById('game-over-screen').classList.add('hidden');
    document.getElementById('pause-screen').classList.add('hidden');
}

function pauseGame() {
    gameState = GameState.PAUSED;
    document.getElementById('pause-screen').classList.remove('hidden');
}

function resumeGame() {
    gameState = GameState.PLAYING;
    document.getElementById('pause-screen').classList.add('hidden');
}

function gameOver() {
    gameState = GameState.GAME_OVER;
    document.getElementById('final-score').textContent = score;
    document.getElementById('game-over-screen').classList.remove('hidden');
}

function quitToTitle() {
    gameState = GameState.START;
    document.getElementById('start-screen').classList.remove('hidden');
    document.getElementById('pause-screen').classList.add('hidden');
    document.getElementById('game-over-screen').classList.add('hidden');
}

// ========================================
// ボタンイベント
// ========================================

document.getElementById('start-btn').addEventListener('click', startGame);
document.getElementById('restart-btn').addEventListener('click', startGame);
document.getElementById('pause-btn').addEventListener('click', () => {
    if (gameState === GameState.PLAYING) {
        pauseGame();
    }
});
document.getElementById('resume-btn').addEventListener('click', resumeGame);
document.getElementById('quit-btn').addEventListener('click', quitToTitle);

// ========================================
// ゲームループ
// ========================================

function gameLoop(currentTime) {
    requestAnimationFrame(gameLoop);

    const deltaTime = currentTime - lastTime;
    lastTime = currentTime;

    // 背景クリア
    ctx.fillStyle = '#000033';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // 星の描画と更新
    updateStars();
    drawStars();

    if (gameState === GameState.PLAYING) {
        // 入力更新
        updateKeyboardInput();

        // ゲームオブジェクトの更新
        player.update();
        updateBullets();
        updateEnemies();
        updatePowerUps();

        // 描画
        drawBullets();
        drawEnemies();
        drawPowerUps();
        player.draw();
    }
}

// ========================================
// 初期化
// ========================================

window.addEventListener('load', () => {
    resizeCanvas();
    initStars();
    lastTime = performance.now();
    requestAnimationFrame(gameLoop);
});

window.addEventListener('resize', resizeCanvas);
