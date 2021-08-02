const Rollbar = require('rollbar');
const config = require('../config/config');
const { isProd } = require('../utils');

const rollbar = new Rollbar({
  accessToken: config.ROLLBAR.ACCESS_TOKEN,
  captureUncaught: true,
  captureUnhandledRejections: true
});

const error = (err) => {
  console.error(err);

  if (isProd()) {
    rollbar.error(err);
  }
};

module.exports = {
  error
};
