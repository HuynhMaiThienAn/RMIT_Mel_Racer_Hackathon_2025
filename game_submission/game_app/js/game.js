// Core game variables
let deck = [];              
let board = [];             
let boardSize = 100;        
let actionIndices = new Set();
let position = 0;
let score = 0;
let lives = 3;
let awaitingAction = false;
let currentCard = null;
let animating = false;
let activeEffects = [];

// Add streak tracking for engagement
let correctStreak = 0;
let wrongStreak = 0;

// Audio effects (optional - won't break if files missing)
const sounds = {
    diceRoll: new Audio('./audio/dice-roll.mp3'),
    correctAnswer: new Audio('./audio/correct-answer.mp3'),
    wrongAnswer: new Audio('./audio/wrong-answer.mp3'),
    victory: new Audio('./audio/victory.mp3'),
    gameOver: new Audio('./audio/game-over.mp3')
};

// Function to play sounds safely
function playSound(soundKey, volume = 0.5) {
    try {
        const audio = sounds[soundKey];
        if (audio && audio.src) {
            audio.currentTime = 0;
            audio.volume = volume;
            audio.play().catch(() => {}); // Silent fail if audio unavailable
        }
    } catch (error) {
        // Silent fail - don't break game if audio fails
    }
}

// Square type constants
const SQUARE_TYPES = {
    EMPTY: 'empty',
    ACTION: 'action',
    FORWARD: 'forward',
    BACKWARD: 'backward',
    POWERUP: 'powerup'
};

// Auto-start when page loads
document.addEventListener('DOMContentLoaded', () => {
    console.log("Game initializing...");
    
    // Set up dice button
    const diceBtn = document.getElementById("dice-btn");
    if (diceBtn) {
        diceBtn.onclick = () => {
            console.log("Dice clicked");
            rollDice();
        };
    }
    
    // Welcome message
    const chatContainer = document.getElementById("chat-container");
    if (chatContainer) {
        displayMessage("system", "👋 Welcome to CyberSafe!");
    }
    
    // Start game after a slight delay
    setTimeout(initGame, 500);
});

// Initialize game
async function initGame() {
    console.log("Loading game data...");
    try {
        // Reset game state
        awaitingAction = false;
        animating = false;
        position = 0;
        score = 0;
        lives = 3;
        activeEffects = [];
        
        // Load all scenario files and build deck
        deck = await loadAllScenarios();
        if (deck.length === 0) {
            displayMessage("system", "⚠️ No scenario data found. Ensure data files exist.");
            return;
        }
        
        // Generate board with special tiles
        generateBoard();
        renderBoard();
        updateScoreUI();
        updateLivesUI();
        
        // Enable dice
        const diceBtn = document.getElementById("dice-btn");
        if (diceBtn) {
            diceBtn.disabled = false;
            displayMessage("system", "🎲 Roll the dice to begin!");
        }
    } catch (error) {
        console.error("Game initialization failed:", error);
        displayMessage("system", "⚠️ Failed to start game. Please try refreshing the page.");
    }
}

// Load all scenario data files
async function loadAllScenarios() {
    const files = [
        'data/student.json',
        'data/office.json',
        'data/home.json'
    ];
    
    const mergedDeck = [];
    
    try {
        const results = await Promise.all(files.map(f => 
            fetch(f)
                .then(r => r.ok ? r.json() : null)
                .catch(() => null)
        ));
        
        results.forEach(res => {
            if (!res) return;
            
            if (Array.isArray(res.cards)) {
                mergedDeck.push(...res.cards);
            } else if (Array.isArray(res.steps)) {
                mergedDeck.push(...res.steps.map(s => ({
                    title: s.title || '',
                    text: s.message || '',
                    options: s.options || [],
                    difficulty: s.difficulty || 1
                })));
            }
        });
        
        // Shuffle deck
        return mergedDeck.sort(() => Math.random() - 0.5);
    } catch (error) {
        console.error("Error loading scenarios:", error);
        return [];
    }
}

