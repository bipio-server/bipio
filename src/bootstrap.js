/**
 *
 * The Bipio API Server.  Application Bootstrap
 *
 * @author Michael Pearson <michael@cloudspark.com.au>
 * Copyright (c) 2010-2014 CloudSpark pty ltd http://www.cloudspark.com.au
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

// always look to local config
process.env.NODE_CONFIG_DIR = __dirname + '/../config';
process.env.MONGOOSE_DISABLE_STABILITY_WARNING = true;
// includes
var app = {
  workerId : ':PID:' + process.pid
},
sugar       = require('sugar'),
util        = require('util'),
underscore  = require('underscore'),
winston     = require('winston'),
helper      = require('./lib/helper'),
cdn         = require('./lib/cdn'),
path        = require('path'),
defs        = require('../config/defs'),
envConfig   = require('config'),
cluster     = require('cluster'),
os          = require('os'),
memwatch = require('memwatch');

// globals
GLOBAL.app = app;
GLOBAL.CFG_CDN = envConfig.cdn;
GLOBAL.CFG = envConfig;
GLOBAL.DEFS = defs;
GLOBAL.SERVER_ROOT = path.resolve(__dirname);
GLOBAL.DATA_DIR = GLOBAL.SERVER_ROOT + '/../' + envConfig.datadir,
GLOBAL.CDN_DIR = GLOBAL.SERVER_ROOT + '/../' + envConfig.cdn;

// attach general helpers to the app
app.helper = helper;
app.cdn = cdn;
app._ = underscore;

app.isMaster = cluster.isMaster;

memwatch.on('leak', function(info) { 
  app.logmessage(info, 'error');
});

// heap profiling.
if ('development' ===  process.env.NODE_ENV) {
//  var agent = require('webkit-devtools-agent');
}

// logger
app.logmessage = function(message, loglevel) {
  var obj = helper.isObject(message);
  if (!obj) {
    if (message && message.trim) {
      message = message.trim();
    }
    
    if (!message) {
      return;
    }
    message = (app.workerId ? process.pid : '#WORKER' + app.workerId) + ':' + (new Date()).getTime() + ':' + message;
  } else {
    app.logmessage((app.workerId ? process.pid : '#WORKER' + app.workerId) + ':' + (new Date()).getTime() + ':OBJECT', loglevel);
  }

  if (!obj && winston) {
    winston.log(loglevel || 'info', message);
  } else {
    console.log(message);
  }

  if ('error' === loglevel && 'development' ===  process.env.NODE_ENV) {
    console.trace(message);
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

if (!GLOBAL.CFG.server.public_interfaces && !process.HEADLESS) {
  GLOBAL.CFG.server.public_interfaces = [];
  var ifaces = os.networkInterfaces();
  for (var i in ifaces) {
    ifaces[i].forEach(function(details) {
      app.logmessage('Resolvable Interface ' + i + ':' + details.address);
      GLOBAL.CFG.server.public_interfaces.push(details.address);
    });
  }
}

var dao = new require('./managers/dao'),
bastion = new require('./managers/bastion');

module.exports.app = app;
module.exports.app.dao = new dao(CFG.dbMongo, app.logmessage);
module.exports.app.bastion = new bastion(module.exports.app.dao, process.HEADLESS);