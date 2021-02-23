const production = !process.env.ROLLUP_WATCH; // or some other env var like NODE_ENV
module.exports = {
  future: {
    purgeLayersByDefault: true,
    removeDeprecatedGapUtilities: true,
  },
  purge: {
    content: [
      "./src/**/*.svelte",
    ],
    enabled: production,
  },
  theme: {
    extend: {
      height: {
        18: '4.5rem'
      },
      colors: {
        blue: {
          550: '#300E92',
          990: '#000425',
          997: '#867EF2',
          998: '#020523',
          999: '#020736',
        },
      },
    },
  },
};
