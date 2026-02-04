import React, { useState, useEffect, useRef } from 'react';
import { supabase } from './lib/supabase';
import Game from './components/Game';
import { generateMap, GRID_WIDTH, GRID_HEIGHT } from './utils/gameLogic';
import { Copy, Loader2, Play, RefreshCw, Terminal, Volume2, VolumeX, Check } from 'lucide-react';
import clsx from 'clsx';

// --- CONFIGURAÇÕES VISUAIS ---
const BG_ICON_OPACITY = 0.5; // Ajuste entre 0 e 1 (0.5 = 50% de opacidade)
const BG_SCROLL_SPEED = 50;  // Segundos para completar um ciclo (menor = mais rápido)

export default function App() {
  const [roomId, setRoomId] = useState('');
  const [isInGame, setIsInGame] = useState(false);
  const [isHost, setIsHost] = useState(false);
  const [status, setStatus] = useState('lobby');
  const [playerName, setPlayerName] = useState(localStorage.getItem('bomberName') || `Player${Math.floor(Math.random() * 999)}`);
  const [playerId] = useState(`player-${Math.floor(Math.random() * 10000)}`);
  const [selectedCharacter, setSelectedCharacter] = useState(null); // 'hello' ou 'menino'

  const [channel, setChannel] = useState(null);
  const [presence, setPresence] = useState({});
  const [realtimeStatus, setRealtimeStatus] = useState('DISCONNECTED');
  const [logs, setLogs] = useState([]); // On-screen logs
  const [isOffline, setIsOffline] = useState(false);

  const [map, setMap] = useState(null);
  const [players, setPlayers] = useState({});

  const presenceRef = useRef({});
  const channelRef = useRef(null);
  const lobbyMusicRef = useRef(null);
  const [isAudioEnabled, setIsAudioEnabled] = useState(true);

  useEffect(() => {
    presenceRef.current = presence;
  }, [presence]);

  const addLog = (msg) => {
    const time = new Date().toLocaleTimeString();
    setLogs(prev => [`[${time}] ${msg}`, ...prev].slice(0, 50));
    console.log(`[App] ${msg}`);
  };

  // Lobby Music Effect
  useEffect(() => {
    if (!isInGame && isAudioEnabled) {
      if (!lobbyMusicRef.current) {
        lobbyMusicRef.current = new Audio('/sounds/Menu musica.mp3');
        lobbyMusicRef.current.loop = true;
        lobbyMusicRef.current.volume = 0.4;
      }
      lobbyMusicRef.current.play().catch(e => console.log("Audio play blocked by browser"));
    } else {
      if (lobbyMusicRef.current) {
        lobbyMusicRef.current.pause();
      }
    }
  }, [isInGame, isAudioEnabled]);

  const createGame = () => {
    const newRoomId = Math.floor(10000 + Math.random() * 90000).toString();
    addLog(`Creating Room: ${newRoomId}`);
    joinRoom(newRoomId);
  };

  const joinRoom = async (id) => {
    const cleanId = id.replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
    setRoomId(cleanId);

    if (!cleanId) return;

    // Cleanup old
    if (channelRef.current) {
      addLog('Leaving previous channel...');
      await supabase.removeChannel(channelRef.current);
      setChannel(null);
      channelRef.current = null;
    }

    addLog(`Connecting to room:${cleanId} as ${playerId}...`);

    const newChannel = supabase.channel(`room:${cleanId}`, {
      config: {
        presence: { key: playerId } // Force using our ID as key for easier debugging
      }
    });

    channelRef.current = newChannel;

    newChannel
      .on('presence', { event: 'sync' }, () => {
        const state = newChannel.presenceState();
        addLog(`Presence Sync: ${Object.keys(state).length} users found.`);
        setPresence(state);

        // Host logic: First valid user sorted by online_at
        const allUsers = [];
        for (const key in state) {
          if (state[key].length > 0) allUsers.push(state[key][0]);
        }
        allUsers.sort((a, b) => (a.online_at || '') < (b.online_at || '') ? -1 : 1);

        const amIHost = allUsers.length > 0 && allUsers[0].id === playerId;
        setIsHost(amIHost);
        if (amIHost) addLog('I am the Host');
      })
      .on('presence', { event: 'join' }, ({ key, newPresences }) => {
        addLog(`User Joined: ${key}`);
      })
      .on('presence', { event: 'leave' }, ({ key, leftPresences }) => {
        addLog(`User Left: ${key}`);
      })
      .on('broadcast', { event: 'init_game' }, ({ payload }) => {
        addLog(`Game Started by Host! Received ${payload.map?.length} tiles.`);
        setMap(payload.map);
        setPlayers(payload.players);
        setStatus('playing');
        setIsInGame(true);
      })
      .on('broadcast', { event: 'request_restart' }, () => {
        // Restart logic...
        addLog('Restart Requested');
        const state = newChannel.presenceState();
        // ... (Host handles this)
        // Simplified: If Im host, just restart
        if (channelRef.current) {
          // Re-calc host logic to be safe
          const allUsers = [];
          for (const key in state) if (state[key].length > 0) allUsers.push(state[key][0]);
          allUsers.sort((a, b) => (a.online_at || '') < (b.online_at || '') ? -1 : 1);
          if (allUsers.length >= 2 && allUsers[0].id === playerId) {
            startGameLocal(allUsers[0], allUsers[1], newChannel);
          }
        }
      })
      .subscribe(async (status, err) => {
        setRealtimeStatus(status);
        addLog(`Connection Status: ${status}`);

        if (status === 'SUBSCRIBED') {
          const trackStatus = await newChannel.track({
            online_at: new Date().toISOString(),
            id: playerId,
            name: playerName, // Include name in presence
            character: selectedCharacter
          });
          addLog(`Tracking Presence: ${trackStatus}`);
        }

        if (status === 'CHANNEL_ERROR') {
          addLog(`Error: ${err?.message}`);
        }
      });

    setChannel(newChannel);
    setStatus('waiting_for_opponent');
  };

  const updateCharacterSelection = async (char) => {
    setSelectedCharacter(char);
    if (channelRef.current) {
      await channelRef.current.track({
        online_at: new Date().toISOString(),
        id: playerId,
        name: playerName,
        character: char
      });
    }
  };

  const getConnectedPlayers = () => {
    const list = [];
    for (const key in presence) {
      presence[key].forEach(p => list.push(p));
    }
    return list;
  };

  const startGameLocal = (p1, p2, chan) => {
    if (!p1 || !p2) {
      addLog('Error: Cannot start game - missing players');
      return;
    }
    addLog(`Starting Game: ${p1.name || 'P1'} vs ${p2.name || 'P2'}`);
    const newMap = generateMap();
    if (!newMap) {
      addLog('Error: Failed to generate map');
      return;
    }
    const initialPlayers = {
      [p1.id]: { x: 0, y: 0, color: 'blue', bombs: 1, range: 1, lives: 3, alive: true, speed: 360, name: p1.name || 'Player 1', character: p1.character || 'hello' },
      [p2.id]: { x: GRID_WIDTH - 1, y: GRID_HEIGHT - 1, color: 'pink', bombs: 1, range: 1, lives: 3, alive: true, speed: 360, name: p2.name || 'Player 2', character: p2.character || 'menino' }
    };

    // Set data first, THEN trigger view change
    setMap(newMap);
    setPlayers(initialPlayers);
    setStatus('playing');
    setIsInGame(true);
    addLog('State updated: isInGame = true');

    chan.send({
      type: 'broadcast',
      event: 'init_game',
      payload: {
        map: newMap,
        players: initialPlayers
      }
    });
  };

  const startSinglePlayer = () => {
    addLog('Starting Single Player Mode...');
    const newMap = generateMap();
    const p1 = { id: playerId, name: playerName, character: selectedCharacter || 'hello' };
    const p2 = { id: 'bot-npc', name: 'INIMIGO', character: 'npc' };

    const initialPlayers = {
      [p1.id]: { x: 0, y: 0, color: 'blue', bombs: 1, range: 1, lives: 5, alive: true, speed: 360, name: p1.name, character: p1.character },
      [p2.id]: { x: GRID_WIDTH - 1, y: GRID_HEIGHT - 1, color: 'pink', bombs: 1, range: 1, lives: 5, alive: true, speed: 360, name: p2.name, character: p2.character }
    };

    setIsOffline(true);
    setMap(newMap);
    setPlayers(initialPlayers);
    setStatus('playing');
    setIsInGame(true);
    setIsHost(true);
  };

  const handleRestart = () => {
    addLog('Restart clicked');
    if (isOffline) {
      startSinglePlayer();
      return;
    }
    if (isHost) {
      const list = getConnectedPlayers().sort((a, b) => (a.online_at || '') < (b.online_at || '') ? -1 : 1);
      if (list.length >= 2) startGameLocal(list[0], list[1], channel);
    } else if (channel) {
      channel.send({ type: 'broadcast', event: 'request_restart', payload: {} });
    }
  };

  const handleLeaveGame = () => {
    if (channelRef.current) {
      auth_cleanup();
    }
    setPresence({});
    setIsInGame(false);
    setIsOffline(false);
    setStatus('lobby');
    setMap(null);
    setRoomId('');
    setLogs([]);
  };

  const auth_cleanup = async () => {
    if (channelRef.current) {
      await supabase.removeChannel(channelRef.current);
      setChannel(null);
      channelRef.current = null;
    }
  }

  // Helper for animated background
  const LobbyBackground = () => (
    <div className="absolute inset-0 overflow-hidden pointer-events-none flex flex-col justify-around py-8">
      {Array.from({ length: 8 }).map((_, rowIndex) => (
        <div
          key={rowIndex}
          className={`flex whitespace-nowrap gap-12 ${rowIndex % 2 === 0 ? 'animate-marquee-left' : 'animate-marquee-right'}`}
          style={{ animationDuration: `${BG_SCROLL_SPEED}s` }}
        >
          {Array.from({ length: 20 }).map((_, iconIndex) => (
            <img
              key={iconIndex}
              src="/images/icone.png"
              alt=""
              className="h-16 w-16 object-contain rotate-12"
              style={{ opacity: BG_ICON_OPACITY }}
            />
          ))}
          {/* Double for seamless loop */}
          {Array.from({ length: 20 }).map((_, iconIndex) => (
            <img
              key={`dup-${iconIndex}`}
              src="/images/icone.png"
              alt=""
              className="h-16 w-16 object-contain rotate-12"
              style={{ opacity: BG_ICON_OPACITY }}
            />
          ))}
        </div>
      ))}
    </div>
  );


  return (
    <div className="bg-joy-bg min-h-screen text-gray-800 font-sans flex relative overflow-hidden transition-all duration-500">
      {!isInGame && <LobbyBackground />}
      {/* LEFT: Game Area */}
      <div className={`flex-1 flex flex-col items-center justify-start md:justify-center p-4 pt-12 md:pt-4 transition-all duration-300 ${!isInGame ? 'w-full' : ''}`}>

        {!isInGame && (
          <>
            <div className="w-full max-w-md bg-white border-4 border-joy-pink p-6 rounded-[2rem] shadow-[0_20px_50px_rgba(254,148,180,0.3)] relative overflow-y-auto my-4 max-h-[90vh] flex flex-col">
              {/* Audio Toggle Button */}
              <button
                onClick={() => setIsAudioEnabled(!isAudioEnabled)}
                className="absolute top-4 right-4 z-50 p-2 bg-white/80 backdrop-blur-sm border-2 border-joy-pink/20 rounded-full text-joy-pink hover:bg-joy-pink hover:text-white transition-all shadow-sm"
                title={isAudioEnabled ? "Mutar Música" : "Tocar Música"}
              >
                {isAudioEnabled ? <Volume2 size={18} /> : <VolumeX size={18} />}
              </button>
              {/* Header / Cover */}
              <div className="relative h-44 -mx-6 -mt-6 mb-4 overflow-hidden">
                <img
                  src="/images/capa do jogo.png"
                  alt="JoyBomber Cover"
                  className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-white via-transparent to-transparent"></div>
              </div>

              <div className="text-center mb-4 flex flex-col items-center">
                <img
                  src="/images/nome do jogo.png"
                  alt="JoyBomber Logo"
                  className="h-16 object-contain drop-shadow-[0_2px_10px_rgba(254,148,180,0.3)] animate-float"
                />
                <p className="text-[10px] text-joy-deep-purple/60 tracking-[0.2em] font-black uppercase mt-2">Para tirar você do tédio</p>
              </div>

              <div className="mb-4 space-y-1">
                <label className="text-[15px] text-joy-pink font-black tracking-widest uppercase ml-1">✧ SEU NOME ✧</label>
                <input
                  type="text"
                  className="w-full bg-joy-bg/50 border-2 border-joy-rosinha/80 focus:border-joy-pink p-3 text-center tracking-widest outline-none uppercase font-black text-base rounded-2xl transition-all text-joy-roxo/60 placeholder:text-joy-pink/80"
                  placeholder="NOME"
                  maxLength={8}
                  value={playerName}
                  onChange={e => {
                    const val = e.target.value.toUpperCase();
                    setPlayerName(val);
                    localStorage.setItem('bomberName', val);
                  }}
                />
              </div>

              {status === 'lobby' ? (
                <div className="space-y-3">
                  <button onClick={createGame} className="w-full py-3 bg-joy-pink text-white rounded-2xl font-black tracking-widest hover:bg-joy-pink/90 hover:scale-[1.02] shadow-lg shadow-joy-pink/30 flex items-center justify-center gap-2 transition-all">
                    <Play size={18} fill="currentColor" /> CRIAR SALA
                  </button>
                  <button onClick={startSinglePlayer} className="w-full py-3 bg-joy-roxo/40 border-4 border-joy-roxo/30 text-joy-roxo rounded-2xl font-black tracking-widest hover:bg-joy-roxo hover:text-white hover:scale-[1.02] shadow-lg shadow-joy-pink/10 flex items-center justify-center gap-2 transition-all">
                    JOGAR SOZINHA
                  </button>
                  <div className="flex flex-col gap-2">
                    <input
                      type="text"
                      className="w-full bg-joy-bg/50 border-2 border-joy-lavender/50 p-3 text-center tracking-[0.2em] font-black focus:border-joy-lavender outline-none rounded-2xl text-sm text-joy-roxo/60"
                      placeholder="CÓDIGO"
                      maxLength={5}
                      value={roomId}
                      onChange={e => setRoomId(e.target.value.replace(/[^0-9]/g, ''))}
                    />
                    <button onClick={() => roomId && joinRoom(roomId)} className="w-full py-4 bg-joy-roxo/70 text-white font-black rounded-2xl hover:bg-joy-roxo/90 shadow-lg shadow-joy-lavender/30 transition-all text-sm uppercase tracking-widest">
                      ENTRAR NA SALA
                    </button>
                  </div>
                </div>
              ) : (
                <div className="text-center space-y-2 py-1">
                  <div className="text-2xl font-black text-joy-pink tracking-widest animate-bounce">
                    {roomId}
                  </div>

                  {/* Character Selection */}
                  <div className="bg-joy-bg/30 p-4 rounded-2xl border-2 border-joy-pink/10 my-4">
                    <p className="text-[10px] font-black text-joy-pink uppercase tracking-widest mb-3">ESCOLHA SEU PERSONAGEM</p>
                    <div className="flex justify-center gap-6">
                      {['hello', 'menino', 'npc'].map(char => {
                        const isTaken = getConnectedPlayers().some(p => p.id !== playerId && p.character === char);
                        const isSelected = selectedCharacter === char;
                        return (
                          <button
                            key={char}
                            disabled={isTaken}
                            onClick={() => updateCharacterSelection(char)}
                            className={clsx(
                              "relative group transition-all p-2 rounded-2xl border-4",
                              isSelected ? "border-joy-pink bg-white shadow-lg scale-110" : "border-transparent bg-white/50 hover:bg-white",
                              isTaken && "opacity-20 grayscale pointer-events-none"
                            )}
                          >
                            <img
                              src={`/images/player_${char}.png`}
                              alt={char}
                              className="w-16 h-16 object-contain"
                            />
                            {isSelected && <div className="absolute -top-2 -right-2 bg-joy-pink text-white rounded-full p-1"><Check size={12} strokeWidth={4} /></div>}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <div className="text-[9px] text-joy-pink/40 font-black uppercase tracking-widest">
                    Esperando Oponente...
                  </div>
                  <div className="flex justify-center flex-col items-center gap-1">
                    <div className="w-8 h-8 border-4 border-joy-bg border-t-joy-pink rounded-full animate-spin"></div>
                    <span className="text-[9px] font-black text-joy-pink/60 uppercase">
                      Amiguinhos: {getConnectedPlayers().length}
                    </span>
                  </div>

                  {isHost && getConnectedPlayers().length >= 2 && (
                    <button
                      onClick={() => {
                        const list = getConnectedPlayers().sort((a, b) => (a.online_at || '') < (b.online_at || '') ? -1 : 1);
                        startGameLocal(list[0], list[1], channel);
                      }}
                      className="w-full py-4 bg-joy-verde text-white font-black text-lg rounded-2xl animate-pulse shadow-lg shadow-joy-mint/30 hover:scale-105 transition-all"
                    >
                      COMEÇAR AVENTURA!
                    </button>
                  )}

                  <button onClick={handleLeaveGame} className="text-joy-roxo/80 hover:text-joy-pink underline text-[10px] font-black uppercase">
                    Voltar / Cancelar
                  </button>

                </div>
              )}
            </div>
            <div className="mt-6 inline-flex items-center px-4 py-1.5 bg-joy-rosinha/30 backdrop-blur-sm border-2 border-joy-pink/20 rounded-full shadow-sm animate-fade-in">
              <p className="text-[9px] font-black text-joy-deep-purple/70 uppercase tracking-[0.3em]">Criado por Deloam • v2.5</p>
            </div>
          </>
        )}

        {isInGame && map ? (
          <Game
            key={JSON.stringify(map)}
            channel={channel}
            playerId={playerId}
            isHost={isHost}
            initialMap={map}
            initialPlayers={players}
            onRestart={handleRestart}
            onLeave={handleLeaveGame}
            isAudioEnabled={isAudioEnabled}
            onToggleAudio={() => setIsAudioEnabled(!isAudioEnabled)}
            isOffline={isOffline}
          />
        ) : null}
      </div>
    </div>
  );
}
