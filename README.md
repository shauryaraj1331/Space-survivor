# 🚀 SPACE SURVIVOR

A fast-paced, high-octane 2D arcade spaceship survival action game crafted with **HTML5 Canvas**, **CSS3**, and **Vanilla JavaScript**. Surviving deep space requires swift reflexes, tactical upgrades, and mastery of your ship's arsenal against escalating alien warfleets.

---

## 🌟 Key Features

### 🕹️ Responsive Controls & Smooth Physics
- **Desktop**: Full 360° omnidirectional propulsion via `WASD` or `Arrow Keys`.
- **Special Ability**: `SPACEBAR` activates the **EMP Shockwave**, destroying incoming hostile ordnance, knocking back hostiles, and delivering critical damage.
- **Mobile Touch Controls**: Responsive virtual joystick on the left thumb and dedicated EMP burst trigger on the right thumb.
- **Pause & Resume**: `ESC` or `P` toggles tactical standby at any moment; automatically pauses safely when switching browser tabs.

### 👾 4 Distinct Hostile Enemy Classes
1. **Scout Interceptor** (Cyan `▲`): Rapid, agile, closes distance directly to ram and swarm your vessel.
2. **Armored Dreadnought** (Amber `⬡`): Heavy, slow-moving behemoth with fortified hull and destructive collision mass.
3. **Sniper Frigate** (Crimson `◈`): Maintains tactical standoff distance, paints your ship with a red laser sight line, and fires high-velocity railgun bolts.
4. **Swarm Stingers** (Purple `❖`): Aggressive wolfpacks of light ships that weave in erratic, synchronized flocking trajectories.

### ⚡ Deep Progression & Upgrade Matrix
- Enemies drop glowing **XP Energy Cores** with magnetic gravitational pull toward your vessel.
- Level-ups pause combat and present **3 tactical system upgrades**:
  - **Plasma Overcharge**: +25% weapon damage.
  - **Rapid Fire Matrix**: +25% cyclic fire rate.
  - **Multi-Barrel Array**: +1 extra projectile per volley (parallel cannons & spread volleys).
  - **Warp Thrusters**: +20% flight velocity.
  - **Reinforced Nanomesh**: +30 Max HP with instant repair.
  - **Energy Aegis (Kinetic Shield)**: Generates a rechargeable kinetic barrier that absorbs fatal impacts.
  - **Graviton Vacuum**: +50% XP attraction radius.
  - **Heavy Ordnance**: +30% projectile caliber & +15% velocity.
  - **Sensor Targeting**: +35% radar lock-on range.
  - **EMP Overclock**: -25% cooldown & +35% blast radius.
  - **Nano Repair Bots**: Passive hull regeneration.

### 🎨 Visual Polish & Audio Synthesis
- **Procedural Canvas Rendering**: Smooth vector ships, glowing plasma bolts, dual engine thruster particle trails, and multi-layered parallax starfield with cosmic dust nebulas.
- **Procedural Web Audio API**: 100% original, copyright-free sound synthesis (laser fire, enemy explosions, shield impact, level-up chimes, EMP shockwaves, button clicks) with volume/mute toggle.
- **Persistent Local Records**: Tracks and saves your Personal Best Score, Longest Survival Time, Total Ships Vaporized, and Sorties Launched in `localStorage`.

---

## 📁 Project Structure

```
SPACE SURVIVOR/
├── index.html        # Semantic HTML5 layout, HUD overlays, and responsive modals
├── style.css         # Modern futuristic sci-fi glassmorphism design system
├── game.js           # Modular game engine, audio synthesizer, and state machine
└── README.md         # Documentation, launch instructions, and deployment guide
```

---

## 🚀 How to Run Locally

You can run **SPACE SURVIVOR** immediately using any standard web browser or local HTTP development server.

### Option 1: Direct File Launch
Simply double-click `index.html` or drag it into any modern web browser (Chrome, Edge, Firefox, Safari, Brave).

### Option 2: Python Local Server (Recommended for Web Audio)
If your terminal supports Python, launch a lightweight HTTP server:

```bash
# Python 3
python -m http.server 8080
```
Then visit: `http://localhost:8080`

### Option 3: Node.js `npx serve` or `http-server`
```bash
npx serve .
# or
npx http-server -p 8080
```

### Option 4: VS Code / IDE Live Server
Right-click `index.html` in your editor and choose **"Open with Live Server"**.

---

## 🌐 How to Deploy as a Static Website

Because **SPACE SURVIVOR** is built purely on vanilla web standards without backend build steps or external dependencies, it can be deployed to any static host for free in seconds.

### Deploying to GitHub Pages
1. Push this folder to a GitHub repository.
2. In your GitHub repository, navigate to **Settings** > **Pages**.
3. Under **Build and deployment**, select **Source** as `Deploy from a branch`.
4. Choose `main` (or `master`) branch and `/ (root)` folder, then click **Save**.
5. Your game will be live at `https://<your-username>.github.io/<repo-name>/`.

### Deploying to Vercel
1. Install Vercel CLI: `npm i -g vercel`
2. Run `vercel` in the project directory, or link your GitHub repo directly in the [Vercel Dashboard](https://vercel.com).
3. No build command or output directory configuration is needed.

### Deploying to Netlify
1. Drag and drop the game directory into the [Netlify Drop](https://app.netlify.com/drop) zone, or connect your Git repository.
2. Publish directory: `./` (root).

### Deploying to Cloudflare Pages
1. Connect your Git repository in the Cloudflare Dashboard under **Workers & Pages**.
2. Set Build command to empty and Output directory to `/`.

---

## 🛠️ Technical Implementation Highlights
- **Frame-Rate Independent Physics**: Uses clamped delta-time (`Math.min(dt, 0.1)`) with `requestAnimationFrame` to ensure consistent 60 FPS across high-refresh displays without warp glitches.
- **DPI-Aware Canvas Scaling**: Automatically detects `window.devicePixelRatio` for retina clarity on mobile devices and 4K monitors.
- **Memory & Object Management**: Inactive particles, off-screen projectiles, and defeated enemies are systematically cleaned up to prevent memory leaks.
- **AudioContext Lifecycle**: Seamlessly handles browser autoplay security policies by resuming audio state on first user interaction.
