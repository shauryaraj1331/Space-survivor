/**
 * ============================================================
 * SPACE SURVIVOR - Modern 2D Arcade Spaceship Survival Game
 * Complete Game Engine, Procedural Canvas Graphics, Web Audio API
 * ============================================================
 */

'use strict';

/* ============================================================
   1. STORAGE SYSTEM (Safe LocalStorage Management)
   ============================================================ */
class StorageManager {
  static KEYS = {
    BEST_SCORE: 'space_survivor_best_score',
    BEST_TIME: 'space_survivor_best_time',
    TOTAL_KILLS: 'space_survivor_total_kills',
    GAMES_PLAYED: 'space_survivor_games_played',
    SOUND_MUTED: 'space_survivor_muted'
  };

  static get(key, defaultValue = 0) {
    try {
      const val = localStorage.getItem(key);
      return val !== null ? JSON.parse(val) : defaultValue;
    } catch (e) {
      console.warn('Storage read failed:', e);
      return defaultValue;
    }
  }

  static set(key, value) {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch (e) {
      console.warn('Storage write failed:', e);
    }
  }

  static getStats() {
    return {
      bestScore: this.get(this.KEYS.BEST_SCORE, 0),
      bestTime: this.get(this.KEYS.BEST_TIME, 0),
      totalKills: this.get(this.KEYS.TOTAL_KILLS, 0),
      gamesPlayed: this.get(this.KEYS.GAMES_PLAYED, 0),
      soundMuted: this.get(this.KEYS.SOUND_MUTED, false)
    };
  }

  static recordGame(score, timeSeconds, kills) {
    const stats = this.getStats();
    let isNewBest = false;

    if (score > stats.bestScore) {
      this.set(this.KEYS.BEST_SCORE, score);
      isNewBest = true;
    }
    if (timeSeconds > stats.bestTime) {
      this.set(this.KEYS.BEST_TIME, timeSeconds);
    }
    this.set(this.KEYS.TOTAL_KILLS, stats.totalKills + kills);
    this.set(this.KEYS.GAMES_PLAYED, stats.gamesPlayed + 1);

    return isNewBest;
  }
}

/* ============================================================
   2. PROCEDURAL SOUND SYNTHESIZER (Web Audio API)
   ============================================================ */
class SoundEngine {
  constructor() {
    this.ctx = null;
    this.isMuted = StorageManager.get(StorageManager.KEYS.SOUND_MUTED, false);
    this.masterGain = null;
    this.noiseBuffer = null;
  }

  init() {
    if (this.ctx) return;
    try {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      this.ctx = new AudioContext();
      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.setValueAtTime(this.isMuted ? 0 : 0.35, this.ctx.currentTime);
      this.masterGain.connect(this.ctx.destination);
      this.generateNoiseBuffer();
    } catch (e) {
      console.warn('Web Audio API not supported or blocked:', e);
    }
  }

  ensureResumed() {
    if (!this.ctx) this.init();
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
  }

  toggleMute() {
    this.isMuted = !this.isMuted;
    StorageManager.set(StorageManager.KEYS.SOUND_MUTED, this.isMuted);
    if (this.masterGain && this.ctx) {
      this.masterGain.gain.setValueAtTime(this.isMuted ? 0 : 0.35, this.ctx.currentTime);
    }
    return this.isMuted;
  }

  generateNoiseBuffer() {
    if (!this.ctx) return;
    const bufferSize = this.ctx.sampleRate * 1.5;
    this.noiseBuffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const output = this.noiseBuffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      output[i] = Math.random() * 2 - 1;
    }
  }

  playLaser(isSpecial = false) {
    if (this.isMuted || !this.ctx) return;
    try {
      const t = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = isSpecial ? 'sawtooth' : 'sine';
      osc.frequency.setValueAtTime(isSpecial ? 850 : 680, t);
      osc.frequency.exponentialRampToValueAtTime(120, t + 0.12);

      gain.gain.setValueAtTime(isSpecial ? 0.3 : 0.18, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.12);

      osc.connect(gain);
      gain.connect(this.masterGain);

      osc.start(t);
      osc.stop(t + 0.13);
    } catch (e) {}
  }

  playEnemyLaser() {
    if (this.isMuted || !this.ctx) return;
    try {
      const t = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(450, t);
      osc.frequency.exponentialRampToValueAtTime(140, t + 0.18);

      gain.gain.setValueAtTime(0.18, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.18);

      osc.connect(gain);
      gain.connect(this.masterGain);

      osc.start(t);
      osc.stop(t + 0.19);
    } catch (e) {}
  }

  playExplosion(isLarge = false) {
    if (this.isMuted || !this.ctx || !this.noiseBuffer) return;
    try {
      const t = this.ctx.currentTime;
      const dur = isLarge ? 0.55 : 0.35;

      // Noise component
      const noise = this.ctx.createBufferSource();
      noise.buffer = this.noiseBuffer;

      const filter = this.ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(isLarge ? 480 : 700, t);
      filter.frequency.exponentialRampToValueAtTime(30, t + dur);

      const gain = this.ctx.createGain();
      gain.gain.setValueAtTime(isLarge ? 0.5 : 0.3, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + dur);

      noise.connect(filter);
      filter.connect(gain);
      gain.connect(this.masterGain);

      noise.start(t);
      noise.stop(t + dur);

      // Low frequency rumble oscillator
      const osc = this.ctx.createOscillator();
      const oscGain = this.ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(isLarge ? 120 : 160, t);
      osc.frequency.exponentialRampToValueAtTime(25, t + dur * 0.8);

      oscGain.gain.setValueAtTime(0.4, t);
      oscGain.gain.exponentialRampToValueAtTime(0.001, t + dur * 0.8);

      osc.connect(oscGain);
      oscGain.connect(this.masterGain);

      osc.start(t);
      osc.stop(t + dur);
    } catch (e) {}
  }

  playHit() {
    if (this.isMuted || !this.ctx) return;
    try {
      const t = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'square';
      osc.frequency.setValueAtTime(220, t);
      osc.frequency.exponentialRampToValueAtTime(80, t + 0.08);

      gain.gain.setValueAtTime(0.12, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.08);

      osc.connect(gain);
      gain.connect(this.masterGain);

      osc.start(t);
      osc.stop(t + 0.09);
    } catch (e) {}
  }

  playPlayerDamage() {
    if (this.isMuted || !this.ctx) return;
    try {
      const t = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(150, t);
      osc.frequency.exponentialRampToValueAtTime(40, t + 0.22);

      gain.gain.setValueAtTime(0.4, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.22);

      osc.connect(gain);
      gain.connect(this.masterGain);

      osc.start(t);
      osc.stop(t + 0.23);
    } catch (e) {}
  }

  playEmpBlast() {
    if (this.isMuted || !this.ctx) return;
    try {
      const t = this.ctx.currentTime;
      const dur = 0.65;

      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      const filter = this.ctx.createBiquadFilter();

      filter.type = 'bandpass';
      filter.frequency.setValueAtTime(1200, t);
      filter.frequency.exponentialRampToValueAtTime(80, t + dur);
      filter.Q.value = 4;

      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(280, t);
      osc.frequency.exponentialRampToValueAtTime(45, t + dur);

      gain.gain.setValueAtTime(0.45, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + dur);

      osc.connect(filter);
      filter.connect(gain);
      gain.connect(this.masterGain);

      osc.start(t);
      osc.stop(t + dur);
    } catch (e) {}
  }

  playLevelUp() {
    if (this.isMuted || !this.ctx) return;
    try {
      const notes = [440, 554.37, 659.25, 880]; // A major arpeggio
      notes.forEach((freq, idx) => {
        const t = this.ctx.currentTime + idx * 0.08;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, t);

        gain.gain.setValueAtTime(0.2, t);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.25);

        osc.connect(gain);
        gain.connect(this.masterGain);

        osc.start(t);
        osc.stop(t + 0.26);
      });
    } catch (e) {}
  }

  playXpPickup() {
    if (this.isMuted || !this.ctx) return;
    try {
      const t = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(987.77, t); // B5
      osc.frequency.exponentialRampToValueAtTime(1318.5, t + 0.06); // E6

      gain.gain.setValueAtTime(0.12, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.07);

      osc.connect(gain);
      gain.connect(this.masterGain);

      osc.start(t);
      osc.stop(t + 0.08);
    } catch (e) {}
  }

  playButtonClick() {
    if (this.isMuted || !this.ctx) return;
    try {
      const t = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(800, t);
      osc.frequency.exponentialRampToValueAtTime(400, t + 0.04);

      gain.gain.setValueAtTime(0.15, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.04);

      osc.connect(gain);
      gain.connect(this.masterGain);

      osc.start(t);
      osc.stop(t + 0.05);
    } catch (e) {}
  }

  playGameOver() {
    if (this.isMuted || !this.ctx) return;
    try {
      const notes = [330, 311.13, 293.66, 261.63]; // Descending melancholy
      notes.forEach((freq, idx) => {
        const t = this.ctx.currentTime + idx * 0.16;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(freq, t);

        gain.gain.setValueAtTime(0.25, t);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.35);

        osc.connect(gain);
        gain.connect(this.masterGain);

        osc.start(t);
        osc.stop(t + 0.36);
      });
    } catch (e) {}
  }
}

/* ============================================================
   3. STARFIELD & NEBULA BACKGROUND SYSTEM
   ============================================================ */
class Starfield {
  constructor(canvas) {
    this.canvas = canvas;
    this.stars = [];
    this.nebulae = [];
    this.numStars = 160;
    this.init();
  }

