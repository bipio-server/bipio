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
 *
 */

/**
 *
 * AMQP Transport wrapper
 *
 */
var amqp = require('amqp'),
app = GLOBAL.app;

function Rabbit(cfg, next) {
  var self = this;
  this.exchanges = [];
  this.queues = [];
  this.cfg = cfg;
  var opt = {
    host: cfg.host,
    login: cfg.auth.username,
    password : cfg.auth.password,
    noDelay : true
  };

  if ('' !== cfg.vhost) {
    opt.vhost = cfg.vhost;
  }

  this.amqpConn = amqp.createConnection(opt,
  {
    defaultExchangeName: cfg.defaultExchange
  }
  );

  this.amqpConn.connectionStatus = null;

  // Setup our preconfigured exchanges, queues and routes
  this.amqpConn.on(
    'ready',
    function() {
	  self.amqpConn.connectionStatus = 'connected';
      for (xName in cfg.exchanges) {
        self.exchanges[xName] = self.amqpConn.exchange(
          xName,
          cfg.exchanges[xName].cfg,
          function() {
            var exchange = this;
            app.logmessage('RABBIT:X:' + this.name + ':UP');
            var xStruct = cfg.exchanges[this.name];

            // create default queue for this exchange
            self.queues[xStruct.queue_default.name] = self.amqpConn.queue(
              xStruct.queue_default.name,
              xStruct.queue_default.config,
              function() {
                this.bind(exchange, xStruct.route_default);
                app.logmessage('RABBIT:Q:' + (undefined !== next ? 'PUBSUB' : 'PUB') + this.name + ':UP' );
                if (next) {
                  next(this.name);
                }
              });
          });
      }
    });

  this.amqpConn.on('connect', function() {
    app.logmessage('RABBIT:Connected');
  });

  this.amqpConn.on('error', function(err) {
    self.amqpConn.connectionStatus = null;
  	app.logmessage('RABBIT:' + err, 'error');
  });
}

Rabbit.prototype.produce = function(xName, route, payload, cb) {
  this.exchanges[xName].publish(route, JSON.stringify(payload), {}, cb);
}

Rabbit.prototype.producePublic = function(payload, cb) {
  this.produce('bastion_generic', 'default', payload, cb);
}

Rabbit.prototype.produceJob = function(payload, cb) {
  this.produce('bastion_jobs', 'default', payload, cb);
}

Rabbit.prototype.getQueueByName = function(queueName) {
  return this.queues[queueName];
}

Rabbit.prototype.disconnect = function() {
  this.amqpConn.disconnect();
  this.amqpConn.connectionStatus = null;
  app.logmessage('RABBIT:DISCONNECTED');
}

module.exports = Rabbit;
