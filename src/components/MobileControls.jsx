import React, { useState, useEffect, useRef } from 'react';

export const VirtualJoystick = ({ onMove }) => {
    const [isDragging, setIsDragging] = useState(false);
    const [stickPos, setStickPos] = useState({ x: 0, y: 0 });
    const baseRef = useRef(null);

    const handleStart = (e) => {
        setIsDragging(true);
        handleMove(e);
    };

    const handleEnd = () => {
        setIsDragging(false);
        setStickPos({ x: 0, y: 0 });
        onMove({ x: 0, y: 0 });
    };

    const handleMove = (e) => {
        if (!isDragging && e.type !== 'touchstart' && e.type !== 'mousedown') return;

        const base = baseRef.current;
        if (!base) return;

        const rect = base.getBoundingClientRect();
        const centerX = rect.left + rect.width / 2;
        const centerY = rect.top + rect.height / 2;

        const clientX = e.touches ? e.touches[0].clientX : e.clientX;
        const clientY = e.touches ? e.touches[0].clientY : e.clientY;

        let dx = clientX - centerX;
        let dy = clientY - centerY;

        const distance = Math.sqrt(dx * dx + dy * dy);
        const maxRadius = rect.width / 2;

        if (distance > maxRadius) {
            dx = (dx / distance) * maxRadius;
            dy = (dy / distance) * maxRadius;
        }

        setStickPos({ x: dx, y: dy });

        // Normalize for the game logic (-1 to 1)
        onMove({ x: dx / maxRadius, y: dy / maxRadius });
    };

    useEffect(() => {
        if (isDragging) {
            window.addEventListener('mousemove', handleMove);
            window.addEventListener('mouseup', handleEnd);
            window.addEventListener('touchmove', handleMove, { passive: false });
            window.addEventListener('touchend', handleEnd);
        }
        return () => {
            window.removeEventListener('mousemove', handleMove);
            window.removeEventListener('mouseup', handleEnd);
            window.removeEventListener('touchmove', handleMove);
            window.removeEventListener('touchend', handleEnd);
        };
    }, [isDragging]);

    return (
        <div
            ref={baseRef}
            className="w-32 h-32 bg-white/20 backdrop-blur-md rounded-full border-4 border-white/30 relative touch-none flex items-center justify-center shadow-xl"
            onMouseDown={handleStart}
            onTouchStart={handleStart}
        >
            <div
                className="w-14 h-14 bg-white/80 rounded-full shadow-lg border-2 border-white pointer-events-none transition-transform duration-75"
                style={{
                    transform: `translate(${stickPos.x}px, ${stickPos.y}px)`,
                    boxShadow: '0 0 20px rgba(0,0,0,0.2)'
                }}
            />
        </div>
    );
};

export const BombButton = ({ onPress }) => {
    return (
        <button
            onTouchStart={(e) => {
                e.preventDefault();
                onPress();
            }}
            onMouseDown={(e) => {
                e.preventDefault();
                onPress();
            }}
            className="w-24 h-24 bg-joy-pink/80 active:bg-joy-rosa2 backdrop-blur-md rounded-full border-8 border-white/30 flex items-center justify-center shadow-2xl active:scale-95 transition-all touch-none select-none"
        >
            <img src="/images/icone.png" alt="Bomb" className="w-12 h-12 object-contain" />
        </button>
    );
};
