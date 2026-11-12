export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}"
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        sky: {
          50: '#F0F9FF',
          100: '#E0F2FE',
          200: '#BAE6FD',
          300: '#7DD3FC',
          400: '#38BDF8',
          500: '#0EA5E9',
          600: '#0284C7',
          700: '#0369A1',
          800: '#075985',
          900: '#0C4A6E',
          950: '#082F49'
        }
      },
      fontFamily: {
        // 預設全站內文與小標題：思源黑體 (Noto Sans TC)
        sans: [
          '"Noto Sans TC"',
          '"Noto Sans CJK TC"',
          '"Source Han Sans TC"',
          '"Source Han Sans"',
          '"思源黑體"',
          '-apple-system',
          'BlinkMacSystemFont',
          '"Segoe UI"',
          'Roboto',
          'sans-serif'
        ],
        body: [
          '"Noto Sans TC"',
          '"Noto Sans CJK TC"',
          '"Source Han Sans TC"',
          '"Source Han Sans"',
          '"思源黑體"',
          '-apple-system',
          'BlinkMacSystemFont',
          '"Segoe UI"',
          'Roboto',
          'sans-serif'
        ],
        // 大標題：阿里巴巴普惠體 + 思源黑體備援
        'heading-lg': [
          '"Alibaba PuHuiTi 3.0"',
          '"Alibaba PuHuiTi"',
          '"AlibabaPuHuiTi"',
          '"阿里巴巴普惠體"',
          '"Noto Sans TC"',
          'sans-serif'
        ],
        // 中標題：思源黑體 (Noto Sans TC)
        'heading-md': [
          '"Noto Sans TC"',
          '"Noto Sans CJK TC"',
          '"Source Han Sans TC"',
          '"Source Han Sans"',
          '"思源黑體"',
          '-apple-system',
          'BlinkMacSystemFont',
          '"Segoe UI"',
          'Roboto',
          'sans-serif'
        ],
        // 小標題 / 內文：思源黑體 (Noto Sans TC)
        'heading-sm': [
          '"Noto Sans TC"',
          '"Noto Sans CJK TC"',
          '"Source Han Sans TC"',
          '"Source Han Sans"',
          '"思源黑體"',
          '-apple-system',
          'BlinkMacSystemFont',
          '"Segoe UI"',
          'Roboto',
          'sans-serif'
        ],
        // 純英文字體專用
        en: ['"Zen Maru Gothic"', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'monospace']
      },
      borderRadius: {
        'bento': '24px',
        'module': '16px'
      }
    }
  },
  plugins: []
};
