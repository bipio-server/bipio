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
var util      = require('util'),
  helper      = require('../lib/helper'),
  crypto   	  = require('crypto'),
  step        = require('../lib/step'), // @todo deprecate, use Q
  async       = require('async'), // @todo deprecate, use Q
  Q           = require('q')
  fs          = require('fs'),
  path        = require('path'),
  time        = require('time'),
  request     = require('request'),
  lodash      = require('lodash'),
  DaoMongo    = require('./dao-mongo.js');

function Dao(config, log, next) {
  var self = this;

  DaoMongo.apply(this, arguments);

  // protocol + base url
  this._baseUrl = config.proto_public + config.domain_public;

  this._modelPrototype = require('../models/prototype.js').BipModel;

  // @todo refactor to not rely on mongoose models
  var modelSrc = {
    // mapper
    'bip' : require('../models/bip').Bip,
    'bip_share' : require('../models/bip_share').BipShare,
    'bip_log' : require('../models/bip_log').BipLog,
    'channel' : require('../models/channel').Channel,
    'channel_log' : require('../models/channel_log').ChannelLog,
    'domain' : require('../models/domain').Domain,

    'transform_default' : require('../models/transform_default').TransformDefault,

    // account
    'account' : require('../models/account').Account,
    'account_auth' : require('../models/account_auth').AccountAuth,
    'account_option' : require('../models/account_option').AccountOption,

    'stats_account' : require('../models/stats_account').StatsAccount,
    'stats_account_network' : require('../models/stats_account_network').StatsAccountNetwork,
  }

  this.models = { };
  for (var key in modelSrc) {
    this.registerModelClass(modelSrc[key]);
  }
}

util.inherits(Dao, DaoMongo);

Dao.prototype.getBaseUrl = function() {
  return this._baseUrl;
}

// ---------------------- USERS

Dao.prototype._createUser = function(username, emailAddress, password, next) {
  var self = this;

  // ----- CREATE ACCOUNT
  var account = self.modelFactory(
    'account',
    {
      name : username,
      username : username,
      is_admin : false,
      email_account : emailAddress
    });

  self.create(account, function(err, modelName, accountResult) {
    if (err) {
      next(err);

    } else {
      // -----CREATE AUTH
      var accountInfo = {
        user : {
          id : accountResult.id,
          domains : {
            test : function() {
              return true
            }
          }
        }
      };

      var accountAuth = self.modelFactory(
        'account_auth',
        {
          username : username,
          password : password,
          type : 'token'
        }, accountInfo);

      self.create(accountAuth, function(err, modelName, accountResult) {
        if (err) {
          next(err);

        } else {
          // ----- CREATE DOMAIN
          var domain = self.modelFactory(
            'domain',
            {
              name : (username + '.' + CFG.domain_public).replace(/:.*$/, ''),
              type : 'custom',
              _available : true
            }, accountInfo);

          self.create(domain, function(err, modelName, domainResult) {
            // skip name lookup errors
            if (err && err.code !== 'ENOTFOUND') {
              next(err);

            } else {
              // upgrade to vanity
              self.updateColumn('domain', { id : domainResult.id }, { type : 'vanity', available : 'true' });

              // ----- CREATE OPTIONS
              var accountOptions = self.modelFactory(
                'account_option',
                {
                  bip_type : 'http',
                  bip_domain_id : domainResult.id,
                  bip_end_life : {
                    imp : 0,
                    time : 0
                  },
                  bip_expire_behaviour: 'pause',
                  timezone : CFG.timezone
                }, accountInfo);

              self.create(accountOptions, function(err, modelName, result) {
                next(err, accountResult);
              });
            }
          });
        }
      });
    }
  });
}

