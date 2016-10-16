module.exports = {
  rules: {
    "no-console": 0,
    "no-native-reassign": 0
  },
  parserOptions: {
    sourceType: "module"
  },
  env: {
    es6:   false,
    node:  true,
    mocha: true
  },
  extends: "eslint:recommended"
};