module.exports = {
  ...require(`./config-${process.env.ENV}`),
  ENV: process.env.ENV,
};