Dao.prototype.createUser = function(username, emailAddress, password, next) {
  var self = this;

  if (app.helper.isFunction(password)) {
    next = password;
    password = null;
  }

  if (username && emailAddress) {
    // check user exists
    self.find('account', { username : username }, function(err, result) {
      if (err) {
        next(err);
      } else if (result) {
        next('Username ' + username + ' already exists');
      } else {
        if (password) {
          self._createUser(username, emailAddress, password, next);
        } else {
          crypto.randomBytes(16, function(ex, buf) {
            self._createUser(username, emailAddress, buf.toString('hex'), next);
          });
        }
      }
    });
  }
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

Dao.prototype.createBip = function(struct, accountInfo, next, postSave) {
  var model = this.modelFactory('bip', app.helper.pasteurize(struct), accountInfo, true);
  this.create(model, next, accountInfo, postSave);
}

Dao.prototype.deleteBip = function(props, accountInfo, next, transactionId) {
  this.remove('bip', props.id, accountInfo, function(err, result) {
    if (err) {
      next(err);
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
      next(false, props);
    }
  })
}

Dao.prototype.pauseBip = function(props, pause, next, transactionId) {
  // default pause (true == unpause)
  if (undefined == pause) {
    pause = true;
  }

  var model = this.modelFactory('bip', props);
  this.updateColumn(
    'bip',
    model.getIdValue(),
    {
      'paused' : pause
    },
    function(err) {
      if (err) {
        next(err);
      } else {
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
        next(false, props);
      }
    }
    );
};

// update account options with the selected bip's config.
Dao.prototype.setDefaultBip = function(bipId, targetModel, accountInfo, next) {
  var self = this;

  // get bip
  this.find('bip', {
    id : bipId,
    owner_id : accountInfo.user.id
  }, function(err, result) {

    if (err || !result) {
      cb(self.errorParse(err), null, null, self.errorMap(err) );
    } else {

      // update into account options
      var patch = {
        bip_config : result.config,
        bip_domain_id : result.domain_id,
        bip_end_life : result.end_life,
        bip_hub : result.hub,
        bip_type : result.type
      }

      // update into account options
      self.updateProperties(
        targetModel.getEntityName(),
        targetModel.id,
        patch,
        function(err) {
          next(err, 'account_option', { message : 'OK' }, 200);
        }
      );
    }
  });
};

/**
 *
 * Finds and removes duplicate tracking for bipid / channel index pairs
 */
Dao.prototype.removeBipDupTracking = function(bipId, next) {
  var promises = [],
    deferred,
    self = this;

  // get bip
  this.find(
    'bip',
    {
      id : bipId
    },
    function(err, result) {
      if (err) {
        next(err);
      } else {
        for (var i = 0; i < result._channel_idx.length; i++)  {

          deferred = app.Q.defer();
          promises.push(deferred.promise);

          (function(channelId, deferred) {
            var modelName = 'channel';
            self.find(modelName, { id : channelId }, function(err, channel) {
              var cModel, pod;
              if (err) {
                deferred.reject(err);
              } else {
                cModel = self.modelFactory(modelName, channel);
                pod = cModel.getPod();

                if (pod.getTrackDuplicates()) {
                  pod.dupRemove(bipId, cModel, function(err) {
                    if (err) {
                      deferred.reject(err);
                    } else {
                      deferred.resolve();
                    }
                  });
                } else {
                  deferred.resolve();
                }
              }
            });
          })(result._channel_idx[i], deferred);
        }

        app.Q.all(promises).then(
          function() {
            next();
          },
          function(err) {
            next(err);
          }
        );
      }
    });
}

Dao.prototype.removeBipDeltaTracking = function(bipId, next) {
  var promises = [],
    deferred,
    self = this;

  // get bip
  this.find(
    'bip',
    {
      id : bipId
    },
    function(err, result) {
      if (err) {
        next(err);
      } else {
        for (var i = 0; i < result._channel_idx.length; i++)  {

          deferred = app.Q.defer();
          promises.push(deferred.promise);

          (function(channelId, deferred) {
            var modelName = 'channel';
            self.find(modelName, { id : channelId }, function(err, channel) {
              var cModel, pod;
              if (err) {
                deferred.reject(err);
              } else {
                cModel = self.modelFactory(modelName, channel);
                pod = cModel.getPod();

                if (pod.getTrackDeltas()) {
                  pod.deltaRemove(bipId, cModel, function(err) {
                    if (err) {
                      deferred.reject(err);
                    } else {
                      deferred.resolve();
                    }
                  });
                } else {
                  deferred.resolve();
                }
              }
            });
          })(result._channel_idx[i], deferred);
        }

        app.Q.all(promises).then(
          function() {
            next();
          },
          function(err) {
            next(err);
          }
        );
      }
    });
}

Dao.prototype.shareBip = function(bip, triggerConfig, cb) {
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

    if (config.renderer && config.renderer.channel_id) {
      config.renderer.channel_id = channelTranslate(config.renderer.channel_id);
    }

  } else if (bip.type === 'trigger' && bip.config.channel_id) {
    config.channel_id = channelTranslate(bip.config.channel_id);
    if (triggerConfig) {
      config.config = triggerConfig;
    }
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
        var model = self.modelFactory(modelName, bipShare, bip.accountInfo);
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
          self.removeFilter('bip_share', {
            id : shareModel.id
          }, function(err) {
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

Dao.prototype.listShares = function(page, pageSize, orderBy, listBy, next) {
  var pageSize = pageSize || 10,
    page = page || 1,
    orderBy = orderBy || 'recent',
    filter = {};

  if (listBy) {
    var tokens = listBy.split(':');
    var searchTerms = tokens[1];

    filter[tokens[0]] = {
      '$regex' : searchTerms,
      '$options' : 'i'
    };

    /* -- experimental, requires mongo 2.6
    filter['$text'] = {
      '$search' : searchTerms
    };
    */
  }

  this.list('bip_share', null, pageSize, page, orderBy, filter, next);
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


Dao.prototype.setTransformDefaults = function(newDefaults, next) {
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
          if (next) {
            next(err, result);
          }
        });
      } else {
        model = self.modelFactory(modelName, newDefaults);
        self.create(model, function(err, result) {
          if (err) {
            app.logmessage(err, 'error');
          }
          if (next) {
            next(err, result);
          }
        });
      }
    } else {
      app.logmessage(err, 'error');
      if (next) {
        next(err);
      }
    }
  });
};


