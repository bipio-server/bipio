#!/usr/bin/env node
/**
 * Triggers unpaused trigger bipts.
 */


var dao = require('../src/bootstrap'),
    app = dao.app;

var    Bastion = require(process.cwd() + '/src/managers/bastion').Bastion,
        bastion     = new Bastion(dao, false, 
        function(readyQueue) {
            if (readyQueue == 'queue_jobs') {
                app.logmessage('Trigger System Found [queue_jobs]');
                dao.triggerAll(function(err, msg) {
                    if (err) {
                        app.logmessage('ERROR:' + err + ' ' + msg);
                    } else {
                        app.logmessage(msg);
                        app.logmessage('DONE');
                    }
                    process.exit(0);
                });                
            }
        }
    );

app.bastion = bastion;
