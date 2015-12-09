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
 * Bastion is the message producer/consumer to resolve channel deliveries
 *
 *
 *
 */
var Rabbit = require('./rabbit'),
sprintf = require('sprintf').sprintf,
uuid    = require('node-uuid'),
helper = require('../lib/helper'),
events = require('events'),
Q = require('q'),
//heapdump = require('heapdump'),
eventEmitter = new events.EventEmitter();

function Bastion(dao, noConsume, cb) {
  var self = this;

  this.consumerTags = {};

  events.EventEmitter.call(this);

  if (!cb && !noConsume) {
    cb = this.consumeLoop()
  }

  this._dao = dao;

  var eventWrapper = function(readyQueue) {
    self.emit('readyQueue', readyQueue);
  };

  this._queue = new Rabbit(CFG.rabbit, noConsume ? eventWrapper : cb);

  if (noConsume) {
    app.logmessage('BASTION:NOCONSUME MODE');
  }

  return this;
}

Bastion.prototype.__proto__ = events.EventEmitter.prototype;

Bastion.prototype.isRabbitConnected = function() {
	app.logmessage('BASTION:AMQPCONNECTION:' + this._queue.amqpConn.connectionStatus);
	return this._queue.amqpConn.connectionStatus;
}

Bastion.prototype.getQueue = function(queueName) {
  if (undefined == queueName) {
    return this._queue;
  } else {
    return this._queue.getQueueByName(queueName);
  }
}

Bastion.prototype.createJob = function(jobName, payload, cb) {
  this.getQueue().produceJob({
      name : jobName,
      data : payload
    },
    cb
  );
}

Bastion.prototype.jobRunnerAlert = function(err, message) {
  if (err) {
    console.log(message);
  }
}

Bastion.prototype.runTrigger = function(jobPacket) {
    var self = this,
      bip = jobPacket.data.bip,
      triggerCid = bip.config.channel_id,
      channel,
      channelDefer = Q.defer(),
      contentParts = {
        _files : []
      },
      imports = {
         _bip : app._.clone(bip)
      },
      transforms = {},
      clientStruct = {
        'id' : uuid(),
        'host' : 'system',
        'date' : Math.floor(new Date().getTime() / 1000),
        'proto' : 'trigger',
        'reply_to' : '',
        'method' : 'man',
        'content_type' : '',
        'encoding' : '',
        'headers' : {}
      };

    channelDefer.promise.then(
      function(channel) {

        app.modules.auth.getAccountStructById(
          bip.owner_id,
          function(err, accountInfo) {
            if (!err) {

              accountInfo.getTimezone(
                function(err, timezone) {
                  // convert to user tz
                  if (timezone) {
                    clientStruct.date += app.helper.tzDiff(timezone);
                  }

                  imports._client = clientStruct;

                  channel = self._dao.modelFactory('channel', channel);

                  self._dao.accumulate('bip', imports._bip, '_imp_actual');

                  app.bastion.createJob(DEFS.JOB_BIP_ACTIVITY, {
                    owner_id : channel.owner_id,
                    bip_id : bip.id,
                    code : 'bip_invoke'
                  });

                  if (jobPacket.data.socketTrigger || !channel.isRealtime() ) {
                    channel.invoke(
                      imports, // imports
                      transforms, // transforms
                      clientStruct, // client
                      contentParts, // content parts
                      function(err, exports, content_parts, transferSizeBytes) {

                        if (!err && !jobPacket.data.dryRun) {

                          app.bastion.createJob(DEFS.JOB_USER_STAT, {
                            owner_id : channel.owner_id,
                            type : 'traffic_inbound_mb',
                            inc : sprintf('%.4f', (transferSizeBytes / (1024 * 1024)) )
                          });

                          app.bastion.createJob(DEFS.JOB_USER_STAT, {
                            owner_id : channel.owner_id,
                            type : 'delivered_bip_inbound'
                          });

                          if (exports) {

                            var normedExports = {};
                            transferSizeBytes = transferSizeBytes || 0;
                            for (var key in exports) {
                              normedExports['source#' + key] = exports[key];
                            }

                            normedExports['source'] = app._.clone(exports);

                            // translate trigger exports
                            // into bip #source hub key.
                            var v = {
                              'source' : exports
                            };

                            self.distributeChannel(
                              bip,
                              'source',
                              '',
                              '',
                              normedExports,
                              clientStruct,
                              content_parts
                            );
                          }

                        } else if (err) {
                          var errStr = err.toString();

                          app.logmessage('Channel Invoke Failure:' + channel.id);
                          app.logmessage(err);

                          app.bastion.createJob(DEFS.JOB_BIP_ACTIVITY, {
                            owner_id : channel.owner_id,
                            bip_id : bip.id,
                            code : 'bip_channnel_error',
                            message : errStr,
                            source : channel.id
                          });
                        }
                      }
                    );
                  }
                }
              );

            }
          }
        );
      },
      function(err) {
        app.logmessage(err, 'error');
      }
    );

    // ----------------------------------------------------------------

    // test for channel id or pointer
    if (app.helper.getRegUUID().test(triggerCid)) {
      this._dao.find(
        'channel',
        {
          'id' : triggerCid,
          'owner_id' : bip.owner_id
        },
        function(err, channel) {
          if (err) {
            channelDefer.reject(err);
          } else {
            channelDefer.resolve(channel);
          }
        }
      );
    } else {
      var actionTokens = triggerCid.split('.');
      var pod = actionTokens[0];
      var action = actionTokens[1];

      if (self._dao.pod(pod) && self._dao.pod(pod).getAction(action)) {
        channel = {
          'id' : triggerCid,
          'action' : pod + '.' + action,
          'owner_id' : bip.owner_id,
          'config': bip.config ? bip.config.config : {}
        };
        channelDefer.resolve(channel);
      } else {
        channelDefer.reject('BASTION:INVALID CHANNEL POINTER:' + cid);
      }
    }
}

