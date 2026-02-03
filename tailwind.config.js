/** @type {import('tailwindcss').Config} */
export default {
    content: [
        "./index.html",
        "./src/**/*.{js,ts,jsx,tsx}",
    ],
    theme: {
        extend: {
            colors: {
                neon: {
                    blue: '#00f3ff',
                    pink: '#ff00ff',
                    purple: '#bc13fe',
                    green: '#0aff00',
                },
                cyber: {
                    dark: '#050510',
                    panel: '#151525',
                    border: '#2a2a40',
                },
                joy: {
                    rosa2: '#ff00ff',
                    rosinha: '#ffb4eb',
                    pink: '#fe94b4',
                    roxo: '#7d2fd0ff',
                    lavender: '#d8b4fe',
                    yellow: '#fef08a',
                    mint: '#99f6e4',
                    verde: '#8af0bf',
                    cream: '#fffdf5',
                    bg: '#fff5f8',
                    border: '#f9a8d4',
                    'deep-purple': '#3b0764',
                    'ground-purple': '#d2adf2',
                    'wall-purple': '#842996'
                }
            },
            boxShadow: {
                'neon-blue': '0 0 10px #00f3ff, 0 0 20px #00f3ff',
                'neon-pink': '0 0 10px #ff00ff, 0 0 20px #ff00ff',
            },
            animation: {
                'pulse-fast': 'pulse 1s cubic-bezier(0.4, 0, 0.6, 1) infinite',
                'float': 'float 3s ease-in-out infinite',
            },
            keyframes: {
                float: {
                    '0%, 100%': { transform: 'translateY(0)' },
                    '50%': { transform: 'translateY(-5px)' },
                }
            }
        },
    },
    plugins: [],
}