// FIXED: Generate board with 1 special, 4 action, 5 empty per row
function generateBoard() {
    board = new Array(boardSize).fill(null).map((_, i) => ({ index: i, type: SQUARE_TYPES.EMPTY }));
    actionIndices.clear();
    
    // Keep only the start (0) and end (99) as guaranteed empty
    board[0].type = SQUARE_TYPES.EMPTY;
    board[boardSize-1].type = SQUARE_TYPES.EMPTY;
    
    // For each row, place tiles strategically
    for (let row = 0; row < 10; row++) {
        // Get all indices in this row
        const rowIndices = [];
        for (let col = 0; col < 10; col++) {
            const idx = row * 10 + col;
            
            // Skip start and end positions
            if (idx === 0 || idx === boardSize - 1) continue;
            
            rowIndices.push(idx);
        }
        
        // Shuffle row indices for randomness
        rowIndices.sort(() => Math.random() - 0.5);
        
        // Track how many of each type we've placed
        let actionCount = 0;
        let specialCount = 0;
        let emptyCount = 0;
        
        const targetCounts = {
            action: 4,      // 4 action squares per row
            special: 1,     // 1 special square per row (powerup, forward, or backward)
            empty: 5        // 5 empty squares per row
        };
        
        // Place tiles according to targets
        for (const idx of rowIndices) {
            // Determine which type to place based on remaining quota
            let type = null;
            
            // Prioritize filling quotas in order
            if (actionCount < targetCounts.action) {
                type = SQUARE_TYPES.ACTION;
                actionCount++;
            } else if (specialCount < targetCounts.special) {
                // Randomly choose which special tile type
                const rand = Math.random();
                if (rand < 0.5) {
                    type = SQUARE_TYPES.FORWARD;
                } else if (rand < 1.0) {
                    type = SQUARE_TYPES.BACKWARD;
                }
                specialCount++;
            } else if (emptyCount < targetCounts.empty) {
                type = SQUARE_TYPES.EMPTY;
                emptyCount++;
            }
            
            // Place the tile
            if (type) {
                board[idx].type = type;
                
                if (type === SQUARE_TYPES.ACTION) {
                    actionIndices.add(idx);
                } else if (type !== SQUARE_TYPES.EMPTY) {
                    // Add values for special tiles
                    board[idx].value = Math.floor(Math.random() * 2) + 1;
                }
            }
        }
    }
    
    console.log("Board generated with 4 action, 1 special, 5 empty tiles per row");
}

