#!/usr/bin/env node
/**
 *
 * The Bipio API Server
 *
 * @author Michael Pearson <michael@cloudspark.com.au>
 * Copyright (c) 2010-2013 Michael Pearson https://github.com/mjpearson
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
process.HEADLESS = true;
var bootstrap = require(__dirname + '/../src/bootstrap');
bootstrap.app.bastion.on('readyQueue', function(readyQueue) {
    if (readyQueue == 'queue_jobs') {
        app.logmessage('BIP-TRIGGER:Trigger Queue Discovered:queue_jobs');
        bootstrap.app.dao.triggerAll(function(err, msg) {
            if (err) {
                app.logmessage('BIP-TRIGGER:' + err + ' ' + msg);
            } else {
                app.logmessage(msg);
                app.logmessage('BIP-TRIGGER:DONE');
            }
            process.exit(0);
        });
    }
});