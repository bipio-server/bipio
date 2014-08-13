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
 * Forces a builds active hub/edges stats for today for every user.
 * The system will otherwise automatically generate these stats once per day.
 */

process.HEADLESS = true;
var bootstrap = require(__dirname + '/../src/bootstrap');
bootstrap.app.dao.generateHubStats(function(err, msg) {
    if (err) {
        app.logmessage('THERE WERE ERRORS');
    } else {
        app.logmessage(msg);
        app.logmessage('DONE');
    }
    process.exit(0);
});