// @todo we have to assume the queue system is a DMZ for now :|
Bastion.prototype.jobRunner = function(jobPacket) {
  var self = this;

  app.logmessage('BASTION:REC:NAME:' + jobPacket.name +':CID: ['
    + (jobPacket.data.bip && jobPacket.data.bip.config && jobPacket.data.bip.channel_id ? jobPacket.data.bip.config.channel_id : '')
    + ']', 'info');

  switch (jobPacket.name) {
    case DEFS.JOB_ATTACH_REFERER_ICON :
//      this._dao._jobAttachBipRefererIcon( jobPacket.data, this.jobRunnerAlert );
      break;

    case DEFS.JOB_USER_NOTIFICATION :
      this._dao.userNotify( jobPacket.data, this.jobRunnerAlert );
      break;

    case DEFS.JOB_BIP_TRIGGER :
      this.runTrigger(jobPacket);
      break;

    case DEFS.SIG_RESTART :
      process.exit(0);
      break;

    case DEFS.JOB_SET_DEFAULT_SPACE :
      this._dao.updateColumn(
        'account_option',
        {
          owner_id : jobPacket.data.owner_id
        },
        {
          default_feed_id : jobPacket.data.channel_id
        },
        function(err, resp) {
          if (err) {
            app.logmessage(err, 'error');
          }
        }
      );
      break;

    case DEFS.JOB_BIP_SET_DEFAULTS :
      this._dao.setTransformDefaults(jobPacket.data);
      break;

    case DEFS.JOB_USER_STAT :
      if (helper.regUUID.test(jobPacket.data.owner_id) || jobPacket.data.owner_id === 'system') {
        var filter = {
          day : helper.nowDay(),
          owner_id : jobPacket.data.owner_id
        },
        modelName = 'stats_account',
        model,
        statType = jobPacket.data.type,
        inc = Number(jobPacket.data.inc) || 1;

        if (isNaN(inc)) {
          app.logmessage('Incrementor is Not A Number  :CID: ['
            + (jobPacket.data.bip && jobPacket.data.bip.config && jobPacket.data.bip.channel_id ? jobPacket.data.bip.config.channel_id : '')
            + ']', 'warning');
          app.logmessage(inc, 'warning');
          inc = 0;
        }

        this._dao.findFilter(modelName, filter, function(err, results) {
          var result = results.pop();
          if (err) {
            app.logmessage(err, 'error');
          } else if (!result) {
            // create
            filter[statType] = inc;
            self._dao.create(
              self._dao.modelFactory(modelName, filter),
              function(err) {
                if (err) {
                  app.logmesasge(err, 'error');
                }
              }
              );
          } else {
            self._dao.accumulate(modelName, result, statType, inc);
            // feed forward to general system stats
            if (jobPacket.data.owner_id !== 'system') {
              self.createJob(DEFS.JOB_USER_STAT, {
                owner_id : 'system',
                type : jobPacket.data.type,
                inc : inc
              } );
            }
          }
        });
      }
      break;

    case DEFS.JOB_BIP_ACTIVITY :
      this._dao.bipLog(jobPacket.data);
      break;

    case DEFS.JOB_HEAP_DUMP :
      if (CFG.dumpKey && jobPacket.data.key === CFG.dumpKey && process.pid === jobPacket.data.pid) {
        var f = '/tmp/bipio_' + process.pid + '_' + Date.now() + '.heapsnapshot';
        app.logmessage('Writing Heap Snapshot ' + f);
//      heapdump.writeSnapshot(f);
      }

      break;

    default :
      console.log(jobPacket);
      app.logmessage('BASTION:MALFORMED PACKET :CID: ['
        + (jobPacket.data.bip && jobPacket.data.bip.config && jobPacket.data.bip.channel_id ? jobPacket.data.bip.config.channel_id : '')
        +']', 'error');
      break;
  }

}

