/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'sans-serif'],
      },
      colors: {
        apple: {
          blue:    '#0071e3',
          bluehov: '#0077ed',
          gray1:   '#1d1d1f',
          gray2:   '#424245',
          gray3:   '#6e6e73',
          gray4:   '#86868b',
          gray5:   '#aeaeb2',
          gray6:   '#d1d1d6',
          gray7:   '#e5e5ea',
          gray8:   '#f2f2f7',
          gray9:   '#f5f5f7',
          white:   '#ffffff',
        },
      },
      boxShadow: {
        'apple-sm': '0 1px 3px rgba(0,0,0,0.08), 0 1px 2px rgba(0,0,0,0.04)',
        'apple':    '0 4px 16px rgba(0,0,0,0.08), 0 1px 4px rgba(0,0,0,0.04)',
        'apple-lg': '0 8px 32px rgba(0,0,0,0.10), 0 2px 8px rgba(0,0,0,0.06)',
        'apple-xl': '0 20px 60px rgba(0,0,0,0.12), 0 4px 16px rgba(0,0,0,0.08)',
      },
      borderRadius: {
        'apple': '12px',
        'apple-lg': '18px',
        'apple-xl': '24px',
      },
    },
  },
  plugins: [],
};