/**
 *
 * Takes a simple count of non-system provided transforms and creates
 * new 'system' transform defaults.  for use by /rpc/transforms
 *
 * uta : Unique Transform Attribute
 */
Dao.prototype.reduceTransformDefaults = function(next) {
	var self = this,
  	regTransform =  /\[%(\s*?)(source|_bip|_client|\w*\.\w*)#[a-zA-Z0-9_\-#:.$@*[\],?()]*(\s*?)%\]/g,
    reduceJob = Q.defer();

	reduceJob.promise.then(
		function() {
			next();
		},
		function() {
			next.apply(self, arguments);
		}
	);

	this.findFilter('transform_default',
	{
		owner_id : {
			'$ne' : 'system'
		}
	},
	function(err, results) {
		var key, utaStr, transforms = [], utaProps = {}, uTransforms = [], uTransform = {}, uta = {}, popular = [], transformToInsert = {}, transformsToInsert = [];
		if (!err) {

			// derive a collection of every unique transform attribute
			results.forEach( function(el, idx, result) {
				transforms = lodash.pairs(el.transform);

				transforms.forEach( function(val, idx) {
					utaStr = val[1].match(regTransform);
					if (utaStr != null) {
						uta[val[0]] = utaStr[0];
						key = el.from_channel + ':' + el.to_channel + ':' + utaStr;
						utaProps = { 'from_channel' : el.from_channel, 'to_channel' : el.to_channel, 'transform' : uta}
						uTransform[key] = utaProps;
						uTransforms.push(uTransform);
						utaProps =  {};
						uTransform = {};
						uta = {};
					}
				});
				return uTransforms;
			});

			// filter down to the popular transforms.
			lodash(uTransforms)
				.countBy( function(transform) {
					return Object.keys(transform);
				})
				.pairs()
				.filter( function(el) {
					//if (el[1] > 1)
					return el[0];
				})
				.map( function(el) {
					return lodash.find(uTransforms, el[0]);
				})
				.map( function(el) {
					return Object.values(el);
				})
				.flatten()
				.map( function(el) {
					if (!( lodash.some(transformsToInsert, {'from_channel' : el.from_channel, 'to_channel' : el.to_channel }))) {
						transformsToInsert.push(el);
						return el;
					} else {
						return lodash.merge( lodash.find(transformsToInsert, {'from_channel' : el.from_channel, 'to_channel' : el.to_channel}), el);
					}
				})
				.value();


			// create 'system' transform_defaults.
			lodash.forEach(transformsToInsert,  function(transform, idx) {
				transform['owner_id'] = 'system';
				self.setTransformDefaults(transform, function(err) {
					if (err) {
						reduceJob.reject(err);
					} else if (idx === (transformsToInsert.length - 1)) {
						reduceJob.resolve();
					}
				});
			});

		} else {
			app.logmessage(err, 'error');
			reduceJob.reject(err);
		}
	});
}

Dao.prototype.updateTransformDefaults = function(next) {
	var self = this;
  if (GLOBAL.CFG.transforms.syncFrom) {
  	request(GLOBAL.CFG.transforms.syncFrom + '/rpc/transforms', function (err, resp, body) {
  		if (!err) {
  			data = JSON.parse(body).data;
  			data.forEach( function(transform) {
  				transform['owner_id'] = 'system';
  				self.upsert('transform_default', lodash.pick(transform, ['from_channel', 'to_channel', 'owner_id']), transform);
  			});

  			app.logmessage('DAO:Updating Transforms:Done', 'info');
  			next();

  		} else {
  			app.logmessage('DAO:Error:Updating Transforms:', err);
  			next(err);
  		}
  	});
  }
}


/**
 *   DEPRECATED.
 * Takes a simple count of non-system provided transforms and creates
 * new system hints for use by /rpc/bip/get_transform_hint
 *
 */
Dao.prototype.reCorp = function() {
  this.findFilter(
    'transform_default',
    {
      'owner_id' : {
        '$ne' : 'system'
      }/*,
      '$orderby' : {
        created : -1
      }*/
    },
    function(err, results) {
      var r, tx, agg = {}, key, uKey, otx = {};
      if (!err) {
        for (var i = 0; i < results.length; i++) {
          r = results[i];

          key = r.from_channel + ':' + r.to_channel;
          uKey = r.owner_id + ':' + key;

          // 1 latest sample per user
          if (!otx[uKey]) {
            otx[uKey] = true;
            tx = JSON.stringify(r.transform);

            if (!agg[key]) {
              agg[key] = {};
              agg[key][tx] = 0;
            }

            agg[key][tx]++;
          }
        }

//console.log('aggretate', agg);

        var maxYields, reduced;
        for (var k in agg) {
          if (agg.hasOwnProperty(k)) {
            for (var j in agg[k]) {

//console.log(agg[k][j])

              if (!reduced[agg[k]]) {
                reduced[agg[k]] = agg[k][j];
              }



              if (agg[k][j] > reduced[agg[k][j]]) {
                reduced[agg[k][j]] = agg[k][j];
              }
            }
          }
        }

        console.log('reduced',  reduced);


      } else {
        app.logmessage(err, 'error');
      }
    }
  );
}


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

  // if an error, mark the bip as errored
  if ('bip_channnel_error' === payload.code) {
    this.bipError(payload.bip_id, true);
  }
}

