#!/usr/bin/env node
/**
 *
 * The Bipio API Server
 *
 * Copyright (c) 2017 InterDigital, Inc. All Rights Reserved
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

 /**
  * Dedicated worker
  */
process.env.WORKER = true;

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
