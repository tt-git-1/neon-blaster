"use client";

import { useEffect, useRef } from "react";
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
  type: "basic" | "fast" | "tank" | "chaser" | "boss";
  scoreValue: number;
  phase?: number;
  patternTimer?: number;
  attackPattern?: string;
  lastPhase?: number;
}

interface Bullet extends Entity {
  damage: number;
  fromPlayer: boolean;
  weaponType?: "normal" | "spread" | "laser" | "homing";
  targetEnemy?: Enemy | null;
}

interface Particle extends Entity {
  life: number;
  maxLife: number;
  size: number;
}

interface PowerUp extends Entity {
  type: "weapon" | "health" | "speed" | "spread" | "laser" | "homing";
  bounceDir: number;
}

interface Bullet extends Entity {
  damage: number;
  fromPlayer: boolean;
  weaponType?: "normal" | "spread" | "laser" | "homing";
  targetEnemy?: Enemy | null;
}

class AudioManager {
  private context: AudioContext | null = null;
  private bgmPlaying: boolean = false;
  private bgmGainNode: GainNode | null = null;

  init() {
    if (typeof window !== "undefined" && !this.context) {
      this.context = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
    }
  }

  playShoot() {
    if (!this.context) return;
    const osc = this.context.createOscillator();
    const gain = this.context.createGain();
    osc.connect(gain);
    gain.connect(this.context.destination);
    osc.frequency.setValueAtTime(880, this.context.currentTime);
    osc.frequency.exponentialRampToValueAtTime(220, this.context.currentTime + 0.1);
    gain.gain.setValueAtTime(0.05, this.context.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, this.context.currentTime + 0.1);
    osc.start();
    osc.stop(this.context.currentTime + 0.1);
  }

  playExplosion() {
    if (!this.context) return;
    const bufferSize = this.context.sampleRate * 0.3;
    const buffer = this.context.createBuffer(1, bufferSize, this.context.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / bufferSize, 3);
    }
    const source = this.context.createBufferSource();
    source.buffer = buffer;
    const gain = this.context.createGain();
    const filter = this.context.createBiquadFilter();
    filter.type = "lowpass";
    filter.frequency.value = 1000;
    source.connect(filter);
    filter.connect(gain);
    gain.connect(this.context.destination);
    gain.gain.setValueAtTime(0.5, this.context.currentTime);
    source.start();
  }

  playPowerUp() {
    if (!this.context) return;
    const osc = this.context.createOscillator();
    const gain = this.context.createGain();
    osc.connect(gain);
    gain.connect(this.context.destination);
    osc.type = "sine";
    osc.frequency.setValueAtTime(523, this.context.currentTime);
    osc.frequency.exponentialRampToValueAtTime(1047, this.context.currentTime + 0.15);
    gain.gain.setValueAtTime(0.3, this.context.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, this.context.currentTime + 0.15);
    osc.start();
    osc.stop(this.context.currentTime + 0.15);
  }

  playBossSpawn() {
    if (!this.context) return;
    const notes = [262, 330, 392, 523];
    notes.forEach((freq, i) => {
      setTimeout(() => {
        if (!this.context) return;
        const osc = this.context.createOscillator();
        const gain = this.context.createGain();
        osc.connect(gain);
        gain.connect(this.context.destination);
        osc.type = "square";
        osc.frequency.value = freq;
        gain.gain.setValueAtTime(0.1, this.context.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, this.context.currentTime + 0.3);
        osc.start();
        osc.stop(this.context.currentTime + 0.3);
      }, i * 150);
    });
  }

  playDamage() {
    if (!this.context) return;
    const osc = this.context.createOscillator();
    const gain = this.context.createGain();
    osc.connect(gain);
    gain.connect(this.context.destination);
    osc.type = "sawtooth";
    osc.frequency.setValueAtTime(150, this.context.currentTime);
    osc.frequency.exponentialRampToValueAtTime(50, this.context.currentTime + 0.2);
    gain.gain.setValueAtTime(0.3, this.context.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, this.context.currentTime + 0.2);
    osc.start();
    osc.stop(this.context.currentTime + 0.2);
  }

