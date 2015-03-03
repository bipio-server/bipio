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
            //app.logmessage('Exchange [' + this.name + '] is UP');
            // @todo winston migration
            app.logmessage('RABBIT:X:' + this.name + ':UP');
            var xStruct = cfg.exchanges[this.name];

            // create default queue for this exchange
            self.queues[xStruct.queue_default.name] = self.amqpConn.queue(
              xStruct.queue_default.name,
              xStruct.queue_default.config,
              function() {
                this.bind(exchange, xStruct.route_default);
                // @todo winston migration
                // app.logmessage('Queue [' + this.name + '] is UP');
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

//  this.amqpConn.connect();
}

Rabbit.prototype.produce = function(xName, route, payload, cb) {
  // this.exchanges[xName].publish(route, JSON.stringify(payload), {}, cb);
  // amqp has stopped giving us 'ack' now!?!?!??
  this.exchanges[xName].publish(route, JSON.stringify(payload), {});
}

Rabbit.prototype.producePublic = function(payload) {
  this.produce('bastion_generic', 'default', payload);
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
