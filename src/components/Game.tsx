"use client";

import { useEffect, useRef, useCallback } from "react";
import confetti from "canvas-confetti";

type Vector = { x: number; y: number };

interface Entity {
  pos: Vector;
  vel: Vector;
  radius: number;
  color: string;
  dead: boolean;
}

interface Player extends Entity {
  hp: number;
  maxHp: number;
  weaponLevel: number;
  invincibleTimer: number;
}

interface Enemy extends Entity {
  hp: number;
  type: "basic" | "fast" | "tank" | "chaser";
  scoreValue: number;
}

interface Bullet extends Entity {
  damage: number;
  fromPlayer: boolean;
}

interface Particle extends Entity {
  life: number;
  maxLife: number;
  size: number;
}

interface PowerUp extends Entity {
  type: "weapon" | "health" | "speed";
  bounceDir: number;
}

class Game {
  canvas: HTMLCanvasElement;
  ctx: CanvasRenderingContext2D;
  player: Player;
  enemies: Enemy[];
  bullets: Bullet[];
  particles: Particle[];
  powerUps: PowerUp[];
  keys: Set<string>;
  score: number;
  gameOver: boolean;
  gameStarted: boolean;
  enemySpawnTimer: number;
  enemySpawnInterval: number;
  difficultyMultiplier: number;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.ctx = canvas.getContext("2d")!;
    this.keys = new Set();
    
    this.player = {
      pos: { x: canvas.width / 2, y: canvas.height - 100 },
      vel: { x: 0, y: 0 },
      radius: 20,
      color: "#00ffff",
      dead: false,
      hp: 100,
      maxHp: 100,
      weaponLevel: 1,
      invincibleTimer: 0,
    };

