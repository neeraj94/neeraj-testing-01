module.exports = {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        primary: 'rgb(var(--color-primary) / <alpha-value>)',
        accent: 'rgb(var(--color-accent) / <alpha-value>)'
      }
    }
  },
  plugins: []
};