// FIXED: Render board - Display numbers on all tiles
function renderBoard() {
    const boardContainer = document.getElementById("board");
    if (!boardContainer) {
        console.error("Board container not found!");
        return;
    }
    
    boardContainer.innerHTML = "";
    boardContainer.style.display = "grid";
    boardContainer.style.gridTemplateColumns = "repeat(10, 1fr)";
    boardContainer.style.gap = "5px";
    boardContainer.style.padding = "10px";
    
    // Create a snake path for the board
    const orderedIndices = [];
    for (let row = 0; row < 10; row++) {
        if (row % 2 === 0) {
            // Left to right
            for (let col = 0; col < 10; col++) {
                orderedIndices.push(row * 10 + col);
            }
        } else {
            // Right to left
            for (let col = 9; col >= 0; col--) {
                orderedIndices.push(row * 10 + col);
            }
        }
    }
    
    // Render each square
    orderedIndices.forEach((index) => {
        const square = document.createElement("div");
        const squareData = board[index];
        
        square.style.aspectRatio = "1";
        square.style.display = "flex";
        square.style.flexDirection = "column";
        square.style.alignItems = "center";
        square.style.justifyContent = "center";
        square.style.borderRadius = "8px";
        square.style.border = "1px solid";
        square.style.cursor = "default";
        square.style.fontSize = "12px";
        square.style.fontWeight = "bold";
        square.style.transition = "all 0.2s ease";
        square.style.position = "relative";
        square.dataset.index = index;
        square.style.gap = "2px";
        
        // Style based on square type with icon
        if (squareData.type === SQUARE_TYPES.ACTION) {
            square.style.backgroundColor = "#b45309";
            square.style.borderColor = "#d97706";
            square.innerHTML = `<div>🔎</div><div style="font-size: 9px; color: #fbbf24;">${index}</div>`;
        } else if (squareData.type === SQUARE_TYPES.FORWARD) {
            square.style.backgroundColor = "#166534";
            square.style.borderColor = "#16a34a";
            square.innerHTML = `<div>⬆️</div><div style="font-size: 9px; color: #86efac;">${index}</div>`;
        } else if (squareData.type === SQUARE_TYPES.BACKWARD) {
            square.style.backgroundColor = "#7f1d1d";
            square.style.borderColor = "#b91c1c";
            square.innerHTML = `<div>⬇️</div><div style="font-size: 9px; color: #fca5a5;">${index}</div>`;
        } else if (squareData.type === SQUARE_TYPES.POWERUP) {
            square.style.backgroundColor = "#6b21a8";
            square.style.borderColor = "#7e22ce";
            const powerupIcons = ["❤️", "🛡️", "🎲"];
            square.innerHTML = `<div>${powerupIcons[squareData.value - 1] || "❓"}</div><div style="font-size: 9px; color: #e9d5ff;">${index}</div>`;
        } else {
            // Empty squares
            if (index === 0) {
                square.style.backgroundColor = "#1e40af";
                square.style.borderColor = "#3b82f6";
                square.innerHTML = `<div>🏠</div><div style="font-size: 9px; color: #bfdbfe;">${index}</div>`;
            } else if (index === boardSize - 1) {
                square.style.backgroundColor = "#15803d";
                square.style.borderColor = "#22c55e";
                square.innerHTML = `<div>🏁</div><div style="font-size: 9px; color: #bbf7d0;">${index}</div>`;
            } else {
                square.style.backgroundColor = "#1f2937";
                square.style.borderColor = "#4b5563";
                square.innerHTML = `<div style="color: #6b7280; font-size: 10px;">${index}</div>`;
            }
        }
        
        // Add player token if on this square
        if (index === position) {
            const token = document.createElement("div");
            token.style.position = "absolute";
            token.style.bottom = "2px";
            token.style.right = "2px";
            token.style.width = "20px";
            token.style.height = "20px";
            token.style.backgroundColor = "#06b6d4";
            token.style.borderRadius = "50%";
            token.style.display = "flex";
            token.style.alignItems = "center";
            token.style.justifyContent = "center";
            token.style.fontSize = "12px";
            token.style.border = "2px solid white";
            token.textContent = "🙂";
            square.appendChild(token);
        }
        
        boardContainer.appendChild(square);
    });
}

// Roll dice
function rollDice() {
    if (animating || awaitingAction) {
        console.log("Cannot roll: game is busy");
        return;
    }
    
    playSound('diceRoll', 0.6);
    
    animating = true;
    const diceBtn = document.getElementById("dice-btn");
    if (diceBtn) diceBtn.disabled = true;
    
    const diceDisplay = document.getElementById("dice-display");
    if (diceDisplay) {
        diceDisplay.textContent = "🎲";
        diceDisplay.classList.add("animate-spin");
    }
    
    const roll = Math.floor(Math.random() * 6) + 1;
    console.log("Rolled:", roll);
    
    // Pre-roll message
    displayMessage("system", "Rolling... 🎲");
    
    setTimeout(() => {
        if (diceDisplay) {
            diceDisplay.classList.remove("animate-spin");
            diceDisplay.textContent = ["⚀", "⚁", "⚂", "⚃", "⚄", "⚅"][roll - 1] || "🎲";
        }
        
        // Enhanced roll messages based on number
        let rollMessage = `You rolled a <strong>${roll}</strong>.`;
        if (roll === 6) rollMessage = `🌟 JACKPOT! You rolled a <strong>${roll}</strong>!`;
        else if (roll === 1) rollMessage = `Unlucky... you rolled just a <strong>${roll}</strong>.`;
        
        displayMessage("system", rollMessage);
        
        setTimeout(() => {
            movePlayer(roll);
        }, 400);
    }, 800);
}