    this.enemies = [];
    this.bullets = [];
    this.particles = [];
    this.powerUps = [];
    this.score = 0;
    this.gameOver = false;
    this.gameStarted = false;
    this.enemySpawnTimer = 0;
    this.enemySpawnInterval = 2;
    this.difficultyMultiplier = 1;
  }

  resize() {
    this.canvas.width = window.innerWidth;
    this.canvas.height = window.innerHeight;
    if (!this.player.dead) {
      this.player.pos.x = Math.min(this.player.pos.x, this.canvas.width - 50);
      this.player.pos.y = Math.min(this.player.pos.y, this.canvas.height - 100);
    }
  }

  spawnEnemy() {
    const types: Array<{ type: Enemy["type"]; hp: number; radius: number; color: string; score: number; speed: number }> = [
      { type: "basic", hp: 30, radius: 25, color: "#ff4444", score: 100, speed: 2 },
      { type: "fast", hp: 15, radius: 18, color: "#ffff00", score: 150, speed: 4 },
      { type: "tank", hp: 80, radius: 35, color: "#ff00ff", score: 250, speed: 1 },
      { type: "chaser", hp: 40, radius: 22, color: "#00ff00", score: 200, speed: 2.5 },
    ];

    let maxTypeIndex: number;
if (this.score < 300) {
    maxTypeIndex = 1; // basic only
} else if (this.score < 800) {
    maxTypeIndex = 2; // basic, fast
} else if (this.score < 1500) {
    maxTypeIndex = 3; // basic, fast, tank
} else {
    maxTypeIndex = 4; // all types including chaser
}

const type = types[Math.floor(Math.random() * maxTypeIndex)];
    
    this.enemies.push({
      pos: { x: Math.random() * (this.canvas.width - 60) + 30, y: -40 },
      vel: { x: (Math.random() - 0.5) * type.speed, y: type.speed },
      radius: type.radius,
      color: type.color,
      dead: false,
      hp: type.hp * this.difficultyMultiplier,
      type: type.type as Enemy["type"],
      scoreValue: type.score,
    });
  }

  spawnBullet(fromPlayer: boolean, pos: Vector, angle: number, damage: number) {
    const speed = fromPlayer ? 12 : 5;
    this.bullets.push({
      pos: { ...pos },
      vel: { x: Math.cos(angle) * speed, y: Math.sin(angle) * speed },
      radius: fromPlayer ? 6 : 8,
      color: fromPlayer ? "#00ffff" : "#ff4444",
      dead: false,
      damage,
      fromPlayer,
    });
  }

  spawnParticles(pos: Vector, color: string, count: number) {
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = Math.random() * 5 + 2;
      this.particles.push({
        pos: { ...pos },
        vel: { x: Math.cos(angle) * speed, y: Math.sin(angle) * speed },
        radius: Math.random() * 4 + 2,
        color: color,
        dead: false,
        life: 1,
        maxLife: 1,
        size: Math.random() * 6 + 3,
      });
    }
  }

  spawnPowerUp(pos: Vector) {
    const types: PowerUp["type"][] = ["weapon", "health", "speed"];
    this.powerUps.push({
      pos: { ...pos },
      vel: { x: 0, y: 2 },
      radius: 15,
      color: types[Math.floor(Math.random() * 3)] === "weapon" ? "#ffd700" : "#00ff00",
      dead: false,
      type: types[Math.floor(Math.random() * 3)],
      bounceDir: 1,
    });
  }

  updatePlayer(dt: number) {
    if (this.player.dead || !this.gameStarted) return;

    const speed = 8;
    this.player.vel.x = 0;
    this.player.vel.y = 0;

    if (this.keys.has("ArrowLeft") || this.keys.has("a")) this.player.vel.x = -speed;
    if (this.keys.has("ArrowRight") || this.keys.has("d")) this.player.vel.x = speed;
    if (this.keys.has("ArrowUp") || this.keys.has("w")) this.player.vel.y = -speed;
    if (this.keys.has("ArrowDown") || this.keys.has("s")) this.player.vel.y = speed;

    this.player.pos.x += this.player.vel.x;
    this.player.pos.y += this.player.vel.y;

    this.player.pos.x = Math.max(this.player.radius, Math.min(this.canvas.width - this.player.radius, this.player.pos.x));
    this.player.pos.y = Math.max(this.player.radius, Math.min(this.canvas.height - this.player.radius, this.player.pos.y));

    if (this.player.invincibleTimer > 0) {
      this.player.invincibleTimer -= dt;
    }
  }

  updateEnemies(dt: number) {
    this.enemySpawnTimer += dt;
    const adjustedInterval = Math.max(0.3, this.enemySpawnInterval - this.score / 2000);
    
    if (this.enemySpawnTimer > adjustedInterval) {
      this.spawnEnemy();
      this.enemySpawnTimer = 0;
      this.difficultyMultiplier = 1 + this.score / 5000;
    }

    for (const enemy of this.enemies) {
      if (enemy.dead) continue;

      switch (enemy.type) {
        case "chaser":
          const dx = this.player.pos.x - enemy.pos.x;
          const dy = this.player.pos.y - enemy.pos.y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist > 0) {
            enemy.vel.x = (dx / dist) * 2.5;
            enemy.vel.y = (dy / dist) * 2.5;
          }
          break;
        case "tank":
          enemy.pos.x += Math.sin(Date.now() / 500) * 2;
          break;
      }

      enemy.pos.x += enemy.vel.x;
      enemy.pos.y += enemy.vel.y;

      if (enemy.pos.y > this.canvas.height + 50 || enemy.pos.x < -50 || enemy.pos.x > this.canvas.width + 50) {
        enemy.dead = true;
      }

      if (!this.player.dead && this.checkCollision(this.player, enemy)) {
        this.player.hp -= 20;
        this.player.invincibleTimer = 1.5;
        enemy.dead = true;
        this.spawnParticles(enemy.pos, enemy.color, 20);
        
        if (this.player.hp <= 0) {
          this.player.dead = true;
          this.gameOver = true;
          this.spawnParticles(this.player.pos, this.player.color, 50);
        }
      }

      if (!enemy.dead && Math.random() < 0.01 * (enemy.type === "tank" ? 2 : enemy.type === "fast" ? 0.5 : 1)) {
        const angle = Math.atan2(this.player.pos.y - enemy.pos.y, this.player.pos.x - enemy.pos.x);
        this.spawnBullet(false, enemy.pos, angle, 10);
      }
    }

    this.enemies = this.enemies.filter((e) => !e.dead);
  }

  updateBullets() {
    for (const bullet of this.bullets) {
      bullet.pos.x += bullet.vel.x;
      bullet.pos.y += bullet.vel.y;

      if (bullet.pos.x < 0 || bullet.pos.x > this.canvas.width || bullet.pos.y < 0 || bullet.pos.y > this.canvas.height) {
        bullet.dead = true;
      }

      if (bullet.fromPlayer) {
        for (const enemy of this.enemies) {
          if (!enemy.dead && this.checkCollision(bullet, enemy)) {
            enemy.hp -= bullet.damage;
            bullet.dead = true;
            this.spawnParticles(bullet.pos, "#ffffff", 5);

            if (enemy.hp <= 0) {
              enemy.dead = true;
              this.score += enemy.scoreValue;
              this.spawnParticles(enemy.pos, enemy.color, 15);
              
              if (Math.random() < 0.1) {
                this.spawnPowerUp(enemy.pos);
              }

              if (this.score % 500 === 0) {
                confetti({
                  particleCount: 30,
                  spread: 60,
                  origin: { x: enemy.pos.x / this.canvas.width, y: enemy.pos.y / this.canvas.height },
                  colors: [enemy.color],
                });
              }
            }
            break;
          }
        }
      } else {
        if (!this.player.dead && this.player.invincibleTimer <= 0 && this.checkCollision(bullet, this.player)) {
          this.player.hp -= bullet.damage;
          bullet.dead = true;
          this.spawnParticles(bullet.pos, "#ff4444", 10);
          this.player.invincibleTimer = 1;

          if (this.player.hp <= 0) {
            this.player.dead = true;
            this.gameOver = true;
            this.spawnParticles(this.player.pos, this.player.color, 50);
          }
        }
      }
    }

    this.bullets = this.bullets.filter((b) => !b.dead);
  }

  updateParticles() {
    for (const particle of this.particles) {
      particle.pos.x += particle.vel.x;
      particle.pos.y += particle.vel.y;
      particle.vel.x *= 0.98;
      particle.vel.y *= 0.98;
      particle.life -= 0.02;

      if (particle.life <= 0) {
        particle.dead = true;
      }
    }

    this.particles = this.particles.filter((p) => !p.dead);
  }

  updatePowerUps() {
    for (const powerUp of this.powerUps) {
      powerUp.pos.y += powerUp.vel.y;
      powerUp.bounceDir *= 0.99;
      powerUp.pos.x += Math.sin(Date.now() / 200) * 1.5;

      if (powerUp.pos.y > this.canvas.height + 30) {
        powerUp.dead = true;
      }

      if (!this.player.dead && this.checkCollision(this.player, powerUp)) {
        powerUp.dead = true;
        this.score += 50;
        
        switch (powerUp.type) {
          case "weapon":
            this.player.weaponLevel = Math.min(5, this.player.weaponLevel + 1);
            break;
          case "health":
            this.player.hp = Math.min(this.player.maxHp, this.player.hp + 30);
            break;
          case "speed":
            confetti({ particleCount: 20, spread: 40 });
            break;
        }

        confetti({
          particleCount: 50,
          spread: 70,
          origin: { x: powerUp.pos.x / this.canvas.width, y: powerUp.pos.y / this.canvas.height },
          colors: [powerUp.color],
        });
      }
    }

    this.powerUps = this.powerUps.filter((p) => !p.dead);
  }

  checkCollision(a: Entity, b: Entity) {
    const dx = a.pos.x - b.pos.x;
    const dy = a.pos.y - b.pos.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    return dist < a.radius + b.radius;
  }

  drawPlayer() {
    if (this.player.dead || this.player.invincibleTimer > 0 && Math.floor(Date.now() / 100) % 2 === 0) return;

    const ctx = this.ctx;
    const p = this.player.pos;

    ctx.save();
    ctx.translate(p.x, p.y);

    ctx.beginPath();
    ctx.moveTo(0, -this.player.radius * 1.5);
    ctx.lineTo(this.player.radius, this.player.radius);
    ctx.lineTo(0, this.player.radius * 0.5);
    ctx.lineTo(-this.player.radius, this.player.radius);
    ctx.closePath();
    
    const gradient = ctx.createRadialGradient(0, 0, 0, 0, 0, this.player.radius);
    gradient.addColorStop(0, "#ffffff");
    gradient.addColorStop(0.5, this.player.color);
    gradient.addColorStop(1, "#008888");
    ctx.fillStyle = gradient;
    ctx.fill();

    ctx.beginPath();
    ctx.arc(0, 0, this.player.radius * 0.4, 0, Math.PI * 2);
    ctx.fillStyle = "#ffffff";
    ctx.fill();

    ctx.restore();
  }

  drawEnemies() {
    for (const enemy of this.enemies) {
      const ctx = this.ctx;
      const e = enemy.pos;

      ctx.save();
      ctx.translate(e.x, e.y);

      if (enemy.type === "basic") {
        ctx.beginPath();
        ctx.arc(0, 0, enemy.radius, 0, Math.PI * 2);
        const gradient = ctx.createRadialGradient(0, 0, 0, 0, 0, enemy.radius);
        gradient.addColorStop(0, "#ff8888");
        gradient.addColorStop(1, enemy.color);
        ctx.fillStyle = gradient;
        ctx.fill();
      } else if (enemy.type === "fast") {
        ctx.beginPath();
        ctx.moveTo(0, enemy.radius);
        for (let i = 0; i < 3; i++) {
          const angle = (Math.PI * 2 / 3) * i - Math.PI / 2;
          ctx.lineTo(Math.cos(angle) * enemy.radius, Math.sin(angle) * enemy.radius);
        }
        ctx.closePath();
        const gradient = ctx.createRadialGradient(0, 0, 0, 0, 0, enemy.radius);
        gradient.addColorStop(0, "#ffff88");
        gradient.addColorStop(1, enemy.color);
        ctx.fillStyle = gradient;
        ctx.fill();
      } else if (enemy.type === "tank") {
        ctx.beginPath();
        ctx.rect(-enemy.radius, -enemy.radius, enemy.radius * 2, enemy.radius * 2);
        const gradient = ctx.createLinearGradient(0, -enemy.radius, 0, enemy.radius);
        gradient.addColorStop(0, "#ff88ff");
        gradient.addColorStop(1, enemy.color);
        ctx.fillStyle = gradient;
        ctx.fill();
      } else if (enemy.type === "chaser") {
        ctx.beginPath();
        for (let i = 0; i < 5; i++) {
          const angle = (Math.PI * 2 / 5) * i - Math.PI / 2 + Date.now() / 500;
          const r = i % 2 === 0 ? enemy.radius : enemy.radius * 0.5;
          ctx.lineTo(Math.cos(angle) * r, Math.sin(angle) * r);
        }
        ctx.closePath();
        const gradient = ctx.createRadialGradient(0, 0, 0, 0, 0, enemy.radius);
        gradient.addColorStop(0, "#88ff88");
        gradient.addColorStop(1, enemy.color);
        ctx.fillStyle = gradient;
        ctx.fill();
      }

      const hpPercent = enemy.hp / (30 * this.difficultyMultiplier);
      if (hpPercent < 1) {
        ctx.fillStyle = "#ffffff";
        ctx.fillRect(-enemy.radius * 0.8, -enemy.radius - 10, enemy.radius * 1.6 * hpPercent, 5);
      }

      ctx.restore();
    }
  }

  drawBullets() {
    for (const bullet of this.bullets) {
      const ctx = this.ctx;
      
      ctx.save();
      ctx.translate(bullet.pos.x, bullet.pos.y);

      ctx.beginPath();
      ctx.arc(0, 0, bullet.radius, 0, Math.PI * 2);
      
      const gradient = ctx.createRadialGradient(0, 0, 0, 0, 0, bullet.radius);
      gradient.addColorStop(0, "#ffffff");
      gradient.addColorStop(0.5, bullet.color);
      gradient.addColorStop(1, "transparent");
      ctx.fillStyle = gradient;
      ctx.fill();

      ctx.beginPath();
      ctx.arc(0, 0, bullet.radius * 0.4, 0, Math.PI * 2);
      ctx.fillStyle = "#ffffff";
      ctx.fill();

      ctx.restore();
    }
  }

  drawParticles() {
    for (const particle of this.particles) {
      const ctx = this.ctx;
      
      ctx.save();
      ctx.globalAlpha = particle.life;
      ctx.translate(particle.pos.x, particle.pos.y);

      ctx.beginPath();
      ctx.arc(0, 0, particle.size * particle.life, 0, Math.PI * 2);
      ctx.fillStyle = particle.color;
      ctx.fill();

      ctx.restore();
    }
  }

  drawPowerUps() {
    for (const powerUp of this.powerUps) {
      const ctx = this.ctx;
      
      ctx.save();
      ctx.translate(powerUp.pos.x, powerUp.pos.y);
      ctx.rotate(Date.now() / 300);

      ctx.beginPath();
      ctx.rect(-powerUp.radius, -powerUp.radius, powerUp.radius * 2, powerUp.radius * 2);
      
      const gradient = ctx.createRadialGradient(0, 0, 0, 0, 0, powerUp.radius * 1.5);
      gradient.addColorStop(0, "#ffffff");
      gradient.addColorStop(0.3, powerUp.color);
      gradient.addColorStop(1, "transparent");
      ctx.fillStyle = gradient;
      ctx.fill();

      ctx.beginPath();
      ctx.rect(-powerUp.radius * 0.7, -powerUp.radius * 0.7, powerUp.radius * 1.4, powerUp.radius * 1.4);
      ctx.strokeStyle = "#ffffff";
      ctx.lineWidth = 2;
      ctx.stroke();

      ctx.fillStyle = "#000000";
      ctx.font = "bold 16px Arial";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      const labels = { weapon: "⚔️", health: "❤️", speed: "⚡" };
      ctx.fillText(labels[powerUp.type], 0, 0);

      ctx.restore();
    }
  }

  drawUI() {
    const ctx = this.ctx;

    if (!this.gameStarted || this.player.dead) return;

    const scoreGradient = ctx.createLinearGradient(20, 20, 250, 20);
    scoreGradient.addColorStop(0, "#00ffff");
    scoreGradient.addColorStop(1, "#ff00ff");
    
    ctx.shadowColor = "#00ffff";
    ctx.shadowBlur = 10;
    ctx.fillStyle = scoreGradient;
    ctx.font = "bold 24px 'Courier New', monospace";
    ctx.textAlign = "left";
    ctx.fillText(`SCORE: ${this.score.toString().padStart(8, "0")}`, 20, 35);
    ctx.shadowBlur = 0;

    ctx.fillStyle = "#ffaa00";
    ctx.font = "bold 16px 'Courier New', monospace";
    ctx.fillText(`WEAPON LVL: ${this.player.weaponLevel}`, 20, 60);

    const hpPercent = this.player.hp / this.player.maxHp;
    
    ctx.fillStyle = "#1a1a2e";
    ctx.fillRect(20, 75, 200, 20);
    
    const hpGradient = ctx.createLinearGradient(22, 77, 218, 77);
    if (hpPercent > 0.5) {
      hpGradient.addColorStop(0, "#00ff00");
      hpGradient.addColorStop(1, "#00aa00");
    } else if (hpPercent > 0.25) {
      hpGradient.addColorStop(0, "#ffff00");
      hpGradient.addColorStop(1, "#aaaa00");
    } else {
      hpGradient.addColorStop(0, "#ff0000");
      hpGradient.addColorStop(1, "#aa0000");
    }
    
    ctx.fillStyle = hpGradient;
    ctx.fillRect(22, 77, Math.max(4, 196 * hpPercent), 16);
    
    ctx.strokeStyle = "#ffffff";
    ctx.lineWidth = 2;
    ctx.strokeRect(20, 75, 200, 20);

    ctx.fillStyle = "#ffffff";
    ctx.font = "bold 14px 'Courier New', monospace";
    ctx.fillText(`HP: ${Math.ceil(this.player.hp)}/${this.player.maxHp}`, 225, 90);
  }

  drawStartScreen() {
    const ctx = this.ctx;
    const centerX = this.canvas.width / 2;
    const centerY = this.canvas.height / 2;

    ctx.save();

    ctx.fillStyle = "rgba(0, 0, 0, 0.7)";
    ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

    ctx.font = "bold 64px 'Courier New', monospace";
    ctx.textAlign = "center";
    
    const titleGradient = ctx.createLinearGradient(centerX - 250, centerY - 100, centerX + 250, centerY - 100);
    titleGradient.addColorStop(0, "#ff0080");
    titleGradient.addColorStop(0.3, "#ff8000");
    titleGradient.addColorStop(0.6, "#ffff00");
    titleGradient.addColorStop(0.9, "#00ffff");
    titleGradient.addColorStop(1, "#8000ff");
    
    ctx.shadowColor = "#ffffff";
    ctx.shadowBlur = 20;
    ctx.fillStyle = titleGradient;
    ctx.fillText("NEON BLASTER", centerX, centerY - 80);
    ctx.shadowBlur = 0;

    ctx.font = "bold 24px 'Courier New', monospace";
    const pulse = (Math.sin(Date.now() / 300) + 1) / 2 * 0.5 + 0.5;
    ctx.fillStyle = `rgba(255, 255, 255, ${pulse})`;
    ctx.fillText("Press SPACE to Start", centerX, centerY + 40);

    ctx.font = "16px 'Courier New', monospace";
    ctx.fillStyle = "#a0a0ff";
    ctx.fillText("WASD or Arrow Keys to Move", centerX, centerY + 90);
    ctx.fillStyle = "#ffa0ff";
    ctx.fillText("SPACE to Shoot", centerX, centerY + 120);

    ctx.font = "italic 14px 'Courier New', monospace";
    ctx.fillStyle = "#80a0ff";
    ctx.fillText("Destroy enemies • Collect power-ups • Survive!", centerX, centerY + 180);

    ctx.restore();
  }

  drawGameOver() {
    const ctx = this.ctx;
    const centerX = this.canvas.width / 2;
    const centerY = this.canvas.height / 2;

    ctx.save();

    ctx.fillStyle = "rgba(0, 0, 0, 0.8)";
    ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

    const gameOverGradient = ctx.createLinearGradient(centerX - 150, centerY - 60, centerX + 150, centerY - 60);
    gameOverGradient.addColorStop(0, "#ff0000");
    gameOverGradient.addColorStop(0.5, "#ff4400");
    gameOverGradient.addColorStop(1, "#ff8800");
    
    ctx.shadowColor = "#ff0000";
    ctx.shadowBlur = 30;
    ctx.font = "bold 48px 'Courier New', monospace";
    ctx.textAlign = "center";
    ctx.fillStyle = gameOverGradient;
    ctx.fillText("GAME OVER", centerX, centerY - 60);
    ctx.shadowBlur = 0;

    ctx.font = "32px 'Courier New', monospace";
    ctx.fillStyle = "#ffffff";
    ctx.fillText(`Final Score: ${this.score.toString().padStart(8, "0")}`, centerX, centerY + 10);

    const restartPulse = (Math.sin(Date.now() / 400) + 1) / 2 * 0.3 + 0.7;
    ctx.font = "bold 24px 'Courier New', monospace";
    ctx.fillStyle = `rgba(255, 255, 0, ${restartPulse})`;
    ctx.fillText("Press SPACE to Restart", centerX, centerY + 80);

    ctx.restore();
  }

  update(dt: number) {
    if (!this.gameStarted || this.gameOver) return;

    this.updatePlayer(dt);
    this.updateEnemies(dt);
    this.updateBullets();
    this.updateParticles();
    this.updatePowerUps();
  }

  draw() {
    const ctx = this.ctx;

    const gradient = ctx.createLinearGradient(0, 0, 0, this.canvas.height);
    gradient.addColorStop(0, "#0a0a1f");
    gradient.addColorStop(0.5, "#1a0a2f");
    gradient.addColorStop(1, "#0f1a2f");
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

    const starCount = 150;
    for (let i = 0; i < starCount; i++) {
      const seed = i * 997;
      const x = ((seed * 12345) % this.canvas.width);
      const y = ((i * 67 + Date.now() / 10) % this.canvas.height);
      const size = (seed % 3) + 1;
      const alpha = 0.3 + Math.sin(Date.now() / 800 + seed) * 0.2;
      ctx.fillStyle = `rgba(255, 255, 255, ${alpha})`;
      ctx.fillRect(x, y, size, size);
    }

    const nebulaCount = 5;
    for (let n = 0; n < nebulaCount; n++) {
      const nx = ((Date.now() / 100 + n * 200) % this.canvas.width);
      const ny = ((n * 300 + Date.now() / 50) % this.canvas.height);
      const radius = 100 + (n % 3) * 50;
      
      const nebulaGradient = ctx.createRadialGradient(nx, ny, 0, nx, ny, radius);
      const colors: [string, string][] = [
        ["rgba(255, 0, 128, 0.08)", "transparent"],
        ["rgba(0, 255, 255, 0.06)", "transparent"],
        ["rgba(128, 0, 255, 0.07)", "transparent"],
        ["rgba(255, 128, 0, 0.05)", "transparent"],
        ["rgba(0, 255, 128, 0.06)", "transparent"],
      ];
      
      nebulaGradient.addColorStop(0, colors[n][0]);
      nebulaGradient.addColorStop(1, colors[n][1]);
      ctx.fillStyle = nebulaGradient;
      ctx.beginPath();
      ctx.arc(nx, ny, radius, 0, Math.PI * 2);
      ctx.fill();
    }

    this.drawParticles();
    this.drawPowerUps();
    this.drawBullets();
    this.drawEnemies();
    this.drawPlayer();
    this.drawUI();

    if (!this.gameStarted) {
      this.drawStartScreen();
    } else if (this.gameOver) {
      this.drawGameOver();
    }
  }

  shoot() {
    if (this.player.dead || !this.gameStarted) return;

    const angles = [-Math.PI / 2];
    
    if (this.player.weaponLevel >= 2) {
      angles.push(-Math.PI / 2 - 0.15, -Math.PI / 2 + 0.15);
    }
    
    if (this.player.weaponLevel >= 4) {
      angles.push(-Math.PI / 2 - 0.3, -Math.PI / 2 + 0.3);
    }

    for (const angle of angles) {
      this.spawnBullet(true, this.player.pos, angle, 15 * this.player.weaponLevel);
    }
  }

  start() {
    this.gameStarted = true;
    this.score = 0;
    this.difficultyMultiplier = 1;
    this.enemies = [];
    this.bullets = [];
    this.particles = [];
    this.powerUps = [];
    
    this.player = {
      pos: { x: this.canvas.width / 2, y: this.canvas.height - 100 },
      vel: { x: 0, y: 0 },
      radius: 20,
      color: "#00ffff",
      dead: false,
      hp: 100,
      maxHp: 100,
      weaponLevel: 1,
      invincibleTimer: 2,
    };

    this.gameOver = false;
  }
}

