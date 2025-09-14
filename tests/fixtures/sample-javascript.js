const express = require('express');
const path = require('path');

function createApp() {
  const app = express();
  return app;
}

module.exports = { createApp };