// Update player position with animation
function updateBoardPosition() {
    // Add animation to token
    const currentSquare = document.querySelector(`[data-index="${position}"]`);
    if (currentSquare) {
        const token = currentSquare.querySelector('.player-token') || currentSquare.querySelector('div[style*="background-color: #06b6d4"]');
        if (token) {
            token.style.animation = 'none';
            setTimeout(() => {
                token.style.animation = 'moveToken 0.4s ease-in-out';
            }, 10);
        }
    }
    
    renderBoard();
}

// Move player
function movePlayer(steps) {
    const prevPosition = position;
    let currentStep = 0;
    
    function step() {
        if (currentStep < steps && position < boardSize - 1) {
            position++;
            score += 1; // +1 for each tile moved forward
            updateScoreUI();
            updateBoardPosition();
            currentStep++;
            
            // Show progress as percentage
            const progress = Math.floor((position / boardSize) * 100);
            if (currentStep === steps) {
                displayMessage("system", `Progress: ${progress}% 📊`);
            }
            
            setTimeout(step, 200);
        } else {
            console.log(`Moved from ${prevPosition} to ${position}`);
            
            if (position === boardSize - 1) {
                setTimeout(() => {
                    endGameWin();
                }, 800);
                return;
            }
            
            handleLanding();
        }
    }
    
    step();
}

// Handle landing on a square - MODIFIED: Empty squares do nothing
function handleLanding() {
    const squareType = board[position]?.type || SQUARE_TYPES.EMPTY;
    
    switch (squareType) {
        case SQUARE_TYPES.ACTION:
            displayMessage("system", "🎯 Challenge incoming! Make the right choice...");
            setTimeout(() => {
                presentCard();
            }, 500);
            break;
            
        case SQUARE_TYPES.FORWARD:
            const forwardSteps = board[position].value || 1;
            displayMessage("system", `🚀 MOMENTUM BOOST! Rushing forward ${forwardSteps} spaces!`);
            setTimeout(() => {
                movePlayer(forwardSteps);
            }, 800);
            break;
            
        case SQUARE_TYPES.BACKWARD:
            const backwardSteps = board[position].value || 1;
            displayMessage("system", `⚡ CONNECTION LOST! Sliding back ${backwardSteps} spaces...`);
            setTimeout(() => {
                moveBackward(backwardSteps);
            }, 800);
            break;
            
        case SQUARE_TYPES.POWERUP:
            const powerupType = board[position].value || 1;
            handlePowerup(powerupType);
            break;
            
        default:
            // FIXED: Empty squares do nothing - just enable dice roll
            animating = false;
            const diceBtn = document.getElementById("dice-btn");
            if (diceBtn) {
                diceBtn.disabled = false;
            }
            displayMessage("system", "Safe zone! 🛡️ Roll again when ready.");
    }
}

// Handle powerup - ENHANCED: More exciting messages
function handlePowerup(type) {
    switch (type) {
        case 1:
            lives = Math.min(5, lives + 1);
            updateLivesUI();
            displayMessage("system", "❤️💫 EXTRA LIFE! You're back to full strength!");
            break;
            
        case 2:
            activeEffects.push("protection");
            displayMessage("system", "🛡️✨ SHIELD ACTIVATED! You're protected from the next wrong answer.");
            break;
    }
    
    animating = false;
    const diceBtn = document.getElementById("dice-btn");
    if (diceBtn) {
        diceBtn.disabled = false;
    }
}

// Move backward
function moveBackward(steps) {
    let stepsLeft = steps;
    
    function step() {
        if (stepsLeft > 0 && position > 0) {
            position--;
            score -= 1; // -1 for each tile moved backward
            score = Math.max(0, score); // Don't let score go negative
            updateScoreUI();
            updateBoardPosition();
            stepsLeft--;
            setTimeout(step, 200);
        } else {
            animating = false;
            awaitingAction = false;
            
            if (lives <= 0) {
                endGameLose();
                return;
            }
            
            const diceBtn = document.getElementById("dice-btn");
            if (diceBtn) diceBtn.disabled = false;
        }
    }
    
    step();
}