export default function GameComponent() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const gameRef = useRef<Game | null>(null);
  const lastTimeRef = useRef<number>(0);
  const shootTimerRef = useRef<number>(0);
  const isSpacePressed = useRef<boolean>(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const game = new Game(canvas);
    game.resize();
    gameRef.current = game;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === " ") {
        e.preventDefault();
        if (!game.gameStarted || game.gameOver) {
          game.start();
          return;
        }
        game.shoot();
        shootTimerRef.current = 0.1;
        isSpacePressed.current = true;
      }
      game.keys.add(e.key);
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.key === " ") {
        isSpacePressed.current = false;
      }
      game.keys.delete(e.key);
    };

    const handleResize = () => {
      game.resize();
    };

    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);
    window.addEventListener("resize", handleResize);

    let animationId: number;

const loop = (currentTime: number) => {
      const dt = Math.min((currentTime - lastTimeRef.current) / 1000, 0.1);
      lastTimeRef.current = currentTime;

      if (game.gameStarted && !game.gameOver) {
        game.update(dt);

        if (isSpacePressed.current) {
          shootTimerRef.current += dt;
          if (shootTimerRef.current > 0.1) {
            game.shoot();
            shootTimerRef.current = 0;
          }
        } else {
          shootTimerRef.current = 0;
        }
      } else {
        shootTimerRef.current = 0;
      }

      game.draw();
      animationId = requestAnimationFrame(loop);
    };

    animationId = requestAnimationFrame(loop);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
      window.removeEventListener("resize", handleResize);
      cancelAnimationFrame(animationId);
    };
  }, []);

  return <canvas ref={canvasRef} style={{ width: "100vw", height: "100vh" }} />;
}
