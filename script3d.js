// Scene setup
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x87ceeb); // Sky blue
scene.fog = new THREE.Fog(0x87ceeb, 100, 500);

const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
camera.position.y = 1.6;

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFShadowMap;
document.getElementById('canvas-container').appendChild(renderer.domElement);

// Lighting
const sunLight = new THREE.DirectionalLight(0xffffff, 0.8);
sunLight.position.set(50, 50, 50);
sunLight.castShadow = true;
sunLight.shadow.camera.left = -100;
sunLight.shadow.camera.right = 100;
sunLight.shadow.camera.top = 100;
sunLight.shadow.camera.bottom = -100;
sunLight.shadow.mapSize.width = 2048;
sunLight.shadow.mapSize.height = 2048;
scene.add(sunLight);

const ambientLight = new THREE.AmbientLight(0xffffff, 0.4);
scene.add(ambientLight);

// Ground
const groundGeometry = new THREE.PlaneGeometry(200, 200);
const groundMaterial = new THREE.MeshLambertMaterial({ color: 0x228b22 });
const ground = new THREE.Mesh(groundGeometry, groundMaterial);
ground.rotation.x = -Math.PI / 2;
ground.receiveShadow = true;
scene.add(ground);

// Game variables
const player = {
    position: new THREE.Vector3(0, 1.6, 0),
    velocity: new THREE.Vector3(0, 0, 0),
    speed: 0.2,
    jumpForce: 0.3,
    isJumping: false,
    health: 100,
    maxHealth: 100,
    ammo: 30,
    maxAmmo: 30,
    score: 0
};

const enemies = [];
const bullets = [];
const explosions = [];

let mouseDown = false;
let canShoot = true;
let spawnRate = 0.02;
let enemyCount = 0;

// Input handling
const keys = {};
window.addEventListener('keydown', (e) => {
    keys[e.key.toLowerCase()] = true;
    if (e.key === ' ') {
        e.preventDefault();
        if (!player.isJumping) {
            player.velocity.y = player.jumpForce;
            player.isJumping = true;
        }
    }
    if (e.key.toLowerCase() === 'r') {
        player.ammo = player.maxAmmo;
    }
});

window.addEventListener('keyup', (e) => {
    keys[e.key.toLowerCase()] = false;
});

// Mouse look
let pitch = 0;
let yaw = 0;
const movementSpeed = 0.1;
const lookSpeed = 0.005;

document.addEventListener('mousemove', (e) => {
    yaw -= e.movementX * lookSpeed;
    pitch -= e.movementY * lookSpeed;
    pitch = Math.max(-Math.PI / 2, Math.min(Math.PI / 2, pitch));
});

document.addEventListener('mousedown', () => {
    mouseDown = true;
});

document.addEventListener('mouseup', () => {
    mouseDown = false;
});

document.addEventListener('click', () => {
    document.body.requestPointerLock = document.body.requestPointerLock || document.body.mozRequestPointerLock;
    document.body.requestPointerLock();
});

// Shoot bullet
function shoot() {
    if (!canShoot || player.ammo <= 0) return;

    canShoot = false;
    player.ammo--;
    updateAmmo();

    const bulletGeometry = new THREE.SphereGeometry(0.1, 8, 8);
    const bulletMaterial = new THREE.MeshBasicMaterial({ color: 0xffff00 });
    const bullet = new THREE.Mesh(bulletGeometry, bulletMaterial);

    const direction = new THREE.Vector3(0, 0, -1);
    direction.applyAxisAngle(new THREE.Vector3(1, 0, 0), pitch);
    direction.applyAxisAngle(new THREE.Vector3(0, 1, 0), yaw);

    bullet.position.copy(camera.position);
    bullet.position.addScaledVector(direction, 2);

    bullet.velocity = direction.clone().multiplyScalar(0.5);
    bullet.life = 100;

    scene.add(bullet);
    bullets.push(bullet);

    setTimeout(() => {
        canShoot = true;
    }, 100);
}

// Spawn enemy
function spawnEnemy() {
    const enemyGeometry = new THREE.BoxGeometry(0.5, 1, 0.5);
    const colors = [0xff0000, 0xff6600, 0xffff00];
    const color = colors[Math.floor(Math.random() * colors.length)];
    const enemyMaterial = new THREE.MeshPhongMaterial({ color: color });
    const enemy = new THREE.Mesh(enemyGeometry, enemyMaterial);

    const angle = Math.random() * Math.PI * 2;
    const distance = 30;
    enemy.position.set(
        Math.cos(angle) * distance,
        1,
        Math.sin(angle) * distance
    );

    enemy.castShadow = true;
    enemy.receiveShadow = true;
    enemy.velocity = new THREE.Vector3(0, 0, 0);
    enemy.health = 10;
    enemy.speed = 0.05;

    scene.add(enemy);
    enemies.push(enemy);
    enemyCount++;
}