/**
 * Bips fired via a name/domain/type (http or smtp for example)
 */
Bastion.prototype.domainBipUnpack = function(name, domain, container, type, cb, cbParameterMap) {
  var self = this, filter, pause = false;
  // find user id by incoming domain
  this._dao.find('domain', {
    'name' : domain
  }, function(err, result) {
    if (err || !result) {
      cb(cbParameterMap.fail, err);
    } else {
      self.bipUnpack(type, name, result.owner_id, result.id, container, cb, cbParameterMap);
    }
  });
}

/**
 * tries to retrieve a bip by name + domain and determines if active.
 *
 * If the bip has expired by time/impressions, then applies account level
 * default behavior for expiry (pause or delete)
 *
 * This interface is primarily used by the protocol proxy before forwarding onto
 * rabbit for consumption by a Bastion worker.
 *
 *
 * @param string type bip type
 * @param string name bip name (optional)
 * @param AccountInfo accountInfo owner account struct
 * @param Object client client info
 * @param function next callback(err)
 */
Bastion.prototype.bipUnpack = function(type, name, accountInfo, client, next) {
  var self = this;
  var filter = {
    'type' : type,
    'paused' : false
  };

  if (name) {
    filter.name = name;
  }

  var ownerId = accountInfo.getId();
  if (ownerId) {
    filter.owner_id = ownerId;
  }

  var domainId = accountInfo.getActiveDomain().id;

  if (domainId) {
    filter.domain_id = domainId;
  }

  self._dao.findFilter('bip',
    filter,
    function(err, bipResults) {
      var firstBinding = false,
      bipResult,
      expireBehavior,
      numResults = bipResults.length;

      if (err || numResults == 0) {
        next(err || "Not Found");
      } else {
        for (var i = 0; i < numResults; i++) {
          bipResult = bipResults[i];
          // check soft ACL
          if (client && bipResult.binder && bipResult.binder.length > 0) {
            if (bipResult.binder[0] == 'first') {
              firstBinding = true;
            }

            if (!firstBinding) {
              if (!helper.inArray(bipResult.binder, client.host)
                  && !(client.reply_to && helper.inArray(bipResult.binder, client.reply_to)) ) {
                next("Not Authorized");
                return;
              }
            }
          }

          (function(bipResult, client, firstBinding, next) {

            accountInfo.getSetting(
              'timezone',
              function cbGetTimezone(err, timezone) {
                if (timezone) {
                  client.date += app.helper.tzDiff(timezone);
                }

                var bipModel = self._dao.modelFactory('bip', bipResult, accountInfo);
                bipModel.checkExpiry(function(expired) {

                  if (expired) {
                    bipModel.expire(client.id, next);

                  } else {
                    // add bip metadata to the container
                    next(
                      false,
                      // we don't need the whole bip packet.
                      {
                        id : bipModel.id,
                        hub : bipModel.hub,
                        owner_id : bipModel.owner_id,
                        config : bipModel.config,
                        name : bipModel.name,
                        type : bipModel.type
                      });

                    // update accumulator
                    self._dao.accumulate('bip', bipResult, '_imp_actual');

                    // update runtime
                    self._dao.updateColumn('bip', bipModel.id, { '_last_run' : Number(app.moment().utc()) }, function(err, result) {
                      if (err) {
                        app.logmessage(err, 'error');
                      }
                    });

                    app.bastion.createJob(DEFS.JOB_BIP_ACTIVITY, {
                      owner_id : bipModel.owner_id,
                      bip_id : bipModel.id,
                      code : 'bip_invoke'
                    });

                    // if this bip is waiting for a binding, then set it.
                    // can't bind triggers
                    if ('trigger' !== bipModel.type && firstBinding) {
                      var bindTo;
                      if (bipModel.type == 'smtp') {
                        bindTo = client.reply_to;
                      } else {
                        bindTo = client.host;
                      }

                      // just incase
                      bindTo = helper.sanitize(bindTo).xss();

                      self._dao.updateColumn('bip', bipModel.id, { 'binder' : [ bindTo ] }, function(err, result) {
                        if (err) {
                          app.logmessage(err, 'error');
                        }
                      });
                    }
                  }
                });


              }
            );
          })(bipResult, client, firstBinding, next);
        }
      }
    });

}

