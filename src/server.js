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
var app,
    util            = require('util'),
    cluster         = require('cluster'),
    express         = require('express'),

    winston         = require('winston'),
    async           = require('async'),
    mongoose        = require('mongoose'),
    redis           = require('redis'),
    fs              = require('fs'),
    helper          = require('./lib/helper'),
    passport        = require('passport');

var defs            = require('../config/defs'),
    envConfig       = require('config'),
    CFG_SERVER      = envConfig.server,
    CFG_DB_MONGO    = envConfig.dbMongo,
    CFG_STORE_REDIS = envConfig.storeRedis,
    workerId;

// @todo cleanup global config
GLOBAL.CFG_CDN         = envConfig.cdn;
GLOBAL.CFG = envConfig;
GLOBAL.DEFS = defs;
GLOBAL.SERVER_ROOT = process.cwd();

var port            = process.env.PORT || CFG_SERVER.port,
forks           = process.env.NODE_ENV == 'development' ? 1 : require('os').cpus().length;

// basically a wrapper around logger
var logmessage = function(message, loglevel) {
    message = '#' + (workerId ? workerId : 'MASTER') + ': ' + message;
    if (winston) {
        winston.log(loglevel || 'info', message);
    } else {
        console.log(message);
    }
}

// our catcher for log messages
process.addListener('uncaughtException', function (err, stack) {
    var message = 'Caught exception: ' + err + '\n' + err.stack;
    if (app && app.logmessage) {
        app.logmessage(message);
    } else {
        console.log(message);
    }
});

// creating and configuring server
var app = express();
var utils = require('express/node_modules/connect/lib/utils');

/**
 * express bodyparser looks broken or too strict.
 */
function xmlBodyParser(req, res, next) {
    var enc = utils.mime(req);
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
    app.use(express.session({ secret: 'kalk#$Ocp2-103LCA:Sdfkj20p84' }));
    app.use(passport.initialize());
    app.use(passport.session());
    app.use('jsonp callback', true );
});

// let's load app with more stuff and export it
app.envConfig = envConfig;
app.defs = defs;
app.helper = helper;
app.logmessage = logmessage;

// we want to set up connections only on "workers, not on cluster/master
// this is the cluster setup
if (cluster.isMaster) {
    app.logmessage('Node v' + process.versions.node);
    app.logmessage('Starting ' + forks + ' fork(s)');
    for (var i = 0; i < forks; i++) {
        var worker = cluster.fork();
    }
} else {
    workerId = cluster.worker.workerID;
    // and we want to do this in parallel, but make sure we do it before continuing with starting server..
    async.parallel(
    {
        mongoConnection: function(cb2) {
            // if mongo configuration is there...
            if (CFG_DB_MONGO) {
                //var mongoURI = 'mongodb://' + CFG_DB_MONGO.username + ':' + CFG_DB_MONGO.password + '@' + CFG_DB_MONGO.host + ':' + CFG_DB_MONGO.port + '/' + CFG_DB_MONGO.dbname;
                //var mongoURI = 'mongodb://' + CFG_DB_MONGO.username + ':' + CFG_DB_MONGO.password + '@' + CFG_DB_MONGO.host + '/' + CFG_DB_MONGO.dbname;
                var mongoURI = 'mongodb://' + CFG_DB_MONGO.host + '/' + CFG_DB_MONGO.dbname;
                logmessage('MongoDB config: ' + mongoURI);
                //var mongoClient = mongoose.createConnection(mongoURI);
                var mongoClient = mongoose.connect(mongoURI);
                // mongoClient = mongoose.connect('mongodb://localhost/' + CFG_DB_MONGO.db);
                cb2(null, mongoClient);
            } else {
                cb2(null, null);
            }
        },
        redisConnection: function(cb3) {
            // if redis configuration is there...
            if (CFG_STORE_REDIS) {
                var redisClient = redis.createClient(CFG_STORE_REDIS.port, CFG_STORE_REDIS.host);
                redisClient.auth(CFG_STORE_REDIS.password, function() {
                    redisClient.select(CFG_STORE_REDIS.dbname, function(err,res) {
                        logmessage('Redis config: ' + redisClient.host + ':' + redisClient.port + ' @ ' + redisClient.selected_db + ' with ' + redisClient.auth_pass);
                        cb3(null, redisClient);
                    });
                });
            } else {
                cb3(null, null);
            }
        }

    },
    /**
         * init done!
         */
    function(err, results) {
        app.mongoClient = results.mongoConnection;
        app.redisClient = results.redisConnection;

        helper.tldtools.init(
            function() {
                app.logmessage('TLD UP')
            },
            function(body) {
                app.logmessage('TLD Cache fail - ' + body, 'error')
            }
        );

        // here load rest-api so we don't clutter this piece of code more
        require('./api-rest');

        app.listen(port, function() {
            app.logmessage('Listening on :' + port + ' in "' + app.settings.env + '" mode...');
            return 0;
        });
    }
    );
}

// export app everywhere
module.exports.app = app;
