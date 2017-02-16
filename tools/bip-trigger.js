#!/usr/bin/env node
/**
 *
 * The Bipio API Server
 *
 * Copyright (c) 2017 InterDigital, Inc. All Rights Reserved
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 *
 *
 * A Bipio Commercial OEM License may be obtained via hello@bip.io
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