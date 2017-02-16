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

// given a url, downloads the favicon for the domain into our icofactory CDN
var url = process.argv[2],
    bipid = process.argv[3];

if (!url) {
    console.log('Usage : node cdnfactory.js {url} {bip id optional}');
    process.exit(1);
}

console.log('fetching icon...');
dao.getBipRefererIcon(bipid, url, true, function(err, response) {
    if (!err) {
        console.log("OK!");
        console.log(response);
    } else {
        console.log(response);
        console.log('Error');
    }
    process.exit(0);
});