// Present card - FIXED: Clear card-content before showing new card
function presentCard() {
    if (deck.length === 0) {
        displayMessage("system", "No more scenario cards!");
        animating = false;
        const diceBtn = document.getElementById("dice-btn");
        if (diceBtn) diceBtn.disabled = false;
        return;
    }
    
    const index = Math.floor(Math.random() * deck.length);
    currentCard = deck[index];
    deck.splice(index, 1);
    
    // Shuffle options so correct answer is in random position
    if (currentCard.options && currentCard.options.length > 0) {
        currentCard.options = currentCard.options.sort(() => Math.random() - 0.5);
    }
    
    awaitingAction = true;
    
    displayMessage("system", "You encountered a scenario!");
    showScenarioCard(currentCard);
    
    const choices = document.getElementById("choices");
    if (!choices) return;
    
    choices.innerHTML = "";
    
    if (currentCard.options && currentCard.options.length > 0) {
        currentCard.options.forEach((option, idx) => {
            const button = document.createElement("button");
            button.className = "bg-gray-700 hover:bg-gray-600 text-left rounded-xl p-3 shadow-md border border-gray-600 transition text-sm w-full mb-2";
            button.innerHTML = `<span class="font-semibold">${option.text || option.choice || `Option ${idx + 1}`}</span>`;
            button.onclick = () => handleChoice(option);
            choices.appendChild(button);
        });
    }
}

// Handle choice - ENHANCED: New scoring system
function handleChoice(option) {
    if (!awaitingAction) return;
    
    const isCorrect = (typeof option.correct === "boolean") ? 
        option.correct : 
        ((option.points || 0) > 0);
    
    if (isCorrect) {
        playSound('correctAnswer', 0.7);
        correctStreak++;
        wrongStreak = 0;
        
        // NEW SCORING: points = difficulty (stars) × 2
        const difficulty = currentCard.difficulty || 1;
        let points = difficulty * 2;
        
        // Streak bonus: +25% per correct answer in a row (max 3 streak for 50% bonus)
        if (correctStreak > 1) {
            const streakBonus = Math.min(correctStreak - 1, 2) * 0.25;
            points = Math.floor(points * (1 + streakBonus));
        }
        
        score += Math.max(0, points);
        updateScoreUI();
        
        // Display streak message
        if (correctStreak > 1) {
            displayMessage("system", `🔥 Streak x${correctStreak}! Earned ${points} points!`);
        } else {
            displayMessage("system", `✅ Correct! Earned ${points} points!`);
        }
    } else {
        playSound('wrongAnswer', 0.7);
        wrongStreak++;
        correctStreak = 0;
        
        if (activeEffects.includes("protection")) {
            activeEffects = activeEffects.filter(e => e !== "protection");
            displayMessage("system", "🛡️ Your shield protected you from the consequences!");
            showFeedback(false, "Your shield protected you!", true);
            return;
        }
        
        // Lose a life with animation
        lives--;
        updateLivesUI(true);
        
        // Wrong streak penalty message
        if (wrongStreak > 1) {
            displayMessage("system", `⚠️ Risky streak x${wrongStreak}! Be careful!`);
        }
        
        if (lives <= 0) {
            displayMessage("system", "❌ You're out of lives!");
        }
    }
    
    showFeedback(isCorrect, option.feedback, false);
}