startBGM() {
    if (!this.context || this.bgmPlaying) return;
    this.bgmPlaying = true;
    this.bgmGainNode = this.context.createGain();
    this.bgmGainNode.gain.value = 0.03;
    this.bgmGainNode.connect(this.context.destination);
    
    const playKick = () => {
      if (!this.bgmPlaying || !this.context) return;
      
      const osc = this.context.createOscillator();
      const gain = this.context.createGain();
      
      osc.connect(gain);
      gain.connect(this.bgmGainNode!);
      osc.type = "sine";
      osc.frequency.setValueAtTime(150, this.context.currentTime);
      osc.frequency.exponentialRampToValueAtTime(50, this.context.currentTime + 0.1);
      
      const now = this.context.currentTime;
      gain.gain.setValueAtTime(0.5, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.15);
      osc.start(now);
      osc.stop(now + 0.15);

      if (this.bgmPlaying) {
        setTimeout(playKick, 400);
      }
    };

    const playSnare = () => {
      if (!this.bgmPlaying || !this.context) return;
      
      for (let i = 0; i < 2; i++) {
        setTimeout(() => {
          if (!this.bgmPlaying || !this.context) return;
          
          const osc = this.context.createOscillator();
          const gain = this.context.createGain();
          
          osc.connect(gain);
          gain.connect(this.bgmGainNode!);
          osc.type = "triangle";
          osc.frequency.value = 200 + Math.random() * 100;
          
          const now = this.context.currentTime;
          gain.gain.setValueAtTime(0.3, now);
          gain.gain.exponentialRampToValueAtTime(0.01, now + 0.08);
          osc.start(now);
          osc.stop(now + 0.1);
        }, i * 200);
      }

      if (this.bgmPlaying) {
        setTimeout(playSnare, 400);
      }
    };

    const playMelody = () => {
      if (!this.bgmPlaying || !this.context) return;
      
      const melody1 = [
        { freq: 392, dur: 0.12 }, { freq: 523, dur: 0.12 }, { freq: 659, dur: 0.12 },
        { freq: 784, dur: 0.24 }, { freq: 659, dur: 0.12 }, { freq: 523, dur: 0.12 },
      ];
      let melodyIndex = 0;

      const playNote = () => {
        if (!this.bgmPlaying || !this.context) return;
        
        const note = melody1[melodyIndex];
        const osc = this.context.createOscillator();
        const gain = this.context.createGain();
        
        osc.connect(gain);
        gain.connect(this.bgmGainNode!);
        
        osc.type = "square";
        osc.frequency.value = note.freq;
        
        const now = this.context.currentTime;
        gain.gain.setValueAtTime(0.25, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + note.dur);
        osc.start(now);
        osc.stop(now + note.dur);

        melodyIndex = (melodyIndex + 1) % melody1.length;
        
        if (this.bgmPlaying) {
          setTimeout(playNote, 120);
        }
      };
      
      playNote();
    };

    const playHiMelody = () => {
      if (!this.bgmPlaying || !this.context) return;
      
      const hiNotes = [1047, 1319, 1568, 1760];
      let hiIndex = Math.floor(Math.random() * 4);

      const playNote = () => {
        if (!this.bgmPlaying || !this.context) return;
        
        const osc = this.context.createOscillator();
        const gain = this.context.createGain();
        
        osc.connect(gain);
        gain.connect(this.bgmGainNode!);
        
        osc.type = "square";
        osc.frequency.value = hiNotes[hiIndex];
        
        const now = this.context.currentTime;
        gain.gain.setValueAtTime(0.12, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.1);
        osc.start(now);
        osc.stop(now + 0.12);

        hiIndex = (hiIndex + 1) % hiNotes.length;
        
        if (this.bgmPlaying) {
          setTimeout(() => playNote(), Math.random() * 200 + 100);
        }
      };
      
      playNote();
    };

    const playPowerUp = () => {
      if (!this.bgmPlaying || !this.context) return;
      
      const notes = [261, 311, 349, 392, 523, 622, 784, 1047];
      let index = 0;

      const playNote = () => {
        if (!this.bgmPlaying || !this.context) return;
        
        const osc = this.context.createOscillator();
        const gain = this.context.createGain();
        
        osc.connect(gain);
        gain.connect(this.bgmGainNode!);
        
        osc.type = "square";
        osc.frequency.value = notes[index];
        
        const now = this.context.currentTime;
        gain.gain.setValueAtTime(0.2, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.15);
        osc.start(now);
        osc.stop(now + 0.18);

        index++;
        
        if (index < notes.length && this.bgmPlaying) {
          setTimeout(playNote, 80);
        }
      };
      
      playNote();
    };

    const startPowerUpLoop = () => {
      if (!this.bgmPlaying) return;
      playPowerUp();
      setTimeout(startPowerUpLoop, 3000 + Math.random() * 2000);
    };

    playKick();
    playSnare();
    playMelody();
    playHiMelody();
    startPowerUpLoop();
  }

  stopBGM() {
    this.bgmPlaying = false;
    if (this.bgmGainNode) {
      this.bgmGainNode.disconnect();
      this.bgmGainNode = null;
    }
  }

  toggleMute(): boolean {
    if (!this.context) return true;
    if (this.context.state === "suspended") {
      this.context.resume();
      return false;
    } else if (this.bgmPlaying) {
      this.stopBGM();
      return true;
    }
    return false;
  }

  resume() {
    if (this.context?.state === "suspended") {
      this.context.resume();
    }
  }
}

