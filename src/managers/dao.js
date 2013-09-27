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
var util        = require('util'),
    helper      = require('../lib/helper'),
    cdn         = require('../lib/cdn'),
    step        = require('../lib/step'),
    async       = require('async'),
    fs          = require('fs'),
    time        = require('time'),
    DaoMongo    = require('./dao-mongo.js');

function Dao(config, log, next) {
    var self = this;
    DaoMongo.apply(this, arguments);

    // protocol + base url
    this._baseUrl = CFG.proto_public + CFG.domain_public;
    this.cdn = cdn;
    this._modelPrototype = require('../models/prototype.js').BipModel;

    var modelSrc = {
        // mapper
        'bip' : require('../models/bip').Bip,
        'bip_share' : require('../models/bip_share').BipShare,
        'bip_log' : require('../models/bip_log').BipLog,
        'channel' : require('../models/channel').Channel,
        'domain' : require('../models/domain').Domain,

        'transform_default' : require('../models/transform_default').TransformDefault,

        // account
        'account' : require('../models/account').Account,
        'account_auth' : require('../models/account_auth').AccountAuth,
        'account_option' : require('../models/account_option').AccountOption,

        'stats_account' : require('../models/stats_account').StatsAccount,
        'stats_account_network' : require('../models/stats_account_network').StatsAccountNetwork
    }

    this.models = { };

    for (var key in modelSrc) {
        this.registerModel(modelSrc[key]);
    }

}

util.inherits(Dao, DaoMongo);

Dao.prototype.getBaseUrl = function() {
    return this._baseUrl;
}


// ---------------------- USERS
function AccountInfo(account) {
    this.user = account;
}

AccountInfo.prototype = {
    getSetting : function(setting) {
        return this.user.settings.getValue(setting);
    },
    getId : function() {
        return this.user.id;
    },
    getActiveDomain : function() {
        return this.user.activeDomainId;
    },
    getDefaultDomain: function() {
        return this.user.domains.get(this.user.defaultDomainId);
    },
    getDefaultDomainStr : function(incProto) {
        var defaultDomain = this.getDefaultDomain();
        var proto = (incProto) ? CFG.proto_public : '';
        return proto + defaultDomain.name;
    },
    getName : function() {
        return this.user.name;
    }
};

Dao.prototype.getAccountStruct = function(authModel, next) {
    var self = this,
        resultModel = { // session usable abstract model of the account
            id : authModel.owner_id,
            name : authModel.name,
            username : authModel.username,
            is_admin: authModel.is_admin,
            settings: {
                api_token: null
            }
        };

    // finally, try to pull out the users auth token and account options
    step(
        function loadAcctInfo() {
            self.find(
                'account_auth',
                {
                    'owner_id' : authModel.owner_id,
                    'type' : 'token'
                },
                this.parallel()
            );

            self.find(
            'account_option',
            {
                'owner_id' : authModel.owner_id
            },
            this.parallel());

            // get domains (for bip/channel representations
            self.findFilter(
            'domain',
            {
                'owner_id' : authModel.owner_id
            },
            this.parallel());

            // get channels (for id lookups)
            self.findFilter(
            'channel',
            {
                'owner_id' : authModel.owner_id
            },
            this.parallel());
        },
        function collateResults(err, auth, options, domains, channels) {
          
            if (err || null == auth || null == options) {
                err = true;
                resultModel = null;
            } else {

                var domainModels = {
                    domains : {},
                    set: function(model) {
                        this.domains[model.id] = model;
                    },
                    get: function( id ) {
                        return this.domains[id];
                    },
                    test: function(id) {
                        return (undefined != this.domains[id]);
                    }
                };

                for (idx in domains ) {
                    domainModels.set(self.modelFactory('domain', domains[idx]));
                    // set default domain.  system allocated 'vanity' domains
                    // will respond to RPC calls etc.
                    if (domains[idx].type == 'vanity') {
                        resultModel.defaultDomainId = domains[idx].id;
                    }
                }

                if (undefined === resultModel.defaultDomainId) {
                    resultModel.defaultDomainId = "";
                }

                // there may be quite a few channels, but this
                // still seems a little cheaper
                var channelModels = {
                    channels : {},
                    set: function(model) {
                        this.channels[model.id] = model;
                    },
                    get: function( id ) {
                        return this.channels[id];
                    },
                    test: function(id) {
                        return (undefined != this.channels[id]);
                    }

                };

                for (idx in channels ) {
                    channelModels.set(self.modelFactory('channel', channels[idx]));
                }

                resultModel.domains = domainModels;
                resultModel.channels = channelModels;
                resultModel.settings = options;

                var model = self.modelFactory('account_auth', auth);
                resultModel.settings.api_token = model.getPassword();
                resultModel.settings.api_token_auth = 'Basic ' + (new Buffer(authModel.username + ':' + model.getPassword()).toString('base64'));
            }

            var accountInfo = new AccountInfo(resultModel);
            
            next(err, accountInfo);
        }
    );
}

