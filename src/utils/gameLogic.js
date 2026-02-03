export const GRID_WIDTH = 15;
export const GRID_HEIGHT = 15;
export const MAX_PLAYERS = 2;

// Block Types
export const BLOCK = {
    EMPTY: 0,
    WALL: 1,      // Indestructible
    CRATE: 2,     // Destructible
};

// Powerup Types (hidden in map until crate broken)
export const POWERUP = {
    NONE: 0,
    BOMB: 1,  // +1 Bomb
    FIRE: 2,  // +1 Range
    SPEED: 3, // Faster movement
};

export const DEFAULT_SPEED_DELAY = 150; // ms between moves (Start Slow was requested, so 150 is decent, maybe 200?)
export const MIN_SPEED_DELAY = 80; // Max speed cap

export function generateMap() {
    const map = Array(GRID_WIDTH * GRID_HEIGHT).fill(null).map(() => ({
        type: BLOCK.EMPTY,
        powerup: POWERUP.NONE,
    }));

    // Helper to get index
    const idx = (x, y) => y * GRID_WIDTH + x;

    // Safe Zones (3x3 corners)
    const isSafe = (x, y) => {
        if (x < 3 && y < 3) return true;
        if (x >= GRID_WIDTH - 3 && y >= GRID_HEIGHT - 3) return true;
        return false;
    };

    // 1. Place Walls & Identify Potential Crate Spots
    const potentialCrates = [];

    for (let y = 0; y < GRID_HEIGHT; y++) {
        for (let x = 0; x < GRID_WIDTH; x++) {
            const i = idx(x, y);

            // Fixed Walls
            if (x % 2 === 1 && y % 2 === 1) {
                map[i].type = BLOCK.WALL;
                continue;
            }

            // Skip safe zones
            if (isSafe(x, y)) continue;

            // Random Crates (60% density)
            if (Math.random() < 0.6) {
                map[i].type = BLOCK.CRATE;
                potentialCrates.push(i);
            }
        }
    }

    // 2. Distribute Fixed Powerups
    // Shuffle potential crates
    for (let i = potentialCrates.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [potentialCrates[i], potentialCrates[j]] = [potentialCrates[j], potentialCrates[i]];
    }

    // Assign specific counts
    const FIRE_COUNT = 10;
    const BOMB_COUNT = 8;
    const SPEED_COUNT = 6;

    let assigned = 0;

    // Assign Fire
    for (let k = 0; k < FIRE_COUNT && assigned < potentialCrates.length; k++) {
        map[potentialCrates[assigned]].powerup = POWERUP.FIRE;
        assigned++;
    }

    // Assign Bombs
    for (let k = 0; k < BOMB_COUNT && assigned < potentialCrates.length; k++) {
        map[potentialCrates[assigned]].powerup = POWERUP.BOMB;
        assigned++;
    }

    // Assign Speed
    for (let k = 0; k < SPEED_COUNT && assigned < potentialCrates.length; k++) {
        map[potentialCrates[assigned]].powerup = POWERUP.SPEED;
        assigned++;
    }

    return map;
}

// --- Physical Collision Logic (AABB) ---
const PLAYER_SIZE = 0.6; // Reduzindo para facilitar a entrada em corredores
const TILE_SIZE = 1.0;

function rectIntersect(r1, r2) {
    return !(r2.left >= r1.right ||
        r2.right <= r1.left ||
        r2.top >= r1.bottom ||
        r2.bottom <= r1.top);
}

// Get bounding box for player centered at x,y
function getPlayerBox(x, y) {
    const half = PLAYER_SIZE / 2;
    return {
        left: x + 0.5 - half,
        right: x + 0.5 + half,
        top: y + 0.5 - half,
        bottom: y + 0.5 + half
    };
}

// Check if a box collides with any solid objects (Walls, Crates, Bombs)
export function checkCollision(newX, newY, map, bombs = [], currentX, currentY) {
    const playerBox = getPlayerBox(newX, newY);
    const currentBox = (currentX !== undefined && currentY !== undefined) ? getPlayerBox(currentX, currentY) : null;

    const minTileX = Math.floor(playerBox.left);
    const maxTileX = Math.floor(playerBox.right);
    const minTileY = Math.floor(playerBox.top);
    const maxTileY = Math.floor(playerBox.bottom);

    if (minTileX < 0 || maxTileX >= GRID_WIDTH || minTileY < 0 || maxTileY >= GRID_HEIGHT) {
        return true;
    }

    for (let py = minTileY; py <= maxTileY; py++) {
        for (let px = minTileX; px <= maxTileX; px++) {
            const idx = py * GRID_WIDTH + px;
            const tile = map[idx];

            if (tile.type !== BLOCK.EMPTY) {
                return true;
            }

            const hasBomb = bombs.some(b => b.x === px && b.y === py);
            if (hasBomb) {
                // If we were already overlapping this bomb at our current position, don't collide (let us walk out)
                if (currentBox) {
                    const bombBox = { left: px, right: px + 1, top: py, bottom: py + 1 };
                    if (rectIntersect(currentBox, bombBox)) {
                        continue;
                    }
                }
                return true;
            }
        }
    }

    return false;
}

export function isValidMove(map, x, y, bombs = [], currentX, currentY) {
    return !checkCollision(x, y, map, bombs, currentX, currentY);
}
