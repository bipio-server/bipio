/**
 *
 * The Bipio API Server
 *
 * @author Michael Pearson <michael@cloudspark.com.au>
 * Copyright (c) 2010-2013 CloudSpark pty ltd http://www.cloudspark.com.au
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
    helper = require('../lib/helper');
//    msgpack = require('msgpack');

function Bastion(dao, noConsume, cb) {
    if (!cb && !noConsume) {
        cb = this.consumeLoop()
    }
    this._dao = null;
    this._queue = new Rabbit(CFG.rabbit, noConsume ? undefined : cb);
    return this;
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

// @todo we have to assume the queue system is a DMZ for now :|
Bastion.prototype.jobRunner = function(jobPacket) {
    var self = this;
    app.logmessage('Bastion Packet Received.  Job [' + jobPacket.name + ']', 'info');
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
                            'local' : {}
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
                                        'encoding' : ''
                                    };

                    imports._client = clientStruct;
                    imports._bip = jobPacket.data;

                    if (err) {
                        app.logmessage(err, 'error');
                    } else if (!result) {
                        app.logmessage('Channel has disappeared [' + cid + ']', 'info');
                    } else {
                        invokeChannel = self._dao.modelFactory('channel', result);
                        invokeChannel.invoke(
                                        imports, // imports
                                        transforms, // transforms
                                        clientStruct, // client
                                        contentParts, // content parts
                                        function(err, exports, content_parts) {
                                            var normedExports = {};
                                            for (var key in exports) {
                                                normedExports['source#' + key] = exports[key];
                                            }
                                            if (!err) {
                                                if (exports) {
                                                    // translate trigger exports
                                                    // into bip #source hub key.
                                                    var v = { 'source' : exports };
                                                    
                                                    self.channelDistribute(
                                                        jobPacket.data,
                                                        'source',
                                                        '',
                                                        '',
                                                        normedExports,
                                                        clientStruct,
                                                        content_parts
                                                    );
                                                }
                                            }
                                        });
                    }
                }
            );

        // exit process
        } else if (jobPacket.name == DEFS.SIG_RESTART) {
            process.exit(0);

        } else if (jobPacket.name == DEFS.JOB_SET_DEFAULT_SPACE) {
            this._dao.updateColumn(
                'account_option', 
                { owner_id : jobPacket.data.owner_id }, 
                { default_feed_id : jobPacket.data.channel_id },
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
                    inc = jobPacket.data.inc || 1;
                    
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
                            self.createJob(DEFS.JOB_USER_STAT, { owner_id : 'system', type : jobPacket.data.type, inc : inc } );
                        }                        
                    }
                });
            }          

        } else if (jobPacket.name == DEFS.JOB_BIP_ACTIVITY) {            
            this._dao.bipLog(jobPacket.data);
        } else {
            app.logmessage('MALFORMED PACKET', 'error');
            console.log(jobPacket);
        }
    }
}

/**
 * tries to retrieve a bip by name + domain and determines if active.
 *
 * If the bip has expired by time/impressions, then pauses the bip.
 *
 * This interface is primarily used by the protocol proxy before forwarding onto
 * rabbit for consumption by a Bastion worker.
 *
 */