/**
 *
 */
Dao.prototype.checkAuth = function(username, password, type, cb, asOwnerId, activeDomainId) {
    var self = this;
    var filter = {};

    if (asOwnerId) {
        filter['id'] = username;
    } else {
        filter['username'] = username;
    }

    this.find(
        'account',
        filter,
        function(err, acctResult) {
            if (!err && (null != acctResult)) {

                var filter = {
                    'owner_id' : acctResult.id,
                    'type' : type
                }

                self.find('account_auth', filter, function(isErr, result) {
                    var resultModel = null;
                    if (!isErr && null != result) {
                        var authModel = self.modelFactory('account_auth', result);
                        if (asOwnerId || authModel.cmpPassword(password)) {

                            authModel.username = acctResult.username;
                            authModel.name = acctResult.name;
                            authModel.is_admin = acctResult.is_admin;
                            
                            self.getAccountStruct(authModel, function(err, accountInfo) {                                
                                if (undefined == activeDomainId) {
                                    accountInfo.user.activeDomainId = accountInfo.defaultDomainId;
                                } else {
                                    accountInfo.user.activeDomainId = activeDomainId;
                                }
                                cb(false, accountInfo);                                
                            });
                        } else {
                            cb(true, resultModel);
                        }
                    } else {
                        cb(true, resultModel);
                    }
                });
            } else {
                cb(true, null);
            }
        }
    );
}

/**
 * Matches a domain and loads
 */
Dao.prototype.domainAuth = function(domain, getUserInfo, cb) {
    var self = this;
    this.find('domain', {
        'name' : domain
    }, function(err, result) {
        if (err) {
            console.log(err);
        }

        if (getUserInfo) {
            if (result) {
                self.checkAuth(result.owner_id, '', 'token', function(err, acctResult) {
                    cb(err, acctResult);
                }, true, result.id);
            } else {
                cb(true, null);
            }
        } else {
            cb(err, result);
        }
    });
}


/**
 * Creates a user notification entry.  Expects payload of the form
 *
 * {
 *  account_id : 'abc123',
 *  message : 'text message',
 *  code : '@see account_log'
 * }
 */
Dao.prototype.userNotify = function(payload, next) {
    var entry = {
        owner_id : payload.account_id,
        code : payload.code,
        content : payload.message
    }

    var model = this.modelFactory('account_log', entry);
    this.create(model);
}


// -------------------------------- BIPS

// --------------------------------- Bip helpers
Dao.prototype.deleteBip = function(props, accountInfo, cb, transactionId) {
    this.remove('bip', props.id, accountInfo, function(err, result) {
        if (err) {
            app.logmessage(err, 'error');
        } else {
            var jobPacket = {
                owner_id : props.owner_id,
                bip_id : props.id
            };

            if (transactionId ) {
                jobPacket.transaction_id = transactionId;
                jobPacket.code = 'bip_deleted_auto';
            } else {
                jobPacket.code = 'bip_deleted_manual';
            }
            app.bastion.createJob(DEFS.JOB_BIP_ACTIVITY, jobPacket);
        }
    })
}

