import React from 'react';

const COLORS = {
    p1: '#99f6e4', // Mint
    p2: '#fe94b4', // Pink
    wall: '#842996', // Dark Purple
    crate: '#fef08a', // Yellow
};

export const WallSprite = () => (
    <svg viewBox="0 0 100 100" className="w-full h-full drop-shadow-sm">
        <rect x="5" y="5" width="90" height="90" fill={COLORS.wall} rx="15" />
        <rect x="15" y="15" width="70" height="70" fill="none" stroke="white" strokeWidth="4" strokeDasharray="8 4" rx="10" opacity="0.3" />
        <circle cx="20" cy="20" r="4" fill="white" />
        <circle cx="80" cy="20" r="4" fill="white" />
        <circle cx="20" cy="80" r="4" fill="white" />
        <circle cx="80" cy="80" r="4" fill="white" />
        <path d="M50 35 L55 45 L65 45 L57 52 L60 62 L50 55 L40 62 L43 52 L35 45 L45 45 Z" fill="white" />
    </svg>
);

export const CrateSprite = () => (
    <svg viewBox="0 0 100 100" className="w-full h-full animate-pulse-slow">
        <rect x="8" y="8" width="84" height="84" fill="#fef08a" rx="12" />
        <rect x="42" y="8" width="16" height="84" fill="#fe94b4" />
        <rect x="8" y="42" width="84" height="16" fill="#fe94b4" />
        <path d="M40 40 Q50 30 60 40 Q70 50 60 60 Q50 70 40 60 Q30 50 40 40" fill="#fe94b4" stroke="white" strokeWidth="2" />
        <circle cx="50" cy="50" r="6" fill="white" />
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
    const imgSrc = character === 'menino' ? '/images/player_menino.png' : '/images/player_hello.png';

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
        <path d="M50 85 C20 65 20 35 50 35 C80 35 80 65 50 85" fill="#fe94b4" opacity="0.6" className="animate-ping" />
        <circle cx="50" cy="50" r="20" fill="#fef08a" opacity="0.4" className="animate-pulse" />
        <path d="M50 50 L50 20 M50 50 L80 50 M50 50 L50 80 M50 50 L20 50" stroke="white" strokeWidth="6" strokeLinecap="round" opacity="0.8" />
    </svg>
);
