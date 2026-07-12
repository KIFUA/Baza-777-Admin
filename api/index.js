const serverApp = require("../dist/server.cjs");

const app = serverApp.default || serverApp;

module.exports = app;