  init() {
    this.stars = [];
    for (let i = 0; i < this.numStars; i++) {
      this.stars.push({
        x: Math.random() * this.canvas.width,
        y: Math.random() * this.canvas.height,
        size: Math.random() * 1.8 + 0.5,
        speed: Math.random() * 0.4 + 0.15,
        brightness: Math.random() * 0.7 + 0.3,
        twinkleSpeed: Math.random() * 2 + 1,
        color: ['#ffffff', '#a8d5e5', '#d4c5f9', '#ffe8d6'][Math.floor(Math.random() * 4)]
      });
    }

    // Procedural Nebulae (cosmic dust glow spots)
    this.nebulae = [
      { x: this.canvas.width * 0.25, y: this.canvas.height * 0.3, r: 240, color: 'rgba(58, 12, 163, 0.12)' },
      { x: this.canvas.width * 0.8, y: this.canvas.height * 0.7, r: 280, color: 'rgba(0, 180, 216, 0.08)' },
      { x: this.canvas.width * 0.5, y: this.canvas.height * 0.85, r: 220, color: 'rgba(114, 9, 183, 0.1)' }
    ];
  }

  resize() {
    this.init();
  }

  update(dt, playerVelX = 0, playerVelY = 0) {
    const pShiftX = playerVelX * 0.05;
    const pShiftY = playerVelY * 0.05;

    for (let s of this.stars) {
      s.y += s.speed * 40 * dt - pShiftY * s.speed;
      s.x -= pShiftX * s.speed;

      // Wrap around
      if (s.y > this.canvas.height) {
        s.y = 0;
        s.x = Math.random() * this.canvas.width;
      } else if (s.y < 0) {
        s.y = this.canvas.height;
        s.x = Math.random() * this.canvas.width;
      }
      if (s.x > this.canvas.width) s.x = 0;
      else if (s.x < 0) s.x = this.canvas.width;
    }
  }

