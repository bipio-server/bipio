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
var dao      = require('../src/bootstrap');
var request = require('request');

// given an image url and account id, attaches the account avatar
var ownerId = process.argv[2];
	url = process.argv[3],
	dstPath = process.argv[4] ? process.argv[4] : GLOBAL.CFG.datadir + '/perm/cdn/img/av/'

if (!url || !ownerId) {
    console.log('Usage : node avsnarf.js {owner id} {url} {destination path}');
    process.exit(1);
}

url = request.get(url);

console.log('fetching avatar...');
dao.app.modules.cdn.saveAvatar(ownerId, url, dstPath, function(err, response) {
    if (!err) {
        console.log("OK!");
        console.log(response);
    } else {
        console.log(response);
        console.log('Error');
    }
    process.exit(0);
});
