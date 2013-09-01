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
 *
 * REST API Server bootstrap
 *
 * michael@cloudspark.com.au
 *
 */
// includes
var app,
    util            = require('util'),
    cluster         = require('cluster'),
    express         = require('express'),

    winston         = require('winston'),
    async           = require('async'),
    mongoose        = require('mongoose'),
    fs              = require('fs'),
    helper          = require('./lib/helper'),
    path            = require('path'),
    passport        = require('passport'),
    app             = express();
    connectUtils    = require('express/node_modules/connect/lib/utils');

// variables
var defs            = require('../config/defs'),
    envConfig       = require('config'),
    workerId;

// globals
GLOBAL.CFG_CDN = envConfig.cdn;
GLOBAL.CFG = envConfig;
GLOBAL.DEFS = defs;
GLOBAL.SERVER_ROOT = path.resolve(__dirname + '/..');
GLOBAL.DATA_DIR = GLOBAL.SERVER_ROOT + envConfig.datadir;

// attach general helpers to the app
app.helper = helper;
app.logmessage = function(message, loglevel) {
    message = '#WORKER' + (workerId ? workerId : 'MASTER') + ': ' + message;
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

/**
 * express bodyparser looks broken or too strict.
 */
function xmlBodyParser(req, res, next) {
    var enc = connectUtils.mime(req);
    if (req._body) return next();
    req.body = req.body || {};

    // ignore GET
    if ('GET' == req.method || 'HEAD' == req.method) return next();

    // check Content-Type
    if (!/xml/.test(enc)) {
        return next();
    }

    // flag as parsed
    req._body = true;

    // parse
    var buf = '';
    req.setEncoding('utf8');
    req.rawBody = '';

    req.on('data', function(chunk) {
        req.rawBody += chunk;
    });
    req.on('end', function(){
        next();
    });
}

// express preflight
app.configure(function() {
    app.use(xmlBodyParser);
    app.use(express.bodyParser());

    // respond with an error if body parser failed
    app.use(function(err, req, res, next) {
        console.log(err);
        if (err.status == 400) {
            app.logmessage(err, 'error');
            res.send(err.status, {
                message : 'Invalid JSON. ' + err
            });
        } else {
            next(err, req, res, next);
        }
    });
    app.use(express.methodOverride());
    app.use(express.cookieParser());

    // required for some oauth provders
    app.use(express.session({
        secret: envConfig.server.sessionSecret
    }));

    app.use(passport.initialize());
    app.use(passport.session());
    app.use('jsonp callback', true );
});

// export app everywhere
module.exports.app = app;

if (cluster.isMaster) {
    // when user hasn't explicitly configured a cluster size, use 1 process per cpu
    var forks = envConfig.server.forks ? envConfig.server.forks : require('os').cpus().length;

    app.logmessage('Node v' + process.versions.node);
    app.logmessage('Starting ' + forks + ' fork(s)');

    for (var i = 0; i < forks; i++) {
        var worker = cluster.fork();
    }
} else {
    workerId = cluster.worker.workerID;
    helper.tldtools.init(
        function() {
            app.logmessage('TLD UP')
        },
        function(body) {
            app.logmessage('TLD Cache fail - ' + body, 'error')
        }
    );

    require('./router');

    app.listen(envConfig.server.port, function() {
        app.logmessage('Listening on :' + envConfig.server.port + ' in "' + app.settings.env + '" mode...');
        return 0;
    });
}