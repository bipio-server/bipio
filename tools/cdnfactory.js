#!/usr/bin/env node
/**
 *
 * The Bipio API Server
 *
 * @author Michael Pearson <michael@bip.io>
 * Copyright (c) 2010-2014 Michael Pearson https://github.com/mjpearson
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
