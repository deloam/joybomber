import React from 'react';

const COLORS = {
    p1: '#99f6e4', // Mint
    p2: '#fe94b4', // Pink
    wall: '#842996', // Dark Purple
    crate: '#fef08a', // Yellow
};

export const WallSprite = () => (
    <svg viewBox="0 0 100 100" className="w-full h-full drop-shadow-md">
        <rect x="5" y="18" width="90" height="82" fill="#581669" rx="15" />
        <rect x="5" y="5" width="90" height="82" fill={COLORS.wall} rx="15" />
        <rect x="15" y="15" width="70" height="62" fill="none" stroke="white" strokeWidth="4" strokeDasharray="8 4" rx="10" opacity="0.3" />
        <path d="M50 30 L55 40 L65 40 L57 47 L60 57 L50 50 L40 57 L43 47 L35 40 L45 40 Z" fill="white" />
    </svg>
);

export const CrateSprite = () => (
    <svg viewBox="0 0 100 100" className="w-full h-full">
        <rect x="8" y="18" width="84" height="78" fill="#d1b84f" rx="12" />
        <rect x="8" y="8" width="84" height="74" fill="#fef08a" rx="12" />
        <rect x="42" y="8" width="16" height="74" fill="#fe94b4" />
        <rect x="8" y="38" width="84" height="16" fill="#fe94b4" />
        <circle cx="50" cy="46" r="6" fill="white" />
    </svg>
);

export const BombSprite = () => (
    <div className="w-full h-full relative flex items-center justify-center">
        <img
            src="/images/icone.png"
            alt="Bomb"
            className="w-[85%] h-[85%] object-contain drop-shadow-[0_0_10px_rgba(254,148,180,0.5)] animate-pulse"
        />
        {/* Fuse and Spark on top of the image */}
        <div className="absolute top-0 right-0 w-full h-full pointer-events-none">
            <svg viewBox="0 0 100 100" className="w-full h-full">
                <path d="M60 35 Q 70 20 80 20" fill="none" stroke="#d8b4fe" strokeWidth="4" strokeLinecap="round" />
                <circle cx="80" cy="20" r="4" fill="#fef08a" className="animate-ping" />
            </svg>
        </div>
    </div>
);

export const PlayerSprite = ({ color, isSelf, character }) => {
    const mainColor = color === 'blue' ? COLORS.p1 : COLORS.p2;
    let imgSrc = '/images/player_hello.png';
    if (character === 'menino') imgSrc = '/images/player_menino.png';
    else if (character === 'npc') imgSrc = '/images/player_npc.png';

    return (
        <div className="w-full h-full relative flex items-center justify-center">
            {/* Sombra */}
            <div className="absolute bottom-1 w-8 h-2 bg-black/10 rounded-full blur-[2px]"></div>

            <img
                src={imgSrc}
                alt="Player"
                className="w-full h-full object-contain relative z-10"
            />

            {isSelf && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 z-20">
                    <div className={`w-3 h-3 bg-white border-2 ${color === 'blue' ? 'border-joy-mint' : 'border-joy-pink'} rounded-full animate-bounce shadow-sm`}></div>
                </div>
            )}
        </div>
    );
};

export const ExplosionSprite = () => (
    <svg viewBox="0 0 100 100" className="w-full h-full">
        <defs>
            <radialGradient id="fireGrad" cx="50%" cy="50%" r="50%">
                <stop offset="0%" stopColor="#ffffff" />
                <stop offset="40%" stopColor="#fef08a" />
                <stop offset="80%" stopColor="#fe94b4" />
                <stop offset="100%" stopColor="#842996" stopOpacity="0" />
            </radialGradient>
        </defs>
        <circle cx="50" cy="50" r="45" fill="url(#fireGrad)" className="animate-pulse" />
        <path d="M50 5 L60 35 L90 40 L65 55 L75 85 L50 70 L25 85 L35 55 L10 40 L40 35 Z" fill="#fe94b4" className="animate-ping" opacity="0.7" />
        <path d="M50 15 L58 38 L82 42 L62 55 L70 78 L50 65 L30 78 L38 55 L18 42 L42 38 Z" fill="#fef08a" className="animate-pulse" />
        <circle cx="50" cy="50" r="15" fill="white" />
    </svg>
);