Dao.prototype.pauseBip = function(props, cb, pause, transactionId) {
    // default pause (true == unpause)
    if (undefined == pause) {
        pause = true;
    }

    var model = this.modelFactory('bip', props);
    this.update(
        'bip',
        model.getIdValue(),
        {
            'paused' : pause
        },
        function(err) {
            if (!err) {
                var jobPacket = {
                    owner_id : props.owner_id,
                    bip_id : props.id
                };

                if (transactionId ) {
                    jobPacket.transaction_id = transactionId;
                    jobPacket.code = 'bip_paused_auto';

                } else {
                    jobPacket.code = 'bip_paused_manual';
                }

                app.bastion.createJob(DEFS.JOB_BIP_ACTIVITY, jobPacket);
            }
        }
    );
};


// update account options with the selected bip's config.
Dao.prototype.setDefaultBip = function(bipId, targetModel, accountInfo, cb) {
    var self = this;
    // get bip
    this.find('bip', {
        id : bipId,
        owner_id : accountInfo.user.id
    }, function(err, result) {
        if (err) {
            cb(self.errorParse(err), null, null, self.errorMap(err) );
        } else {
            // update into account options
            targetModel.bip_config = result.config;
            targetModel.bip_domain_id = result.domain_id;
            targetModel.bip_end_life = result.end_life;
            targetModel.bip_hub = result.hub;
            targetModel.bip_type = result.type;

            // update into account options
            self.update(
            'account_option',
            targetModel.id,
            targetModel,
            cb,
            accountInfo
        );
        }
    });
};

Dao.prototype.webFinger = function(emailAddress, next) {
    next();
}

Dao.prototype.shareBip = function(bip, cb) {
    var self = this,
        modelName = 'bip_share',
        hub = helper.copyProperties(bip.hub, {}, true),
        derivedHub = {},
        manifest = {},
        channels = bip.accountInfo.user.channels,
        derivedSrc = '',
        txSrcNorm = '',
        template = '',
        regUUID = helper.getRegUUID(),
        cMatch;

    function channelTranslate(src) {
        // skip source in manifest
        if (src !== 'source') {
            src = channels.get(src).action;
            manifest[src] = true;
        }

        return src;
    }

    // ugh.
    function keyNormalize(src) {
        return src.replace('.', '-');
    }

    for (var src in hub) {
        if (hub.hasOwnProperty(src)) {
            derivedSrc = channelTranslate(src);

            derivedSrc = keyNormalize(derivedSrc);

            derivedHub[derivedSrc] = {
                edges : [],
                transforms : {}
            };

            for (var i = 0; i < hub[src].edges.length; i++) {
                derivedHub[derivedSrc].edges.push(channelTranslate(hub[src].edges[i]));
            }

            if (hub[src].transforms) {
                for (var txSrc in hub[src].transforms) {
                    txSrcNorm = keyNormalize(channelTranslate(txSrc));
                    derivedHub[derivedSrc].transforms[txSrcNorm] = {};

                    for (var cImport in hub[src].transforms[txSrc]) {
                        template = hub[src].transforms[txSrc][cImport];
                        cMatch = template.match(regUUID);
                        if (cMatch && cMatch.length) {
                            for (var j = 0; j < cMatch.length; j++) {
                                template = template.replace(cMatch[j], channelTranslate(cMatch[j]));
                            }
                        }
                        derivedHub[derivedSrc].transforms[txSrcNorm][cImport] = template;
                    }
                }
            }
        }
    }

    var config = helper.copyProperties(bip.config, {});
    // always force auth on shared http bips.
    if (bip.type === 'http') {
        config.auth = 'token'
        delete config.username;
        delete config.password;
    } else if (bip.type === 'trigger' && bip.config.channel_id) {
        config.channel_id = channelTranslate(bip.config.channel_id);
    }

    // bip share struct
    var bipShare = {
        bip_id : bip.id,
        type : bip.type,
        name : bip.name,
        note : bip.note,
        icon : bip.icon,
        config : config,
        hub : derivedHub,
        manifest : Object.keys(manifest),
        owner_id : bip.owner_id,
        owner_name : bip.accountInfo.user.name
    };


    bipShare.manifest_hash = helper.strHash(bipShare.manifest.join());

    // find & update or create for bip/owner pair
    self.find(
        'bip_share',
        {
            owner_id : bip.accountInfo.user.id,
            bip_id : bip.id
        },
        function(err, result) {
            if (err) {
                cb(self.errorParse(err), null, null, self.errorMap(err) );
            } else {
                var model = this.modelFactory(modelName, bipShare, bip.accountInfo);
                if (!result) {
                    self.create(model, cb, bip.accountInfo);

                    var jobPacket = {
                        owner_id : bip.owner_id,
                        bip_id : bip.id,
                        code : 'bip_share'
                    };

                    app.bastion.createJob(DEFS.JOB_BIP_ACTIVITY, jobPacket);
                    app.bastion.createJob(DEFS.JOB_USER_STAT, {
                        owner_id : bip.owner_id,
                        type : 'share_total'
                    } );

                } else {
                    self.update(modelName, result.id, bipShare , cb, bip.accountInfo);
                }
            }
        });
}

