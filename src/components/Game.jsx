import React, { useState, useEffect, useRef } from 'react';
import { GRID_WIDTH, GRID_HEIGHT, BLOCK, POWERUP, isValidMove } from '../utils/gameLogic';
import { Bomb, Flame, Footprints, Trophy, Skull, Volume2, VolumeX } from 'lucide-react';
import { WallSprite, CrateSprite, BombSprite, PlayerSprite, ExplosionSprite } from './Sprites';
import clsx from 'clsx';

// Constants
const CELL_SIZE = 40; // px
const BOMB_TIMER = 3000;
const EXPLOSION_DURATION = 1000;

export default function Game({ channel, playerId, isHost, initialMap, initialPlayers, onRestart, onLeave, isAudioEnabled, onToggleAudio }) {
    const [map, setMap] = useState(initialMap);
    const [players, setPlayers] = useState(initialPlayers);
    const [bombs, setBombs] = useState([]);
    const [explosions, setExplosions] = useState([]); // { x, y, timestamp }
    const [items, setItems] = useState([]); // { x, y, type }
    const [gameOver, setGameOver] = useState(null); // { winnerId }
    const [rematchVotes, setRematchVotes] = useState([]); // [playerId, ...]

    // Authoritative local position for smooth 60fps movement
    const localPosRef = useRef(initialPlayers[playerId] ? { x: initialPlayers[playerId].x, y: initialPlayers[playerId].y } : { x: 1, y: 1 });

    // --- Audio ---
    const bgMusicRef = useRef(null);

    const playSound = (path, volume = 0.5, loop = false) => {
        const audio = new Audio(path);
        audio.volume = volume;
        audio.loop = loop;
        audio.play().catch(e => console.log("Audio play blocked:", e));
        return audio;
    };

    useEffect(() => {
        if (!isAudioEnabled) {
            if (bgMusicRef.current) {
                bgMusicRef.current.pause();
            }
            return;
        }

        // Se o áudio estiver ligado e não tiver música tocando, inicia
        if (!bgMusicRef.current) {
            const startAudio = playSound('/sounds/musica de inicio de jogo.wav', 0.3, false);
            bgMusicRef.current = startAudio;

            const handleEnded = () => {
                const bgAudio = playSound('/sounds/musica de fundo.mp3', 0.3, true);
                bgMusicRef.current = bgAudio;
            };

            startAudio.addEventListener('ended', handleEnded);
        } else {
            bgMusicRef.current.play().catch(e => console.log("Audio play blocked:", e));
        }

        return () => {
            if (bgMusicRef.current && !isAudioEnabled) {
                bgMusicRef.current.pause();
            }
        };
    }, [isAudioEnabled]);

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            if (bgMusicRef.current) {
                bgMusicRef.current.pause();
                bgMusicRef.current = null;
            }
        };
    }, []);

    const stateRef = useRef({ map, players, bombs, items, gameOver });
    useEffect(() => {
        stateRef.current = { map, players, bombs, items, gameOver };
    }, [map, players, bombs, items, gameOver]);

    // Sync local state if props change (e.g. game starts or resets)
    useEffect(() => {
        if (initialPlayers && Object.keys(initialPlayers).length > 0) {
            setPlayers(initialPlayers);
            if (initialPlayers[playerId]) {
                localPosRef.current = { x: initialPlayers[playerId].x, y: initialPlayers[playerId].y };
            }
        }
    }, [initialPlayers, playerId]);

    // --- Realtime Listeners ---
    useEffect(() => {
        if (!channel) return;

        const subscription = channel
            .on('broadcast', { event: 'move' }, ({ payload }) => {
                if (payload.id === playerId) return; // Prevent self-feedback loop
                setPlayers(prev => ({ ...prev, [payload.id]: payload.data }));
            })
            .on('broadcast', { event: 'place_bomb' }, ({ payload }) => {
                // Determine ID (sender should provide it, but fallback if older client)
                const bombId = payload.id || Date.now() + Math.random();
                const newBomb = { ...payload, id: bombId };

                setBombs(prev => {
                    // Avoid duplicates if we already added it locally
                    if (prev.some(b => b.id === newBomb.id)) return prev;
                    return [...prev, newBomb];
                });

                // Trigger explosion ONLY if we didn't add it locally (i.e. it's from someone else)
                if (payload.ownerId !== playerId) {
                    playSound('/sounds/coloca bomba.wav', 0.5);
                    scheduleExplosion(newBomb);
                }
            })
            .on('broadcast', { event: 'map_update' }, ({ payload }) => {
                // Host sent a map update (broken crates, etc)
                setMap(payload.map);
                if (payload.items) setItems(payload.items);
            })
            .on('broadcast', { event: 'game_over' }, ({ payload }) => {
                setGameOver(payload);
                if (bgMusicRef.current) bgMusicRef.current.pause();
                if (payload.winner === playerId) {
                    playSound('/sounds/musica ganhou.wav', 0.6, false);
                }
            })
            .on('broadcast', { event: 'vote_restart' }, ({ payload }) => {
                setRematchVotes(prev => {
                    const newVotes = [...new Set([...prev, payload.id])];
                    if (newVotes.length >= 2 && isHost) {
                        onRestart();
                    }
                    return newVotes;
                });
            })
            .on('broadcast', { event: 'update_lives' }, ({ payload }) => {
                setPlayers(prev => ({
                    ...prev,
                    [payload.id]: {
                        ...prev[payload.id],
                        lives: payload.lives,
                        alive: payload.lives > 0,
                        invincibleUntil: payload.invincibleUntil // Sync invincibility
                    }
                }));
                playSound('/sounds/sofre dano.wav', 0.6);
            })
            .on('broadcast', { event: 'item_collected' }, ({ payload }) => {
                setItems(prev => prev.filter(i => !(i.x === payload.x && i.y === payload.y)));
            })
            .subscribe();

        return () => {
            // channel.unsubscribe() is handled in parent
        };
    }, [channel]);

    // --- Logic ---

    const bombTimeouts = useRef({});
    const lastMoveTime = useRef(0);

    // --- Logic ---

    const scheduleExplosion = (bomb) => {
        if (bombTimeouts.current[bomb.id]) return; // Already scheduled

        bombTimeouts.current[bomb.id] = setTimeout(() => {
            handleExplosion(bomb);
            delete bombTimeouts.current[bomb.id];
        }, BOMB_TIMER);
    };

    const handleExplosion = (bomb) => {
        // Clear timeout if triggered early (Chain Reaction)
        if (bombTimeouts.current[bomb.id]) {
            clearTimeout(bombTimeouts.current[bomb.id]);
            delete bombTimeouts.current[bomb.id];
        }

        playSound('/sounds/explosao da bomba.wav', 1.0);
        setBombs(prev => prev.filter(b => b.id !== bomb.id));

        // Calculate flame spread
        const flames = [{ x: bomb.x, y: bomb.y }];
        const range = bomb.range || 1;
        const directions = [[0, 1], [0, -1], [1, 0], [-1, 0]];

        directions.forEach(([dx, dy]) => {
            for (let i = 1; i <= range; i++) {
                const nx = bomb.x + dx * i;
                const ny = bomb.y + dy * i;
                if (nx < 0 || nx >= GRID_WIDTH || ny < 0 || ny >= GRID_HEIGHT) break;

                const idx = ny * GRID_WIDTH + nx;
                const cell = stateRef.current.map[idx];

                if (cell.type === BLOCK.WALL) break;

                flames.push({ x: nx, y: ny });

                if (cell.type === BLOCK.CRATE) break;
            }
        });

        // Chain Reaction: Check if any OTHER bombs are in the flames
        // We use stateRef to get current bombs, excluding the one currently exploding
        const otherBombs = stateRef.current.bombs.filter(b => b.id !== bomb.id);
        const bombsHit = otherBombs.filter(b => flames.some(f => f.x === b.x && f.y === b.y));

        bombsHit.forEach(b => {
            if (bombTimeouts.current[b.id]) {
                clearTimeout(bombTimeouts.current[b.id]);
                delete bombTimeouts.current[b.id];
                setTimeout(() => handleExplosion(b), 100);
            }
        });

        // Add visuals
        const timestamp = Date.now();
        const newExplosions = flames.map((f, i) => ({ ...f, id: `${timestamp}-${i}-${Math.random()}` }));
        setExplosions(prev => [...prev, ...newExplosions]);

        setTimeout(() => {
            const idsToRemove = new Set(newExplosions.map(e => e.id));
            setExplosions(prev => prev.filter(e => !idsToRemove.has(e.id)));
        }, EXPLOSION_DURATION);

        // --- HOST LOGIC: State Changes ---
        if (isHost && !stateRef.current.gameOver) {
            handleHostExplosionEffects(flames, bomb.ownerId);
        }
    };

    const handleHostExplosionEffects = (flames, attackerId) => {
        let mapChanged = false;
        const newMap = [...stateRef.current.map];
        const newItems = [...stateRef.current.items];
        let winner = null;
        const hitPlayers = new Set(); // Avoid double hits per tick

        flames.forEach(f => {
            const idx = f.y * GRID_WIDTH + f.x;
            let justSpawned = false;

            // 1. Destroy Crates
            if (newMap[idx].type === BLOCK.CRATE) {
                const powerupType = newMap[idx].powerup;
                newMap[idx] = { ...newMap[idx], type: BLOCK.EMPTY };
                mapChanged = true;
                if (powerupType !== POWERUP.NONE) {
                    newItems.push({ x: f.x, y: f.y, type: powerupType });
                    justSpawned = true;
                }
            }

            // 2. Hit Players
            Object.entries(stateRef.current.players).forEach(([pid, p]) => {
                if (Math.round(p.x) === f.x && Math.round(p.y) === f.y) {
                    hitPlayers.add(pid);
                }
            });

            // 3. Destroy Items
            if (!justSpawned) {
                const itemIdx = newItems.findIndex(i => i.x === f.x && i.y === f.y);
                if (itemIdx !== -1) {
                    newItems.splice(itemIdx, 1);
                    mapChanged = true;
                }
            }
        });

        if (hitPlayers.size > 0) {
            hitPlayers.forEach(pid => {
                const p = stateRef.current.players[pid];
                const now = Date.now();
                if (p.lives > 0 && (!p.invincibleUntil || now > p.invincibleUntil)) {
                    const newLives = p.lives - 1;
                    const newInvincibleUntil = now + 1000;
                    channel.send({
                        type: 'broadcast',
                        event: 'update_lives',
                        payload: { id: pid, lives: newLives, invincibleUntil: newInvincibleUntil }
                    });
                    setPlayers(prev => ({
                        ...prev, [pid]: { ...prev[pid], lives: newLives, alive: newLives > 0, invincibleUntil: newInvincibleUntil }
                    }));
                    if (newLives <= 0) {
                        const otherId = Object.keys(stateRef.current.players).find(id => id !== pid);
                        winner = otherId || attackerId;
                    }
                }
            });
        }

        if (mapChanged) {
            setMap(newMap);
            setItems(newItems);
            channel.send({ type: 'broadcast', event: 'map_update', payload: { map: newMap, items: newItems } });
        }
        if (winner) {
            channel.send({ type: 'broadcast', event: 'game_over', payload: { winner } });
            setGameOver({ winner });
        }
    };

    // --- Input Handling (Game Loop) ---
    const keysPressed = useRef({});
    const lastTime = useRef(0);
    const lastNetworkUpdate = useRef(0);

    useEffect(() => {
        const handleKeyDown = (e) => { keysPressed.current[e.key] = true; keysPressed.current[e.code] = true; };
        const handleKeyUp = (e) => { keysPressed.current[e.key] = false; keysPressed.current[e.code] = false; };
        window.addEventListener('keydown', handleKeyDown);
        window.addEventListener('keyup', handleKeyUp);
        let animationFrameId;
        const loop = (timestamp) => {
            if (!lastTime.current) lastTime.current = timestamp;
            const deltaTime = (timestamp - lastTime.current) / 1000;
            lastTime.current = timestamp;
            if (!stateRef.current.gameOver) update(deltaTime, timestamp);
            animationFrameId = requestAnimationFrame(loop);
        };
        animationFrameId = requestAnimationFrame(loop);
        return () => {
            window.removeEventListener('keydown', handleKeyDown);
            window.removeEventListener('keyup', handleKeyUp);
            cancelAnimationFrame(animationFrameId);
        };
    }, []);

    const update = (dt, now) => {
        const myPlayer = stateRef.current.players[playerId];
        if (!myPlayer || !myPlayer.alive) return;

        if (keysPressed.current[' '] && myPlayer.lives > 0) {
            if (!keysPressed.current['SpaceLocked']) {
                tryPlaceBomb(myPlayer);
                keysPressed.current['SpaceLocked'] = true;
            }
        } else {
            keysPressed.current['SpaceLocked'] = false;
        }

        let dx = 0; let dy = 0;
        if (keysPressed.current['ArrowUp'] || keysPressed.current['KeyW'] || keysPressed.current['w'] || keysPressed.current['W']) dy -= 1;
        if (keysPressed.current['ArrowDown'] || keysPressed.current['KeyS'] || keysPressed.current['s'] || keysPressed.current['S']) dy += 1;
        if (keysPressed.current['ArrowLeft'] || keysPressed.current['KeyA'] || keysPressed.current['a'] || keysPressed.current['A']) dx -= 1;
        if (keysPressed.current['ArrowRight'] || keysPressed.current['KeyD'] || keysPressed.current['d'] || keysPressed.current['D']) dx += 1;

        if (dx !== 0 || dy !== 0) {
            const length = Math.sqrt(dx * dx + dy * dy);
            dx /= length; dy /= length;
            const currentDelay = myPlayer.speed || 360;
            const tilesPerSec = (1000 / currentDelay) * 1.5;
            const moveAmount = tilesPerSec * dt;

            let nextX = localPosRef.current.x + dx * moveAmount;
            let nextY = localPosRef.current.y + dy * moveAmount;

            let finalX = localPosRef.current.x;
            let finalY = localPosRef.current.y;

            // --- Enhanced Movement with Smooth Sliding / Corner Nudging ---
            const SLIDE_THRESHOLD = 0.4; // How far off-center we can be to trigger sliding

            if (dx !== 0) {
                if (isValidMove(stateRef.current.map, nextX, localPosRef.current.y, stateRef.current.bombs, localPosRef.current.x, localPosRef.current.y)) {
                    finalX = nextX;
                } else if (dy === 0) {
                    // Not moving vertically, but horizontally blocked: Try to nudge vertically towards center
                    const centerY = Math.round(localPosRef.current.y);
                    const diffY = centerY - localPosRef.current.y;
                    if (Math.abs(diffY) > 0.01 && Math.abs(diffY) < SLIDE_THRESHOLD) {
                        const nudge = Math.sign(diffY) * moveAmount;
                        const testY = localPosRef.current.y + nudge;
                        if (isValidMove(stateRef.current.map, nextX, testY, stateRef.current.bombs, localPosRef.current.x, localPosRef.current.y)) {
                            finalX = nextX;
                            finalY = testY;
                        }
                    }
                }
            }

            if (dy !== 0) {
                if (isValidMove(stateRef.current.map, finalX, nextY, stateRef.current.bombs, finalX, localPosRef.current.y)) {
                    finalY = nextY;
                } else if (dx === 0) {
                    // Not moving horizontally, but vertically blocked: Try to nudge horizontally towards center
                    const centerX = Math.round(localPosRef.current.x);
                    const diffX = centerX - localPosRef.current.x;
                    if (Math.abs(diffX) > 0.01 && Math.abs(diffX) < SLIDE_THRESHOLD) {
                        const nudge = Math.sign(diffX) * moveAmount;
                        const testX = localPosRef.current.x + nudge;
                        if (isValidMove(stateRef.current.map, testX, nextY, stateRef.current.bombs, localPosRef.current.x, localPosRef.current.y)) {
                            finalX = testX;
                            finalY = nextY;
                        }
                    }
                }
            }

            if (finalX !== localPosRef.current.x || finalY !== localPosRef.current.y) {
                localPosRef.current = { x: finalX, y: finalY };
                const updates = checkItemCollection(finalX, finalY, myPlayer);
                const newPlayerState = { ...myPlayer, x: finalX, y: finalY, ...updates };
                setPlayers(prev => ({ ...prev, [playerId]: newPlayerState }));
                if (now - lastNetworkUpdate.current > 50) {
                    channel.send({ type: 'broadcast', event: 'move', payload: { id: playerId, data: newPlayerState } });
                    lastNetworkUpdate.current = now;
                }
            }
        }
    };

    const tryPlaceBomb = (player) => {
        const myActiveBombs = stateRef.current.bombs.filter(b => b.ownerId === playerId).length;
        if (myActiveBombs >= (player.bombs || 1)) return;
        const bx = Math.round(localPosRef.current.x);
        const by = Math.round(localPosRef.current.y);
        if (!stateRef.current.bombs.some(b => b.x === bx && b.y === by)) {
            const bombPayload = { x: bx, y: by, ownerId: playerId, range: player.range, id: `bomb-${playerId}-${Date.now()}` };
            setBombs(prev => [...prev, bombPayload]);
            playSound('/sounds/coloca bomba.wav', 0.5);
            scheduleExplosion(bombPayload);
            channel.send({ type: 'broadcast', event: 'place_bomb', payload: bombPayload });
        }
    };

    const checkItemCollection = (x, y, player) => {
        const itemIdx = stateRef.current.items.findIndex(i => Math.abs(x - i.x) < 0.6 && Math.abs(y - i.y) < 0.6);
        if (itemIdx === -1) return {};
        const item = stateRef.current.items[itemIdx];
        const updates = {};
        if (item.type === POWERUP.BOMB) updates.bombs = (player.bombs || 1) + 1;
        if (item.type === POWERUP.FIRE) updates.range = (player.range || 1) + 1;
        if (item.type === POWERUP.SPEED) updates.speed = Math.max(100, (player.speed || 360) - 40);
        playSound('/sounds/pegou item.wav', 0.5);
        const newItems = stateRef.current.items.filter((_, i) => i !== itemIdx);
        setItems(newItems);

        // Broadcast collection to everyone (including host)
        channel.send({
            type: 'broadcast',
            event: 'item_collected',
            payload: { x: item.x, y: item.y }
        });

        return updates;
    };

    return (
        <div className="flex flex-col items-center justify-between min-h-screen bg-joy-bg text-gray-800 p-8 relative">
            {/* HUD */}
            <div className="w-full max-w-4xl flex justify-between font-sans z-30">
                {Object.entries(players).map(([pid, p]) => (
                    <div key={pid} className={clsx(
                        "flex flex-col gap-1 p-4 rounded-[2rem] bg-white border-4 transition-all shadow-lg",
                        p.color === 'blue' ? "border-joy-mint text-joy-deep-purple" : "border-joy-pink text-joy-deep-purple",
                        pid === playerId ? "scale-105" : "opacity-80 scale-95"
                    )}>
                        <div className="font-black text-xl flex items-center justify-between gap-6 uppercase tracking-tight">
                            <span className={p.color === 'blue' ? "text-joy-mint" : "text-joy-pink"}>
                                {p.name || (p.color === 'blue' ? 'JOGADOR 1' : 'JOGADOR 2')}
                            </span>
                            <div className="flex gap-1 text-joy-pink text-sm">
                                {Array.from({ length: 3 }).map((_, i) => (
                                    <div key={i} className={clsx(i < p.lives ? "opacity-100 scale-125" : "opacity-20 grayscale", "transition-all")}>❤</div>
                                ))}
                            </div>
                        </div>
                        <div className="grid grid-cols-3 gap-4 text-[11px] font-black uppercase text-joy-deep-purple/40 mt-2">
                            <div className="flex items-center gap-1">
                                <img src="/images/icone.png" alt="Bomb" className="w-4 h-4 object-contain" /> {p.bombs}
                            </div>
                            <div className="flex items-center gap-1"><Flame size={14} strokeWidth={3} /> {p.range}</div>
                            <div className="flex items-center gap-1"><Footprints size={14} strokeWidth={3} /> {Math.round(((360 - (p.speed || 360)) / 40) + 1)}</div>
                        </div>
                    </div>
                ))}
            </div>

            {/* Game Over Modal */}
            {gameOver && (
                <div className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-white/95 backdrop-blur-md p-4 text-center">
                    <h1 className="text-5xl md:text-7xl font-black text-joy-pink drop-shadow-[0_4px_0_#fff] mb-8 animate-bounce leading-tight">
                        {gameOver.winner === playerId ? "VOCÊ VENCEU! ✨" : "TENTE DE NOVO! 🌸"}
                    </h1>
                    <div className="flex flex-col gap-4">
                        <button
                            onClick={() => {
                                if (rematchVotes.includes(playerId)) return;
                                const newVotes = [...new Set([...rematchVotes, playerId])];
                                setRematchVotes(newVotes);
                                channel.send({ type: 'broadcast', event: 'vote_restart', payload: { id: playerId } });
                                if (isHost && newVotes.length >= 2) onRestart();
                            }}
                            className="px-12 py-5 bg-joy-pink text-white rounded-3xl text-2xl font-black uppercase tracking-widest transition-all shadow-[0_10px_0_#e6789b] active:translate-y-1 active:shadow-none disabled:opacity-50"
                            disabled={rematchVotes.includes(playerId)}
                        >
                            {rematchVotes.includes(playerId) ? `Aguardando... (${rematchVotes.length}/2)` : "JOGAR MAIS! ♡"}
                        </button>
                        <button onClick={onLeave} className="px-8 py-3 bg-transparent border-4 border-joy-pink/20 text-joy-pink/60 hover:text-joy-pink hover:border-joy-pink rounded-3xl text-sm font-black uppercase tracking-widest transition-all">
                            Voltar ao Início
                        </button>
                    </div>
                </div>
            )}

            {/* Quit Button */}
            <div className="absolute bottom-8 right-8 flex gap-2 z-40">
                <button
                    onClick={onToggleAudio}
                    className="p-4 bg-white border-4 border-joy-pink/20 text-joy-pink hover:bg-joy-pink hover:text-white rounded-2xl transition-all font-black text-xs shadow-lg"
                    title={isAudioEnabled ? "Mutar Música" : "Tocar Música"}
                >
                    {isAudioEnabled ? <Volume2 size={18} /> : <VolumeX size={18} />}
                </button>
                <button
                    onClick={onLeave}
                    className="p-4 bg-white border-4 border-joy-pink/20 text-joy-pink hover:bg-joy-pink hover:text-white rounded-2xl transition-all font-black text-xs shadow-lg uppercase tracking-widest"
                    title="Sair do Jogo"
                >
                    ✕ SAIR DA PARTIDA
                </button>
            </div>

            {/* Board Container */}
            <div
                className="relative bg-joy-ground-purple border-8 border-joy-deep-purple rounded-[4rem] shadow-[0_30px_60px_rgba(254,148,180,0.2)] p-12"
                style={{
                    width: GRID_WIDTH * CELL_SIZE + 112, // (p-12 = 96) + (border-8 = 16)
                    height: GRID_HEIGHT * CELL_SIZE + 112,
                }}
            >
                {/* Inner container for active game elements */}
                <div className="relative w-full h-full">
                    {/* Grid Floor */}
                    <div className="absolute inset-0 opacity-20 pointer-events-none"
                        style={{
                            backgroundImage: `linear-gradient(#333 1px, transparent 1px), linear-gradient(90deg, #333 1px, transparent 1px)`,
                            backgroundSize: `${CELL_SIZE}px ${CELL_SIZE}px`
                        }}
                    />

                    {/* Map Objects */}
                    {map.map((cell, i) => {
                        const x = i % GRID_WIDTH;
                        const y = Math.floor(i / GRID_WIDTH);
                        if (cell.type === BLOCK.EMPTY) return null;
                        return (
                            <div
                                key={i}
                                className="absolute top-0 left-0"
                                style={{
                                    width: CELL_SIZE, height: CELL_SIZE,
                                    transform: `translate(${x * CELL_SIZE}px, ${y * CELL_SIZE}px)`
                                }}
                            >
                                {cell.type === BLOCK.WALL && <WallSprite />}
                                {cell.type === BLOCK.CRATE && <CrateSprite />}
                            </div>
                        );
                    })}

                    {/* Items */}
                    {items.map((item, i) => (
                        <div
                            key={`item-${i}`}
                            className="absolute flex items-center justify-center animate-bounce-slow"
                            style={{
                                width: CELL_SIZE, height: CELL_SIZE,
                                transform: `translate(${item.x * CELL_SIZE}px, ${item.y * CELL_SIZE}px)`
                            }}
                        >
                            {item.type === POWERUP.BOMB && <Bomb className="text-joy-wall-purple" size={32} />}
                            {item.type === POWERUP.FIRE && <Flame className="text-joy-wall-purple" size={32} />}
                            {item.type === POWERUP.SPEED && <Footprints className="text-joy-wall-purple" size={32} />}
                        </div>
                    ))}

                    {/* Bombs */}
                    {bombs.map((bomb) => (
                        <div
                            key={bomb.id}
                            className="absolute flex items-center justify-center z-10"
                            style={{
                                width: CELL_SIZE, height: CELL_SIZE,
                                transform: `translate(${bomb.x * CELL_SIZE}px, ${bomb.y * CELL_SIZE}px)`
                            }}
                        >
                            <div className="w-full h-full scale-90">
                                <BombSprite />
                            </div>
                        </div>
                    ))}

                    {/* Explosions */}
                    {explosions.map((exp) => (
                        <div
                            key={exp.id}
                            className="absolute flex items-center justify-center z-20"
                            style={{
                                width: CELL_SIZE, height: CELL_SIZE,
                                transform: `translate(${exp.x * CELL_SIZE}px, ${exp.y * CELL_SIZE}px)`
                            }}
                        >
                            <ExplosionSprite />
                        </div>
                    ))}

                    {/* Players */}
                    {Object.entries(players).map(([pid, p]) => {
                        const isInvincible = p.invincibleUntil && Date.now() < p.invincibleUntil;
                        return (
                            <div
                                key={pid}
                                className={clsx(
                                    "absolute flex items-center justify-center z-30 transition-all duration-100",
                                    isInvincible && "animate-blink"
                                )}
                                style={{
                                    width: CELL_SIZE, height: CELL_SIZE,
                                    transform: `translate(${p.x * CELL_SIZE}px, ${p.y * CELL_SIZE}px)`
                                }}
                            >
                                <div className="w-full h-full scale-110">
                                    <PlayerSprite color={p.color} isSelf={pid === playerId} character={p.character} />
                                </div>
                                <div className={`absolute -top-5 text-[10px] font-black px-2 py-0.5 rounded-full shadow-sm whitespace-nowrap bg-white border-2 ${pid === playerId ? "text-joy-mint border-joy-mint" : "text-joy-pink border-joy-pink"}`}>
                                    {p.name || (pid === playerId ? "VOCÊ" : "INIMIGO")}
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* Footer Instructions */}
            <div className="mt-8 text-joy-pink/40 text-[10px] font-black uppercase tracking-[0.2em]">
                WASD • SETAS • ESPAÇO
            </div>
        </div>
    );
}
