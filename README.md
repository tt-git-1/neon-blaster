# 🚀 Neon Blaster

<div align="center">

![Next.js](https://img.shields.io/badge/Next.js-16-black?logo=next.js)
![TypeScript](https://img.shields.io/badge/TypeScript-5-blue?logo=typescript)
![Tailwind CSS](https://img.shields.io/badge/Tailwind-3.4-38bdf8?logo=tailwind-css)

**An arcade-style space shooter game built with modern web technologies**

</div>

<div align="center">
  <p>A fast-paced, neon-soaked space shooter where you battle waves of alien enemies, collect power-ups, and survive as long as possible.</p>
</div>

---

## 🎮 Features

- ⚡ **Instant Response Controls** - Zero-latency shooting with hold-to-fire mechanics
- 👾 **4 Enemy Types** - Basic, Fast, Tank, and Chaser enemies with unique behaviors
- 💎 **Power-Up System** - Weapon upgrades, health packs, and speed boosts
- ✨ **Particle Effects** - Beautiful explosions and visual feedback
- 🌟 **Dynamic Background** - Animated starfield with drifting nebulae
- 📊 **Score Tracking** - Real-time scoring with confetti celebrations at milestones
- 🔫 **Weapon Progression** - Unlock multi-shot capabilities as you level up

---

## 🛠️ Tech Stack

| Technology | Purpose |
|------------|---------|
| [Next.js 16](https://nextjs.org/) | React framework with App Router |
| [TypeScript](https://www.typescriptlang.org/) | Type-safe development |
| [Tailwind CSS](https://tailwindcss.com/) | Utility-first styling |
| [Canvas API](https://developer.mozilla.org/en-US/docs/Web/API/Canvas_API) | High-performance rendering |
| [canvas-confetti](https://github.com/catdad/canvas-confetti) | Celebration effects |

---

## 🚀 Getting Started

### Prerequisites

- Node.js 18+ 
- npm or yarn

### Installation

```bash
# Clone the repository
git clone https://github.com/tt-git-1/neon-blaster.git

# Navigate to project directory
cd neon-blaster

# Install dependencies
npm install

# Start development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## 🎯 How to Play

| Key | Action |
|-----|--------|
| `W` / ↑ | Move Up |
| `S` / ↓ | Move Down |
| `A` / ← | Move Left |
| `D` / → | Move Right |
| `SPACE` (tap) | Shoot |
| `SPACE` (hold) | Rapid Fire |

### Objective
Destroy enemies, collect power-ups, and survive as long as possible. Your score increases with each enemy defeated!

---

## 🎮 Game Mechanics

### Enemies

| Type | HP | Speed | Behavior | Score |
|------|-----|-------|----------|-------|
| 🔴 Basic | 30 | Medium | Straight descent | 100 |
| 🟡 Fast | 15 | High | Quick vertical attack | 150 |
| 🟣 Tank | 80 | Low | Sine wave movement, shoots frequently | 250 |
| 🟢 Chaser | 40 | Medium-High | Tracks player position | 200 |

### Power-Ups

- ⚔️ **Weapon Upgrade** - Increases shot count (max level: 5)
- ❤️ **Health Pack** - Restores 30 HP
- ⚡ **Speed Boost** - Visual celebration effect

### Difficulty Progression

| Score Range | Available Enemies |
|-------------|-------------------|
| 0 - 300 | Basic |
| 300 - 800 | Basic + Fast |
| 800 - 1500 | Basic + Fast + Tank |
| 1500+ | All types (including Chaser) |

Enemy spawn rate also increases as your score grows, creating an escalating challenge curve.

---

## 📁 Project Structure

```
neon-blaster/
├── src/
│   ├── app/
│   │   ├── globals.css      # Global styles
│   │   ├── layout.tsx       # Root layout
│   │   └── page.tsx         # Main entry point
│   └── components/
│       └── Game.tsx         # Core game logic & rendering
├── package.json
└── tailwind.config.ts
```

---

## 🎨 Design Philosophy

- **Neon Aesthetic** - Vibrant colors against deep space backgrounds
- **Smooth Performance** - 60 FPS canvas rendering with optimized particle systems
- **Responsive Controls** - Immediate input response for competitive gameplay
- **Visual Feedback** - Every action produces satisfying visual effects

---

## 🏗️ Development

### Build for Production

```bash
npm run build
npm start
```

### Run Linter

```bash
npm run lint
```

---

## 🔮 Future Roadmap

- [ ] Boss battles with unique patterns
- [ ] Sound effects and background music
- [ ] High score persistence (localStorage)
- [ ] Mobile touch controls
- [ ] Additional weapon types (spread, laser, homing)
- [ ] Leaderboard system

---

## 📄 License

This project is open source and available under the MIT License.

---

<div align="center">

**Built with ❤️ using Next.js & TypeScript**

⭐ Star this repo if you enjoy the game!

</div>