Dao.prototype.unshareBip = function(id, accountInfo, cb) {
    var self = this;
    (function(id, accountInfo, cb) {
        var filter = {
            'owner_id' : accountInfo.user.id,
            'id' : id
        };
        self.findFilter('bip_share', filter, function(err, result) {
            if (err || !result) {
                cb(self.errorParse(err), null, null, self.errorMap(err) );
            } else {
                (function(shareModel, cb) {
                    self.removeFilter('bip_share', { id : shareModel.id }, function(err) {
                        if (!err) {
                            var jobPacket = {
                                owner_id : shareModel.owner_id,
                                bip_id : shareModel.bip_id,
                                code : 'bip_unshare'
                            };

                            app.bastion.createJob(DEFS.JOB_BIP_ACTIVITY, jobPacket);
                            cb(false, undefined, 'OK', 200);
                        } else {
                            cb(self.errorParse(err), 'bip_share', {}, self.errorMap(err));
                        }
                    });
                })(result[0], cb);
            }
        });
    })(id, accountInfo, cb);
}

/**
 * Gets a transformation hint for the requested adjacent channels
 */
Dao.prototype.getTransformHint = function(accountInfo, from, to, next) {
    var filter = {
        $or : [ {
                owner_id : accountInfo.user.id
            }, {
                owner_id : 'system'
            } ],
        from_channel : from,
        to_channel : to
    };

    this.findFilter('transform_default', filter, function(err, results) {
        var result;

        if (err || !results || results.length === 0) {
            //next(err, 'transform_default');
            next(err, null);
        } else {
            if (results) {
                results.sort(function(a, b) {
                    if (a.owner_id > b.owner_id) {
                        return 1;
                    } else if (a.owner_id < b.owner_id) {
                        return -1;
                    } else {
                        return 0;
                    }
                });
                result = results[0];
            } else {
                result = {};
            }
            next(false, 'transform_default', result);
        }
    });
};

Dao.prototype.setTransformDefaults = function(newDefaults) {
    var filter = {
        owner_id : newDefaults.owner_id,
        from_channel : newDefaults.from_channel,
        to_channel : newDefaults.to_channel
    },
    self = this,
    model,
    modelName = 'transform_default';

    this.findFilter(modelName, filter, function(err, result) {
        if (!err) {
            if (result && result.length > 0 ) {
                self.updateColumn(modelName, filter, newDefaults, function(err, result) {
                    if (err) {
                        app.logmessage(err, 'error');
                    }
                });
            } else {
                model = self.modelFactory(modelName, newDefaults);
                self.create(model, function(err, result) {
                    if (err) {
                        app.logmessage(err, 'error');
                    }
                });
            }
        } else {
            app.logmessage(err, 'error');
        }
    });
};

Dao.prototype.bipLog = function(payload) {
    var self = this,
    model,
    modelName = 'bip_log';

    model = self.modelFactory(modelName, payload);
    self.create(model, function(err, result) {
        if (err) {
            app.logmessage(err, 'error');
        }
    });
}

