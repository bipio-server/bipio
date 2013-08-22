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
 * REST API Server bootstrap
 *
 * michael@cloudspark.com.au
 *
 */
var app = {},
util            = require('util'),
winston         = require('winston'),
async           = require('async'),
mongoose        = require('mongoose'),
helper      = require('./lib/helper');

var defs            = require('../config/defs'),
envConfig       = require('config'),
CFG_SERVER      = envConfig.server,
CFG_DB_MONGO    = envConfig.dbMongo,
CFG_STORE_REDIS = envConfig.storeRedis;

// basically a wrapper around logger
var logmessage = function(message, severity, meta) {
    message = '#' + (process.env.NODE_WORKER_ID ? process.env.NODE_WORKER_ID : 'M') + ': ' + message;
    if (winston) {
        severity = severity || 'info';
        winston.log(severity, message, meta);
    } else {
        console.log(message);
    }
}

app.envConfig = envConfig;
app.defs = defs;
app.helper = helper;
app.logmessage = logmessage;
module.exports.app = app;
GLOBAL.app = app;

// @todo cleanup global config
GLOBAL.CFG_CDN         = envConfig.cdn;
GLOBAL.CFG = envConfig;
GLOBAL.DEFS = defs;
GLOBAL.SERVER_ROOT = process.cwd();

var DaoMongo = require(process.cwd() + '/src/managers/dao-mongo').DaoMongo;
var dao         = new DaoMongo(envConfig.dbMongo.connect, logmessage, function(err, dao) {
    process.addListener('uncaughtException', function (err, stack) {
        var message = 'Caught exception: ' + err + '\n' + err.stack;
        if (app && app.logmessage) {
            app.logmessage(message);
        } else {
            console.log(message);
        }
    });
});

module.exports = dao;
module.exports.app = app;