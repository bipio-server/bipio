#!/usr/bin/env node
/**
 *
 * The Bipio API Server
 *
 * @author Michael Pearson <github@m.bip.io>
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
 */
 /**
  * Dedicated worker
  */
var bootstrap = require(__dirname + '/bootstrap'),
  app = bootstrap.app,
  helper  = require('./lib/helper'),
  cluster = require('cluster');

// export app everywhere
module.exports.app = app;

//
// ------ START CLUSTER
//

app.logmessage('BIPIO_WORKER:STARTED:' + new Date());

if (cluster.isMaster) {
  // when user hasn't explicitly configured a cluster size, use 1 process per cpu
  var forks = GLOBAL.CFG.server.forks ? GLOBAL.CFG.server.forks : require('os').cpus().length;
  app.logmessage('Node v' + process.versions.node);
  app.logmessage('Starting ' + forks + ' fork(s)');

  for (var i = 0; i < forks; i++) {
    cluster.fork();
  }

  cluster.on('disconnect', function(worker) {
    app.logmessage('Worker:' + worker.workerID + ':Disconnect');
    cluster.fork();
  });

} else {

  workerId = cluster.worker.workerID;

  helper.tldtools.init(
    function() {
      app.logmessage('TLD:UP');
    },
    function(body) {
      app.logmessage('TLD:Cache fail - ' + body, 'error')
    }
  );
}

app.logmessage('WAITING...');
