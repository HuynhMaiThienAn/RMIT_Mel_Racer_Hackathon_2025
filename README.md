# CyberSafe: Educational Cybersecurity Board Game

## Overview

CyberSafe is an interactive web-based board game designed to educate university students about cybersecurity threats and best practices across three real-world contexts: Student, Office, and Home environments. Players navigate a 10x10 game board, encounter cybersecurity scenarios, and earn points by making correct security decisions.

**Key Features:**
- 50 + unique cybersecurity scenarios across 3 difficulty levels
- Dynamic board with action tiles, movement modifiers, and powerups
- Progressive scoring system with streak bonuses
- Learn Mode for non-gamified scenario review
- Responsive web design

---

## Instructions to Run the Game

### Prerequisites
- Web browser (Chrome, Firefox, Safari, or Edge)
- No installation required

### Starting the Game

1. **Navigate to the game folder:**
   ```
   Open game_app/index.html in your web browser using live server extensions by Ritwick Dey
   ```

2. **From the Home Page:**
   - Click "Play Game" to start a new game session
   - Click "Learn Mode" to review scenarios without gameplay mechanics
   - Click "About Us" for team information

3. **Playing the Game:**
   - Click the Dice button to roll (results 1-6)
   - Your token advances automatically across the board
   - When landing on an action tile (magnifying glass icon), a scenario card appears
   - Select one of the multiple-choice options
   - Correct answers award points; incorrect answers cost a life
   - Special tiles provide bonuses (forward movement, backward movement, powerups)
   - Win by reaching square 99; lose if lives reach 0

4. **Learn Mode:**
   - Select category filter (Student, Office, Home)
   - Choose difficulty level (1-3 stars)
   - Browse scenarios with correct answers and explanations
   - No scoring or time limits

---

## Project Summary

### Game Mechanics

**Board Layout:** 100 squares organized in 10 rows
- 40 action tiles (scenarios)
- 10 forward tiles (+2 to +4 movement)
- 10 backward tiles (-2 to -3 movement)
- 10 powerup tiles (extra life or shield)
- 30 empty tiles (no interaction)

**Scoring System:**
- Correct answer: (difficulty × 2) base points
- Streak bonus: +25% per consecutive correct (max 50%)
- Movement bonus: +1 per tile traveled
- Win bonus: +10 points
- Incorrect answer or backward tile: -1 life

**Player Resources:**
- Starting lives: 3
- Shield powerup: Absorbs one life loss
- Extra life powerup: Adds one life

### Scenario Content

**Three Context Categories:**

| Category | Count | Focus Areas |
|----------|-------|------------|
| Student | 20 scenarios | Campus security, personal data protection, social engineering |
| Office | 20 scenarios | Workplace data handling, email security, access control |
| Home | 20 scenarios | Personal device security, network safety, online banking |

Each scenario includes:
- Title and description
- Difficulty rating (1-3 stars)
- 3 multiple-choice options
- Correct answer with educational feedback

### Technical Architecture

**Frontend Stack:**
- HTML5 for structure
- CSS3 with animations for visual effects
- Vanilla JavaScript for game logic and state management

**File Structure:**
```
game_app/
├── index.html          (Home page)
├── game.html           (Gameplay interface)
├── learn.html          (Learning mode)
├── about.html          (Team information)
├── js/
│   └── game.js         (Core game engine)
├── css/
│   ├── style.css       (Main styling)
│   └── animations.css  (Game animations)
├── data/
│   ├── student.json    (20 student scenarios)
│   ├── office.json     (20 office scenarios)
│   └── home.json       (20 home scenarios)
└── audio/              (Sound effects and music)
```

### Learning Objectives

Players will understand:
- Common cybersecurity threats in academic, professional, and personal settings
- Best practices for password management, phishing detection, and data privacy
- Risk assessment and decision-making in security contexts
- Consequences of poor cybersecurity choices

---

## Development

### Asset Generation
The project uses AI-assisted content creation with structured prompts:
- `concept_prompts.txt` - Game design and learning objectives
- `code_generation_prompts.txt` - Engine and UI implementation
- `asset_genereation_prompts.txt` - Visual and audio specifications
- `refinement_prompts.txt` - Quality assurance guidelines

---

## Team Information

**Project:** CyberSafe Educational Game  
**Organization:** RMIT University  
**Team:** Race
S3998345 – An Huynh Mai Thien 

S4059598 – Cong Nguyen Phan 

S4024618 – Do Bao Minh Khuong 

For more information, visit the About page within the game.

---