/**
 *
 * The Bipio API Server.  Application Bootstrap
 *
 * @author Michael Pearson <github@m.bip.io>
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

 */

process.env.NODE_CONFIG_DIR =
  process.env.NODE_CONFIG_DIR || __dirname + '/../config';
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
ipaddr = require('ipaddr.js'),
memwatch = require('memwatch'),
heapdump = require('heapdump');

require('ssl-root-cas/latest').inject();

// globals
GLOBAL.app = app;
GLOBAL.CFG_CDN = envConfig.cdn;
GLOBAL.CFG = envConfig;
GLOBAL.DEFS = defs;
GLOBAL.SERVER_ROOT = path.resolve(__dirname);
//
GLOBAL.DATA_DIR = path.resolve((0 === envConfig.datadir.indexOf('/')
    ? envConfig.datadir
    : GLOBAL.SERVER_ROOT + '/../' + envConfig.datadir));

//
GLOBAL.CDN_DIR = path.resolve(0 === envConfig.cdn.indexOf('/')
    ? envConfig.cdn
    : GLOBAL.SERVER_ROOT + '/../' + envConfig.cdn);

// attach general helpers to the app
app.helper = helper;
app.cdn = cdn;
app._ = underscore;

app.isMaster = cluster.isMaster;

app.modules = {};

app.getConfig = function() {
  return envConfig;
}

// load modules
var mod, ModProto;
for (k in envConfig.modules) {
  if (envConfig.modules.hasOwnProperty(k)) {
    mod =  envConfig.modules[k];
    ModProto = require(
      GLOBAL.SERVER_ROOT
      + '/modules/'
      + k
      + '/'
      + ('native' === mod.strategy ? 'prototype' : mod.strategy)
      + '.js'
    );
    app.modules[k] = new ModProto(mod.config);
  }
}

/*
memwatch.on('leak', function(info) {
  app.logmessage(info, 'error');

  if (process.env.BIP_DUMP_HEAPS) {
    var f = '/tmp/bipio_' + process.pid + '_' + Date.now() + '.heapsnapshot';
    console.log('Writing Heap Snapshot ' + f);
    heapdump.writeSnapshot(f);
  }
});
*/

// heap profiling.
if ('development' ===  process.env.NODE_ENV) {
//  var agent = require('webkit-devtools-agent');
}

// logger
app.logmessage = function(message, loglevel) {
  if ('error' === loglevel) {
    console.trace(message);
  }

  var obj = helper.isObject(message);
  if (!obj) {
    if (message && message.trim) {
      message = message.trim();
    }

    if (!message) {
      return;
    }
    message = (app.workerId ? 'WORKER' + app.workerId : process.pid ) + ':' + (new Date()).getTime() + ':' + message;
  } else {
    app.logmessage((app.workerId ? 'WORKER' + app.workerId : process.pid ) + ':' + (new Date()).getTime() + ':OBJECT', loglevel);
  }

  if (!obj && winston) {
    winston.log(loglevel || 'info', message);
  } else {
    if ('error' === loglevel) {
     console.trace(message);
    } else {
      console.log(message);
    }
  }
}

// exception catchall
process.addListener('uncaughtException', function (err, stack) {
  var message = 'Caught exception: ' + err + '\n' + err.stack;
  if (app && app.logmessage) {
    app.logmessage(message);
  } else {
    console.trace(message);
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

// validate config
if (/^http(s?):\/\//i.test(envConfig.domain_public)) {
  envConfig.domain_public = envConfig.domain_public.replace(/^http(s?):\/\//, '');
  app.logmessage('CONFIG:domain_public should not include protocol', 'warn');
}

var domainPublic = envConfig.domain_public.replace(/:\d*/, '');
if (ipaddr.IPv4.isValid(domainPublic) || ipaddr.IPv6.isValid(domainPublic) ) {
  app.logmessage('CONFIG:domain_public can not be an IP Address', 'error');
  process.exit(0);
}

// initialize DAO and bastion (queue manager)
var dao = new require('./managers/dao'),
bastion = new require('./managers/bastion');

module.exports.app = app;
module.exports.app.dao = new dao(CFG, app.logmessage);
module.exports.app.bastion = new bastion(module.exports.app.dao, process.HEADLESS || process.env.NOCONSUME);

// bind dao to modules
for (var k in app.modules) {
  if (app.modules.hasOwnProperty(k) && app.modules[k].setDAO) {
    app.modules[k].setDAO(module.exports.app.dao);
  }
}
