/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'sans-serif'],
      },
      colors: {
        // Keep apple tokens as aliases to plain colors so existing pages don't break
        apple: {
          blue:    '#2563eb',
          bluehov: '#1d4ed8',
          gray1:   '#111827',
          gray2:   '#1f2937',
          gray3:   '#374151',
          gray4:   '#6b7280',
          gray5:   '#9ca3af',
          gray6:   '#d1d5db',
          gray7:   '#e5e7eb',
          gray8:   '#f3f4f6',
          gray9:   '#f9fafb',
          white:   '#ffffff',
        },
      },
      boxShadow: {
        'apple-sm': '0 1px 2px rgba(0,0,0,0.05)',
        'apple':    '0 1px 3px rgba(0,0,0,0.07), 0 1px 2px rgba(0,0,0,0.04)',
        'apple-lg': '0 4px 12px rgba(0,0,0,0.06), 0 1px 3px rgba(0,0,0,0.04)',
        'apple-xl': '0 8px 24px rgba(0,0,0,0.08)',
      },
      borderRadius: {
        'apple':    '10px',
        'apple-lg': '14px',
        'apple-xl': '18px',
      },
    },
  },
  plugins: [],
};