/**
 *
 * Given a referer, attempts to call out to the site and discover a usable
 * image which we can normalise and store. (favicon.ico for now)
 *
 * Where the icon already exists locally, we return a cached link to the site CDN
 * icon factory of /static/img/cdn/icofactory/{referer hash}.ico
 *
 * @param string bip id
 * @param string referer FQDN - including protocol
 */
Dao.prototype.getBipRefererIcon = function(bipId, referer, blocking, cb) {
    var iconUri,
    fileSuffix = '.ico',
    ok = true,
    iconSource = referer.replace("https", 'http') + '/favicon' + fileSuffix,
    cdnPath = 'icofactory',
    jobPayload;

    if (referer) {
        // create hash
        var hashFile = helper.strHash(iconSource) + fileSuffix,
        dDir = process.cwd() + DEFS.DATA_DIR + '/cdn/img/' + cdnPath + '/',
        filePath = dDir + hashFile,
        cdnUri = CFG.cdn_public + '/' + cdnPath + '/' + hashFile;

        jobPayload = {
            bip_id : bipId,
            referer_icon_path : iconSource,
            dst_file : filePath,
            icon_uri : cdnUri
        };

        // !!warning!! sync check
        if (helper.existsSync(filePath)) {
            iconUri = cdnUri;
            if (cb) {
                cb(false, jobPayload);
            }
        } else {
            if (!blocking) {
                // @todo stubbed. Queue not yet implemented
                app.bastion.createJob(DEFS.JOB_ATTACH_REFERER_ICON, jobPayload);
            } else {
                // for testing purposes
                this._jobAttachBipRefererIcon(jobPayload, cb);
            }
        }
    }
    return iconUri;
}


/**
 *
 * Trigger all trigger bips
 *
 */
Dao.prototype.triggerAll = function(cb) {
    var self = this,
    filter = {
        type : 'trigger',
        paused : false
    };

    this.findFilter('bip', filter, function(err, results) {
        if (!err && results) {
            numResults = results.length;
            numProcessed = 0;
            // @todo this is some ghetto shit. Hope we can get these triggers off fast enough.
            for (var i = 0; i < numResults; i++) {
                // fire off a bip trigger job to rabbit
                app.logmessage('DAO:Trigger:' + results[i].id);
                (function(trigger, numResults, numProcessed, next) {
                    app.bastion.createJob( DEFS.JOB_BIP_TRIGGER, trigger);
                    numProcessed++;
                    app.logmessage('DAO:Trigger:' + trigger.id);
                    if (numProcessed == numResults) {
                        // the amqp lib has stopped giving us queue publish acknowledgements?
                        setTimeout(function() {
                            next(false, 'DAO:Trigger:' + numProcessed + ' Triggers Fired');
                        }, 100);
                    }

                    /*
                    app.bastion.createJob( DEFS.JOB_BIP_TRIGGER, trigger, function() {
                        numProcessed++;
                        app.logmessage('DAO:Trigger:' + trigger.id + ':Complete');
                        if (numProcessed == numResults) {
                            next(false, 'DAO:Trigger:' + numProcessed + ' Triggers Fired');
                        }
                    });
                    */
                })(results[i], numResults, numProcessed, cb);
            }
        } else {
            cb(false, 'No Bips'); // @todo maybe when we have users we can set this as an error! ^_^
        }
    });
}

/**
 * @param Object bip structure
 * @param Object prefs owner behavior preferences
 * @param Function next callbac(error, result)
 */
Dao.prototype.expireBip = function(bip, prefs, next) {
    var self = this;
    if ('pause' === prefs['mode']) {
        self.updateColumn('bip', bip.id, {
            paused : true
        }, function(err) {
            if (err) {
                self._log(err, 'error');
            } else {
                self._log(bip.id + ' paused');
            }

            next(err, bip);
        });

    } else if ('delete' === prefs['mode']) {
        bip.remove(function(err) {
            if (err) {
                self._log(err, 'error');
            } else {
                self._log(bip.id + ' deleted');
            }

            next(err, bip);
        });
    } else {
        self._log('Bad Preference for ' + bip.owner_id + ' "' + prefs + '"', 'error');
        next(true);
    }
}