Bastion.prototype.bipUnpack = function(type, name, ownerId, domainId, container, cb, cbParameterMap) {
    var self = this;
    var filter = {
        'type' : type,
        'paused' : false
    };

    if (name) {
        filter.name = name;
    }

    if (ownerId) {
        filter.owner_id = ownerId;
    }

    if (domainId) {
        filter.domain_id = domainId;
    }

    this._dao.findFilter('bip',
        filter,
        function(err, bipResults) {
            var firstBinder = false,
                bipResult,
                numResults = bipResults.length;

            if (err || numResults == 0) {
                cb(cbParameterMap.fail, err);
            } else {
                for (var i = 0; i < numResults; i++) {
                    bipResult = bipResults[i];
                    if (container._clientInfo && bipResult.binder.length > 0) {
                        if (bipResult.binder[0] == 'first') {
                            firstBinder = true;
                        }

                        if (!firstBinder) {
                            if (
                                !helper.inArray(bipResult.binder, container._clientInfo.remote_ip) &&
                                !(container._clientInfo.remote_sender && helper.inArray(bipResult.binder, container._clientInfo.remote_sender)) ) {
                                cb(cbParameterMap.fail, "Not Authorized");
                                return;
                            }
                        }
                    }

                    if (bipResult.end_life) {
                        var endTime = parseInt(bipResult.end_life.time * 1),
                        endImp =  parseInt(bipResult.end_life.imp * 1),
                        now, pause = false;

                        if (endTime > 0) {
                            now = Math.floor(new Date().getTime() / 1000);
                            // if its an integer, then treat as a timestamp
                            if (!isNaN(endTime)) {
                                // expired? then pause
                                if (now >= endTime) {
                                    // pause this bip
                                    console.log('pause');
                                    pause = true;
                                }
                            }
                        }

                        if (endImp > 0) {
                            // @todo check impressions
                            if (bipResult._imp_actual && bipResult._imp_actual >= endImp) {
                                console.log('pause imp');
                                pause = true;
                            }
                        }
                    }

                    if (pause) {
                        
                        // @todo apply bip_expire_behaviour from user prefs
                        self._dao.pauseBip(bipResult, cb(cbParameterMap.fail, err), true, container._clientInfo.txId);
                    } else {
                        // add bip metadata to the container
                        cb(
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
                                bindTo = container._clientInfo.remote_sender;
                            } else {
                                bindTo = container._clientInfo.remote_ip;
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
 * Given a bip and some content, begins the delivery process
 * 
 * bip and client also exist in exports as _bip and _client respectively, we
 * break them out as seperate system usable arguments.
 * 
 * @todo _bip and _client should be read-only objects
 * 
 */
Bastion.prototype.bipFire = function(bip, content_type, encoding, exports, client, content_parts, files) {
    if (files) {
        content_parts._files = files;
    }
    var statSize = 0;
    for (var i = 0; i < content_parts._files.length; i++) {       
        statSize += sprintf('%.4f', (content_parts._files[i].size / (1024 * 1024)) );
    }
    

    app.bastion.createJob(DEFS.JOB_USER_STAT, { owner_id : bip.owner_id, type : 'traffic_inbound_mb', inc : statSize } );
    app.bastion.createJob(DEFS.JOB_USER_STAT, { owner_id : bip.owner_id, type : 'delivered_bip_inbound' } );

    // distribute the undirected graph out to channel workers
    return this.channelDistribute(bip, 'source', content_type, encoding, exports, client, content_parts);

}

/**
 * Given the imports, a bip and channel pointer, determines which edges need delivery
 * and pushes to the queue
 */
Bastion.prototype.channelDistribute = function(bip, channel_id, content_type, encoding, imports, client, content_parts) {
    var numEdges = (bip.hub[channel_id]) ? bip.hub[channel_id].edges.length : 0, channelInvokePacket;
    
    // create a new channel_id imports reference.  We dont' check if the channel
    // already exists in imports, because loops are not yet allowed.
    //imports[channel_id == 'source' ? '_source' : channel_id] = app.helper.copyProperties(imports.local, {} );
    imports[channel_id] = app.helper.copyProperties(imports.local, {} );
    
    for (var i = 0; i < numEdges; i++) {
        channelInvokePacket = {
            'bip' : bip,
            'channel_id' : bip.hub[channel_id].edges[i],
            'content_type' : content_type,
            'encoding' : encoding,
            'transforms' : bip.hub[channel_id].transforms,
            'imports' : imports,
            'client' : client,
            'content_parts' : content_parts
        }

        app.logmessage('Bastion Channel Distribute [' + channel_id + ']');

        // send to rabbit
        //this._queue.producePublic(msgpack.pack(channelInvokePacket));
        this._queue.producePublic(channelInvokePacket);
    }
}

/**
 * Loads and invokes a channel, then passes to next distribution if one exists
 */
Bastion.prototype.channelProcess = function(struct) {
    var self = this;

    // unpack the bip and deliver
    app.logmessage('Bastion Packet Received. Transaction ID [' + struct.client.id + ']', 'info');
    app.logmessage('Bastion Channel Process Start [' + struct.client.id + ']->[' + struct.channel_id + ']', 'info');

    if (undefined != struct.bip) {

        // Load channels & distribute
        var filter = {
            'id' : struct.channel_id,
            'owner_id' : struct.bip.owner_id
        };

        this._dao.find(
            'channel',
            filter,
            function(err, result) {
                if (err || !result) {
                    app.logmessage('Bastion CRITICAL Couldnt load channel ' + struct.channel_id, 'warning');
                } else {
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
                        function(err, exports, contentParts) {
                            if (!err && exports) {

                                    var newImports = struct.imports
                                    newImports.local = exports;

                                    self.channelDistribute(
                                            struct.bip,
                                            channel.id,
                                            struct.content_type,
                                            struct.encoding,
                                            // exports,
                                            newImports,
                                            struct.client,
                                            contentParts
                                        );
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
            q.subscribe(consumer);
            app.logmessage('[' + queueConsume + '] consumer attached');
        }
    }
}

module.exports = Bastion;