// Create explosion
function createExplosion(position) {
    const explosionGeometry = new THREE.SphereGeometry(1, 8, 8);
    const explosionMaterial = new THREE.MeshBasicMaterial({ 
        color: 0xff4500,
        transparent: true,
        opacity: 1
    });
    const explosionMesh = new THREE.Mesh(explosionGeometry, explosionMaterial);
    explosionMesh.position.copy(position);

    scene.add(explosionMesh);
    explosions.push({
        mesh: explosionMesh,
        life: 20,
        maxLife: 20,
        scale: 1
    });
}

// Update player position
function updatePlayer() {
    const forward = new THREE.Vector3(0, 0, -1);
    const right = new THREE.Vector3(1, 0, 0);

    forward.applyAxisAngle(new THREE.Vector3(0, 1, 0), yaw);
    right.applyAxisAngle(new THREE.Vector3(0, 1, 0), yaw);

    if (keys['w']) player.position.addScaledVector(forward, player.speed);
    if (keys['s']) player.position.addScaledVector(forward, -player.speed);
    if (keys['a']) player.position.addScaledVector(right, -player.speed);
    if (keys['d']) player.position.addScaledVector(right, player.speed);

    // Gravity
    player.velocity.y -= 0.01;
    player.position.y += player.velocity.y;

    // Ground collision
    if (player.position.y <= 1.6) {
        player.position.y = 1.6;
        player.velocity.y = 0;
        player.isJumping = false;
    }

    // Boundary
    player.position.x = Math.max(-95, Math.min(95, player.position.x));
    player.position.z = Math.max(-95, Math.min(95, player.position.z));

    camera.position.copy(player.position);

    // Apply camera rotation
    camera.rotation.order = 'YXZ';
    camera.rotation.y = yaw;
    camera.rotation.x = pitch;
}

// Update enemies
function updateEnemies() {
    for (let i = enemies.length - 1; i >= 0; i--) {
        const enemy = enemies[i];

        // Move towards player
        const direction = new THREE.Vector3();
        direction.subVectors(player.position, enemy.position);
        direction.y = 0;
        direction.normalize();

        enemy.position.addScaledVector(direction, enemy.speed);

        // Boundary
        enemy.position.x = Math.max(-95, Math.min(95, enemy.position.x));
        enemy.position.z = Math.max(-95, Math.min(95, enemy.position.z));

        // Collision with player
        const distToPlayer = player.position.distanceTo(enemy.position);
        if (distToPlayer < 2) {
            player.health -= 0.5;
            updateHealth();

            if (player.health <= 0) {
                gameOver();
            }
        }

        // Remove if health <= 0
        if (enemy.health <= 0) {
            scene.remove(enemy);
            enemies.splice(i, 1);
            player.score += 100;
            updateScore();
            createExplosion(enemy.position);
        }
    }
}

// Update bullets
function updateBullets() {
    for (let i = bullets.length - 1; i >= 0; i--) {
        const bullet = bullets[i];

        bullet.position.addScaledVector(bullet.velocity, 1);
        bullet.life--;

        // Remove if out of bounds or no life
        if (bullet.life <= 0 || bullet.position.length() > 150) {
            scene.remove(bullet);
            bullets.splice(i, 1);
            continue;
        }

        // Check collision with enemies
        for (let j = enemies.length - 1; j >= 0; j--) {
            const enemy = enemies[j];
            if (bullet.position.distanceTo(enemy.position) < 1) {
                enemy.health -= 5;
                scene.remove(bullet);
                bullets.splice(i, 1);
                break;
            }
        }
    }
}

// Update explosions
function updateExplosions() {
    for (let i = explosions.length - 1; i >= 0; i--) {
        const explosion = explosions[i];
        explosion.life--;

        if (explosion.life <= 0) {
            scene.remove(explosion.mesh);
            explosions.splice(i, 1);
        } else {
            explosion.scale *= 1.05;
            explosion.mesh.scale.set(explosion.scale, explosion.scale, explosion.scale);
            explosion.mesh.material.opacity = explosion.life / explosion.maxLife;
        }
    }
}

// Spawn difficulty increases over time
function spawnEnemiesWave() {
    if (Math.random() < spawnRate) {
        spawnEnemy();
        spawnRate += 0.0001;
    }
}

// Update HUD
function updateScore() {
    document.getElementById('score').textContent = player.score;
}

function updateHealth() {
    const healthEl = document.getElementById('health');
    healthEl.textContent = Math.ceil(player.health);
    if (player.health < 30) {
        healthEl.classList.add('low');
    } else {
        healthEl.classList.remove('low');
    }
}

function updateAmmo() {
    document.getElementById('ammo').textContent = player.ammo;
}

function gameOver() {
    alert(`Game Over! Final Score: ${player.score}`);
    location.reload();
}

// Game loop
function animate() {
    requestAnimationFrame(animate);

    // Input
    if (mouseDown) {
        shoot();
    }

    // Update
    updatePlayer();
    updateEnemies();
    updateBullets();
    updateExplosions();
    spawnEnemiesWave();

    // Render
    renderer.render(scene, camera);
}

// Handle window resize
window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
});

// Start game
updateScore();
updateHealth();
updateAmmo();
animate();