  draw(ctx, time) {
    // Nebulae glow
    for (let neb of this.nebulae) {
      const grad = ctx.createRadialGradient(neb.x, neb.y, 0, neb.x, neb.y, neb.r);
      grad.addColorStop(0, neb.color);
      grad.addColorStop(1, 'transparent');
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(neb.x, neb.y, neb.r, 0, Math.PI * 2);
      ctx.fill();
    }

    // Stars
    for (let s of this.stars) {
      const alpha = s.brightness * (0.7 + 0.3 * Math.sin(time * s.twinkleSpeed + s.x));
      ctx.fillStyle = s.color;
      ctx.globalAlpha = Math.max(0.1, Math.min(1, alpha));
      ctx.beginPath();
      ctx.arc(s.x, s.y, s.size, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  }
}

/* ============================================================
   4. PARTICLES & FLOATING EFFECTS
   ============================================================ */
class Particle {
  constructor(x, y, vx, vy, color, size, life, decay, isSmoke = false) {
    this.x = x;
    this.y = y;
    this.vx = vx;
    this.vy = vy;
    this.color = color;
    this.size = size;
    this.maxLife = life;
    this.life = life;
    this.decay = decay;
    this.isSmoke = isSmoke;
  }

  update(dt) {
    this.x += this.vx * dt;
    this.y += this.vy * dt;
    this.vx *= 0.96;
    this.vy *= 0.96;
    this.life -= this.decay * dt;
    if (this.isSmoke) this.size += 6 * dt;
    return this.life > 0;
  }

  draw(ctx) {
    const alpha = Math.max(0, this.life / this.maxLife);
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.fillStyle = this.color;
    ctx.shadowBlur = this.isSmoke ? 0 : 8;
    ctx.shadowColor = this.color;
    ctx.beginPath();
    ctx.arc(this.x, this.y, Math.max(0.5, this.size), 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
}

class ShockwaveRing {
  constructor(x, y, maxRadius, color, duration = 0.45) {
    this.x = x;
    this.y = y;
    this.radius = 4;
    this.maxRadius = maxRadius;
    this.color = color;
    this.duration = duration;
    this.elapsed = 0;
  }

  update(dt) {
    this.elapsed += dt;
    const progress = Math.min(1, this.elapsed / this.duration);
    this.radius = this.maxRadius * progress;
    return progress < 1;
  }

  draw(ctx) {
    const progress = this.elapsed / this.duration;
    const alpha = 1 - progress;
    ctx.save();
    ctx.strokeStyle = this.color;
    ctx.lineWidth = Math.max(1, (1 - progress) * 6);
    ctx.globalAlpha = alpha;
    ctx.shadowBlur = 15;
    ctx.shadowColor = this.color;
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  }
}

class FloatingText {
  constructor(x, y, text, color, size = 16) {
    this.x = x;
    this.y = y;
    this.text = text;
    this.color = color;
    this.size = size;
    this.life = 0.8;
    this.maxLife = 0.8;
    this.vy = -45;
  }

  update(dt) {
    this.y += this.vy * dt;
    this.life -= dt;
    return this.life > 0;
  }

  draw(ctx) {
    const alpha = Math.max(0, this.life / this.maxLife);
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.fillStyle = this.color;
    ctx.font = `bold ${this.size}px 'Orbitron', sans-serif`;
    ctx.textAlign = 'center';
    ctx.shadowBlur = 8;
    ctx.shadowColor = this.color;
    ctx.fillText(this.text, this.x, this.y);
    ctx.restore();
  }
}

/* ============================================================
   5. XP GEMS & COLLECTIBLES
   ============================================================ */
class XpGem {
  constructor(x, y, value = 10) {
    this.x = x;
    this.y = y;
    this.value = value;
    this.radius = value >= 30 ? 7 : 5;
    this.color = value >= 30 ? '#ffb703' : '#00f0ff';
    this.isMagnetic = false;
    this.vx = (Math.random() - 0.5) * 40;
    this.vy = (Math.random() - 0.5) * 40;
    this.pulse = Math.random() * Math.PI * 2;
  }

  update(dt, player) {
    this.pulse += dt * 4;
    // Friction on initial scatter
    this.vx *= 0.92;
    this.vy *= 0.92;
    this.x += this.vx * dt;
    this.y += this.vy * dt;

    // Magnet check
    const dx = player.x - this.x;
    const dy = player.y - this.y;
    const dist = Math.hypot(dx, dy);

    if (dist < player.magnetRadius) {
      this.isMagnetic = true;
      const speed = 360 + (1 - dist / player.magnetRadius) * 200;
      this.x += (dx / dist) * speed * dt;
      this.y += (dy / dist) * speed * dt;
    }

    // Pickup check
    if (dist < player.radius + this.radius) {
      return true; // Collected!
    }
    return false;
  }

  draw(ctx) {
    ctx.save();
    const glow = Math.sin(this.pulse) * 3 + 6;
    ctx.fillStyle = this.color;
    ctx.shadowBlur = glow;
    ctx.shadowColor = this.color;

    // Diamond gem shape
    ctx.translate(this.x, this.y);
    ctx.beginPath();
    ctx.moveTo(0, -this.radius);
    ctx.lineTo(this.radius * 0.8, 0);
    ctx.lineTo(0, this.radius);
    ctx.lineTo(-this.radius * 0.8, 0);
    ctx.closePath();
    ctx.fill();

    // Inner bright spark
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(0, 0, this.radius * 0.35, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
  }
}

/* ============================================================
   6. PROJECTILES SYSTEM
   ============================================================ */
class Projectile {
  constructor(x, y, vx, vy, damage, isPlayer = true, size = 4, color = '#00f0ff') {
    this.x = x;
    this.y = y;
    this.vx = vx;
    this.vy = vy;
    this.damage = damage;
    this.isPlayer = isPlayer;
    this.radius = size;
    this.color = color;
    this.angle = Math.atan2(vy, vx);
    this.distanceTraveled = 0;
    this.maxDistance = 1200;
  }

  update(dt) {
    const stepX = this.vx * dt;
    const stepY = this.vy * dt;
    this.x += stepX;
    this.y += stepY;
    this.distanceTraveled += Math.hypot(stepX, stepY);
    return this.distanceTraveled < this.maxDistance;
  }

  draw(ctx) {
    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.rotate(this.angle);

    ctx.shadowBlur = 10;
    ctx.shadowColor = this.color;
    ctx.fillStyle = this.color;

    if (this.isPlayer) {
      // Sleek plasma energy bolt
      ctx.beginPath();
      ctx.ellipse(0, 0, this.radius * 2.5, this.radius, 0, 0, Math.PI * 2);
      ctx.fill();

      // Bright inner core
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.ellipse(0, 0, this.radius * 1.5, this.radius * 0.5, 0, 0, Math.PI * 2);
      ctx.fill();
    } else {
      // Enemy projectile: hostile glowing round needle/bullet
      ctx.beginPath();
      ctx.ellipse(0, 0, this.radius * 2, this.radius, 0, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(0, 0, this.radius * 0.5, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.restore();
  }
}

/* ============================================================
   7. PLAYER SPACESHIP
   ============================================================ */
class Player {
  constructor(x, y) {
    this.x = x;
    this.y = y;
    this.radius = 20;
    this.angle = -Math.PI / 2; // Facing up initially

    // Movement physics
    this.vx = 0;
    this.vy = 0;
    this.baseSpeed = 270;
    this.speedMult = 1.0;
    this.friction = 0.88;

    // Health & Defense
    this.maxHp = 100;
    this.hp = 100;
    this.invulnerableTimer = 0;
    this.invulnerableDuration = 1.2;

    // Shield Upgrade
    this.hasShield = false;
    this.shieldActive = false;
    this.shieldCooldown = 15;
    this.shieldTimer = 0;

    // Regeneration
    this.regenRate = 0; // HP per sec

    // Weapon Stats
    this.damageMult = 1.0;
    this.fireRate = 4.2; // shots per second
    this.fireTimer = 0;
    this.projectilesCount = 1; // 1, 2, 3, etc.
    this.projectileSize = 4;
    this.projectileSpeed = 650;
    this.weaponRange = 550;

    // EMP Shockwave Special Ability
    this.empCooldown = 12; // seconds
    this.empTimer = 12; // Start fully charged!
    this.empRadius = 240;

    // XP & Magnet
    this.magnetRadius = 140;

    // Visuals & Effects
    this.damageFlashTimer = 0;
    this.thrusterAnim = 0;
  }

  get currentSpeed() {
    return this.baseSpeed * this.speedMult;
  }

  takeDamage(amount, soundEngine, camera) {
    if (this.invulnerableTimer > 0) return false;

    // Shield absorb
    if (this.hasShield && this.shieldActive) {
      this.shieldActive = false;
      this.shieldTimer = this.shieldCooldown;
      this.invulnerableTimer = 0.8;
      soundEngine.playHit();
      camera.shake(6, 0.2);
      return false;
    }

    this.hp -= amount;
    this.invulnerableTimer = this.invulnerableDuration;
    this.damageFlashTimer = 0.2;
    soundEngine.playPlayerDamage();
    camera.shake(14, 0.35);

    if (this.hp <= 0) {
      this.hp = 0;
      return true; // Destroyed
    }
    return false;
  }

  heal(amount) {
    this.hp = Math.min(this.maxHp, this.hp + amount);
  }

  triggerEmp(soundEngine, camera, particles, projectiles, enemies) {
    if (this.empTimer < this.empCooldown) return false;

    this.empTimer = 0;
    soundEngine.playEmpBlast();
    camera.shake(16, 0.4);

    // Shockwave particle effect
    particles.shockwaves.push(new ShockwaveRing(this.x, this.y, this.empRadius, '#00f0ff', 0.5));

    // Clear enemy projectiles within blast radius
    for (let i = projectiles.length - 1; i >= 0; i--) {
      const p = projectiles[i];
      if (!p.isPlayer && Math.hypot(p.x - this.x, p.y - this.y) <= this.empRadius) {
        // Disintegrate bullet
        for (let k = 0; k < 4; k++) {
          particles.particles.push(new Particle(p.x, p.y, (Math.random() - 0.5) * 80, (Math.random() - 0.5) * 80, '#ff0077', 2, 0.3, 1));
        }
        projectiles.splice(i, 1);
      }
    }

    // Damage & knock back enemies
    const empDmg = 90 * this.damageMult;
    for (let enemy of enemies) {
      const dist = Math.hypot(enemy.x - this.x, enemy.y - this.y);
      if (dist <= this.empRadius) {
        enemy.takeDamage(empDmg, particles);
        // Knockback vector
        const angle = Math.atan2(enemy.y - this.y, enemy.x - this.x);
        enemy.vx += Math.cos(angle) * 350;
        enemy.vy += Math.sin(angle) * 350;
      }
    }

    return true;
  }

  update(dt, inputDir, canvasWidth, canvasHeight, enemies, projectiles, soundEngine, particles) {
    // Regenerate HP
    if (this.regenRate > 0 && this.hp < this.maxHp) {
      this.heal(this.regenRate * dt);
    }

    // Shield Recharge
    if (this.hasShield && !this.shieldActive) {
      this.shieldTimer -= dt;
      if (this.shieldTimer <= 0) {
        this.shieldActive = true;
      }
    }

    // EMP Cooldown
    if (this.empTimer < this.empCooldown) {
      this.empTimer = Math.min(this.empCooldown, this.empTimer + dt);
    }

    // Invulnerability & Damage Flash Timers
    if (this.invulnerableTimer > 0) this.invulnerableTimer -= dt;
    if (this.damageFlashTimer > 0) this.damageFlashTimer -= dt;

    // Movement Physics
    if (inputDir.x !== 0 || inputDir.y !== 0) {
      const len = Math.hypot(inputDir.x, inputDir.y);
      const nx = inputDir.x / len;
      const ny = inputDir.y / len;

      this.vx += nx * this.currentSpeed * 6 * dt;
      this.vy += ny * this.currentSpeed * 6 * dt;

      // Limit top speed
      const curSpeed = Math.hypot(this.vx, this.vy);
      if (curSpeed > this.currentSpeed) {
        this.vx = (this.vx / curSpeed) * this.currentSpeed;
        this.vy = (this.vy / curSpeed) * this.currentSpeed;
      }

      // Turn towards movement direction
      const targetAngle = Math.atan2(inputDir.y, inputDir.x);
      // Smooth angle interpolation
      let diff = targetAngle - this.angle;
      while (diff < -Math.PI) diff += Math.PI * 2;
      while (diff > Math.PI) diff -= Math.PI * 2;
      this.angle += diff * 12 * dt;
    }

    // Apply friction
    this.vx *= Math.pow(this.friction, dt * 60);
    this.vy *= Math.pow(this.friction, dt * 60);

    // Apply position
    this.x += this.vx * dt;
    this.y += this.vy * dt;

    // Clamp to canvas boundaries
    const margin = this.radius + 6;
    if (this.x < margin) { this.x = margin; this.vx = 0; }
    if (this.x > canvasWidth - margin) { this.x = canvasWidth - margin; this.vx = 0; }
    if (this.y < margin) { this.y = margin; this.vy = 0; }
    if (this.y > canvasHeight - margin) { this.y = canvasHeight - margin; this.vy = 0; }

    // Thruster engine particles
    this.thrusterAnim += dt * 25;
    const speedMagnitude = Math.hypot(this.vx, this.vy);
    if (speedMagnitude > 20 || Math.random() < 0.3) {
      const rearAngle = this.angle + Math.PI;
      // Dual engines
      const offsets = [-8, 8];
      for (let off of offsets) {
        const ex = this.x + Math.cos(rearAngle) * 16 + Math.cos(this.angle + Math.PI / 2) * off;
        const ey = this.y + Math.sin(rearAngle) * 16 + Math.sin(this.angle + Math.PI / 2) * off;
        const pSpeed = Math.random() * 80 + 60;
        const spread = (Math.random() - 0.5) * 0.4;
        const pvx = Math.cos(rearAngle + spread) * pSpeed;
        const pvy = Math.sin(rearAngle + spread) * pSpeed;
        const colors = ['#00f0ff', '#3a86ff', '#8338ec'];
        particles.particles.push(new Particle(ex, ey, pvx, pvy, colors[Math.floor(Math.random() * colors.length)], 2.5, 0.25, 1));
      }
    }

    // Weapon Auto-Targeting & Firing
    this.fireTimer += dt;
    const fireInterval = 1 / this.fireRate;
    if (this.fireTimer >= fireInterval) {
      this.fireTimer = 0;
      this.autoFire(enemies, projectiles, soundEngine);
    }
  }

  autoFire(enemies, projectiles, soundEngine) {
    // Find closest enemy within weapon range
    let nearestEnemy = null;
    let minDistance = this.weaponRange;

    for (let enemy of enemies) {
      const dist = Math.hypot(enemy.x - this.x, enemy.y - this.y);
      if (dist < minDistance) {
        minDistance = dist;
        nearestEnemy = enemy;
      }
    }

    // Determine target firing angle
    let fireAngle = this.angle;
    if (nearestEnemy) {
      fireAngle = Math.atan2(nearestEnemy.y - this.y, nearestEnemy.x - this.x);
    }

    const baseDmg = 24 * this.damageMult;
    const count = this.projectilesCount;

    if (count === 1) {
      const vx = Math.cos(fireAngle) * this.projectileSpeed;
      const vy = Math.sin(fireAngle) * this.projectileSpeed;
      projectiles.push(new Projectile(this.x, this.y, vx, vy, baseDmg, true, this.projectileSize));
    } else if (count === 2) {
      // Twin parallel cannons
      const perpAngle = fireAngle + Math.PI / 2;
      const offDist = 8;
      const p1x = this.x + Math.cos(perpAngle) * offDist;
      const p1y = this.y + Math.sin(perpAngle) * offDist;
      const p2x = this.x - Math.cos(perpAngle) * offDist;
      const p2y = this.y - Math.sin(perpAngle) * offDist;
      const vx = Math.cos(fireAngle) * this.projectileSpeed;
      const vy = Math.sin(fireAngle) * this.projectileSpeed;
      projectiles.push(new Projectile(p1x, p1y, vx, vy, baseDmg * 0.9, true, this.projectileSize));
      projectiles.push(new Projectile(p2x, p2y, vx, vy, baseDmg * 0.9, true, this.projectileSize));
    } else {
      // Spread fan (3 or more)
      const spreadStep = 0.12; // radians (~7 deg)
      const startAngle = fireAngle - ((count - 1) * spreadStep) / 2;
      for (let i = 0; i < count; i++) {
        const curAngle = startAngle + i * spreadStep;
        const vx = Math.cos(curAngle) * this.projectileSpeed;
        const vy = Math.sin(curAngle) * this.projectileSpeed;
        projectiles.push(new Projectile(this.x, this.y, vx, vy, baseDmg * 0.85, true, this.projectileSize));
      }
    }

    soundEngine.playLaser(count > 1);
  }

  draw(ctx) {
    ctx.save();
    ctx.translate(this.x, this.y);

    // Invulnerability flashing effect
    if (this.invulnerableTimer > 0) {
      const isVisible = Math.floor(this.invulnerableTimer * 20) % 2 === 0;
      if (!isVisible) {
        ctx.restore();
        return;
      }
      ctx.globalAlpha = 0.7;
    }

    // Shield Bubble Visual
    if (this.hasShield && this.shieldActive) {
      ctx.save();
      ctx.strokeStyle = 'rgba(0, 240, 255, 0.7)';
      ctx.lineWidth = 2.5;
      ctx.shadowBlur = 16;
      ctx.shadowColor = '#00f0ff';
      ctx.beginPath();
      ctx.arc(0, 0, this.radius + 8, 0, Math.PI * 2);
      ctx.stroke();

      ctx.fillStyle = 'rgba(0, 240, 255, 0.08)';
      ctx.beginPath();
      ctx.arc(0, 0, this.radius + 8, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    // Rotate to ship heading
    ctx.rotate(this.angle);

    // Damage flash tint
    if (this.damageFlashTimer > 0) {
      ctx.shadowBlur = 20;
      ctx.shadowColor = '#ff0055';
    } else {
      ctx.shadowBlur = 12;
      ctx.shadowColor = '#00f0ff';
    }

    // --- PROCEDURAL HIGH-TECH SPACESHIP BODY ---
    // Outer Wings
    ctx.fillStyle = '#0f172a';
    ctx.strokeStyle = '#00f0ff';
    ctx.lineWidth = 2;

    ctx.beginPath();
    ctx.moveTo(22, 0);          // Nose tip
    ctx.lineTo(-8, 18);        // Right wingtip
    ctx.lineTo(-14, 14);       // Right rear wing
    ctx.lineTo(-10, 8);        // Engine mount
    ctx.lineTo(-16, 0);        // Center rear
    ctx.lineTo(-10, -8);       // Engine mount
    ctx.lineTo(-14, -14);      // Left rear wing
    ctx.lineTo(-8, -18);       // Left wingtip
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Wing accent panels
    ctx.fillStyle = '#1e293b';
    ctx.beginPath();
    ctx.moveTo(8, 0);
    ctx.lineTo(-6, 12);
    ctx.lineTo(-10, 8);
    ctx.lineTo(2, 0);
    ctx.lineTo(-10, -8);
    ctx.lineTo(-6, -12);
    ctx.closePath();
    ctx.fill();

    // Wing neon stripes
    ctx.strokeStyle = '#ff0077';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(-4, 14);
    ctx.lineTo(-12, 12);
    ctx.moveTo(-4, -14);
    ctx.lineTo(-12, -12);
    ctx.stroke();

    // Cockpit Canopy (Glowing Cyan)
    ctx.fillStyle = '#00f0ff';
    ctx.shadowBlur = 10;
    ctx.shadowColor = '#00f0ff';
    ctx.beginPath();
    ctx.ellipse(3, 0, 7, 3.5, 0, 0, Math.PI * 2);
    ctx.fill();

    // Engine exhaust glow ports
    ctx.fillStyle = '#38bdf8';
    ctx.beginPath();
    ctx.arc(-11, 7, 2, 0, Math.PI * 2);
    ctx.arc(-11, -7, 2, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
  }
}

/* ============================================================
   8. ENEMY HIERARCHY (Scout, Tank, Sniper, Swarm)
   ============================================================ */
class Enemy {
  constructor(x, y, type, playerLevel = 1) {
    this.x = x;
    this.y = y;
    this.type = type;
    this.angle = 0;
    this.vx = 0;
    this.vy = 0;

    // Type-specific properties
    this.setupType(playerLevel);

    this.hitFlashTimer = 0;
  }

  setupType(level) {
    // Health scaling with game progression
    const hpScale = 1 + (level - 1) * 0.12;

    switch (this.type) {
      case 'scout':
        this.radius = 14;
        this.maxHp = Math.round(28 * hpScale);
        this.hp = this.maxHp;
        this.speed = 180 + Math.random() * 25;
        this.scoreValue = 80;
        this.xpValue = 15;
        this.collisionDamage = 18;
        this.color = '#00f0ff';
        break;

      case 'tank':
        this.radius = 28;
        this.maxHp = Math.round(140 * hpScale);
        this.hp = this.maxHp;
        this.speed = 65;
        this.scoreValue = 260;
        this.xpValue = 45;
        this.collisionDamage = 35;
        this.color = '#ffb703';
        break;

      case 'sniper':
        this.radius = 18;
        this.maxHp = Math.round(50 * hpScale);
        this.hp = this.maxHp;
        this.speed = 115;
        this.scoreValue = 180;
        this.xpValue = 30;
        this.collisionDamage = 20;
        this.color = '#ff0055';
        this.shootTimer = 2.0;
        this.shootInterval = 3.2;
        this.aimChargeTimer = 0;
        this.standoffDistance = 320;
        break;

      case 'swarm':
        this.radius = 10;
        this.maxHp = Math.round(14 * hpScale);
        this.hp = this.maxHp;
        this.speed = 210 + Math.random() * 30;
        this.scoreValue = 45;
        this.xpValue = 10;
        this.collisionDamage = 12;
        this.color = '#8338ec';
        this.wiggleOffset = Math.random() * 10;
        break;
    }
  }

  takeDamage(amount, particles) {
    this.hp -= amount;
    this.hitFlashTimer = 0.12;

    // Small impact spark
    particles.floatingTexts.push(new FloatingText(this.x, this.y - 10, Math.round(amount), '#ffffff', 14));

    if (this.hp <= 0) {
      this.hp = 0;
      return true; // Dead
    }
    return false;
  }

  update(dt, player, projectiles, soundEngine) {
    if (this.hitFlashTimer > 0) this.hitFlashTimer -= dt;

    const dx = player.x - this.x;
    const dy = player.y - this.y;
    const dist = Math.hypot(dx, dy) || 1;
    const nx = dx / dist;
    const ny = dy / dist;

    this.angle = Math.atan2(dy, dx);

    switch (this.type) {
      case 'scout': {
        // Direct intercept with agile turning
        this.vx = nx * this.speed;
        this.vy = ny * this.speed;
        this.x += this.vx * dt;
        this.y += this.vy * dt;
        break;
      }

      case 'tank': {
        // Relentless heavy forward inertia
        this.vx += nx * this.speed * 2.5 * dt;
        this.vy += ny * this.speed * 2.5 * dt;
        const curSpd = Math.hypot(this.vx, this.vy);
        if (curSpd > this.speed) {
          this.vx = (this.vx / curSpd) * this.speed;
          this.vy = (this.vy / curSpd) * this.speed;
        }
        this.x += this.vx * dt;
        this.y += this.vy * dt;
        break;
      }

      case 'sniper': {
        // Standoff distance keeper
        if (dist < this.standoffDistance - 40) {
          // Back away
          this.vx = -nx * this.speed;
          this.vy = -ny * this.speed;
        } else if (dist > this.standoffDistance + 40) {
          // Approach
          this.vx = nx * this.speed;
          this.vy = ny * this.speed;
        } else {
          // Orbit slowly
          this.vx = -ny * (this.speed * 0.7);
          this.vy = nx * (this.speed * 0.7);
        }
        this.x += this.vx * dt;
        this.y += this.vy * dt;

        // Firing logic
        this.shootTimer -= dt;
        if (this.shootTimer <= 0.8) {
          this.aimChargeTimer += dt; // Charge laser sight warning
        }

        if (this.shootTimer <= 0) {
          this.shootTimer = this.shootInterval;
          this.aimChargeTimer = 0;
          // Fire sniper round towards player
          const pSpeed = 480;
          const pvx = nx * pSpeed;
          const pvy = ny * pSpeed;
          projectiles.push(new Projectile(this.x, this.y, pvx, pvy, 22, false, 5, '#ff0055'));
          soundEngine.playEnemyLaser();
        }
        break;
      }

      case 'swarm': {
        // Swarm flocking with erratic sine wave weave
        this.wiggleOffset += dt * 8;
        const perpX = -ny;
        const perpY = nx;
        const weave = Math.sin(this.wiggleOffset) * 0.75;
        this.vx = (nx + perpX * weave) * this.speed;
        this.vy = (ny + perpY * weave) * this.speed;
        this.x += this.vx * dt;
        this.y += this.vy * dt;
        break;
      }
    }
  }

  draw(ctx, player) {
    ctx.save();
    ctx.translate(this.x, this.y);

    // Hit flash tint
    if (this.hitFlashTimer > 0) {
      ctx.shadowBlur = 15;
      ctx.shadowColor = '#ffffff';
      ctx.fillStyle = '#ffffff';
    } else {
      ctx.shadowBlur = 8;
      ctx.shadowColor = this.color;
      ctx.fillStyle = this.color;
    }

    ctx.rotate(this.angle);

    // Procedural rendering by type
    switch (this.type) {
      case 'scout': {
        // Sleek dart / arrowhead
        ctx.beginPath();
        ctx.moveTo(this.radius * 1.2, 0);
        ctx.lineTo(-this.radius, this.radius * 0.85);
        ctx.lineTo(-this.radius * 0.5, 0);
        ctx.lineTo(-this.radius, -this.radius * 0.85);
        ctx.closePath();
        ctx.fill();

        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 1.5;
        ctx.stroke();
        break;
      }

      case 'tank': {
        // Heavy armored octagonal cruiser
        ctx.beginPath();
        const r = this.radius;
        const cut = r * 0.45;
        ctx.moveTo(r, 0);
        ctx.lineTo(r - cut, cut);
        ctx.lineTo(r - cut, r - cut);
        ctx.lineTo(0, r);
        ctx.lineTo(-r + cut, r);
        ctx.lineTo(-r, r - cut);
        ctx.lineTo(-r, -r + cut);
        ctx.lineTo(-r + cut, -r);
        ctx.lineTo(0, -r);
        ctx.lineTo(r - cut, -r + cut);
        ctx.closePath();
        ctx.fill();

        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 2.5;
        ctx.stroke();

        // Inner glowing core
        ctx.fillStyle = '#ff3300';
        ctx.beginPath();
        ctx.arc(0, 0, r * 0.35, 0, Math.PI * 2);
        ctx.fill();
        break;
      }

      case 'sniper': {
        // Long sleek needle frigate
        ctx.beginPath();
        ctx.moveTo(this.radius * 1.5, 0);
        ctx.lineTo(-this.radius * 0.8, this.radius * 0.7);
        ctx.lineTo(-this.radius * 0.4, 0);
        ctx.lineTo(-this.radius * 0.8, -this.radius * 0.7);
        ctx.closePath();
        ctx.fill();

        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 1.5;
        ctx.stroke();

        // Extended sniper barrel
        ctx.strokeStyle = '#ff0055';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(this.radius * 0.5, 0);
        ctx.lineTo(this.radius * 1.8, 0);
        ctx.stroke();
        break;
      }

      case 'swarm': {
        // Small sharp stinger
        ctx.beginPath();
        ctx.moveTo(this.radius * 1.3, 0);
        ctx.lineTo(-this.radius, this.radius);
        ctx.lineTo(-this.radius * 0.3, 0);
        ctx.lineTo(-this.radius, -this.radius);
        ctx.closePath();
        ctx.fill();
        break;
      }
    }

    ctx.restore();

    // Sniper Laser Aim Warning Line (in world coordinates)
    if (this.type === 'sniper' && this.shootTimer <= 0.8 && player) {
      ctx.save();
      const aimAlpha = Math.min(1, (0.8 - this.shootTimer) / 0.8);
      ctx.strokeStyle = `rgba(255, 0, 85, ${aimAlpha * 0.75})`;
      ctx.lineWidth = 1.5;
      ctx.setLineDash([6, 6]);
      ctx.beginPath();
      ctx.moveTo(this.x, this.y);
      ctx.lineTo(player.x, player.y);
      ctx.stroke();
      ctx.restore();
    }
  }
}

/* ============================================================
   9. UPGRADES CATALOG & PROGRESSION SYSTEM
   ============================================================ */
class UpgradeCatalog {
  static ALL_UPGRADES = [
    {
      id: 'damage',
      name: 'PLASMA OVERCHARGE',
      desc: 'Infuses weapon capacitors with dense hyper-plasma.',
      effectText: '+25% Weapon Damage',
      icon: '⚡',
      rarity: 'RARE',
      apply: (player) => { player.damageMult += 0.25; }
    },
    {
      id: 'fire_rate',
      name: 'RAPID FIRE MATRIX',
      desc: 'Accelerates cooling cycle for blistering cyclic rate.',
      effectText: '+25% Fire Rate',
      icon: '🔥',
      rarity: 'COMMON',
      apply: (player) => { player.fireRate *= 1.25; }
    },
    {
      id: 'multishot',
      name: 'MULTI-BARREL ARRAY',
      desc: 'Mounts an additional synchronized plasma cannon.',
      effectText: '+1 Projectile per Volley',
      icon: '💥',
      rarity: 'LEGENDARY',
      apply: (player) => { player.projectilesCount += 1; }
    },
    {
      id: 'speed',
      name: 'WARP THRUSTERS',
      desc: 'Overclocks ion engine output for heightened agility.',
      effectText: '+20% Flight Speed',
      icon: '🚀',
      rarity: 'COMMON',
      apply: (player) => { player.speedMult += 0.2; }
    },
    {
      id: 'max_health',
      name: 'REINFORCED NANOMESH',
      desc: 'Synthesizes titanium composite plating on hull.',
      effectText: '+30 Max HP & Instant Repair',
      icon: '🛡️',
      rarity: 'COMMON',
      apply: (player) => {
        player.maxHp += 30;
        player.heal(30);
      }
    },
    {
      id: 'shield',
      name: 'ENERGY AEGIS',
      desc: 'Projects a kinetic barrier absorbing fatal incoming impacts.',
      effectText: 'Kinetic Shield (Regens every 15s)',
      icon: '💠',
      rarity: 'EPIC',
      apply: (player) => {
        player.hasShield = true;
        player.shieldActive = true;
      }
    },
    {
      id: 'magnet',
      name: 'GRAVITON VACUUM',
      desc: 'Expands localized gravitational tractor beam.',
      effectText: '+50% XP Collection Range',
      icon: '🧲',
      rarity: 'COMMON',
      apply: (player) => { player.magnetRadius *= 1.5; }
    },
    {
      id: 'heavy_rounds',
      name: 'HEAVY ORDNANCE',
      desc: 'Densifies projectile mass for enhanced destructive envelope.',
      effectText: '+30% Bullet Size & +15% Velocity',
      icon: '💣',
      rarity: 'RARE',
      apply: (player) => {
        player.projectileSize = Math.round(player.projectileSize * 1.3);
        player.projectileSpeed *= 1.15;
      }
    },
    {
      id: 'sensor_range',
      name: 'SENSOR TARGETING',
      desc: 'Expands targeting radar horizon and lock-on range.',
      effectText: '+35% Targeting Range',
      icon: '📡',
      rarity: 'COMMON',
      apply: (player) => { player.weaponRange *= 1.35; }
    },
    {
      id: 'emp_charge',
      name: 'EMP OVERCLOCK',
      desc: 'Accelerates capacitor recharge cycle for EMP blast.',
      effectText: '-25% EMP Cooldown & +35% Radius',
      icon: '🌀',
      rarity: 'EPIC',
      apply: (player) => {
        player.empCooldown = Math.max(5, player.empCooldown * 0.75);
        player.empRadius *= 1.35;
      }
    },
    {
      id: 'regen',
      name: 'NANO REPAIR BOTS',
      desc: 'Deploys autonomous cellular nanites that repair hull seams.',
      effectText: '+2.5 HP / Second Regeneration',
      icon: '🧪',
      rarity: 'RARE',
      apply: (player) => { player.regenRate += 2.5; }
    }
  ];

  static getRandomUpgrades(count = 3, player) {
    // Filter out shield if player already has shield
    let pool = this.ALL_UPGRADES.filter(u => {
      if (u.id === 'shield' && player.hasShield) return false;
      return true;
    });

    // Shuffle
    const shuffled = [...pool].sort(() => 0.5 - Math.random());
    return shuffled.slice(0, count);
  }
}

/* ============================================================
   10. CAMERA & SCREEN SHAKE
   ============================================================ */
class Camera {
  constructor() {
    this.shakeIntensity = 0;
    this.shakeDuration = 0;
    this.shakeTimer = 0;
    this.offsetX = 0;
    this.offsetY = 0;
  }

  shake(intensity, duration) {
    this.shakeIntensity = Math.max(this.shakeIntensity, intensity);
    this.shakeDuration = duration;
    this.shakeTimer = duration;
  }

  update(dt) {
    if (this.shakeTimer > 0) {
      this.shakeTimer -= dt;
      const progress = this.shakeTimer / this.shakeDuration;
      const curIntensity = this.shakeIntensity * progress;
      this.offsetX = (Math.random() - 0.5) * 2 * curIntensity;
      this.offsetY = (Math.random() - 0.5) * 2 * curIntensity;
    } else {
      this.shakeIntensity = 0;
      this.offsetX = 0;
      this.offsetY = 0;
    }
  }

  apply(ctx) {
    ctx.translate(this.offsetX, this.offsetY);
  }
}

/* ============================================================
   11. MAIN GAME CONTROLLER & STATE MACHINE
   ============================================================ */
class Game {
  static STATES = {
    MENU: 'MENU',
    PLAYING: 'PLAYING',
    PAUSED: 'PAUSED',
    LEVEL_UP: 'LEVEL_UP',
    GAME_OVER: 'GAME_OVER'
  };

  constructor() {
    this.canvas = document.getElementById('gameCanvas');
    this.ctx = this.canvas.getContext('2d');
    this.state = Game.STATES.MENU;

    // Subsystems
    this.sound = new SoundEngine();
    this.camera = new Camera();
    this.starfield = new Starfield(this.canvas);

    // Entities
    this.player = null;
    this.enemies = [];
    this.projectiles = [];
    this.xpGems = [];
    this.particles = {
      particles: [],
      shockwaves: [],
      floatingTexts: []
    };

    // Progression & Wave Director
    this.score = 0;
    this.survivalTime = 0; // seconds
    this.kills = 0;
    this.level = 1;
    this.currentXp = 0;
    this.requiredXp = 100;
    this.spawnTimer = 0;
    this.swarmEventTimer = 25; // Trigger swarm waves periodically
    this.isSwarmIncoming = false;

    // Controls
    this.keys = {};
    this.joystick = {
      active: false,
      startX: 0,
      startY: 0,
      currentX: 0,
      currentY: 0,
      vectorX: 0,
      vectorY: 0
    };

    // Timing
    this.lastTime = 0;
    this.animFrameId = null;

    // Cached DOM elements
    this.dom = {
      // Screens
      screenMainMenu: document.getElementById('screenMainMenu'),
      screenPause: document.getElementById('screenPause'),
      screenLevelUp: document.getElementById('screenLevelUp'),
      screenGameOver: document.getElementById('screenGameOver'),
      modalInstructions: document.getElementById('modalInstructions'),
      hud: document.getElementById('hud'),
      touchControls: document.getElementById('touchControls'),

      // HUD elements
      hudHpFill: document.getElementById('hudHpFill'),
      hudHpText: document.getElementById('hudHpText'),
      hudShieldFill: document.getElementById('hudShieldFill'),
      hudXpFill: document.getElementById('hudXpFill'),
      hudXpText: document.getElementById('hudXpText'),
      hudLevel: document.getElementById('hudLevel'),
      hudTimer: document.getElementById('hudTimer'),
      hudScore: document.getElementById('hudScore'),
      hudKills: document.getElementById('hudKills'),
      empCooldownFill: document.getElementById('empCooldownFill'),
      empStatusText: document.getElementById('empStatusText'),
      waveBanner: document.getElementById('waveBanner'),
      waveText: document.getElementById('waveText'),

      // Menu Stats
      statBestScore: document.getElementById('statBestScore'),
      statBestTime: document.getElementById('statBestTime'),
      statTotalKills: document.getElementById('statTotalKills'),
      statGamesPlayed: document.getElementById('statGamesPlayed'),

      // Game Over Elements
      goFinalScore: document.getElementById('goFinalScore'),
      goSurvivalTime: document.getElementById('goSurvivalTime'),
      goKills: document.getElementById('goKills'),
      goLevel: document.getElementById('goLevel'),
      newBestBanner: document.getElementById('newBestBanner'),

      // Upgrade Grid
      upgradeCardsGrid: document.getElementById('upgradeCardsGrid'),
      levelupNewLevel: document.getElementById('levelupNewLevel'),

      // Audio & Pause toggles
      btnAudioToggle: document.getElementById('btnAudioToggle'),
      pauseSoundStatus: document.getElementById('pauseSoundStatus'),

      // Joystick elements
      joystickZone: document.getElementById('joystickZone'),
      joystickBase: document.getElementById('joystickBase'),
      joystickKnob: document.getElementById('joystickKnob'),
      btnTouchEmp: document.getElementById('btnTouchEmp')
    };

    this.init();
  }

  init() {
    this.handleResize();
    window.addEventListener('resize', () => this.handleResize());

    this.setupEventListeners();
    this.updateStatsDisplay();
    this.updateAudioIcons();

    // Auto-detect touch device
    this.isTouchDevice = ('ontouchstart' in window || navigator.maxTouchPoints > 0 || window.innerWidth <= 860);

    // Start render loop (animates menu background)
    this.lastTime = performance.now();
    this.loop = this.loop.bind(this);
    this.animFrameId = requestAnimationFrame(this.loop);
  }

  handleResize() {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    this.canvas.width = window.innerWidth * dpr;
    this.canvas.height = window.innerHeight * dpr;
    this.ctx.resetTransform?.();
    this.ctx.scale(dpr, dpr);
    this.canvasCssWidth = window.innerWidth;
    this.canvasCssHeight = window.innerHeight;

    this.isTouchDevice = ('ontouchstart' in window || navigator.maxTouchPoints > 0 || window.innerWidth <= 860);
    if (this.state === Game.STATES.PLAYING && this.isTouchDevice) {
      this.dom.touchControls.classList.remove('hidden');
    } else {
      this.dom.touchControls.classList.add('hidden');
    }

    if (this.starfield) {
      this.starfield.resize();
    }
  }

  setupEventListeners() {
    // Keyboard inputs
    window.addEventListener('keydown', (e) => {
      this.sound.ensureResumed();
      this.keys[e.code] = true;

      // Handle pause key
      if ((e.code === 'KeyP' || e.code === 'Escape') && !e.repeat) {
        if (this.state === Game.STATES.PLAYING) {
          this.pauseGame();
        } else if (this.state === Game.STATES.PAUSED) {
          this.resumeGame();
        }
      }

      // Spacebar EMP ability
      if (e.code === 'Space' && this.state === Game.STATES.PLAYING && !e.repeat) {
        e.preventDefault();
        this.triggerPlayerEmp();
      }
    });

    window.addEventListener('keyup', (e) => {
      this.keys[e.code] = false;
    });

    // Auto-pause when tab changes or window loses focus
    document.addEventListener('visibilitychange', () => {
      if (document.hidden && this.state === Game.STATES.PLAYING) {
        this.pauseGame();
      }
    });

    // Button Listeners
    document.getElementById('btnStartGame').addEventListener('click', () => {
      this.sound.playButtonClick();
      this.sound.ensureResumed();
      this.startNewGame();
    });

    document.getElementById('btnOpenInstructions').addEventListener('click', () => {
      this.sound.playButtonClick();
      this.dom.modalInstructions.classList.remove('hidden');
      this.dom.modalInstructions.classList.add('active');
    });

    document.getElementById('btnCloseInstructions').addEventListener('click', () => {
      this.sound.playButtonClick();
      this.dom.modalInstructions.classList.remove('active');
      this.dom.modalInstructions.classList.add('hidden');
    });

    document.getElementById('btnDismissInstructions').addEventListener('click', () => {
      this.sound.playButtonClick();
      this.dom.modalInstructions.classList.remove('active');
      this.dom.modalInstructions.classList.add('hidden');
    });

    document.getElementById('btnPause').addEventListener('click', () => {
      this.sound.playButtonClick();
      if (this.state === Game.STATES.PLAYING) {
        this.pauseGame();
      }
    });

    document.getElementById('btnResumeGame').addEventListener('click', () => {
      this.sound.playButtonClick();
      this.resumeGame();
    });

    document.getElementById('btnRestartGame').addEventListener('click', () => {
      this.sound.playButtonClick();
      this.startNewGame();
    });

    document.getElementById('btnQuitToMenu').addEventListener('click', () => {
      this.sound.playButtonClick();
      this.quitToMenu();
    });

    document.getElementById('btnPlayAgain').addEventListener('click', () => {
      this.sound.playButtonClick();
      this.startNewGame();
    });

    document.getElementById('btnGameOverToMenu').addEventListener('click', () => {
      this.sound.playButtonClick();
      this.quitToMenu();
    });

    // Audio toggle
    const toggleSound = () => {
      const isMuted = this.sound.toggleMute();
      this.updateAudioIcons();
      this.sound.playButtonClick();
    };

    this.dom.btnAudioToggle.addEventListener('click', toggleSound);
    document.getElementById('btnToggleSoundPause').addEventListener('click', toggleSound);

    // Virtual Touch Controls
    this.setupTouchControls();
  }

  setupTouchControls() {
    const zone = this.dom.joystickZone;
    const knob = this.dom.joystickKnob;
    const maxRadius = 45;

    const onTouchStart = (e) => {
      e.preventDefault();
      this.sound.ensureResumed();
      const touch = e.targetTouches[0];
      const rect = zone.getBoundingClientRect();
      this.joystick.active = true;
      this.joystick.startX = rect.left + rect.width / 2;
      this.joystick.startY = rect.top + rect.height / 2;
      updateJoystick(touch.clientX, touch.clientY);
    };

    const onTouchMove = (e) => {
      e.preventDefault();
      if (!this.joystick.active) return;
      const touch = e.targetTouches[0];
      updateJoystick(touch.clientX, touch.clientY);
    };

    const onTouchEnd = (e) => {
      e.preventDefault();
      this.joystick.active = false;
      this.joystick.vectorX = 0;
      this.joystick.vectorY = 0;
      knob.style.transform = `translate(0px, 0px)`;
    };

    const updateJoystick = (clientX, clientY) => {
      const dx = clientX - this.joystick.startX;
      const dy = clientY - this.joystick.startY;
      const dist = Math.hypot(dx, dy);
      const angle = Math.atan2(dy, dx);

      const clampedDist = Math.min(dist, maxRadius);
      const knobX = Math.cos(angle) * clampedDist;
      const knobY = Math.sin(angle) * clampedDist;

      knob.style.transform = `translate(${knobX}px, ${knobY}px)`;

      // Normalized vector
      this.joystick.vectorX = knobX / maxRadius;
      this.joystick.vectorY = knobY / maxRadius;
    };

    zone.addEventListener('touchstart', onTouchStart, { passive: false });
    zone.addEventListener('touchmove', onTouchMove, { passive: false });
    zone.addEventListener('touchend', onTouchEnd, { passive: false });
    zone.addEventListener('touchcancel', onTouchEnd, { passive: false });

    // EMP Action Button
    this.dom.btnTouchEmp.addEventListener('touchstart', (e) => {
      e.preventDefault();
      this.sound.ensureResumed();
      if (this.state === Game.STATES.PLAYING) {
        this.triggerPlayerEmp();
      }
    }, { passive: false });
  }

  updateAudioIcons() {
    const isMuted = this.sound.isMuted;
    this.dom.btnAudioToggle.querySelector('.sound-on-icon').classList.toggle('hidden', isMuted);
    this.dom.btnAudioToggle.querySelector('.sound-off-icon').classList.toggle('hidden', !isMuted);
    this.dom.pauseSoundStatus.textContent = isMuted ? 'SOUND: OFF' : 'SOUND: ON';
  }

  updateStatsDisplay() {
    const stats = StorageManager.getStats();
    this.dom.statBestScore.textContent = stats.bestScore.toLocaleString();
    this.dom.statBestTime.textContent = this.formatTime(stats.bestTime);
    this.dom.statTotalKills.textContent = stats.totalKills.toLocaleString();
    this.dom.statGamesPlayed.textContent = stats.gamesPlayed.toLocaleString();
  }

  formatTime(totalSeconds) {
    const s = Math.floor(totalSeconds);
    const mins = Math.floor(s / 60);
    const secs = s % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }

  startNewGame() {
    // Reset Entities
    this.player = new Player(this.canvasCssWidth / 2, this.canvasCssHeight / 2);
    this.enemies = [];
    this.projectiles = [];
    this.xpGems = [];
    this.particles = {
      particles: [],
      shockwaves: [],
      floatingTexts: []
    };

    // Reset Progression
    this.score = 0;
    this.survivalTime = 0;
    this.kills = 0;
    this.level = 1;
    this.currentXp = 0;
    this.requiredXp = 100;
    this.spawnTimer = 0;
    this.swarmEventTimer = 25;
    this.isSwarmIncoming = false;

    // Switch Screens
    this.setScreen('PLAYING');
    this.updateHud();
  }

  setScreen(newState) {
    this.state = newState;

    // Hide all modals
    this.dom.screenMainMenu.classList.remove('active');
    this.dom.screenMainMenu.classList.add('hidden');
    this.dom.screenPause.classList.remove('active');
    this.dom.screenPause.classList.add('hidden');
    this.dom.screenLevelUp.classList.remove('active');
    this.dom.screenLevelUp.classList.add('hidden');
    this.dom.screenGameOver.classList.remove('active');
    this.dom.screenGameOver.classList.add('hidden');
    this.dom.modalInstructions.classList.remove('active');
    this.dom.modalInstructions.classList.add('hidden');

    if (newState === Game.STATES.MENU) {
      this.dom.screenMainMenu.classList.remove('hidden');
      this.dom.screenMainMenu.classList.add('active');
      this.dom.hud.classList.add('hidden');
      this.dom.touchControls.classList.add('hidden');
      this.updateStatsDisplay();
    } else if (newState === Game.STATES.PLAYING) {
      this.dom.hud.classList.remove('hidden');
      if (this.isTouchDevice) {
        this.dom.touchControls.classList.remove('hidden');
      }
    } else if (newState === Game.STATES.PAUSED) {
      this.dom.screenPause.classList.remove('hidden');
      this.dom.screenPause.classList.add('active');
      this.dom.touchControls.classList.add('hidden');
    } else if (newState === Game.STATES.LEVEL_UP) {
      this.dom.screenLevelUp.classList.remove('hidden');
      this.dom.screenLevelUp.classList.add('active');
      this.dom.touchControls.classList.add('hidden');
    } else if (newState === Game.STATES.GAME_OVER) {
      this.dom.screenGameOver.classList.remove('hidden');
      this.dom.screenGameOver.classList.add('active');
      this.dom.hud.classList.add('hidden');
      this.dom.touchControls.classList.add('hidden');
    }
  }

  pauseGame() {
    if (this.state !== Game.STATES.PLAYING) return;
    this.setScreen(Game.STATES.PAUSED);
  }

  resumeGame() {
    if (this.state !== Game.STATES.PAUSED) return;
    this.setScreen(Game.STATES.PLAYING);
    this.lastTime = performance.now();
  }

  quitToMenu() {
    this.setScreen(Game.STATES.MENU);
  }

  triggerPlayerEmp() {
    if (!this.player) return;
    this.player.triggerEmp(
      this.sound,
      this.camera,
      this.particles,
      this.projectiles,
      this.enemies
    );
  }

  onEnemyDefeated(enemy) {
    this.kills++;
    this.score += enemy.scoreValue;

    // Sound effect
    this.sound.playExplosion(enemy.type === 'tank');

    // Screen shake
    this.camera.shake(enemy.type === 'tank' ? 10 : 5, 0.25);

    // Shockwave on death
    this.particles.shockwaves.push(
      new ShockwaveRing(enemy.x, enemy.y, enemy.radius * 2.2, enemy.color, 0.35)
    );

    // Debris & smoke particles
    const particleCount = enemy.type === 'tank' ? 24 : 14;
    for (let i = 0; i < particleCount; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = Math.random() * 140 + 40;
      const vx = Math.cos(angle) * speed;
      const vy = Math.sin(angle) * speed;
      const colors = [enemy.color, '#ff0055', '#ffb703', '#ffffff'];
      const pColor = colors[Math.floor(Math.random() * colors.length)];
      this.particles.particles.push(
        new Particle(enemy.x, enemy.y, vx, vy, pColor, Math.random() * 3 + 1.5, 0.45, 1, Math.random() < 0.3)
      );
    }

    // Drop XP Gem
    this.xpGems.push(new XpGem(enemy.x, enemy.y, enemy.xpValue));
  }

  gainXp(amount) {
    this.currentXp += amount;
    this.sound.playXpPickup();

    if (this.currentXp >= this.requiredXp) {
      this.levelUp();
    }
  }

  levelUp() {
    this.currentXp -= this.requiredXp;
    this.level++;
    this.requiredXp = Math.round(100 * Math.pow(this.level, 1.25));

    this.sound.playLevelUp();
    this.showLevelUpModal();
  }

  showLevelUpModal() {
    this.setScreen(Game.STATES.LEVEL_UP);
    this.dom.levelupNewLevel.textContent = this.level;

    // Get 3 random cards
    const cards = UpgradeCatalog.getRandomUpgrades(3, this.player);
    this.dom.upgradeCardsGrid.innerHTML = '';

    cards.forEach(card => {
      const el = document.createElement('div');
      el.className = 'upgrade-card';
      el.innerHTML = `
        <span class="upgrade-rarity">${card.rarity}</span>
        <div class="upgrade-icon-wrap">${card.icon}</div>
        <h3 class="upgrade-name">${card.name}</h3>
        <p class="upgrade-desc">${card.desc}</p>
        <span class="upgrade-stat-badge">${card.effectText}</span>
      `;
      el.addEventListener('click', () => {
        this.sound.playButtonClick();
        card.apply(this.player);
        this.resumeFromLevelUp();
      });
      this.dom.upgradeCardsGrid.appendChild(el);
    });
  }

  resumeFromLevelUp() {
    this.setScreen(Game.STATES.PLAYING);
    this.lastTime = performance.now();
    if (this.currentXp >= this.requiredXp) {
      this.levelUp();
    }
  }

  gameOver() {
    this.sound.playGameOver();
    this.camera.shake(20, 0.6);

    // Massive final explosion
    for (let i = 0; i < 40; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = Math.random() * 220 + 50;
      this.particles.particles.push(
        new Particle(this.player.x, this.player.y, Math.cos(angle) * speed, Math.sin(angle) * speed, '#00f0ff', 3.5, 0.7, 1)
      );
    }
    this.particles.shockwaves.push(new ShockwaveRing(this.player.x, this.player.y, 160, '#00f0ff', 0.6));

    // Save statistics & check for new record
    const isNewBest = StorageManager.recordGame(this.score, this.survivalTime, this.kills);

    // Update Game Over UI
    this.dom.goFinalScore.textContent = this.score.toLocaleString();
    this.dom.goSurvivalTime.textContent = this.formatTime(this.survivalTime);
    this.dom.goKills.textContent = this.kills.toLocaleString();
    this.dom.goLevel.textContent = this.level;
    this.dom.newBestBanner.classList.toggle('hidden', !isNewBest);

    // Switch screen
    this.setScreen(Game.STATES.GAME_OVER);
  }

  /* ============================================================
     ENEMY SPAWN DIRECTOR
     ============================================================ */
  updateEnemySpawning(dt) {
    this.spawnTimer += dt;
    this.swarmEventTimer -= dt;

    // Base spawn interval shrinks as survival time progresses
    // Starts at 2.2s, drops down to 0.55s at 5 minutes
    const baseInterval = Math.max(0.55, 2.2 - (this.survivalTime / 180));

    // Check for Swarm Wave Alert
    if (this.swarmEventTimer <= 3 && !this.isSwarmIncoming) {
      this.isSwarmIncoming = true;
      this.dom.waveBanner.classList.remove('hidden');
      this.dom.waveText.textContent = 'WARNING: HOSTILE SWARM INCOMING';
    }

    if (this.swarmEventTimer <= 0) {
      this.spawnSwarmPack();
      this.swarmEventTimer = 28 + Math.random() * 10;
      this.isSwarmIncoming = false;
      setTimeout(() => {
        this.dom.waveBanner.classList.add('hidden');
      }, 3000);
    }

    if (this.spawnTimer >= baseInterval) {
      this.spawnTimer = 0;
      this.spawnRandomEnemy();
    }
  }

  getSpawnPositionOutside() {
    const margin = 50;
    const side = Math.floor(Math.random() * 4); // 0: Top, 1: Right, 2: Bottom, 3: Left
    let x, y;

    switch (side) {
      case 0: // Top
        x = Math.random() * this.canvasCssWidth;
        y = -margin;
        break;
      case 1: // Right
        x = this.canvasCssWidth + margin;
        y = Math.random() * this.canvasCssHeight;
        break;
      case 2: // Bottom
        x = Math.random() * this.canvasCssWidth;
        y = this.canvasCssHeight + margin;
        break;
      case 3: // Left
        x = -margin;
        y = Math.random() * this.canvasCssHeight;
        break;
    }
    return { x, y };
  }

  spawnRandomEnemy() {
    const pos = this.getSpawnPositionOutside();

    // Select enemy type based on survival time weighting
    const t = this.survivalTime;
    let type = 'scout';
    const rand = Math.random();

    if (t < 25) {
      // Early game: mostly scouts and a few swarms
      type = rand < 0.75 ? 'scout' : 'swarm';
    } else if (t < 60) {
      // Mid game: scouts, tanks, snipers
      if (rand < 0.45) type = 'scout';
      else if (rand < 0.75) type = 'sniper';
      else type = 'tank';
    } else {
      // Late game: intense mix of everything
      if (rand < 0.3) type = 'scout';
      else if (rand < 0.55) type = 'tank';
      else if (rand < 0.8) type = 'sniper';
      else type = 'swarm';
    }

    this.enemies.push(new Enemy(pos.x, pos.y, type, this.level));
  }

  spawnSwarmPack() {
    const pos = this.getSpawnPositionOutside();
    const count = 5 + Math.floor(Math.random() * 4);
    for (let i = 0; i < count; i++) {
      const offsetX = (Math.random() - 0.5) * 60;
      const offsetY = (Math.random() - 0.5) * 60;
      this.enemies.push(new Enemy(pos.x + offsetX, pos.y + offsetY, 'swarm', this.level));
    }
  }

  /* ============================================================
     COLLISION DETECTION & RESOLUTION
     ============================================================ */
  handleCollisions() {
    if (!this.player) return;

    // 1. Player Projectiles vs Enemies
    for (let pIdx = this.projectiles.length - 1; pIdx >= 0; pIdx--) {
      const p = this.projectiles[pIdx];
      if (!p.isPlayer) continue;

      for (let eIdx = this.enemies.length - 1; eIdx >= 0; eIdx--) {
        const enemy = this.enemies[eIdx];
        const dist = Math.hypot(p.x - enemy.x, p.y - enemy.y);

        if (dist < p.radius + enemy.radius) {
          // Impact sparks
          for (let k = 0; k < 5; k++) {
            this.particles.particles.push(
              new Particle(p.x, p.y, (Math.random() - 0.5) * 90, (Math.random() - 0.5) * 90, '#00f0ff', 2, 0.25, 1)
            );
          }

          // Damage enemy
          const isDead = enemy.takeDamage(p.damage, this.particles);
          this.sound.playHit();

          // Remove projectile
          this.projectiles.splice(pIdx, 1);

          if (isDead) {
            this.enemies.splice(eIdx, 1);
            this.onEnemyDefeated(enemy);
          }
          break; // Projectile consumed
        }
      }
    }

    // 2. Enemy Projectiles vs Player
    for (let pIdx = this.projectiles.length - 1; pIdx >= 0; pIdx--) {
      const p = this.projectiles[pIdx];
      if (p.isPlayer) continue;

      const dist = Math.hypot(p.x - this.player.x, p.y - this.player.y);
      if (dist < p.radius + this.player.radius) {
        // Destroyed projectile
        this.projectiles.splice(pIdx, 1);

        const isDead = this.player.takeDamage(p.damage, this.sound, this.camera);
        if (isDead) {
          this.gameOver();
          return;
        }
      }
    }

    // 3. Enemies vs Player (Collision Ramming)
    for (let eIdx = this.enemies.length - 1; eIdx >= 0; eIdx--) {
      const enemy = this.enemies[eIdx];
      const dist = Math.hypot(enemy.x - this.player.x, enemy.y - this.player.y);

      if (dist < enemy.radius + this.player.radius) {
        const isDead = this.player.takeDamage(enemy.collisionDamage, this.sound, this.camera);

        // Knockback enemy away from player
        const angle = Math.atan2(enemy.y - this.player.y, enemy.x - this.player.x);
        enemy.x += Math.cos(angle) * 30;
        enemy.y += Math.sin(angle) * 30;

        if (isDead) {
          this.gameOver();
          return;
        }
      }
    }

    // 4. Enemy vs Enemy soft separation to prevent clustering
    for (let i = 0; i < this.enemies.length; i++) {
      for (let j = i + 1; j < this.enemies.length; j++) {
        const e1 = this.enemies[i];
        const e2 = this.enemies[j];
        const dx = e2.x - e1.x;
        const dy = e2.y - e1.y;
        const dist = Math.hypot(dx, dy);
        const minDist = e1.radius + e2.radius;

        if (dist < minDist && dist > 0) {
          const overlap = (minDist - dist) * 0.5;
          const nx = dx / dist;
          const ny = dy / dist;
          e1.x -= nx * overlap;
          e1.y -= ny * overlap;
          e2.x += nx * overlap;
          e2.y += ny * overlap;
        }
      }
    }
  }

  /* ============================================================
     UPDATE & RENDER PIPELINE
     ============================================================ */
  update(dt) {
    // Background stars update continuously (even on main menu)
    const pvx = this.player ? this.player.vx : 0;
    const pvy = this.player ? this.player.vy : 0;
    this.starfield.update(dt, pvx, pvy);
    this.camera.update(dt);

    if (this.state !== Game.STATES.PLAYING) return;

    // Survival time accumulation
    this.survivalTime += dt;

    // Read Input direction (Keyboard or Touch Joystick)
    let inputDir = { x: 0, y: 0 };
    if (this.keys['KeyW'] || this.keys['ArrowUp']) inputDir.y -= 1;
    if (this.keys['KeyS'] || this.keys['ArrowDown']) inputDir.y += 1;
    if (this.keys['KeyA'] || this.keys['ArrowLeft']) inputDir.x -= 1;
    if (this.keys['KeyD'] || this.keys['ArrowRight']) inputDir.x += 1;

    // Override with touch joystick if active
    if (this.joystick.active) {
      inputDir.x = this.joystick.vectorX;
      inputDir.y = this.joystick.vectorY;
    }

    // Update Player
    this.player.update(
      dt,
      inputDir,
      this.canvasCssWidth,
      this.canvasCssHeight,
      this.enemies,
      this.projectiles,
      this.sound,
      this.particles
    );

    // Update Enemies
    for (let enemy of this.enemies) {
      enemy.update(dt, this.player, this.projectiles, this.sound);
    }

    // Update Projectiles
    for (let i = this.projectiles.length - 1; i >= 0; i--) {
      const alive = this.projectiles[i].update(dt);
      if (!alive) this.projectiles.splice(i, 1);
    }

    // Update XP Gems
    for (let i = this.xpGems.length - 1; i >= 0; i--) {
      const collected = this.xpGems[i].update(dt, this.player);
      if (collected) {
        this.gainXp(this.xpGems[i].value);
        this.xpGems.splice(i, 1);
      }
    }

    // Update Particles
    for (let i = this.particles.particles.length - 1; i >= 0; i--) {
      if (!this.particles.particles[i].update(dt)) {
        this.particles.particles.splice(i, 1);
      }
    }
    for (let i = this.particles.shockwaves.length - 1; i >= 0; i--) {
      if (!this.particles.shockwaves[i].update(dt)) {
        this.particles.shockwaves.splice(i, 1);
      }
    }
    for (let i = this.particles.floatingTexts.length - 1; i >= 0; i--) {
      if (!this.particles.floatingTexts[i].update(dt)) {
        this.particles.floatingTexts.splice(i, 1);
      }
    }

    // Enemy Spawning Director
    this.updateEnemySpawning(dt);

    // Collisions
    this.handleCollisions();

    // Update HUD stats
    this.updateHud();
  }

  updateHud() {
    if (!this.player) return;

    // HP Bar
    const hpPct = Math.max(0, Math.min(100, (this.player.hp / this.player.maxHp) * 100));
    this.dom.hudHpFill.style.width = `${hpPct}%`;
    this.dom.hudHpText.textContent = `${Math.ceil(this.player.hp)} / ${this.player.maxHp}`;

    // Shield status
    if (this.player.hasShield) {
      this.dom.hudShieldFill.classList.remove('hidden');
      this.dom.hudShieldFill.textContent = this.player.shieldActive ? 'SHIELD ACTIVE' : 'SHIELD RECHARGING';
      this.dom.hudShieldFill.style.opacity = this.player.shieldActive ? '1' : '0.4';
    } else {
      this.dom.hudShieldFill.classList.add('hidden');
    }

    // XP Bar
    const xpPct = Math.min(100, (this.currentXp / this.requiredXp) * 100);
    this.dom.hudXpFill.style.width = `${xpPct}%`;
    this.dom.hudXpText.textContent = `${this.currentXp} / ${this.requiredXp}`;
    this.dom.hudLevel.textContent = this.level;

    // Timer & Score & Kills
    this.dom.hudTimer.textContent = this.formatTime(this.survivalTime);
    this.dom.hudScore.textContent = this.score.toLocaleString();
    this.dom.hudKills.textContent = this.kills.toLocaleString();

    // EMP Ability Cooldown
    const empPct = Math.min(100, (this.player.empTimer / this.player.empCooldown) * 100);
    this.dom.empCooldownFill.style.width = `${empPct}%`;
    const isReady = this.player.empTimer >= this.player.empCooldown;
    this.dom.empStatusText.textContent = isReady ? 'READY' : `${Math.ceil(this.player.empCooldown - this.player.empTimer)}s`;
    this.dom.empStatusText.style.color = isReady ? '#00f0ff' : '#ff0077';
  }

  render() {
    const ctx = this.ctx;
    ctx.save();

    // Clear background
    ctx.clearRect(0, 0, this.canvasCssWidth, this.canvasCssHeight);

    // Apply Camera Screen Shake
    this.camera.apply(ctx);

    // Draw Starfield Background
    this.starfield.draw(ctx, performance.now() * 0.001);

    // In-game entities
    if (this.state === Game.STATES.PLAYING || this.state === Game.STATES.PAUSED || this.state === Game.STATES.LEVEL_UP) {
      // 1. XP Gems
      for (let gem of this.xpGems) {
        gem.draw(ctx);
      }

      // 2. Shockwaves
      for (let sw of this.particles.shockwaves) {
        sw.draw(ctx);
      }

      // 3. Projectiles
      for (let p of this.projectiles) {
        p.draw(ctx);
      }

      // 4. Enemies
      for (let enemy of this.enemies) {
        enemy.draw(ctx, this.player);
      }

      // 5. Player
      if (this.player && this.player.hp > 0) {
        this.player.draw(ctx);
      }

      // 6. Particle sparks & smoke
      for (let part of this.particles.particles) {
        part.draw(ctx);
      }

      // 7. Floating Combat Text
      for (let ft of this.particles.floatingTexts) {
        ft.draw(ctx);
      }
    }

    ctx.restore();
  }

  loop(currentTime) {
    // Clamped Delta Time (prevents physics explosions after background pause)
    const dt = Math.min((currentTime - this.lastTime) * 0.001, 0.1);
    this.lastTime = currentTime;

    this.update(dt);
    this.render();

    this.animFrameId = requestAnimationFrame(this.loop);
  }
}

// Instantiate game engine on DOM content ready
window.addEventListener('DOMContentLoaded', () => {
  window.gameInstance = new Game();
});