Dao.prototype.bipError = function(id, errState, next) {
  this.updateColumn(
    'bip',
    {
      id : id
    },
    {
      _errors : errState
    },
    next
  );

}

/**
 *
 * Trigger all trigger bips
 *
 */
Dao.prototype.triggerAll = function(next, filterExtra, isSocket, force, dryRun) {
  var self = this,
  filter = {
    type : 'trigger',
  }, fkeys;

  if (!force) {
    filter.paused = false;
  }

  if (filterExtra) {
    Object.keys(filterExtra).forEach( function(fKey) {
		filterExtra.hasOwnProperty(fKey) ? filter[fKey] = filterExtra[fKey] : '';
	});
  }

  this.findFilter('bip', filter, function(err, results) {
    if (!err && results.length) {
      numResults = results.length;
      numProcessed = 0;

      for (var i = 0; i < numResults; i++) {

        (function(bipResult) {

          // get user account
          self.findFilter(
            'account_option',
            {
              owner_id : bipResult.owner_id
            },
            function(err, results) {
              if (!err && results && results.length === 1) {
                // set up a pseudo account Info
                var accountInfo = {
                  user : {
                    settings : results[0]
                  }
                }

      				// check expiry
				      var bipModel = self.modelFactory('bip', bipResult, accountInfo);
                bipModel.checkExpiry(function(expired) {
                  if (expired) {
                    bipModel.expire('expired', next);
                  } else {
          					//check scheduled
          					bipModel.isScheduled( function(scheduled) {
          						if (!force && !scheduled) {
          							next();
          						} else {
            						var payload = {
              						bip : app._.clone(bipResult)._doc,
              						socketTrigger : isSocket,
              						accountInfo : accountInfo
            						}

            						delete payload.bip.accountInfo;

            						// update runtime
            						self.updateColumn('bip', bipResult.id, { '_last_run' : Number(app.moment().utc()) }, function(err, result) {
            						if (err) {
            							app.logmessage(err, 'error');
            						}

            						});

            						app.bastion.createJob( DEFS.JOB_BIP_TRIGGER, payload);
            						numProcessed++;

            						app.logmessage('DAO:Trigger:' + payload.bip.id + ':' + numProcessed + ':' + numResults);

            						if (numProcessed >= (numResults - 1)) {
            						// the amqp lib has stopped giving us queue publish acknowledgements?
            						setTimeout(function() {
            							if (bipModel.schedule !== undefined) {
                            self.updateScheduledBipRunTime(bipModel, next);
                          }
            							next(false, 'DAO:Trigger:' + (numResults)  + ' Triggers Fired');
            						}, 1000);
            						}
            					}
          				  });
          				}
                });
              }
            }
          );
        })(results[i]);

      }
    } else {
      next(false, 'No Bips'); // @todo maybe when we have users we can set this as an error! ^_^
    }
  });
}


