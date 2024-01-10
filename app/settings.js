export default {
  title: "James Long's sketchbook",
  subtitle: 'A bunch of little things and sketches',
  author: 'James Long',
  site: 'https://jlongster.com',
  currentSite:
    process.env === 'development'
      ? 'http://localhost:3000'
      : 'https://jlongster.com',
};