/**
 *
 * Expires bips
 *
 */
Dao.prototype.expireAll = function(next) {
    var self = this;
    // find all users
    this.findFilter('account_option', {}, function(err, results) {
        var ownerPref = {},
        numResults,
        nowTime = Math.floor(
            new time.Date().
                setTimezone('UTC').
                getTime() / 1000
        );

        if (!err && results) {
            numResults = results.length;
            for (var i = 0; i < numResults; i++) {
                ownerPref[results[i].owner_id] = {
                    tz : results[i].timezone,
                    mode : results[i].bip_expire_behaviour
                }
            }

            // @todo find more general solution (not bound to mongo)
            self.findFilter(
                'bip',
                {
                    paused : false,
                    '$or' : [
                        {
                            'end_life.time' : {
                                '$gt' : 0,
                                '$lt' : nowTime
                            }
                        },
                        {
                            'end_life.imp' : {
                                '$gt' : 0
                            }
                        }
                    ]
                },
                function(err, results) {
                    var numResults, result, pref, offsetSeconds;
                    if (!err && results.length > 0) {
                        numResults = results.length;
                        for (var i = 0; i < numResults; i++) {
                            self.expireBip(
                                results[i],
                                ownerPref[results[i].owner_id],
                                next
                            );
                        }
                    } else {
                        next(false, '');
                    }
                }
            );
        } else {
            cb(false, '');
        }
    });
}

// --------------------------------------------------------------- CHANNELS&PODS
//
// POD RPC
Dao.prototype.pod = function(podName) {
    return this.models['channel']['class'].pod(podName);
}

/**
 * Lists all actions for an account
 *
 * @todo cache
 */
DaoMongo.prototype.listChannelActions = function(type, accountInfo, callback) {
    // get available actions for account
    var modelName = 'channel',
    self = this,
    c = this.modelFactory(modelName),
    owner_id = accountInfo.user.id,
    actions = type == 'actions' ? c.getActionList() : c.getEmitterList(),
    filter = {
        action : {
            $in : actions
        },
        owner_id : owner_id
    };

    this.find('channel', filter, function (err, results) {
        var model;
        if (err) {
            self.log('Error: list(): ' + err);
            if (callback) {
                callback(false, err);
            }
        } else {
            // convert to models
            realResult = [];
            for (key in results) {
                model = self.modelFactory(modelName, results[key], accountInfo);
                realResult.push(model);
            }

            var resultStruct = {
                'data' : realResult
            }

            if (callback) {
                callback(false, modelName, resultStruct );
            }
        }
    });
}

// --------------------------------------------------------------------- UTILITY

Dao.prototype.describe = function(model, subdomain, next, accountInfo) {
    var modelClass, resp = {}, exports = {};

    if (model == 'pod') {
        model = 'channel';
        modelClass = this.modelFactory(model);

        // describe all pods
        var pods = modelClass.pod();
        var authChecks = [], checkFunction;

        for (var key in pods) {
            // introspect a single pod if flagged
            if (subdomain && key != subdomain) {
                continue;
            }
            resp[key] = pods[key].describe(accountInfo);

            // prep the oAuthChecks array for a parallel datasource check
            if (resp[key].auth.type != 'none') {
                authChecks.push(
                function(podName) {
                    return function(cb) {
                        return pods[podName].authStatus( accountInfo.getId(), podName, cb );
                    }
                }(key) // self exec
            );
            }
        }

        // for any pods which have oauth, try to discover their status
        if (authChecks.length > 0) {
            async.parallel(authChecks, function(err, results) {
                if (!err) {
                    for (idx in results) {
                        var podName = results[idx][0],
                        authType = results[idx][1],
                        result = results[idx][2];

                        if (null !== result && resp[podName]) {
                            resp[podName].auth.status = 'accepted';
                        }
                    }
                    next(false, null, resp);
                } else {
                    next(err, null, resp);
                }
            });
        } else {
            next(false, null, resp);
        }

        // describe bip type exports
    } else if (model == 'bip') {
        modelClass = this.modelFactory(model);
        next(false, null, modelClass.exports);

    } else {
        //modelClass = this.modelFactory(model);
        next(false, null);
    }
}