/**
 * Given a bip and some content, begins the delivery process
 *
 * bip and client also exist in exports as _bip and _client respectively, we
 * break them out as seperate system usable arguments.
 *
 * @todo _bip and _client should be read-only objects
 *
 */
Bastion.prototype.bipFire = function(bip, exports, client, content_parts, files) {
  var self = this;

  if (files) {
    content_parts._files = files;
  }
  var statSize = 0;
  for (var i = 0; i < content_parts._files.length; i++) {
    statSize += sprintf('%.4f', (content_parts._files[i].size / (1024 * 1024)) );
  }

  for (var k in exports) {
    if (exports.hasOwnProperty(k) && ~/^_/.test(key) && exports[key]) {
      statSize += exports[key].length;
    }
  }

  app.bastion.createJob(DEFS.JOB_USER_STAT, {
    owner_id : bip.owner_id,
    type : 'traffic_inbound_mb',
    inc : statSize
  } );

  app.bastion.createJob(DEFS.JOB_USER_STAT, {
    owner_id : bip.owner_id,
    type : 'delivered_bip_inbound'
  } );

  // clear bip error state
  this._dao.bipError(bip.id, false, function() {
    // distribute the undirected graph out to channel workers
    return self.distributeChannel(bip, 'source', client.content_type, client.encoding, app._.clone(exports), client, content_parts);
  });

}

/**
 * Given the imports, a bip and channel pointer, determines which edges need delivery
 * and pushes to the queue
 */
Bastion.prototype.distributeChannel = function(bip, channel_id, content_type, encoding, exports, client, content_parts) {
  var numEdges = (bip.hub[channel_id]) ? bip.hub[channel_id].edges.length : 0, channelInvokePacket;

  // add adjacent exports generated by channel_id
  if ( app.helper.getRegUUID().test(channel_id ) ) {
    exports[channel_id] = app._.clone(exports.local, {} );

  } else if ('source' === channel_id) {
    exports['source'] = app._.clone(exports.source, {} );

  } else {
    tokens = channel_id.split('.');

    var ptr = exports;

    tokens.forEach(function(token, idx) {

      if (!ptr[token]) {
        ptr[token] = {}
      }

      if (idx === tokens.length - 1) {
        ptr[token] = app._.clone(exports.local, {} );
      } else {
        ptr = ptr[token];
      }
    });
  }

  // do not export account object reference with bip (circular ref)
  delete bip.accountInfo;

  for (var i = 0; i < numEdges; i++) {
    channelInvokePacket = {
      'bip' : bip,
      'channel_id' : bip.hub[channel_id].edges[i],
      'content_type' : content_type,
      'encoding' : encoding,
      'transforms' : bip.hub[channel_id].transforms,
      'imports' : exports,
      'client' : client,
      'content_parts' : content_parts
    }

    app.logmessage('BASTION:FWD:TX:' + client.id + ':CID:' + channel_id);
    // produce an export for the next upstream
    // adjacent channel
    this._queue.producePublic(channelInvokePacket, function() {
      delete bip;
      delete exports;
      delete client;
      delete conten_parts;
    });
  }
}

