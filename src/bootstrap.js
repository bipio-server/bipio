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
 *
 * Application and DAO bootstrap for standalone scripts
 *
 * michael@cloudspark.com.au
 *
 */
// includes
var app = {},
    util            = require('util'),
    winston         = require('winston'),
    helper          = require('./lib/helper'),
    path            = require('path'),
    defs            = require('../config/defs'),
    envConfig       = require('config');

// globals
GLOBAL.CFG_CDN = envConfig.cdn;
GLOBAL.CFG = envConfig;
GLOBAL.DEFS = defs;
GLOBAL.SERVER_ROOT = path.resolve(__dirname);

// attach general helpers to the app
app.helper = helper;

// out of band messaging
app.bastion = bastion;

// logger
app.logmessage = function(message, loglevel) {
    if (winston) {
        winston.log(loglevel || 'info', message);
    } else {
        console.log(message);
    }
}

// exception catchall
process.addListener('uncaughtException', function (err, stack) {
    var message = 'Caught exception: ' + err + '\n' + err.stack;
    if (app && app.logmessage) {
        app.logmessage(message);
    } else {
        console.log(message);
    }
});

var DaoMongo    = require('./managers/dao-mongo').DaoMongo,
    Bastion    = require('./managers/bastion'),

    dao = new DaoMongo(envConfig.dbMongo.connect, app.logmessage, function(err, dao) {
        if (err) {
            console.log(err);
            process.exit(0);
        }
    }),
    bastion     = new Bastion(dao);

module.exports = dao;
module.exports.app = app;