Dao.prototype.setNetworkChordStat = function(ownerId, newNetwork, next) {
    var nowDay = helper.nowDay(),
    filter = {
        owner_id : ownerId,
        day : nowDay
    },
    self = this,
    model,
    modelName = 'stats_account_network';

    newNetwork.day = nowDay;
    newNetwork.owner_id = ownerId;
    newNetwork.updated_at = helper.nowUTCSeconds();

    this.findFilter(modelName, filter, function(err, result) {
        if (!err) {
            if (result && result.length > 0 ) {
                self.updateColumn(modelName, filter, newNetwork, function(err, result) {
                    if (err) {
                        app.logmessage(err, 'error');
                    }
                    next(err, result);
                });
            } else {
                model = self.modelFactory(modelName, newNetwork);
                self.create(model, function(err, result) {
                    if (err) {
                        app.logmessage(err, 'error');
                    }
                    next(err, result);
                });
            }
        } else {
            app.logmessage(err, 'error');
            next(err, result);
        }
    });
}


Dao.prototype.generateHubStats = function(next) {
    var self = this;
    // get users
    this.findFilter('account', {}, function(err, results) {
        var accountId,
        globalStats = {

        };

        if (err) {
            next(err);
        } else {
            if (!results) {
                next(true, 'NO ACCOUNTS FOUND');
            } else {
                var numProcessed = 0, numResults = results.length;
                for (var i = 0; i < numResults; i++) {
                    (function(accountId) {
                        step(
                            function loadNetwork() {
                                self.findFilter(
                                    'channel',
                                    {
                                        'owner_id' : accountId
                                    },
                                    this.parallel()
                                );

                                self.findFilter(
                                    'bip',
                                    {
                                        'owner_id' : accountId
                                    },
                                    this.parallel()
                                );
                            },

                            function done(err, channels, bips) {
                                if (!err) {
                                    var channelMap = {},
                                    j,
                                    bip,
                                    from,
                                    to,
                                    chordKey = '',

                                    networkData = {};

                                    // translate channel id's into actions
                                    for (j = 0; j < channels.length; j++) {
                                        if (!channelMap[channels[j].id]) {
                                            channelMap[channels[j].id] = channels[j].action;
                                        }
                                    }

                                    delete channels;

                                    for (j = 0; j < bips.length; j++) {
                                        bip = bips[j];
                                        for (var key in bip.hub) {
                                            if (bip.hub.hasOwnProperty(key)) {
                                                if (key === 'source') {
                                                    from = bip.type === 'trigger' ?
                                                        channelMap[bip.config.channel_id] :
                                                        'bip.' + bip.type;
                                                } else {
                                                    from = channelMap[key]
                                                }

                                                // skip bad hubs or deleted channels that
                                                // are yet to resolve.
                                                if (from) {
                                                    for (var k = 0; k < bip.hub[key].edges.length; k++) {
                                                        to = channelMap[bip.hub[key].edges[k]];
                                                        if (to) {
                                                            // truly nasty.
                                                            chordKey = (from + ';' + to).replace(new RegExp('\\.', 'g'), '#');
                                                            //chordKey = .replace('.', '_');

                                                            //chordKeyPod = from.split('.')[0] + '-' + to.split('.')[0];
                                                            if (!networkData[chordKey]) {
                                                                networkData[chordKey] = 0;
                                                            }
                                                            networkData[chordKey]++;

                                                            if (!globalStats[chordKey]) {
                                                                globalStats[chordKey] = 0;
                                                            }
                                                            globalStats[chordKey]++;
                                                        }
                                                    }
                                                }

                                            }
                                        }
                                    }

                                    numProcessed++;

                                    // write
                                    if (Object.keys(networkData).length > 0) {
                                        self.setNetworkChordStat(
                                        accountId,
                                        {
                                            data : networkData
                                        },
                                        function(err) {
                                            if (err) {
                                                next(err, err);
                                            } else if (numProcessed === numResults ) {
                                                app.logmessage('Processed ' + numProcessed + ' accounts');
                                                app.logmessage('Writing System Entry ');
                                                self.setNetworkChordStat(
                                                'system',
                                                {
                                                    data : globalStats
                                                },
                                                function(err) {
                                                    if (err) {
                                                        next(err, err);
                                                    } else {
                                                        next(false, 'ok');
                                                    }
                                                }
                                            );
                                            }
                                        }
                                    );
                                    } else {
                                        next(false, 'NO ACTIVITY')
                                    }
                                } else {
                                    next(true, err);
                                }
                            }
                        );
                    })(results[i].id);
                }

                /*
                while (done >= results.length) {

                }
                // write global stats
                self.setNetworkChordStat(
                    'system',
                    {
                        data : globalStats
                    },
                    function(err) {
                        if (err) {
                            console.log(err);
                        }
                    }
                );
                 */
            }
        }
    });
}