Bastion.prototype._invokeChannel = function(channel, struct) {
  var transforms = {},
    self = this;

  if (struct.transforms && struct.transforms[struct.channel_id]) {
    transforms = struct.transforms[struct.channel_id];
  }

  channel = self._dao.modelFactory('channel', channel);

  channel.invoke(
    struct.imports,
    transforms,
    struct.client, // system imports
    struct.content_parts,
    function(err, exports, contentParts, transferredBytes) {

      if (!err && exports) {

        var newImports = app._.clone(struct.imports)
        newImports.local = exports;

        // any channel which pushes data outside the system
        // should provide a #bytes sent for outbound accounting
        if (null !== transferredBytes) {

          self.createJob(DEFS.JOB_USER_STAT, {
            owner_id : channel.owner_id,
            type : 'traffic_outbound_mb',
            inc : sprintf('%.4f', (transferredBytes / (1024 * 1024)) )
          });

          self.createJob(DEFS.JOB_USER_STAT, {
            owner_id : channel.owner_id,
            type : 'delivered_channel_outbound'
          });
        }

        self.distributeChannel(
          struct.bip,
          channel.id,
          struct.content_type,
          struct.encoding,
          // exports,
          newImports,
          struct.client,
          contentParts || struct.content_parts
        );

      } else if (err) {
        var errStr = err.message ? err.message : err.toString();

        app.logmessage('Channel Invoke Failure:' + channel.id);
        app.logmessage(err);

        self.createJob(DEFS.JOB_BIP_ACTIVITY, {
          owner_id : channel.owner_id,
          bip_id : struct.bip.id,
          code : 'bip_channnel_error',
          message : errStr,
          source : channel.id
        });
      }
    }
  );
}

/**
 * Loads and invokes a channel, then passes to next distribution if one exists
 */
Bastion.prototype.processChannel = function(struct) {
  var self = this;

  var actionTokens = struct.channel_id.split('.');

  struct.imports._bip = app._.clone(struct.bip);
  struct.imports._client = app._.clone(struct.client);

  // unpack the bip and deliver
  if (undefined != struct.bip) {

    app.logmessage('BASTION:TX_PTR:TX:' + struct.client.id + ':BIPID:' + struct.bip.id + ':CID:' + struct.channel_id, 'info');

    this._dao.getChannel(
      struct.channel_id,
      struct.bip.owner_id,
      function(err, channel) {
        if (err) {
          app.logmessage('BASTION:Couldnt load channel:' + struct.channel_id + ' ' + err, 'warning');
        } else {

          app.logmessage('BASTION:INVOKE:TX:' + struct.client.id + ':CID:' + struct.channel_id, 'info');

          self._invokeChannel(channel, struct);
        }
      }
    );
  }
}

/**
 *
 * Set up consumer loop
 *
 * @param string queueConsume queue name to consume on
 *
 */
Bastion.prototype.consumeLoop = function() {
  var self = this;
  return function(queueConsume) {
    var q = self.getQueue(queueConsume),
    consumer;

    if (queueConsume == 'queue_bastion') {
      consumer = function anonConsumeGraph(message, headers, deliveryInfo) {

        self.processChannel(JSON.parse(message.data.toString()));

      }
    } else if (queueConsume == 'queue_jobs') {
      consumer = function anonConsumeJobs(message, headers, deliveryInfo) {
        self.jobRunner(JSON.parse(message.data.toString()));

      }
    }

    if (consumer) {
      q.subscribe(consumer);
    }


  }
}

module.exports = Bastion;
