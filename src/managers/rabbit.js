/**
 *
 * AMQP Transport wrapper
 *
 */
var amqp = require('amqp');

function Rabbit(cfg, next) {
    var self = this;
    this.exchanges = [];
    this.queues = [];
    this.cfg = cfg;
    var opt = {
        host: 'localhost',
        vhost: "/" + process.env.NODE_ENV,
        login: cfg.auth.username,
        password : cfg.auth.password
    };

    this.amqpConn = amqp.createConnection(opt,
    {
        defaultExchangeName: cfg.defaultExchange
    }
    );

    // Setup our preconfigured exchanges, queues and routes
    this.amqpConn.on(
        'ready',
        function() {
            for (xName in cfg.exchanges) {
                self.exchanges[xName] = self.amqpConn.exchange(
                    xName,
                    cfg.exchanges[xName].cfg,
                    function() {
                        var exchange = this;
                        //app.logmessage('Exchange [' + this.name + '] is UP');
                        // @todo winston migration
                        app.logmessage('X[' + this.name + ']UP');
                        var xStruct = cfg.exchanges[this.name];

                        // create default queue for this exchange
                        self.queues[xStruct.queue_default.name] = self.amqpConn.queue(
                            xStruct.queue_default.name,
                            xStruct.queue_default.config,
                            function() {
                                this.bind(exchange, xStruct.route_default);
                                // @todo winston migration
                                // app.logmessage('Queue [' + this.name + '] is UP');
                                app.logmessage((undefined !== next ? '[PUBSUB]' : '[PUB]') + 'Q[' + this.name + ']UP' );
                                if (next) {
                                    next(this.name);
                                }
                            });
                    });
            }
        });

    this.amqpConn.on('connect', function() {
        app.logmessage('RabbitMQ Connected');
    });

    this.amqpConn.connect();
}

Rabbit.prototype.produce = function(xName, route, payload, cb) {   
    this.exchanges[xName].publish(route, JSON.stringify(payload), {}, cb);
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

module.exports = Rabbit;