// Show feedback - ENHANCED: More dynamic feedback
function showFeedback(isCorrect, feedback, skipMove = false) {
    const scenarioCard = document.getElementById("scenario-card");
    const cardContent = document.getElementById("card-content");
    const choices = document.getElementById("choices");
    
    if (!cardContent) return;
    
    // IMPORTANT: Only clear choices, not the entire card-content
    if (choices) choices.innerHTML = "";
    
    // Enhanced feedback with streak info
    let feedbackTitle = isCorrect ? 'Correct Choice' : 'Incorrect Choice';
    let feedbackEmoji = isCorrect ? '✅' : '❌';
    
    if (isCorrect && correctStreak > 1) {
        feedbackTitle = `Correct! (Streak x${correctStreak})`;
        feedbackEmoji = '🔥';
    } else if (!isCorrect && wrongStreak > 1) {
        feedbackTitle = `Incorrect (Risky x${wrongStreak})`;
        feedbackEmoji = '⚠️';
    }
    
    const feedbackDiv = document.createElement("div");
    feedbackDiv.className = `p-4 rounded-lg text-center mb-4 ${isCorrect ? 'bg-green-800' : 'bg-red-800'}`;
    feedbackDiv.innerHTML = `
        <div class="text-3xl mb-2" style="animation: pulse 0.5s ease-in-out;">${feedbackEmoji}</div>
        <h4 class="font-bold mb-1 text-lg">${feedbackTitle}</h4>
        <p>${feedback || (isCorrect ? 'Great decision!' : 'That choice had risks.')}</p>
    `;
    
    const continueBtn = document.createElement("button");
    continueBtn.className = "bg-cyan-600 hover:bg-cyan-700 px-4 py-2 mt-4 rounded-lg text-white font-semibold w-full";
    continueBtn.textContent = "Continue";
    continueBtn.onclick = () => {
        awaitingAction = false;
        currentCard = null;
        
        if (scenarioCard) scenarioCard.classList.add("hidden");
        
        const instructions = document.getElementById("instructions");
        if (instructions) instructions.classList.remove("hidden");
        
        if (isCorrect || skipMove) {
            // Correct or shield used: allow next roll
            animating = false;
            const diceBtn = document.getElementById("dice-btn");
            if (diceBtn) diceBtn.disabled = false;
        } else {
            // Wrong: only lose life, stay in place
            if (lives <= 0) {
                endGameLose();
                return;
            }
            
            // Allow next roll (don't move back)
            animating = false;
            const diceBtn = document.getElementById("dice-btn");
            if (diceBtn) diceBtn.disabled = false;
        }
    };
    
    // Add feedback and continue button to choices container (not card-content)
    if (choices) {
        choices.innerHTML = "";
        choices.appendChild(feedbackDiv);
        choices.appendChild(continueBtn);
    }
}

// Show scenario card - FIXED: Properly populate card content with animation
function showScenarioCard(card) {
    const scenarioCard = document.getElementById("scenario-card");
    const instructions = document.getElementById("instructions");
    const cardTitle = document.getElementById("card-title");
    const cardText = document.getElementById("card-text");
    const cardDifficulty = document.getElementById("card-difficulty");
    
    if (!scenarioCard) return;
    
    // Set title and text directly in their elements
    if (cardTitle) cardTitle.textContent = card.title || "Scenario";
    if (cardText) cardText.textContent = card.text || card.message || "";
    
    if (cardDifficulty) {
        const difficulty = card.difficulty || 1;
        cardDifficulty.textContent = "⭐".repeat(Math.min(3, Math.max(1, difficulty)));
    }
    
    // Remove hidden class to trigger animation
    scenarioCard.classList.remove("hidden");
    if (instructions) instructions.classList.add("hidden");
    
    // Trigger animation by removing and re-adding the animation class
    scenarioCard.style.animation = 'none';
    setTimeout(() => {
        scenarioCard.style.animation = 'slideInCard 0.5s ease-out';
    }, 10);
}

// Update UI
function updateScoreUI() {
    const scoreEl = document.getElementById("score");
    if (scoreEl) scoreEl.textContent = `Score: ${score}`;
}

function updateLivesUI(animate = false) {
    const livesEl = document.getElementById("lives");
    if (livesEl) {
        if (animate) {
            // Add shake animation
            livesEl.style.animation = "none";
            setTimeout(() => {
                livesEl.style.animation = "shake 0.5s ease-in-out";
            }, 10);
            
            // Change color to red briefly
            const originalColor = livesEl.style.color;
            livesEl.style.color = "#ef4444";
            setTimeout(() => {
                livesEl.style.color = originalColor;
            }, 500);
        }
        
        livesEl.textContent = `Lives: ${lives}`;
    }
}

