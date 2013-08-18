#!/usr/bin/env node
/**
 * Expires bips which have reached their end-life by time
 */
require('../src/bootstrap').expireAll(function(err, msg) {
    if (err) {
        console.log('ERROR:' + err);
        console.log(msg);
    } else {
        console.log('DONE');
    }
    
    process.exit(0);
});
