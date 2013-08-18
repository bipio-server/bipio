#!/usr/bin/env node
/**
 * Triggers unpaused trigger bipts.
 */


var dao = require('../src/bootstrap'),
    app = dao.app;

var model = dao.modelFactory('account_auth');

model.type = 'token';
console.log(model.hash('t'));

process.exit(0);