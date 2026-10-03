const bundle = require('./_bundle.cjs');
const app = bundle.default || bundle;

module.exports = (req, res) => {
  return app(req, res);
};