Dao.prototype.triggerByChannelAction = function(actionPath, next) {
  var self = this,
    filter = {
      action : actionPath
    };

  this.findFilter('channel', filter, function(err, results) {
    var cids = [];
    if (!err && results.length) {

      cids = results.map(function(channel) { return channel.id; });

      var bipFilter = {
        "config.channel_id" : {
          "$in" : cids
        }
      }

      self.triggerAll(next, bipFilter, true);

    } else {
      next();
    }
  });
}


Dao.prototype.updateScheduledBipRunTime = function(bip, next) {
	var self = this,
		nextTime = bip.getNextScheduledRunTime();

	self.updateColumn('bip', bip.id, {
		'schedule.nextTimeToRun' : nextTime
	}, function(err) {
		if (err) {
			self._log(err, 'error');
		} else {
			self._log(bip.id + ' set to run at ' + bip.schedule.nextTimeToRun);
		}
		next(err, false);
	});
}


Dao.prototype.removeSchedule = function(bip, next) {
	var self = this;
	self.updateColum('bip', bip.id, {
		$unset: { schedule : true }
	}, function(err) {
		if (err) {
			self._log(err, 'error');
		} else {
			self._log(bip.id + 'scheduling removed');
		}
		next(err, bip);
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
    numProcessed = 0,
    filter,
    tzNowTime;

    if (!err && results) {
      for (var i = 0; i < results.length; i++) {
        try {
          tzNowTime = Math.floor(
            new time.Date().setTimezone(results[i].timezone).getTime() / 1000
            );
        } catch (e) {
          app.logmessage(results[i].owner_id + ' : ' + e, 'error');
          tzNowTime = Math.floor(new time.Date().getTime() / 1000);
        }

        filter = {
          paused : false,
          $or: [
          {
            "end_life.time": {
              $gt: 0,
              $lt: tzNowTime
            }
          },

          {
            "end_life.imp": {
              $gt: 0
            }
          }
          ],
          owner_id: results[i].owner_id
        };

        if ('delete' === results[i].bip_expire_behaviour) {
          self.removeFilter('bip', filter, function(err) {
            if (err) {
              self.log(err);
            }
            numProcessed++;
            if (numProcessed >= results.length) {
              next(false, '');
            }
          });
        } else if ('pause' === results[i].bip_expire_behaviour) {
          self.updateColumn('bip', filter, {
            paused : true
          }, function(err) {
            if (err) {
              self.log(err);
            }
            numProcessed++;
            if (numProcessed >= results.length) {
              next(false, '');
            }
          });
        }

      }
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

Dao.prototype.refreshOAuth = function() {
  var self = this,
    pods = this.models['channel']['class'].getPods(),
    withinSeconds = 16 * 60 * 1000; // 16 mins (cron by 15 mins)
    maxExpiry = (new Date()).getTime() + withinSeconds;

  // get account
  var filter = {
    "oauth_token_expire" : {
      '$gt' : 0,
      '$lt' : maxExpiry,
      '$exists' : true
    },
    'type' : 'oauth'
  }

  this.findFilter('account_auth', filter, function(err, results) {
    if (!err) {
      for (var i = 0; i < results.length; i++) {
        pods[results[i].oauth_provider].oAuthRefresh(self.modelFactory('account_auth', results[i]));
      }
    }
  });
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

  this.findFilter('channel', filter, function (err, results) {
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

Dao.prototype.getBipsByChannelId = function(channelId, accountInfo, next) {
  var filter = {
    owner_id : accountInfo.getId(),
    _channel_idx : channelId
  }

  this.findFilter('bip', filter, next);
}


Dao.prototype.updateChannelIcon = function(channel, URL) {
  channel.config.icon = URL;
  this.updateColumn(
    'channel',
    {
      id : channel.id
    },
    {
      config : channel.config
    }
  );
}

// --------------------------------------------------------------------- UTILITY

Dao.prototype.getPodAuthTokens = function(owner_id, pod, next) {
    // describe all pods
    var self = this,
      authType = pod.getAuthType(),
      filter = {
        owner_id : owner_id
      };

    if ('issuer_token' === authType) {
      filter.auth_provider = pod.getName();
    } else if ('oauth' === authType) {
      filter.oauth_provider = pod.getName();
    } else {
      next();
      return;
    }

    this.find('account_auth', filter, function(err, result) {
      var authRecord;
      if (err) {
        next(err);
      } else if (!result) {
        next();
      } else {
        authRecord = self.modelFactory('account_auth', result);
        if ('issuer_token' === authType) {
          next(false, {
            'username' : authRecord.getUsername(),
            'password' : authRecord.getPassword(),
            'key' : authRecord.getKey()
          });
        } else if ('oauth' === authType) {
          next(false, {
            'access_token' : authRecord.getPassword(),
            'secret' : authRecord.getOAuthRefresh(),
            'profile' : authRecord.getOauthProfile()
          });
        }
      }
    });

}

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
      if (resp[key].auth.strategy && resp[key].auth.strategy != 'none' && accountInfo) {
        authChecks.push(
          function(podName) {
            return function(cb) {
              return pods[podName].authStatus( accountInfo.getId(), cb );
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

Dao.prototype.generateAccountStats = function(accountId, next) {
  var self = this;
  app.logmessage('STATS:Processing Account ' + accountId);
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
      if (err) {
        next(true);
      } else {
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
                    // nasty. mongodb normaliser
                    chordKey = (from + ';' + to).replace(new RegExp('\\.', 'g'), '#');
                    if (!networkData[chordKey]) {
                      networkData[chordKey] = 0;
                    }
                    networkData[chordKey]++;
                  }
                }
              }
            }
          }
        }

        // write
        if (Object.keys(networkData).length > 0) {
          app.logmessage('STATS:WRITING ACTIVITY:' + accountId);
          self.setNetworkChordStat(
            accountId,
            {
              data : networkData
            },
            function(err) {
              if (err) {
                next(true);
              } else {
                next(false, networkData);
              }
            }
            );
        } else {
          app.logmessage('STATS:NO ACTIVITY:' + accountId);
          next(false)
        }
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
        next(true, 'STATS:NO ACCOUNTS FOUND');
      } else {
        var numProcessed = 0, numResults = results.length;
        for (var i = 0; i < numResults; i++) {
          self.generateAccountStats(results[i].id, function(err, accountStats) {
            numProcessed++;
            if (!err) {
              for (var chordKey in accountStats) {
                if (accountStats.hasOwnProperty(chordKey)) {
                  if (!globalStats[chordKey]) {
                    globalStats[chordKey] = 0;
                  }
                  globalStats[chordKey]++;
                }
              }

              if (numResults === numProcessed) {
                app.logmessage('Writing System Entry ');
                self.setNetworkChordStat(
                  'system',
                  {
                    data : globalStats
                  },
                  function(err) {
                    if (err) {
                      app.logmessage('STATS:' + err, 'error');
                      next(true);
                    } else {
                      next(false, 'ok');
                    }
                  }
                );
              }
            } else {
              next(err);
            }
          });
        }
      }
    }
  });
}

DaoMongo.prototype.getModelPrototype = function() {
  return this._modelPrototype;
}

DaoMongo.prototype.runMigrations = function(newVersion, targetConfig, next) {
  var migrationPath = path.resolve(__dirname + '/../../migrations/'),
    newVersionInt = app.helper.versionToInt(newVersion),
    // @deprecate default pinned first migration version (+1)
    lastMigration = app.helper.versionToInt('0.2.45'),
    migrations = {};

  var self = this;

  // get last migration
  this.findFilter('migration', {}, function (err, results) {

    if (err) {
      next(err);
    } else {
      for (var i = 0; i < results.length; i++) {
        if (results[i].versionInt > lastMigration) {
          lastMigration = results[i].versionInt;
        }
      }

      // enumerate available migrations
      var files = fs.readdirSync(migrationPath);
        var pkgInt,
          migration,
          migrationFile,
          orderedMigrations,
          deferred,
          promises = [];

        if (err) {
          next(err);
        } else {
          // normalize versions
          for (var i = 0; i < files.length; i++) {
            pkgInt = app.helper.versionToInt(files[i]);
            if (!isNaN(pkgInt)) {
              migrations[pkgInt] = files[i];
            }
          }

          // get ordered keys
          orderedMigrations = Object.keys(migrations).sort();

          for (var i = 0; i < orderedMigrations.length; i++) {
            if (orderedMigrations[i] > lastMigration) {
              migrationFile = path.resolve(migrationPath + '/' + migrations[orderedMigrations[i]] );
              lastMigration = orderedMigrations[i];

              if (fs.existsSync(migrationFile)) {
                migration = require(migrationFile);
                if (migration && migration.run) {
                  deferred = Q.defer();

                  promises.push(deferred.promise);

                  (function(deferred, migration, runVersion, runVersionInt) {

                    migration.run(app, targetConfig, function(msg, msgLevel) {
                      console.log('Running ' + runVersion);
                      app.logmessage(msg || 'Done', msgLevel);
                      if ('error' === msgLevel) {
                        deferred.reject(msg);
                      } else {

                        // save migration
                        self.create(
                          self.modelFactory('migration', {
                            version : runVersion,
                            versionInt : runVersionInt
                          }),
                          function(err) {
                            if (err) {
                              deferred.reject(err);
                            } else {
                              deferred.resolve('Installed ' + runVersion );
                            }
                          }
                        );
                      }
                    });
                  })(deferred, migration, migrations[orderedMigrations[i]], orderedMigrations[i]);

                } else {
                  next('No migration index.js or no "run" method found in ' + migrationFile);
                }
              }
            }
          }

          if (promises.length) {
      			Q.all(promises).then(function(messages) {
              next(false, messages.join('\n') );
            },
            function() {
              next.apply(next, arguments);
            });
          } else {
            next('Nothing To Do');
          }


        }
    }
  });
}


module.exports = Dao;
