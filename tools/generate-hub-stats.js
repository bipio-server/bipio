#!/usr/bin/env node
/**
 * Builds active hub/edges stats for today for every user
 */

var dao = require('../src/bootstrap'),
    app = dao.app;

dao.generateHubStats(function(err, msg) {
    if (err) {
        app.logmessage('ERROR:' + err + ' ' + msg);
    } else {
        app.logmessage(msg);
        app.logmessage('DONE');
    }
    process.exit(0);
});