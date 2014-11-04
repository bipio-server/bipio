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
heapdump = require('heapdump'),
eventEmitter = new events.EventEmitter();

//    msgpack = require('msgpack');

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

  //this._queue = new Rabbit(CFG.rabbit, noConsume ? undefined : eventWrapper);
  this._queue = new Rabbit(CFG.rabbit, noConsume ? eventWrapper : cb);

  if (noConsume) {
    app.logmessage('BASTION:NOCONSUME MODE');
  }

  return this;
}

Bastion.prototype.__proto__ = events.EventEmitter.prototype;


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

// @todo we have to assume the queue system is a DMZ for now :|
Bastion.prototype.jobRunner = function(jobPacket) {
  var self = this;
  app.logmessage('BASTION:REC:NAME:' + jobPacket.name, 'info');
  if (jobPacket.name) {
    if (jobPacket.name == DEFS.JOB_ATTACH_REFERER_ICON) {
      this._dao._jobAttachBipRefererIcon( jobPacket.data, this.jobRunnerAlert );

    //
    } else if (jobPacket.name == DEFS.JOB_USER_NOTIFICATION) {
      this._dao.userNotify( jobPacket.data, this.jobRunnerAlert );

    } else if (jobPacket.name == DEFS.JOB_BIP_TRIGGER) {
      var cid = jobPacket.data.config.channel_id;
      // Get Channel
      this._dao.find(
        'channel',
        {
          'id' : cid,
          'owner_id' : jobPacket.data.owner_id
        },
        function(err, result) {
          var invokeChannel,
          contentParts = {
            _files : []
          },
          imports = {
             _bip : app._.clone(jobPacket.data)
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

          imports._client = clientStruct;

          if (err) {
            app.logmessage(err, 'error');
          } else if (!result) {
            app.logmessage('Channel has disappeared [' + cid + ']', 'info');
          } else {
            invokeChannel = self._dao.modelFactory('channel', result);

            if (jobPacket.data.socketTrigger || !invokeChannel.isSocket() ) {
              invokeChannel.invoke(
                imports, // imports
                transforms, // transforms
                clientStruct, // client
                contentParts, // content parts
                function(err, exports, content_parts, transferSizeBytes) {
                  var normedExports = {};
                  transferSizeBytes = transferSizeBytes || 0;
                  for (var key in exports) {
                    normedExports['source#' + key] = exports[key];
                  }

                  normedExports['source'] = app._.clone(exports);

                  if (!err) {
                    if (exports) {
                      self._dao.accumulate('bip', imports._bip, '_imp_actual');

                      app.bastion.createJob(DEFS.JOB_USER_STAT, {
                        owner_id : result.owner_id,
                        type : 'traffic_inbound_mb',
                        inc : sprintf('%.4f', (transferSizeBytes / (1024 * 1024)) )
                      });

                      app.bastion.createJob(DEFS.JOB_USER_STAT, {
                        owner_id : result.owner_id,
                        type : 'delivered_bip_inbound'
                      });

                      // translate trigger exports
                      // into bip #source hub key.
                      var v = {
                        'source' : exports
                      };

                      self.channelDistribute(
                        app._.clone(jobPacket.data),
                        'source',
                        '',
                        '',
                        normedExports,
                        app._.clone(clientStruct),
                        content_parts
                      );
                    }
                  }
                });
            }
          }
        }
      );

    // exit process
    } else if (jobPacket.name == DEFS.SIG_RESTART) {
      process.exit(0);

    } else if (jobPacket.name == DEFS.JOB_SET_DEFAULT_SPACE) {
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
    } else if (jobPacket.name == DEFS.JOB_BIP_SET_DEFAULTS) {
      this._dao.setTransformDefaults(jobPacket.data);

    } else if (jobPacket.name == DEFS.JOB_USER_STAT) {
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
          app.logmessage('Incrementor is Not A Number', 'warning');
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

    } else if (jobPacket.name == DEFS.JOB_BIP_ACTIVITY) {
      this._dao.bipLog(jobPacket.data);
    } else if (jobPacket.name === DEFS.JOB_HEAP_DUMP && CFG.dumpKey && jobPacket.data.key === CFG.dumpKey && process.pid === jobPacket.data.pid) {
      var f = '/tmp/bipio_' + process.pid + '_' + Date.now() + '.heapsnapshot';
      app.logmessage('Writing Heap Snapshot ' + f);
      heapdump.writeSnapshot(f);
    } else {
      console.log(jobPacket);
      app.logmessage('BASTION:MALFORMED PACKET', 'error');
    }
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
 */
Bastion.prototype.bipUnpack = function(type, name, accountInfo, client, next, cbParameterMap) {
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

  var domainId = accountInfo.getActiveDomain();
  if (domainId) {
    filter.domain_id = domainId;
  }

//  (function(accountInfo, client, filter, next) {
    self._dao.findFilter('bip',
      filter,
      function(err, bipResults) {
        var firstBinder = false,
        bipResult,
        expireBehavior,
        numResults = bipResults.length;

        if (err || numResults == 0) {
          next(cbParameterMap.fail, err);
        } else {
          for (var i = 0; i < numResults; i++) {
            bipResult = bipResults[i];
            if (client && bipResult.binder && bipResult.binder.length > 0) {
              if (bipResult.binder[0] == 'first') {
                firstBinder = true;
              }

              if (!firstBinder) {
                if (
                  !helper.inArray(bipResult.binder, client.host) &&
                  !(client.reply_to && helper.inArray(bipResult.binder, client.reply_to)) ) {
                  next(cbParameterMap.fail, "Not Authorized");
                  return;
                }
              }
            }

            if (bipResult.end_life) {
              // convert bip expiry to user timezone
              var tzTime = new Date(parseInt(bipResult.end_life.time * 1))
                  .setTimezone(accountInfo.user.settings.timezone).getTime(),
                endTime = Math.floor(tzTime),
                nowTime = new Date().getTime() / 1000,
                endImp =  parseInt(bipResult.end_life.imp * 1),
                now, expired = false;

              if (endTime > 0) {
                now = Math.floor(nowTime);
                // if its an integer, then treat as a timestamp
                if (!isNaN(endTime)) {
                  // expired? then pause
                  if (now >= endTime) {
                    // pause this bip
                    expired = true;
                  }
                }
              }

              if (endImp > 0) {
                if (bipResult._imp_actual && bipResult._imp_actual >= endImp) {
                  expired = true;
                }
              }
            }

            if (expired) {
              expireBehavior = (bipResult.end_life.action && '' !== bipResult.end_life.action)
              ? bipResult.end_life.action
              : accountInfo.user.settings.bip_expire_behaviour;

              if ('delete' === expireBehavior) {
                self._dao.deleteBip(bipResult, accountInfo, cb(cbParameterMap.fail, err), client.id);
              } else {
                self._dao.pauseBip(bipResult, cb(cbParameterMap.fail, err), true, client.id);
              }
            } else {
              // add bip metadata to the container
              next(
                cbParameterMap.success,
                {
                  'status' : 'OK'
                },
                // we don't need the whole bip packet.
                {
                  id : bipResult.id,
                  hub : bipResult.hub,
                  owner_id : bipResult.owner_id,
                  config : bipResult.config,
                  name : bipResult.name,
                  type : bipResult.type
                });

              // update accumulator
              self._dao.accumulate('bip', bipResult, '_imp_actual');

              // if this bip is waiting for a binding, then set it
              if (firstBinder) {
                var bindTo;
                if (bipResult.type == 'smtp') {
                  bindTo = client.reply_to;
                } else {
                  bindTo = client.host;
                }

                // just incase
                bindTo = helper.sanitize(bindTo).xss();

                self._dao.updateColumn('bip', bipResult.id, [ bindTo ], function(err, result) {
                  if (err) {
                    console.log(err);
                  }
                });
              }
            }
          }
        }
      });
//  })(accountInfo, client, filter, cb);
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

  // distribute the undirected graph out to channel workers
  return this.channelDistribute(bip, 'source', client.content_type, client.encoding, app._.clone(exports), client, content_parts);

}

/**
 * Given the imports, a bip and channel pointer, determines which edges need delivery
 * and pushes to the queue
 */
Bastion.prototype.channelDistribute = function(bip, channel_id, content_type, encoding, exports, client, content_parts) {
  var numEdges = (bip.hub[channel_id]) ? bip.hub[channel_id].edges.length : 0, channelInvokePacket;

  // add adjacent exports generated by channel_id
  if (!exports[channel_id]) {
    exports[channel_id] = app._.clone(exports.local, {} );
  }

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
    this._queue.producePublic(channelInvokePacket);
  }
}

/**
 * Loads and invokes a channel, then passes to next distribution if one exists
 */
Bastion.prototype.channelProcess = function(struct) {
  var self = this;

  // unpack the bip and deliver
  app.logmessage('BASTION:PROC:TX:' + struct.client.id, 'info'); // transaction started
  app.logmessage('BASTION:FWD:TX:' + struct.client.id + ':CID:' + struct.channel_id, 'info');

  if (undefined != struct.bip) {

    app.logmessage('BASTION:PROC:TX:' + struct.client.id + ':BIPID:' + struct.bip.id + ':CID:' + struct.channel_id, 'info');

    // Load channels & distribute
    var filter = {
      'id' : struct.channel_id,
      'owner_id' : struct.bip.owner_id
    };

    struct.imports._bip = app._.clone(struct.bip);
    struct.imports._client = app._.clone(struct.client);

    this._dao.find(
      'channel',
      filter,
      function(err, result) {
        if (err || !result) {
          app.logmessage('BASTION:CRITICAL Couldnt load channel:' + struct.channel_id, 'warning');
        } else {
          app.logmessage('BASTION:INVOKE:TX:' + struct.client.id + ':CID:' + struct.channel_id, 'info');
          var channel = self._dao.modelFactory('channel', result),
          transforms = {};

          if (struct.transforms && struct.transforms[struct.channel_id]) {
            transforms = struct.transforms[struct.channel_id];
          }

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

                  app.bastion.createJob(DEFS.JOB_USER_STAT, {
                    owner_id : channel.owner_id,
                    type : 'traffic_outbound_mb',
                    inc : sprintf('%.4f', (transferredBytes / (1024 * 1024)) )
                  });

                  app.bastion.createJob(DEFS.JOB_USER_STAT, {
                    owner_id : channel.owner_id,
                    type : 'delivered_channel_outbound'
                  });
                }

                self.channelDistribute(
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
                app.logmessage('Channel Invoke Failure:' + channel.id);
                app.logmessage(err);

                var logModel = self._dao.modelFactory(
                  'channel_log',
                  {
                    owner_id : channel.owner_id,
                    channel_id : channel.id,
                    transaction_id : struct.client.id,
                    code : 'channel_error',
                    bip_id : struct.imports._bip.id,
                    message : err.toString()
                  }
                );
                self._dao.create(logModel);
              }
            });
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
      consumer = function (message, headers, deliveryInfo) {
        self.channelProcess(JSON.parse(message.data.toString()));
      //self.channelProcess(msgpack.unpack(message.data));
      }
    } else if (queueConsume == 'queue_jobs') {
      consumer = function (message, headers, deliveryInfo) {
        self.jobRunner(JSON.parse(message.data.toString()));
      //self.channelProcess(msgpack.unpack(message.data));
      }
    }

    if (consumer) {
      q.subscribe(consumer).addCallback(function(ok) {
        self.consumerTags[ok.consumerTag] = q;
      });
      app.logmessage('BASTION:' + queueConsume + ':consumer attached');
    }
  }
}

Bastion.prototype.close = function() {
  var ct = this.consumerTags;
  for (k in ct) {
    if (ct.hasOwnProperty(k)) {
      app.logmessage('BASTION:consumer tag:unsubscribed');
      ct[k].unsubscribe(k);
    }
  }

  this._queue.disconnect();
}

module.exports = Bastion;