
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

//var mongoURI = 'mongodb://' + CFG_DB_MONGO.username + ':' + CFG_DB_MONGO.password + '@' + CFG_DB_MONGO.host + ':' + CFG_DB_MONGO.port + '/' + CFG_DB_MONGO.dbname;
var mongoURI = 'mongodb://' + CFG_DB_MONGO.host + '/' + CFG_DB_MONGO.dbname;
// var mongoClient = mongoose.createConnection(mongoURI);
var mongoClient = mongoose.connect(mongoURI);

var DaoMongo = require(process.cwd() + '/src/managers/dao-mongo').DaoMongo;
var dao         = new DaoMongo(envConfig.dbMongo, mongoClient, logmessage, null);

// our catcher for log messages
process.addListener('uncaughtException', function (err, stack) {
    var message = 'Caught exception: ' + err + '\n' + err.stack;
    if (app && app.logmessage) {
        app.logmessage(message);
    } else {
        console.log(message);
    }
});

module.exports = dao;
module.exports.app = app;