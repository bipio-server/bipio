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
 * Channels are configuration instances for pods, they are both a model and a
 * strategy/bridge pattern for interacting with channel pods and their related
 * actions.
 *
 */
var BipModel = require('./prototype.js').BipModel,
helper = require('../lib/helper');

var Channel = Object.create(BipModel);

Channel.entityName = 'channel';
Channel.entitySchema = {
  id: {
    type: String,
    index: true,
    renderable: true,
    writable: false
  },

  owner_id : {
    type: String,
    index: true,
    renderable: false,
    writable: false
  },

  name: {
    type: String,
    renderable: true,
    required : true,
    writable: true,
    "default" : "",
    validate : [
    {
      validator : BipModel.validators.notempty,
      msg : "Cannot be empty"
    },
    {
      validator : BipModel.validators.len_64,
      msg : "64 characters max"
    }
    ]
  },
  app_id : {
    type: String,
    renderable: true,
    writable: true,
    "default" : ""
  },
  action: {
    type: String,
    renderable: true,
    required : true,
    writable: true,
    set : function(action) {            
      var podAction = Channel.getPodTokens(action);
      if (podAction.ok()) {
        this.config = pods[podAction.pod].importGetDefaults(podAction.action);
      }
      return action;
    },
    "default" : "",
    validate : [
    {
      validator : BipModel.validators.notempty,
      msg : "Cannot be empty"
    },

    {
      validator : function(val, next) {
        next( validAction(val) );
      },
      msg : 'Invalid Pod or Action'
    },

    {
      validator : function(val, next) {
        var ok = false;
        if (validAction(this.action)) {
          // validate the config for this action
          ok = true;
        }
        next(ok);
      },
      msg : 'Action Configuration Error'
    }
    ]
  },

  config:  {
    type: Object,
    renderable: true,
    required : true,
    writable: true,
    "default" : {},
    validate : [
    {
      validator : function(val, next) {
        var ok = false;
        if (validAction(this.action)) {
          // validate the config for this action
          ok = true;
        }
        next(ok);
      },
      msg : 'Invalid Config'
    }
    ]
  },

  _available : {
    type: Boolean,
    renderable: true,
    writable: false,
    "default" : true
  },
  note: {
    type: String,
    renderable: true,
    writable: true,
    validate : [
    {
      validator : BipModel.validators.max_text,
      msg : "Text is too long, 1kb max"
    }
    ]
  },
  icon : {
    type: String,
    renderable: true,
    writable: true,
    "default" : ""
  },
  created : {
    type: Number,
    renderable: true,
    writable: false
  }
};

Channel.compoundKeyContraints = {
  "owner_id" : 1,
  "name" : 1,
  "action" : 1
};

function validAction(value) {
  var ok = false;
  ok = (undefined != value && value != '' && value != 0);
  if (ok) {
    var tTokens = value.split('.');
    var pod = tTokens[0], podAction = tTokens[1];
   
    ok = (undefined != pods[pod] && undefined != pods[pod].getSchema(podAction));
  }
  return ok;
}

// Pod Binder
Channel.staticChildInit = function() {
  // initialize each channel pod
  for (var idx in pods) {
    pods[idx].init(this.getDao(), CFG.pods[idx] );
  }

  return this;
};

/**
 * Transforms adjacentExports into an import usable by this Channel.  Transforms
 * are applied to imports under these conditions
 *
 *  - import < explicit export
 *  - import < template
 *  - import < _bip.{attribute}
 *  - import < _client.{attribute}
 *  - import < {channel_id}.{attribute}
 *  - no transforms, exports = import (do not need to explicitly transform 1:1)
 *
 */