function displayMessage(sender, text) {
    const chatContainer = document.getElementById("chat-container");
    if (!chatContainer) return;
    
    const msg = document.createElement("div");
    msg.classList.add("p-2", "my-1", "rounded-lg");
    msg.style.maxWidth = "80%";
    
    if (sender === "player") {
        msg.classList.add("bg-cyan-600");
    } else if (sender === "stranger") {
        msg.classList.add("bg-gray-700");
    } else {
        msg.classList.add("text-gray-400");
        msg.style.fontSize = "12px";
        msg.style.textAlign = "center";
    }
    
    msg.innerHTML = text;
    chatContainer.appendChild(msg);
    chatContainer.scrollTop = chatContainer.scrollHeight;
}

// End game - Victory with popup
function endGameWin() {
    const winBonus = 10; // +10 for winning
    const streakBonus = Math.max(0, Math.min(correctStreak - 1, 2) * 10);
    const finalScore = score + winBonus + streakBonus;
    
    displayMessage("system", "🎉 VICTORY! You navigated the internet safely!");
    displayMessage("system", `🏆 Final Score: ${finalScore} (Base: ${score} + Win Bonus: ${winBonus}${streakBonus > 0 ? ` + Streak Bonus: ${streakBonus}` : ''})`);
    displayMessage("system", `✅ Correct Streak: x${correctStreak} | ❌ Times at Risk: ${wrongStreak}`);
    
    // Play victory sound
    playSound('victory');
    
    // Create victory popup
    showVictoryPopup(finalScore, correctStreak, wrongStreak);
    
    const choicesEl = document.getElementById("choices");
    if (choicesEl) {
        choicesEl.innerHTML = `
            <div style="text-align: center; margin-bottom: 10px;">
                <p style="font-size: 12px; color: #9ca3af;">You survived the digital jungle!</p>
            </div>
            <button onclick="location.reload()" class="bg-cyan-600 hover:bg-cyan-700 px-4 py-2 rounded-lg text-white font-semibold w-full mb-2 transition duration-300 transform hover:scale-105">
                🔄 Play Again
            </button>
            <a href="index.html" class="inline-block bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800 px-4 py-2 rounded-lg text-white font-semibold text-center w-full transition duration-300 transform hover:scale-105">
                🏠 Return Home
            </a>
        `;
    }
}

function endGameLose() {
    displayMessage("system", "💀 GAME OVER! You ran out of lives.");
    displayMessage("system", `📊 Final Score: ${score} | 🔥 Best Streak: x${correctStreak} | ⚠️ Risky Moments: ${wrongStreak}`);
    
    // Play game over sound
    playSound('gameOver');
    
    // Create game over popup
    showGameOverPopup(score, correctStreak, wrongStreak);
    
    const choicesEl = document.getElementById("choices");
    if (choicesEl) {
        choicesEl.innerHTML = `
            <div style="text-align: center; margin-bottom: 10px;">
                <p style="font-size: 12px; color: #9ca3af;">The digital world got the best of you. Try again!</p>
            </div>
            <button onclick="location.reload()" class="bg-cyan-600 hover:bg-cyan-700 px-4 py-2 rounded-lg text-white font-semibold w-full mb-2 transition duration-300 transform hover:scale-105">
                🔄 Try Again
            </button>
            <a href="index.html" class="inline-block bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800 px-4 py-2 rounded-lg text-white font-semibold text-center w-full transition duration-300 transform hover:scale-105">
                🏠 Return Home
            </a>
        `;
    }
}

