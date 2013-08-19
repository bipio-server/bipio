#!/usr/bin/env node
/**
 *
 * The Bipio API Server
 *
 * @author Michael Pearson <michael@cloudspark.com.au>
 * Copyright (c) 2010-2013 CloudSpark pty ltd http://www.cloudspark.com.au
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program.  If not, see <http://www.gnu.org/licenses/>.
 *
 * A Bipio Commercial OEM License may be obtained via enquiries@cloudspark.com.au
 */
/**
 * Triggers unpaused trigger bips.
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