Channel._transform = function(adjacentExports, transforms, client, bip) {
  var self = this,
  pod = this.getPodTokens();
  actionImports = pods[pod.name].getImports(pod.action), // expected imports
  resolvedImports = {}, // final imports for the channel
  localKey = 'local#'
  //
  // flattens adjacent exports so that we have a dot notation form to directly
  // matched against.
  flattenedExports = helper.flattenObject(adjacentExports, '#');

  // copy action Imports into resolved Imports, with empty values or exact
  // matches
  for (var localImport in actionImports) {
    resolvedImports[localImport] = (flattenedExports[localKey + localImport] ?
      flattenedExports[localKey + localImport] :
      ''
      );
  }

  if (Object.keys(transforms).length) {
    var key;
    var tplPattern;

    for (var dst in transforms) {
      //key = transforms[dst][i];
      key = transforms[dst];

      if ('' === resolvedImports[dst] || undefined === resolvedImports[dst]) {
        resolvedImports[dst] = '';
      }

      // match explicit key
      if (flattenedExports[key]) {
        importVal = flattenedExports[key];

      // match 'local. derived key'
      } else if (flattenedExports[localKey + key]) {
        importVal = flattenedExports[localKey + key];

      } else {
        // no exact match? Try and template it. Template engines are
        // too insecure, so we roll a basic pattern match only for
        // [% attribute %] or [% _bip.attribute %] or whatever
        for (var exp in flattenedExports) {
          // if local expressin in exports, then drop it and try to match
          if (/^local#/.test(exp)) {
            expLocal = exp.replace(/^local#/, '');
          } else {
            expLocal = exp;
          }

          // it doesn't matter too much if people inject 'undefined'
          // into their transform template...
          key = String(key).replace(
            new RegExp("\\[%(\\s*?)(" + expLocal + '|' + exp + ")(\\s*?)%\\]", 'g'), 
            flattenedExports[ exp ]
          );
        }

        // empty any unresolved key
        key = String(key).replace(
          helper.regActionUUID,
          ''
        );

        importVal = key;
      }
      resolvedImports[dst] += importVal;

    }
  } else {
    resolvedImports = adjacentExports;
  }

  return helper.naturalize(resolvedImports);
}

/**
 *
 * Applies transforms to imports for this channel and invokes this channel
 *
 */
Channel.invoke = function(adjacentExports, transforms, client, contentParts, next) {
  var self = this;

  var transformedImports = this._transform(adjacentExports, transforms, client),
  podTokens = this.getPodTokens(),
  podName = podTokens.name;
  /*
console.log('adjacent exports :');
console.log('ID ' + this.id);
console.log(adjacentExports);
console.log('transformed');
console.log(transformedImports);
console.log('---');
*/

  // attach bip and client configs
  var sysImports = {
    client : client,
    bip : adjacentExports._bip
  }

  // invoke method
  client.owner_id = this.owner_id;
  if (pods[podName].isOAuth()) {
    pods[podName].oAuthGetToken(this.owner_id, podName, function(err, oAuthToken, tokenSecret, authProfile) {
      if (!err && oAuthToken) {
        sysImports.auth = {
          oauth : {
            token : oAuthToken,
            secret : tokenSecret,
            profile : authProfile
          }
        };
        pods[podName].invoke(podTokens.action, self, transformedImports, sysImports, contentParts, next);
      } else {
        next(err);
      }
    });
  } else if ('issuer_token' === pods[podName]._authType) {
    pods[podName].authGetIssuerToken(this.owner_id, podName, function(err, username, password, key) {
      if (!err && (username || password || key)) {
        sysImports.auth = {
          issuer_token : {
            username : username,
            password : password,
            key : key
          }
        };
        pods[podName].invoke(podTokens.action, self, transformedImports, sysImports, contentParts, next);
      } else {
        next(err);
      }
    });
  } else {
    pods[podName].invoke(podTokens.action, this, transformedImports, sysImports, contentParts, next);
  }
}
Channel.rpc = function(renderer, query, client, req, res) {
  var self = this,
  podTokens = this.getPodTokens();

  if (pods[podTokens.name].isOAuth()) {
    (function(podName, action, renderer, query, client, req, res) {
      pods[podName].oAuthGetToken(self.owner_id, podName, function(err, oAuthToken, tokenSecret, authProfile) {
        var podTokens = self.getPodTokens();

        if (!err && oAuthToken) {
          var sysImports = {
            client : client,
            auth : {
              oauth : {
                token : oAuthToken,
                secret : tokenSecret,
                profile : authProfile
              }
            }
          };

          pods[podName].rpc(
            action,
            renderer,
            sysImports,
            query,
            self,
            req,
            res
            );

        } else if (err) {
          GLOBAL.app.logmessage(err, 'error');
          res.send(403);
        } else if (!oAuthToken) {
          res.send(403, {
            error : 'No OAuth Token bound for this Channel'
          });
        }
      });
    })(podTokens.name, podTokens.action, renderer, query, client, req, res);
    
  } else if ('issuer_token' === pods[podTokens.name]._authType) {
    
    
    (function(podName, action, renderer, query, client, req, res) {
      pods[podName].authGetIssuerToken(self.owner_id, podName, function(err, username, password) {
        if (!err && (username || password)) {
          var sysImports = {
            client : client,
            auth : {
              issuer_token : {
                username : username,
                password : password
              }
            }
          };
          pods[podName].rpc(
              action,
              renderer,
              sysImports,
              query,
              self,
              req,
              res
              );
        } else {
          res.send(403, {
            error : 'No Issuer Token bound for this Channel'
          });
        }
      });
    })(podTokens.name, podTokens.action, renderer, query, client, req, res);
  } else {
    var sysImports = {
      client : client,
      auth : {}
    };
    pods[podTokens.name].rpc(
      podTokens.action,
      renderer,
      sysImports,
      req.query,
      this,
      req,
      res
      );
  }
}


Channel.pod = function(podName) {
  var ret, tokens, schema;
  if (podName) {
    if (undefined != pods[podName]) {
      ret = pods[podName];
    }
  } else if (this.action && '' !== this.action) {
    tokens = this.action.split('.');
    ret = schema = pods[tokens[0]];
      
  } else {
    ret = pods;
  }
  return ret;
}

Channel.hasRenderer = function(renderer) {
  var tokens = this.action.split('.'),
  pod = this.pod(tokens[0]);
  return pod.isRenderer(tokens[1]);
}

Channel.getActionList = function() {
  var schema, result = [];

  for (pod in pods) {
    schema = pods[pod].getSchema();
    for (action in schema) {
      // @todo 'admin' actions should be surfaced to admin users
      if (!schema[action].trigger && !schema[action].admin) {
        result.push(pod + '.' + action);
      }
    }
  }
  return result;
}

Channel.getEmitterList = function() {
  var schema, result = [];

  for (pod in pods) {
    schema = pods[pod].getSchema();
    for (action in schema) {
      // @todo 'admin' actions should be surfaced to admin users
      if (schema[action].trigger && !schema[action].admin) {
        result.push(pod + '.' + action);
      }
    }
  }
  return result;
}

// post save, run pod initialization
/**
 *
 * @param {Object} sysInfo struct of { 'user' : account info, 'sys' : system generic }
 *
 */
Channel.postSave = function(accountInfo, next, isNew) {
  var tTokens = this.action.split('.'),
  podName = tTokens[0], action = tTokens[1],
  self = this;

  if (undefined == podName || undefined == action) {
    // throw a constraint crit
    console.log('crit: Channel [' + this.id + '] Init post save but no action?');
    throw DEFS.ERR_CONSTRAINT;
    return;
  }

  this.accountInfo = undefined;
  accountInfo.user.channels.set(this);    

  // channels behave a little differently, they can have postponed availability
  // after creation, which the pod actions themselves might want to dictate.
  if (pods[podName].isOAuth()) {
    // attach the users credentials for any potential oAuth based channel setup
    (function(channel, podName, action, accountInfo, next) {
      pods[podName].oAuthGetToken(accountInfo.user.id, podName, function(err, oAuthToken, tokenSecret, authProfile) {
        if (!err && oAuthToken) {
          var auth = {
            oauth : {
              token : oAuthToken,
              secret : tokenSecret,
              profile : authProfile
            }
          };
          pods[podName].setup(action, channel, accountInfo, auth, next);
        // not authenticated? Then we can't perform setup so drop this 
        // channel
        } else if (!oAuthToken) {
          self._dao.remove('channel', self.id, accountInfo, function() {            
            next('Channel could not authenticate', 'channel', {
              message : 'Channel could not authenticate'
            }, 500);  
          });
                  
        }
      });
    })(this, podName, action, accountInfo, next);
    
  } else if ('issuer_token' === pods[podName]._authType) {
    
    (function(channel, podName, action, accountInfo, next) {
      pods[podName].authGetIssuerToken(self.owner_id, podName, function(err, username, password, key) {
        if (!err && (username || password || key)) {
          var auth = {
            issuer_token : {
              username : username,
              key : key,
              password : password
            }
          };
          
          pods[podName].setup(action, channel, accountInfo, auth, next);
          
        } else {
          // not authenticated? Then we can't perform setup so drop this 
          // channel
          self._dao.remove('channel', self.id, accountInfo, function() {
            next(true, 'channel', {
              message : 'No Issuer Token bound for this Channel'
            }, 403);  
          });
        }
      });
    })(this, podName, action, accountInfo, next);
    
  } else {
    pods[podName].setup(action, this, accountInfo, next);
  }

  if (isNew) {
    GLOBAL.app.bastion.createJob(DEFS.JOB_USER_STAT, {
      owner_id : accountInfo.user.id, 
      type : 'channels_total'
    } );
  }
}

/**
 * Checks whether any bips are pointed to this channel and if not,
 * calls any pod teardowns.
 */
Channel.preRemove = function(id, accountInfo, next) { 
  var tTokens = this.action.split('.'),
  podName = tTokens[0], action = tTokens[1],
  self = this;

  this.getBips(id, accountInfo, function(err, results) {
    // removing channel where it has bips, conflict
    if (!err && results && results.length > 0) {           
      next('Channel still has Bips attached', 'channel', {
        message : 'Channel still has Bips attached'
      }, 409);           
    } else {
      pods[podName].teardown(action, self, accountInfo, function(err) {
        next(err, 'channel', self);
      });
    }
  });
}

Channel.getPodTokens = function() {
  var ret = {
    ok : function() {
      return (undefined != this.pod);
    }
  };
  if (this.action) {
    var tokens = this.action.split('.');
    if (tokens.length == 2) {
      ret.name = ret.pod = tokens[0];
      ret.action = tokens[1];
      ret._struct = pods[ret.pod];
      ret.getSchema = function(key) {
        //var ptr = pods[this.pod]['_schemas'][this.action];
        var ptr = pods[this.pod].getSchema(this.action);
        if (key && ptr[key]) {
          return ptr[key];
        }
        return ptr;
      };
      ret.isTrigger = function() {
        //return pods[this.pod]['_schemas'][this.action].trigger;
        return pods[this.pod].isTrigger(this.action);
      },
      // get all unique keys
      ret.getSingletonConstraints = function() {
        var schema = this.getSchema(),
        constraints = {}, singleton = false;

        for (key in schema.config.properties) {
          if (schema.config.properties[key].unique) {
            singleton = true;
            constraints[key] = schema.config.properties;
          }
        }

        return singleton ? constraints : null;
      }
    }
  }
  return ret;
}

Channel.getPods = function(name) {
  if (name && pods[name]) {
    return pods[name];
  } else {
    return pods;
  }
}

// We try to inject defaults into channel configs to avoid patching documents
// in mongo with default configs as they change.
Channel.getConfig = function() {
  var config = {};

  pod = this.getPodTokens();
  var podConfig = pods[pod.name].importGetConfig(pod.action);
  for (key in podConfig.properties) {
    if (!this.config[key] && podConfig.properties[key]['default']) {
      config[key] = podConfig.properties[key]['default'];
    } else if (this.config[key]) {
      config[key] = this.config[key];
    }
  }
  return config;
}

/**
 * Tests a named import is valid for the configured chanenl
 */
Channel.testImport = function(importName) {
  var ok = false,
  pod = this.getPodTokens();

  if (pod.ok()) {
    ok = pods[pod.name].testImport(pod.action, importName);
  }

  return ok;
}

/**
 *
 * Gets configured Bips for this channel
 * 
 */
Channel.getBips = function(channelId, accountInfo, next) {
  this._dao.getBipsByChannelId(channelId, accountInfo, next);
}

/**
 * Given a transformSource lookup, retrieves the default transform for this
 * channels configured pod.action
 *
 */
Channel.getTransformDefault = function(transformSource) {
  var transform,
  action = this.getPodTokens();

  if (action.ok()) {
    transform = pods[action.pod].getTransformDefault(transformSource, action.action);
  }
  return transform;
}

Channel.getRendererUrl = function(renderer, accountInfo) {
  var action = this.getPodTokens(),
  rStruct,
  ret,
  cid = this.getIdValue();

  if (action.ok()) {
    rStruct = action.getSchema('renderers');
    if (rStruct[renderer]) {
      if (cid) {
        ret = accountInfo.getDefaultDomainStr(true) + '/rpc/render/channel/' + cid + '/' + renderer;
      } else {
        ret = accountInfo.getDefaultDomainStr(true) + '/rpc/pod/' + action.name + '/' + action.action + '/' + renderer;
      }            
    }
  }

  return ret;
}

Channel.attachRenderer = function(accountInfo) {
  var action = this.getPodTokens();

  if (action.ok()) {
    rStruct = action.getSchema();
    if (rStruct && rStruct.renderers) {
      // add global invokers
      this._renderers = {
        'invoke' : {
          description : 'Invoke',
          description_long : 'Invokes the Channel with ad-hoc imports',
          contentType : DEFS.CONTENTTYPE_JSON,
          _href : accountInfo.getDefaultDomainStr(true) + '/rpc/render/channel/' + this.getIdValue() + '/invoke'
        }
      };
      
      for (var idx in rStruct.renderers) {
        this._renderers[idx] = rStruct.renderers[idx]
        this._renderers[idx]._href = this.getRendererUrl(idx, accountInfo);
      }
    }
  }
}

Channel.href = function() {
  return this._dao.getBaseUrl() + '/rest/' + this.entityName + '/' + this.getIdValue();
}

/**
 * Channel representation
 */
Channel.repr = function(accountInfo) {
  var repr = '';
  var action = this.getPodTokens();

  if (action.ok()) {
    repr = pods[action.pod].repr(action.action, this);
    this.attachRenderer(accountInfo);
  }



  return repr;
}

Channel.isAvailable = function() {
  return this._available;
}

// register pods
if (!process.HEADLESS) {
  var pods = {};
  for (var podName in CFG.pods) {
    if (CFG.pods.hasOwnProperty(podName) && podName !== 'testing') {
      pods[podName] = require('bip-pod-' + podName);
      GLOBAL.app.logmessage('POD:' + podName + ':UP');
    }
  }
}

module.exports.Channel = Channel;