// Victory popup with confetti
function showVictoryPopup(finalScore, streak, risks) {
    const overlay = document.createElement('div');
    overlay.className = 'fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-50 game-over-overlay';
    
    const popup = document.createElement('div');
    popup.className = 'bg-gradient-to-b from-cyan-900 to-blue-900 p-8 rounded-2xl shadow-2xl text-center max-w-md popup-message border-2 border-cyan-400';
    popup.innerHTML = `
        <div class="text-6xl mb-4">🎉</div>
        <h2 class="text-3xl font-bold text-cyan-300 mb-3">VICTORY!</h2>
        <p class="text-gray-200 mb-6">You navigated the internet safely!</p>
        
        <div class="bg-gray-800 p-4 rounded-lg mb-6 space-y-2">
            <div class="flex justify-between items-center text-cyan-300">
                <span>🏆 Final Score:</span>
                <span class="font-bold text-2xl">${finalScore}</span>
            </div>
            <div class="flex justify-between items-center text-green-300">
                <span>🔥 Best Streak:</span>
                <span class="font-bold">x${streak}</span>
            </div>
            <div class="flex justify-between items-center text-yellow-300">
                <span>⚠️ Risky Moments:</span>
                <span class="font-bold">${risks}</span>
            </div>
        </div>
        
        <p class="text-gray-300 text-sm mb-4">You survived the digital jungle! Stay safe online!</p>
    `;
    
    overlay.appendChild(popup);
    document.body.appendChild(overlay);
    
    // Add confetti
    createConfetti();
    
    // Auto close after 5 seconds
    setTimeout(() => {
        overlay.style.opacity = '0';
        overlay.style.transition = 'opacity 0.5s ease-out';
        setTimeout(() => overlay.remove(), 500);
    }, 5000);
}

// Game over popup
function showGameOverPopup(finalScore, streak, risks) {
    const overlay = document.createElement('div');
    overlay.className = 'fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-50 game-over-overlay';
    
    const popup = document.createElement('div');
    popup.className = 'bg-gradient-to-b from-red-900 to-gray-900 p-8 rounded-2xl shadow-2xl text-center max-w-md popup-message border-2 border-red-500';
    popup.innerHTML = `
        <div class="text-6xl mb-4">💀</div>
        <h2 class="text-3xl font-bold text-red-400 mb-3">GAME OVER!</h2>
        <p class="text-gray-200 mb-6">You ran out of lives...</p>
        
        <div class="bg-gray-800 p-4 rounded-lg mb-6 space-y-2">
            <div class="flex justify-between items-center text-cyan-300">
                <span>📊 Final Score:</span>
                <span class="font-bold text-2xl">${finalScore}</span>
            </div>
            <div class="flex justify-between items-center text-yellow-300">
                <span>🔥 Best Streak:</span>
                <span class="font-bold">x${streak}</span>
            </div>
            <div class="flex justify-between items-center text-orange-300">
                <span>⚠️ Risky Moments:</span>
                <span class="font-bold">${risks}</span>
            </div>
        </div>
        
        <p class="text-gray-300 text-sm mb-4">The digital world got the best of you. Try again!</p>
    `;
    
    overlay.appendChild(popup);
    document.body.appendChild(overlay);
    
    // Auto close after 5 seconds
    setTimeout(() => {
        overlay.style.opacity = '0';
        overlay.style.transition = 'opacity 0.5s ease-out';
        setTimeout(() => overlay.remove(), 500);
    }, 5000);
}

// Create confetti effect for victory
function createConfetti() {
    const confettiPieces = 50;
    const colors = ['#06b6d4', '#0ea5e9', '#00d9ff', '#22c55e', '#eab308', '#f97316'];
    
    for (let i = 0; i < confettiPieces; i++) {
        const confetti = document.createElement('div');
        confetti.className = 'confetti fixed pointer-events-none';
        confetti.style.left = Math.random() * 100 + 'vw';
        confetti.style.top = '-10px';
        confetti.style.width = (Math.random() * 10 + 5) + 'px';
        confetti.style.height = confetti.style.width;
        confetti.style.backgroundColor = colors[Math.floor(Math.random() * colors.length)];
        confetti.style.borderRadius = '50%';
        confetti.style.zIndex = '51';
        confetti.style.opacity = '1';
        
        document.body.appendChild(confetti);
        
        // Remove after animation
        setTimeout(() => confetti.remove(), 3000);
    }
}