class Game {
  canvas: HTMLCanvasElement;
  ctx: CanvasRenderingContext2D;
  audioManager: AudioManager;
  enemies: Enemy[];
  bullets: Bullet[];
  particles: Particle[];
  powerUps: PowerUp[];
  keys: Set<string>;
  player: Player;
  score: number;
  gameOver: boolean;
  gameStarted: boolean;
  enemySpawnTimer: number;
  enemySpawnInterval: number;
  difficultyMultiplier: number;
  bossSpawned: boolean;
  bossDefeatedInRound: number;
  nextBossScore: number;
  highScore: number;
  isNewHighScore: boolean;
  currentWeaponType: "normal" | "spread" | "laser" | "homing";

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.ctx = canvas.getContext("2d")!;
    this.keys = new Set();
    this.audioManager = new AudioManager();
    
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
    this.bossSpawned = false;
this.bossDefeatedInRound = 0;
    this.nextBossScore = 2000;
    this.highScore = typeof window !== "undefined" ? parseInt(localStorage.getItem("neonBlasterHighScore") || "0") : 0;
    this.isNewHighScore = false;
    this.currentWeaponType = "normal";
  }

  saveHighScore() {
    if (this.score > this.highScore) {
      this.highScore = this.score;
      this.isNewHighScore = true;
      try {
        localStorage.setItem("neonBlasterHighScore", this.highScore.toString());
      } catch {}
    }
  }

  loadHighScores(): { name: string; score: number; date: number }[] {
    try {
      const stored = localStorage.getItem("neonBlasterLeaderboard");
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  }

  saveToLeaderboard(name: string) {
    const scores = this.loadHighScores();
    scores.push({ name, score: this.score, date: Date.now() });
    scores.sort((a, b) => b.score - a.score);
    const top10 = scores.slice(0, 10);
    try {
      localStorage.setItem("neonBlasterLeaderboard", JSON.stringify(top10));
    } catch {}
  }

  getHighScore(): number {
    return this.highScore;
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

  spawnBoss() {
    const bossTypes = [
      { name: "Phoenix", hp: 500, radius: 60, color: "#ff6600", speed: 1.5 },
      { name: "Void Walker", hp: 600, radius: 70, color: "#9900ff", speed: 1 },
      { name: "Titan", hp: 800, radius: 80, color: "#00ccff", speed: 0.8 },
    ];
    
    const bossType = bossTypes[Math.floor(Math.random() * bossTypes.length)];
    this.bossSpawned = true;
    
    this.enemies.push({
      pos: { x: this.canvas.width / 2, y: -100 },
      vel: { x: 0, y: bossType.speed },
      radius: bossType.radius,
      color: bossType.color,
      dead: false,
      hp: bossType.hp * this.difficultyMultiplier,
      type: "boss",
      scoreValue: 500,
      phase: 1,
      patternTimer: 0,
      attackPattern: "descend",
    });
    
    confetti({
      particleCount: 100,
      spread: 90,
      origin: { x: 0.5, y: 0 },
      colors: [bossType.color, "#ffffff"],
    });
  }

  spawnBullet(fromPlayer: boolean, pos: Vector, angle: number, damage: number, weaponType?: "normal" | "spread" | "laser" | "homing"): Bullet {
    let speed = fromPlayer ? 12 : 5;
    let radius = fromPlayer ? 6 : 8;
    let color = fromPlayer ? "#00ffff" : "#ff4444";
    
    if (fromPlayer && weaponType) {
      switch (weaponType) {
        case "spread":
          color = "#ff8800";
          speed = 14;
          break;
        case "laser":
          color = "#00ffff";
          speed = 18;
          radius = 5;
          break;
        case "homing":
          color = "#ff00ff";
          speed = 10;
          radius = 7;
          break;
      }
    }
    
    const bullet: Bullet = {
      pos: { ...pos },
      vel: { x: Math.cos(angle) * speed, y: Math.sin(angle) * speed },
      radius,
      color,
      dead: false,
      damage,
      fromPlayer,
      weaponType,
    };
    
    this.bullets.push(bullet);
    return bullet;
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
    const types: PowerUp["type"][] = ["weapon", "health", "speed", "spread", "laser", "homing"];
    const type = types[Math.floor(Math.random() * types.length)];
    let color: string;
    
    switch (type) {
      case "weapon": color = "#ffd700"; break;
      case "health": color = "#00ff00"; break;
      case "speed": color = "#ffff00"; break;
      case "spread": color = "#ff8800"; break;
      case "laser": color = "#00ffff"; break;
      case "homing": color = "#ff00ff"; break;
    }
    
    this.powerUps.push({
      pos: { ...pos },
      vel: { x: 0, y: 2 },
      radius: 15,
      color,
      dead: false,
      type,
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
    
    if (!this.bossSpawned && this.score >= this.nextBossScore) {
      this.audioManager.init();
      this.audioManager.playBossSpawn();
      this.spawnBoss();
      return;
    }
    
    const adjustedInterval = Math.max(0.3, this.enemySpawnInterval - this.score / 2000);
    
    if (this.enemySpawnTimer > adjustedInterval && !this.bossSpawned) {
      this.spawnEnemy();
      this.enemySpawnTimer = 0;
      this.difficultyMultiplier = 1 + this.score / 5000;
    }

    for (const enemy of this.enemies) {
      if (enemy.dead) continue;

      if (enemy.type === "boss") {
        this.updateBoss(enemy, dt);
        continue;
      }

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
        this.audioManager.playDamage();
        this.player.invincibleTimer = 1.5;
        enemy.dead = true;
        this.spawnParticles(enemy.pos, enemy.color, 20);
        
        if (this.player.hp <= 0) {
          this.player.dead = true;
          this.gameOver = true;
          this.audioManager.stopBGM();
          this.saveHighScore();
          this.spawnParticles(this.player.pos, this.player.color, 50);
        }
      }

      if (!enemy.dead && Math.random() < 0.01 * (enemy.type === "tank" ? 2 : enemy.type === "fast" ? 0.5 : 1)) {
        const angle = Math.atan2(this.player.pos.y - enemy.pos.y, this.player.pos.x - enemy.pos.x);
        this.spawnBullet(false, enemy.pos, angle, 10);
      }
    }

    this.enemies = this.enemies.filter((e) => !e.dead);

    if (this.bossSpawned && this.enemies.length === 0 && this.enemySpawnTimer > 3) {
      this.bossSpawned = false;
      this.bossDefeatedInRound++;
      this.nextBossScore += 2000 + this.bossDefeatedInRound * 1000;
    }
  }

  updateBoss(boss: Enemy, dt: number) {
    if (!boss.attackPattern) boss.attackPattern = "descend";
    if (!boss.patternTimer) boss.patternTimer = 0;
    
    boss.patternTimer += dt;

    switch (boss.attackPattern) {
      case "descend":
        if (boss.pos.y < this.canvas.height / 4) {
          boss.vel.y = 1;
        } else {
          boss.vel.y = 0;
          boss.attackPattern = "sidestep";
          boss.patternTimer = 0;
        }
        break;
        
      case "sidestep":
        boss.pos.x += Math.sin(boss.patternTimer * 2) * 3;
        if (boss.pos.x < boss.radius || boss.pos.x > this.canvas.width - boss.radius) {
          boss.vel.x *= -1;
        }
        
        if (boss.patternTimer > 4) {
          boss.attackPattern = "barrage";
          boss.patternTimer = 0;
        }
        break;
        
      case "barrage":
        const phase = Math.floor(boss.patternTimer / 2);
        if (phase !== boss.lastPhase) {
          boss.lastPhase = phase;
          for (let i = 0; i < 5; i++) {
            const angle = Math.PI / 2 + (i - 2) * 0.3;
            this.spawnBullet(false, boss.pos, angle, 15);
          }
        }
        
        if (boss.patternTimer > 6) {
          boss.attackPattern = "spiral";
          boss.patternTimer = 0;
        }
        break;
        
      case "spiral":
        const baseAngle = Math.atan2(this.player.pos.y - boss.pos.y, this.player.pos.x - boss.pos.x);
        const spiralAngleOffset = Date.now() / 300;
        const angle = baseAngle + spiralAngleOffset;
        this.spawnBullet(false, { x: boss.pos.x + Math.cos(spiralAngleOffset) * 30, y: boss.pos.y + Math.sin(spiralAngleOffset) * 30 }, angle, 12);
        
        if (boss.patternTimer > 5) {
          const hpPercent = boss.hp / (500 * this.difficultyMultiplier);
          if (hpPercent < 0.5 && boss.phase === 1) {
            boss.phase = 2;
            boss.hp *= 0.5;
            confetti({
              particleCount: 50,
              spread: 60,
              origin: { x: boss.pos.x / this.canvas.width, y: boss.pos.y / this.canvas.height },
              colors: ["#ff0000", "#ffff00"],
            });
          } else {
            boss.attackPattern = "sidestep";
            boss.patternTimer = 0;
          }
        }
        break;
    }

    if (boss.phase === 2) {
      const dx = this.player.pos.x - boss.pos.x;
      const dy = this.player.pos.y - boss.pos.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist > 0 && Math.random() < 0.03) {
        const angle = Math.atan2(dy, dx);
        this.spawnBullet(false, boss.pos, angle, 20);
      }
    }

    boss.pos.x += boss.vel.x;
    boss.pos.y += boss.vel.y;

    if (!this.player.dead && this.checkCollision(this.player, boss)) {
      this.player.hp -= 30;
      this.audioManager.playDamage();
      this.player.invincibleTimer = 2;
      
      if (this.player.hp <= 0) {
        this.player.dead = true;
        this.gameOver = true;
        this.audioManager.stopBGM();
        this.saveHighScore();
        this.spawnParticles(this.player.pos, this.player.color, 50);
      }
    }

    if (boss.hp <= 0) {
      boss.dead = true;
      this.score += boss.scoreValue * (boss.phase === 2 ? 1.5 : 1);
      this.spawnParticles(boss.pos, boss.color, 50);
      
      confetti({
        particleCount: 150,
        spread: 100,
        origin: { x: boss.pos.x / this.canvas.width, y: boss.pos.y / this.canvas.height },
        colors: [boss.color, "#ffffff", "#ff0000"],
      });
    }
  }

  updateBullets() {
    for (const bullet of this.bullets) {
      if (bullet.fromPlayer && bullet.weaponType === "homing" && bullet.targetEnemy && !bullet.targetEnemy.dead) {
        const dx = bullet.targetEnemy.pos.x - bullet.pos.x;
        const dy = bullet.targetEnemy.pos.y - bullet.pos.y;
        const angle = Math.atan2(dy, dx);
        
        const turnRate = 0.15;
        const currentAngle = Math.atan2(bullet.vel.y, bullet.vel.x);
        let newAngle = currentAngle;
        
        if (angle > currentAngle) {
          newAngle = Math.min(angle, currentAngle + turnRate);
        } else {
          newAngle = Math.max(angle, currentAngle - turnRate);
        }
        
        const speed = Math.sqrt(bullet.vel.x * bullet.vel.x + bullet.vel.y * bullet.vel.y);
        bullet.vel.x = Math.cos(newAngle) * speed;
        bullet.vel.y = Math.sin(newAngle) * speed;
      }
      
      if (bullet.fromPlayer && bullet.weaponType === "laser") {
        for (const enemy of this.enemies) {
          if (!enemy.dead) {
            const dx = enemy.pos.x - bullet.pos.x;
            
            if (Math.abs(dx) < 5 && enemy.pos.y > bullet.pos.y) {
              enemy.hp -= bullet.damage * 0.1;
              
              if (enemy.hp <= 0) {
                enemy.dead = true;
                this.score += enemy.scoreValue;
                this.audioManager.playExplosion();
                this.spawnParticles(enemy.pos, enemy.color, 15);
                
                if (Math.random() < 0.1) {
                  this.spawnPowerUp(enemy.pos);
                }
              }
            }
          }
        }
      }

      bullet.pos.x += bullet.vel.x;
      bullet.pos.y += bullet.vel.y;

      if (bullet.pos.x < -50 || bullet.pos.x > this.canvas.width + 50 || bullet.pos.y < -50 || bullet.pos.y > this.canvas.height + 50) {
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
              this.audioManager.playExplosion();
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
          this.audioManager.playDamage();
          bullet.dead = true;
          this.spawnParticles(bullet.pos, "#ff4444", 10);
          this.player.invincibleTimer = 1;

          if (this.player.hp <= 0) {
            this.player.dead = true;
            this.gameOver = true;
            this.audioManager.stopBGM();
            this.saveHighScore();
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
        this.audioManager.playPowerUp();
        
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
          case "spread":
            this.currentWeaponType = "spread";
            confetti({ particleCount: 30, spread: 50, colors: ["#ff8800"] });
            break;
          case "laser":
            this.currentWeaponType = "laser";
            confetti({ particleCount: 30, spread: 50, colors: ["#00ffff"] });
            break;
          case "homing":
            this.currentWeaponType = "homing";
            confetti({ particleCount: 30, spread: 50, colors: ["#ff00ff"] });
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
      } else if (enemy.type === "boss") {
        const pulseSize = enemy.radius + Math.sin(Date.now() / 200) * 5;
        
        ctx.beginPath();
        for (let i = 0; i < 8; i++) {
          const angle = (Math.PI * 2 / 8) * i - Math.PI / 2 + Date.now() / 800;
          const r = pulseSize * (i % 2 === 0 ? 1 : 0.6);
          ctx.lineTo(Math.cos(angle) * r, Math.sin(angle) * r);
        }
        ctx.closePath();
        
        const gradient = ctx.createRadialGradient(0, 0, 0, 0, 0, pulseSize);
        if (enemy.phase === 2) {
          gradient.addColorStop(0, "#ff0000");
          gradient.addColorStop(0.5, enemy.color);
          gradient.addColorStop(1, "#330066");
        } else {
          gradient.addColorStop(0, "#ffffff");
          gradient.addColorStop(0.5, enemy.color);
          gradient.addColorStop(1, "#003333");
        }
        ctx.fillStyle = gradient;
        ctx.fill();

        if (enemy.phase === 2) {
          ctx.strokeStyle = "#ff0000";
          ctx.lineWidth = 3;
          ctx.beginPath();
          ctx.arc(0, 0, pulseSize * 1.2, 0, Math.PI * 2);
          ctx.stroke();
        }

        const eyeOffset = Math.sin(Date.now() / 300) * 5;
        ctx.fillStyle = enemy.phase === 2 ? "#ffff00" : "#ffffff";
        ctx.beginPath();
        ctx.arc(-15 + eyeOffset, -10, 8, 0, Math.PI * 2);
        ctx.arc(15 - eyeOffset, -10, 8, 0, Math.PI * 2);
        ctx.fill();

        if (enemy.attackPattern === "spiral") {
          for (let i = 0; i < 6; i++) {
            const angle = Date.now() / 200 + (Math.PI * 2 / 6) * i;
            const x = Math.cos(angle) * (pulseSize * 0.8);
            const y = Math.sin(angle) * (pulseSize * 0.8);
            
            ctx.beginPath();
            ctx.arc(x, y, 5 + Math.sin(Date.now() / 100 + i), 0, Math.PI * 2);
            ctx.fillStyle = "#ff4444";
            ctx.fill();
          }
        }
      }

      const hpPercent = enemy.type === "boss" 
        ? enemy.hp / (enemy.phase === 2 ? 250 : 500) / this.difficultyMultiplier
        : enemy.hp / (30 * this.difficultyMultiplier);
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
      
      if (bullet.fromPlayer && bullet.weaponType === "laser") {
        ctx.save();
        
        ctx.beginPath();
        ctx.moveTo(this.player.pos.x, this.player.pos.y);
        ctx.lineTo(bullet.pos.x, bullet.pos.y);
        
        ctx.strokeStyle = "#00ffff";
        ctx.lineWidth = 4;
        ctx.shadowColor = "#00ffff";
        ctx.shadowBlur = 15;
        ctx.globalAlpha = 0.8;
        ctx.stroke();
        
        ctx.beginPath();
        ctx.moveTo(this.player.pos.x, this.player.pos.y);
        ctx.lineTo(bullet.pos.x, bullet.pos.y);
        ctx.strokeStyle = "#ffffff";
        ctx.lineWidth = 2;
        ctx.shadowBlur = 0;
        ctx.globalAlpha = 0.5;
        ctx.stroke();
        
        ctx.restore();
      } else if (bullet.fromPlayer && bullet.weaponType === "homing") {
        ctx.save();
        ctx.translate(bullet.pos.x, bullet.pos.y);
        
        const angle = Math.atan2(bullet.vel.y, bullet.vel.x);
        ctx.rotate(angle);
        
        for (let i = 0; i < 5; i++) {
          const trailX = -i * 8;
          const alpha = 1 - i / 5;
          
          ctx.globalAlpha = alpha;
          ctx.beginPath();
          ctx.arc(trailX, 0, bullet.radius * (1 - i * 0.15), 0, Math.PI * 2);
          ctx.fillStyle = bullet.color;
          ctx.shadowColor = bullet.color;
          ctx.shadowBlur = 10;
          ctx.fill();
        }
        
        ctx.globalAlpha = 1;
        ctx.beginPath();
        ctx.arc(0, 0, bullet.radius, 0, Math.PI * 2);
        const gradient = ctx.createRadialGradient(0, 0, 0, 0, 0, bullet.radius);
        gradient.addColorStop(0, "#ffffff");
        gradient.addColorStop(0.5, bullet.color);
        gradient.addColorStop(1, "transparent");
        ctx.fillStyle = gradient;
        ctx.shadowBlur = 15;
        ctx.fill();
        
        ctx.restore();
      } else if (bullet.fromPlayer && bullet.weaponType === "spread") {
        ctx.save();
        ctx.translate(bullet.pos.x, bullet.pos.y);
        
        const angle = Math.atan2(bullet.vel.y, bullet.vel.x);
        ctx.rotate(angle);
        
        for (let i = 0; i < 3; i++) {
          const trailX = -i * 6;
          const alpha = 1 - i / 3;
          
          ctx.globalAlpha = alpha;
          ctx.beginPath();
          ctx.arc(trailX, 0, bullet.radius * (1 - i * 0.2), 0, Math.PI * 2);
          ctx.fillStyle = bullet.color;
          ctx.shadowColor = bullet.color;
          ctx.shadowBlur = 8;
          ctx.fill();
        }
        
        ctx.globalAlpha = 1;
        ctx.beginPath();
        ctx.arc(0, 0, bullet.radius, 0, Math.PI * 2);
        const gradient = ctx.createRadialGradient(0, 0, 0, 0, 0, bullet.radius);
        gradient.addColorStop(0, "#ffffff");
        gradient.addColorStop(0.5, bullet.color);
        gradient.addColorStop(1, "transparent");
        ctx.fillStyle = gradient;
        ctx.shadowBlur = 10;
        ctx.fill();
        
        ctx.restore();
      } else {
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
      const labels: Record<string, string> = { 
        weapon: "⚔️", 
        health: "❤️", 
        speed: "⚡",
        spread: "🌪️",
        laser: "🔦",
        homing: "🎯"
      };
      ctx.fillText(labels[powerUp.type] || "", 0, 0);

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

    if (this.bossSpawned) {
      const boss = this.enemies.find(e => e.type === "boss");
      if (boss) {
        ctx.fillStyle = "#ff0000";
        ctx.font = "bold 18px 'Courier New', monospace";
        ctx.textAlign = "center";
        ctx.shadowColor = "#ff0000";
        ctx.shadowBlur = 15;
        ctx.fillText("⚠️ BOSS APPROACHING ⚠️", this.canvas.width / 2, 40);
        ctx.shadowBlur = 0;
        
        const bossHpPercent = boss.hp / (boss.phase === 2 ? 250 : 500) / this.difficultyMultiplier;
        ctx.fillStyle = "#1a1a2e";
        ctx.fillRect(this.canvas.width / 2 - 150, 55, 300, 15);
        
        const hpGradient = ctx.createLinearGradient(this.canvas.width / 2 - 148, 57, this.canvas.width / 2 + 148, 57);
        hpGradient.addColorStop(0, "#ff0000");
        hpGradient.addColorStop(1, "#aa0000");
        ctx.fillStyle = hpGradient;
        ctx.fillRect(this.canvas.width / 2 - 148, 57, Math.max(4, 296 * bossHpPercent), 11);
        
        ctx.strokeStyle = "#ffffff";
        ctx.lineWidth = 2;
        ctx.strokeRect(this.canvas.width / 2 - 150, 55, 300, 15);

        if (boss.phase === 2) {
          ctx.fillStyle = "#ff8800";
          ctx.font = "bold 14px 'Courier New', monospace";
          ctx.textAlign = "center";
          ctx.fillText("PHASE 2 - ENRAGED!", this.canvas.width / 2, 85);
        }
      }
    }

    ctx.fillStyle = "#ffffff";
    ctx.font = "bold 14px 'Courier New', monospace";
    ctx.textAlign = "left";
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

    if (this.highScore > 0) {
      ctx.font = "20px 'Courier New', monospace";
      ctx.fillStyle = "#ffd700";
      ctx.shadowColor = "#ffd700";
      ctx.shadowBlur = 10;
      ctx.fillText(`HIGH SCORE: ${this.highScore.toString().padStart(8, "0")}`, centerX, centerY + 220);
      ctx.shadowBlur = 0;
    }

    const leaderboard = this.loadHighScores();
    if (leaderboard.length > 0) {
      ctx.font = "14px 'Courier New', monospace";
      ctx.fillStyle = "#88ff88";
      ctx.fillText("Top Scores:", centerX, centerY + 255);
      
      for (let i = 0; i < Math.min(3, leaderboard.length); i++) {
        const y = 275 + i * 20;
        const rankColor = i === 0 ? "#ffd700" : i === 1 ? "#c0c0c0" : "#cd7f32";
        ctx.fillStyle = rankColor;
        ctx.fillText(`${i + 1}. ${leaderboard[i].score.toString().padStart(6, "0")}`, centerX - 50, y);
      }
    }

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

    if (this.isNewHighScore) {
      const pulse = (Math.sin(Date.now() / 200) + 1) / 2 * 0.5 + 0.5;
      ctx.shadowColor = "#ffff00";
      ctx.shadowBlur = 20;
      ctx.font = "bold 28px 'Courier New', monospace";
      ctx.fillStyle = `rgba(255, 215, 0, ${pulse})`;
      ctx.fillText("NEW HIGH SCORE!", centerX, centerY + 50);
      ctx.shadowBlur = 0;
    } else {
      ctx.font = "24px 'Courier New', monospace";
      ctx.fillStyle = "#aaaaaa";
      ctx.fillText(`High Score: ${this.highScore.toString().padStart(8, "0")}`, centerX, centerY + 50);
    }

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
    
    this.audioManager.init();
    this.audioManager.playShoot();

    switch (this.currentWeaponType) {
      case "spread":
        for (let i = -3; i <= 3; i++) {
          const angle = -Math.PI / 2 + (i * 0.15);
          this.spawnBullet(true, this.player.pos, angle, 12 * this.player.weaponLevel, "spread");
        }
        break;
        
      case "laser":
        for (let i = -1; i <= 1; i++) {
          const angle = -Math.PI / 2 + (i * 0.05);
          const bullet = this.spawnBullet(true, this.player.pos, angle, 20 * this.player.weaponLevel, "laser");
          if (bullet) bullet.radius = 8;
        }
        break;
        
      case "homing":
        const target = this.findNearestEnemy();
        let angle = -Math.PI / 2;
        if (target && !target.dead) {
          angle = Math.atan2(target.pos.y - this.player.pos.y, target.pos.x - this.player.pos.x);
        }
        
        for (let i = -1; i <= 1; i++) {
          const offsetAngle = angle + (i * 0.3);
          const bullet = this.spawnBullet(true, this.player.pos, offsetAngle, 15 * this.player.weaponLevel, "homing");
          if (bullet) {
            bullet.targetEnemy = target;
          }
        }
        break;
        
      default:
        const angles = [-Math.PI / 2];
        
        if (this.player.weaponLevel >= 2) {
          angles.push(-Math.PI / 2 - 0.15, -Math.PI / 2 + 0.15);
        }
        
        if (this.player.weaponLevel >= 4) {
          angles.push(-Math.PI / 2 - 0.3, -Math.PI / 2 + 0.3);
        }

        for (const a of angles) {
          this.spawnBullet(true, this.player.pos, a, 15 * this.player.weaponLevel, "normal");
        }
    }
  }

  findNearestEnemy(): Enemy | null {
    let nearest: Enemy | null = null;
    let minDist = Infinity;
    
    for (const enemy of this.enemies) {
      if (enemy.dead || enemy.type === "boss") continue;
      
      const dx = enemy.pos.x - this.player.pos.x;
      const dy = enemy.pos.y - this.player.pos.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      
      if (dist < minDist) {
        minDist = dist;
        nearest = enemy;
      }
    }
    
    return nearest;
  }

  start() {
    this.audioManager.init();
    this.audioManager.startBGM();
    this.gameStarted = true;
    this.score = 0;
    this.difficultyMultiplier = 1;
    this.bossSpawned = false;
    this.bossDefeatedInRound = 0;
    this.nextBossScore = 2000;
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
    this.currentWeaponType = "normal";
  }
}

export default function GameComponent() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const gameRef = useRef<Game | null>(null);
  const lastTimeRef = useRef<number>(0);
  const shootTimerRef = useRef<number>(0);
  const isSpacePressed = useRef<boolean>(false);
  
  const touchStartRef = useRef<{ x: number; y: number } | null>(null);
  const joystickRef = useRef<HTMLDivElement>(null);
  const joystickKnobRef = useRef<HTMLDivElement>(null);

  const handleTouchStart = (e: React.TouchEvent) => {
    const game = gameRef.current;
    if (!game || !game.gameStarted || game.gameOver) return;
    
    const { clientX: x } = e.touches[0];
    
    if (x < window.innerWidth / 2 && joystickRef.current) {
      const rect = joystickRef.current.getBoundingClientRect();
      touchStartRef.current = { 
        x: rect.left + rect.width / 2, 
        y: rect.top + rect.height / 2 
      };
    } else if (x > window.innerWidth / 2) {
      game.shoot();
      isSpacePressed.current = true;
      shootTimerRef.current = 0.1;
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    const game = gameRef.current;
    if (!game || !touchStartRef.current || !joystickKnobRef.current) return;

    const touch = e.touches[0];
    const dx = touch.clientX - touchStartRef.current.x;
    const dy = touch.clientY - touchStartRef.current.y;
    
    const maxDist = 40;
    const dist = Math.min(Math.sqrt(dx * dx + dy * dy), maxDist);
    const angle = Math.atan2(dy, dx);
    
    const knobX = Math.cos(angle) * dist;
    const knobY = Math.sin(angle) * dist;
    
    joystickKnobRef.current.style.transform = `translate(${knobX}px, ${knobY}px)`;

    game.keys.delete("ArrowLeft");
    game.keys.delete("ArrowRight");
    game.keys.delete("ArrowUp");
    game.keys.delete("ArrowDown");
    game.keys.delete("w");
    game.keys.delete("s");
    game.keys.delete("a");
    game.keys.delete("d");

    if (dist > 10) {
      if (knobX < -15 || dx < -30) game.keys.add("ArrowLeft");
      if (knobX > 15 || dx > 30) game.keys.add("ArrowRight");
      if (knobY < -15 || dy < -30) game.keys.add("ArrowUp");
      if (knobY > 15 || dy > 30) game.keys.add("ArrowDown");
    }
  };

  const handleTouchEnd = () => {
    touchStartRef.current = null;
    isSpacePressed.current = false;
    
    if (joystickKnobRef.current) {
      joystickKnobRef.current.style.transform = "translate(0px, 0px)";
    }
    
    const game = gameRef.current;
    if (!game) return;
    
    game.keys.delete("ArrowLeft");
    game.keys.delete("ArrowRight");
    game.keys.delete("ArrowUp");
    game.keys.delete("ArrowDown");
    game.keys.delete("w");
    game.keys.delete("s");
    game.keys.delete("a");
    game.keys.delete("d");
  };

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

  const isMobile = typeof window !== "undefined" && "ontouchstart" in window;

  if (!isMobile) {
    return <canvas ref={canvasRef} style={{ width: "100vw", height: "100vh" }} />;
  }

  return (
    <div 
      style={{ 
        position: "relative", 
        width: "100vw", 
        height: "100vh",
        touchAction: "none"
      }}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      <canvas ref={canvasRef} style={{ width: "100%", height: "100%" }} />
      
      <div 
        ref={joystickRef}
        style={{
          position: "absolute",
          left: 40,
          bottom: 40,
          width: 120,
          height: 120,
          borderRadius: "50%",
          backgroundColor: "rgba(255, 255, 255, 0.1)",
          border: "3px solid rgba(0, 255, 255, 0.5)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <div 
          ref={joystickKnobRef}
          style={{
            width: 50,
            height: 50,
            borderRadius: "50%",
            backgroundColor: "rgba(0, 255, 255, 0.7)",
            boxShadow: "0 0 20px rgba(0, 255, 255, 0.5)",
          }}
        />
      </div>
      
      <div
        style={{
          position: "absolute",
          right: 40,
          bottom: 60,
          width: 80,
          height: 80,
          borderRadius: "50%",
          backgroundColor: "rgba(255, 0, 100, 0.3)",
          border: "3px solid rgba(255, 0, 100, 0.5)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: "30px",
        }}
      >
        🔫
      </div>
    </div>
  );
}