/**
 *
 * Deferred job to pull an image url to the cdn and bind it to a users avatar.
 *
 */
Dao.prototype._jobAttachUserAvatarIcon = function(payload, next) {
    var ownerId = payload.owner_id,
    avPath = payload.avatar_url,
    dstFile = payload.dst_file
    self = this;

    if (!next) {
        next = function(err, response) {
            console.log(err);
            console.log(response);
        }
    }

    // don't care if the file exists or not, just suck it down.
    cdn.httpFileSnarf(avPath, dstFile, function(err, resp) {
        var convertArgs = [ dstFile, '-resize', '125x125' ];

        // if avPath isn't a jpeg, convert it
        if (! /(jpg|jpeg)$/i.test(dstFile)  ) {
            var newDst = dstFile.split('.');
            newDst.pop();
            newDst = newDst.join('.') + '.jpg';
            convertArgs.push(newDst);
        }

        cdn.convert(convertArgs, function(err, stdout) {
            if (err) {
                next(true, resp);
            } else {
                next(false, payload);
            }
        });
    });
}

/**
 *
 *
 * @todo - convert to png
 */
Dao.prototype.getAvRemote = function(ownerId, avUrl, blocking, cb) {
    var iconUri,
    fileSuffix = '.ico',
    ok = true,
    jobPayload,
    tokens = avUrl.split('.'),
    ext = tokens[tokens.length - 1];
    fileName = ownerId + '.' + ext,
    // via {username}.bip.io/profile/av
    // or website bip.io/static/cdn/av/{owner_id}.png
    dDir = DATA_DIR + '/cdn/img/av/';
    filePath = dDir + fileName;

    jobPayload = {
        owner_id : ownerId,
        avatar_url : avUrl,
        dst_file : filePath
    };

    if (!blocking) {
        // @todo stubbed. Queue not yet implemented
        app.bastion.createJob(DEFS.JOB_ATTACH_REFERER_ICON, jobPayload);
    } else {
        // for testing purposes
        this._jobAttachUserAvatarIcon(jobPayload, cb);
    }
}


/**
 * Deferred job to attach a 3rd party icon to the given bip after saving to the CDN
 *
 * @todo move this into a jobRunner class (bsation)
 *
 */
Dao.prototype._jobAttachBipRefererIcon = function(payload, next) {
    var bipId = payload.bip_id,
    dstFile = payload.dst_file,
    refererIconPath = payload.referer_icon_path,
    iconUri = payload.icon_uri,
    self = this;

    if (!next) {
        next = function(err, response) {
            console.log(err);
        }
    }

    helper.exists(dstFile, function(exists) {
        if (!exists) {
            cdn.httpFileSnarf(refererIconPath, dstFile, function(err, resp) {
                if (err) {
                    next(true, resp);
                } else {
                    if (bipId) {
                        self.updateColumn('bip', bipId, {
                            icon : iconUri
                        });
                    }
                    next(false, payload);
                }
            });
        } else {
            if (bipId) {
                self.updateColumn('bip', bipId, {
                    icon : iconUri
                });
            }
            next(false, payload);
        }
    });
}

DaoMongo.prototype.getModelPrototype = function() {
    return this._modelPrototype;
}

module.exports = Dao;