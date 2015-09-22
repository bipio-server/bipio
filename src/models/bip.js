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
 var async = require('async'),
   baseConverter = require('base-converter'),
   BipModel = require('./prototype.js').BipModel,
   Bip = Object.create(BipModel),
  //cronParser = require('cron-parser'),
  Rrecur = require('rrecur').Rrecur;

// setters
/**
 *
 */
 function generate_random_base() {
  var ret = '';
  var charRanges = {
    48 : 57,
    65 : 90,
    97 : 122
  }

  for (lower in charRanges) {
    for (var i = lower; i <= charRanges[lower]; i++) {
      ret += String.fromCharCode(i);
    }
  }

  return '.' + ret + '_';
}

  // strict formatting of date string required for scheduler to work
function removeOffset(time) {
  return normedStart = time.substr(0, 16);
}

function setSchedule(schedule) {
  	var sched, recur, recurStr, startTime;

  if (schedule && app.helper.isObject(schedule) && Object.keys(schedule)) {
  	recurStr = schedule.recurrencePattern;

    if (!schedule.startDateTime.trim()) {
      schedule.startDateTime = app.moment().format();
    }

  	// FuelBox UI tacks on trailing semicolon, which breaks ability for rrecurjs to create() an iterable object.
  	recurStr = (recurStr.charAt(recurStr.length-1) == ';') ? recurStr.slice(0,-1) : recurStr;

    startTime = removeOffset(schedule.startDateTime);

    sched = {
      dtstart: {
       zoneless: startTime,
       locale: schedule.timeZone.offset
      },
      rrule: Rrecur.parse(recurStr)
     };

    schedule['sched'] = sched;

    recur = Rrecur.create(sched, schedule.startTime, schedule.timeZone.offset);
    schedule['nextTimeToRun'] = moment(recur.next()).unix() * 1000;

    return schedule;
  }
}

/**
 * Takes a time string
 *
 * Doesn't make a user setting timezone translation here, if they change timezones
 * it means system needs to update all of their bips.
 */
 function endLifeParse(end_life) {
  var seconds, d;

  // passed validation but isn't a number, then set it zero (never end based on impressions)
  if (isNaN(parseInt(end_life.imp))) {
    end_life.imp = 0;
  }

  if (!end_life.time) {
    end_life.time = 0;
  } else if (end_life.time !== '0' && end_life.time !== 0 && end_life.time !== '') {
    try {
      d = new Date(Date.parse(end_life.time));
      if (d.getTime() != 0) {
        end_life.time = Math.floor(d.getTime() / 1000);
      }
    } catch (e) {
    }
  }

  return end_life;
}

// -----------------------------------------------------------------------------
Bip.repr = function(accountInfo) {
  if (undefined === this.domain_id || '' === this.domain_id) {
    return '';
  } else if (!accountInfo.user.domains) {
    return this.name;
  }

  var repr = '',
  domainName = accountInfo.user.domains.get(this.domain_id).repr();

  // inject the port for dev
  if (process.env.NODE_ENV == 'development') {
    domainName += ':' + CFG.server.port;
  }

  if (this.type === 'http') {
    repr = (CFG.proto_user ? CFG.proto_user : CFG.proto_public) + domainName + '/bip/http/' + this.name;

  } else if (this.type == 'smtp') {
    repr = this.name + '@' + domainName;
  }
  return repr;
}

function escapeDot(val) {
  return val.replace(/\./g, '\u0001');
}

function unEscapeDot(val) {
  return val.replace(/\u0001/g, '.');
}

Bip.links = function(accountInfo) {
  var links = [];
  if (this.type === 'http') {
    var schema = {
      'href' : this.repr(accountInfo),
      'rel' : '_repr',
      'encType' : 'application/json',
      "schema" : {
        "properties" : {
        },
        "required" : []
      }
    };

    if (this.exports) {
      schema.schema = this.exports;
    }

    for (var sCID in this.hub) {
      if (this.hub.hasOwnProperty(sCID) && this.hub[sCID].transforms) {
        for (var eCID in this.hub[sCID].transforms) {
          if (this.hub[sCID].transforms.hasOwnProperty(eCID)) {
            for (var attr in this.hub[sCID].transforms[eCID]) {
              var tokens = this.hub[sCID].transforms[eCID][attr].match(app.helper.regActionSource),
              key;

              if (tokens) {
                for (var i = 0; i < tokens.length; i++ ) {
                  key = tokens[i].replace(app.helper.regActionSource, '$3');
                  if (key && !schema.schema.properties[key]) {
                    schema.schema.properties[key] = {
                      type : "string",
                      name : key
                    };

                    if (!schema.schema.required) {
                      schema.schema.required = [];
                    }

                    schema.schema.required.push(key);
                  }
                }
              }
            }
          }
        }

      }
    }

    // traverse transforms, extract attributes
    links.push(schema);
  }

  if (this._errors) {
    links.push({
      _href : this._dao.getBaseUrl() + '/rest/bip/' + this.id + '/logs',
      name : 'errors',
      contentType : 'application/json',
      title : 'Error Logs'
    });
  }

  return links;
}

Bip.entityName = 'bip';
Bip.entitySchema = {
  id: {
    type: String,
    index: true,
    renderable: true,
    writable: false
  },
  name: {
    type: String,
    renderable: true,
    writable: true,
    validate : [
    {
      'validator' : BipModel.validators.max_64,
      'msg' : "64 characters max"
    }
    ]
  },
  domain_id: {
    type: String,
    index : true,
    renderable: true,
    writable: true,
    validate : [ {
      validator : function(val, next) {
        next(this.type === 'trigger' ? true :
          this.getAccountInfo().user.domains.test(val)
          );
      },
      msg : 'Domain Not Found'
    }
    ]
  },
  type: {
    type: String,
    renderable: true,
    writable: true,
    validate : [
    {
      validator : function(val, next) {
        if (CFG.server.smtp_bips) {
          next( /^(smtp|http|trigger)$/i.test(val) );
        } else {
          next( /^(http|trigger)$/i.test(val) );
        }
      },
      msg : 'Unexpected Bip Type'
    }
    ],
    set : function(type) {
      // empty name? then generate one
      if (undefined == this.name || this.name == '') {
        var uuidInt = new Date().getTime();
        // change base
        this.name = baseConverter.decToGeneric(uuidInt, generate_random_base());
      }

      // scrub name
      if ('smtp' === type) {
        this.name = this.name.replace(/\s/g, '-');
        this.name = this.name.replace(/[^a-zA-Z0-9-_.]/g, '');
      } else if ('http' === type) {
        this.name = this.name.replace(/[^a-zA-Z0-9-_.\s()!*+,;\[\]@]/g, '');
      }
      return type;
    }
  },
  config: {
    type: Object,
    renderable: true,
    writable: true,
    "default" : {},
    validate : [{
      validator : function(val, next) {
        var ok = false;
        if (!val) {
          next(ok);
          return;
        }

        // ------------------------------
        if (this.type == 'trigger') {
          ok = false;
          var cid = val.channel_id,
            accountInfo = this.getAccountInfo(),
            userChannels = accountInfo.user.channels,
            channel, podTokens, pod;

          if (app.helper.getRegUUID().test(cid)) {
            channel = userChannels.get(cid),
            podTokens;

            if (channel) {
              podTokens = channel.action.split('.');
              pod = this.getDao().pod(podTokens[0], accountInfo);

              ok = channel && pod && pod.isTrigger(podTokens[1]);
            }
          } else {
            podTokens = cid.split('.');

            pod = this.getDao().pod(podTokens[0], accountInfo);

            if (pod) {
              ok = pod.isTrigger(podTokens[1])
            }
          }

        // ------------------------------
      } else if (this.type == 'http') {

        if (val.auth && /^(none|token|basic)$/.test(val.auth)) {
          if (val.auth == 'basic') {
            ok = val.username && val.password;
          } else {
              // none and token don't require extra config
              ok = true;
            }
          }

          if (val.exports && app.helper.isArray(val.exports)) {
            ok = true;
            for (var i = 0; i < val.exports.length; i++) {
              // @todo make sure inputs has been sanitized
              ok = (val.exports[i] != '' && app.helper.isString(val.exports[i]));
              if (!ok) {
                break;
              }
            }
          } else if (!val.exports) {
            ok = true;
          }

        // ------------------------------
      } else if (this.type == 'smtp') {
        ok = true;
      }

      next(ok);
    },
    msg : 'Bad Config'
  },
  {
    validator : function(val, next) {
      var ok = true;
      if (this.type == 'http' && val.renderer) {
        ok = this.getDao().validateRenderer(val, this.getAccountInfo());
      }

      next(ok);
      return;
    },
    msg : 'Renderer RPC Not Found'
  }
  ]
},
hub: {
  type: Object,
  renderable: true,
  writable: true,
  set : function(hub) {
    var newSrc, newCid;

      // normalize
      for (var src in hub) {

        newSrc = escapeDot(src);
        hub[newSrc] = hub[src];

        if (newSrc !== src) {
          delete hub[src];
        }

        if ( hub.hasOwnProperty(newSrc) ) {
          for (var cid in hub[newSrc].transforms) {
            newCid = escapeDot(cid);
            hub[newSrc].transforms[newCid] = hub[newSrc].transforms[cid];
            if (newCid !== cid) {
              delete hub[newSrc].transforms[cid];
            }
          }
        }
      }

      // parse
      for (var src in hub) {
        if (hub.hasOwnProperty(src)) {
          for (var cid in hub[src].transforms) {
            if (hub[src].transforms.hasOwnProperty(cid)) {
              for (var k in hub[src].transforms[cid]) {
                hub[src].transforms[cid][k] = hub[src].transforms[cid][k].trim();
              }
            }
          }
        }
      }

      return hub;
    },
    customGetter : function(hub) {
      var newSrc, newCid;

      // normalize
      for (var src in hub) {

        newSrc = unEscapeDot(src);
        hub[newSrc] = hub[src];

        if (newSrc !== src) {
          delete hub[src];
        }

        if ( hub.hasOwnProperty(newSrc) ) {
          for (var cid in hub[newSrc].transforms) {

            newCid = unEscapeDot(cid);
            hub[newSrc].transforms[newCid] = hub[newSrc].transforms[cid];
            if (newCid !== cid) {
              delete hub[newSrc].transforms[cid];
            }

          }
        }
      }

      return hub;
    },
    validate : [
    {
      // not a very good validator, but will do for know.
      // @todo ensure edge > vertex > edge doesn't exist
      validator : function(hub, next) {
        var numEdges, edges = {}, edge, loop = false;
        for (key in hub) {
          edges[key] = 1;
          numEdges = hub[key].edges.length;
          for (var i = 0; i < numEdges; i++ ) {
            edge = hub[key].edges[i];

            if (!edges[edge]) {
              edges[edge] = 1;
            } else {
              edges[edge]++;
              break;
            }
          }
        }

        for (edge in edges) {
          loop = edges[edge] > 2;
          if (loop) {
            break;
          }
        }

        next(!loop);
      },
      msg : "Loop Detected"
    },

    {
    	validator : function(val, next) {
        var ok = false,
          pod,
          accountInfo = this.getAccountInfo(),
          userChannels = accountInfo.user.channels,
          numEdges,
          transforms,
          hasRenderer = this.config.renderer && undefined !== this.config.renderer.channel_id;

        // check channels + transforms make sense
        if (undefined != val.source) {
          for (var cid in val) {
            if (val.hasOwnProperty(cid)) {

              numEdges = val[cid].edges.length;
              if (numEdges > 0) {
                for (var e = 0; e < numEdges; e++) {
                  ok = false;
                  if (!app.helper.getRegUUID().test(val[cid].edges[e])) {

                    var pointerDetails=val[cid].edges[e].split(".");

                    if ( pointerDetails.length >= 2 ){
                      pod = this.getDao().pod(pointerDetails[0], accountInfo);

                      if ( pod ) {

                        if ( pod.getAction(pointerDetails[1]) ){
                          ok=true;

                        } else {

                          ok=false;
                          break;
                        }

                      } else {
                        ok=false;
                        break;
                      }
                    }
                  } else if (userChannels.get(cid)) {
                    ok = true;

                  } else {
                    ok=false;
                    break;
                  }
                }
              }

              if (!ok && hasRenderer) {
                ok = true;
              }
            }

            if (!ok) {
              break;
            }

          }
        } else if (hasRenderer) {
          ok = true;
        }
        next(ok);
      },
      msg : 'Invalid, Inactive or Missing Channel In Hub'
    },

    {
      // ensure hub has a source edge
      validator : function(hub, next) {
        var hasRenderer = this.config.renderer &&
        (
          undefined !== this.config.renderer.channel_id ||
          undefined !== this.config.renderer.pod
          );

        next(hub.source && hub.source.edges.length > 0 || hasRenderer);
      },
      msg : "Hub Cannot Be Empty"
    },
    /* @todo stubbed
        {
            // ensure no orphans
            validator : function(hub, next) {
                var cid,
                    k,
                    egress = {};

                for (cid in hub) {
                    if (hub.hasOwnProperty(cid)) {
                        egress[cid] = 1;
                        for (k = 0; k < hub[cid].edges.length; k++) {
                            if (undefined === egress[hub[cid].edges[k]]) {
                                egress[hub[cid].edges[k]] = 1;
                            }
                            egress[hub[cid].edges[k]]--;
                        }
                    }
                }
            },
            msg : "Orphaned Channel"
          }*/
          ]
        },
        note: {
          type: String,
          renderable: true,
          writable: true,
          "default" : '',
          validate : [{
            'validator' : BipModel.validators.max_text,
            'msg' : "1024 characters max"
          }]
        },
        end_life: {
          type: Object,
          renderable: true,
          writable: true,
          set : endLifeParse,
          validate : [{
            validator : function(val, next) {
              next(
                (parseFloat(val.imp) == parseInt(val.imp)) && !isNaN(val.imp) &&
                ((parseFloat(val.time) == parseInt(val.time)) && !isNaN(val.time)) ||
                0 !== new Date(Date.parse(val.time)).getTime()
                );
            },
            msg : 'Bad Expiry Structure'
          },
          {
            validator : function(val, next) {
              next(val.action && /^(pause|delete)$/i.test(val.action) );
            },
            msg : 'Expected "pause" or "delete"'
          }
          ]
        },
        paused: {
          type: Boolean,
          renderable: true,
          writable: true,
          'default' : false,
          set : function(newValue) {
            return newValue;
    /*
            if (false === this.paused && newValue) {
                Bip.getDao().pauseBip(this, null, newValue, null);
            }
            return newValue;
            */
          },
          validate : [{
            'validator' : BipModel.validators.bool_any,
            'msg' : 'Expected 1,0,true,false'
          }]
        },
        schedule: {
          type: Object,
          renderable: true,
          writable: true,
          default : {},
          set : setSchedule
        },
        binder: {
          type: Array,
          renderable: true,
          writable: true
        },
        icon : {
          type: String,
          renderable: true,
          writable: true,
          "default" : ""
        },
        app_id : {
          type: String,
          renderable: true,
          writable: true,
          "default" : ""
        },
        owner_id : {
          type: String,
          index: true,
          renderable: false,
          writable: false
        },
        created : {
          type: Number,
          renderable: true,
          writable: false
        },
        _imp_actual : {
          type : Number,
          renderable : true,
          writable : false,
          "default" : 0
        },
        _last_run : {
          type : Number,
          renderable : true,
          writable : false,
          "default" : 0,
          get : function(value) {
            if (value) {
              var now = app.moment.utc();
              return app.moment.duration(now.diff(value)).humanize() + ' ago';
            } else {
              return '';
            }
          },
          getLastRun : function(value) {
            if (value) {
             var now = app.moment.utc();
             return value;
           } else {
             return '';
           }
         }
       },
  exports : { // user timezone
    type : Object,
    renderable : true,
    writable : true,
    get : function(val) {
      return val ? JSON.parse(val) : val;
    },
    set : function(val) {
      return val ? JSON.stringify(val) : val;
    }
  },
  _tz : { // user timezone
    type : String,
    renderable : false,
    writable : false
  },
  // channel secondary index
  _channel_idx : {
    type : Array,
    renderable : true,
    writable : false
  },
  _errors : {
    type : Boolean,
    renderable : false,
    writable : false
  }
};

Bip.compoundKeyConstraints = {
  owner_id : 1,
  name : 1,
  type : 1
};

Bip.exports = {
  getExports : function(type, keysOnly) {
    var exp = [];

    if (this[type]) {
      if (keysOnly && true == keysOnly) {
        exp = [];
        for (key in this[type]) {
          exp.push(key);
        }
        // register available client exports for the bip
        exp.push('_client#host');
      } else {
        exp = this[type];
        exp['_client#host'] = {
          type : 'string'
        }
      }

      // HTTP Bips can be configured with export hints depending on
      // what the end user needs to send.  We assume they're strings.
      //
      if (this.type == 'http' && this.config.exports.length > 0) {
       for (var i = 0; i < this.config.exports.length; i++) {
        exp[this.config.exports[i]] = {
          type : String,
          description : this.config.exports[i]
        }
      }
    }

  }
  return exp;
},

'*' : {
  properties : {
      '_files' : { // tba
        type : 'array',
        description : 'File Objects'
      },
      '_client' : {
        type : 'object',
        description : 'Client Info',
        properties : {
          "host" : {
            "title" : "Host",
            "type" : "string"
          },
          "repr" : {
            "title" : "Sender",
            "type" : "string"
          },
          "date" : {
            "title" : "Invoke Time",
            "type" : "string"
          },
          "id" : {
            "title" : "Message ID",
            "type" : "string"
          },
          "proto" : {
            "title" : "Protocol",
            "type" : "string"
          },
          "method" : {
            "title" : "Request Method",
            "type" : "string"
          }
        }
      },
      '_bip' : {
        type : 'object',
        description : 'This Bip',
        properties : {
          "name" : {
            "title" : "Name",
            "type" : "string"
          },
          "type" : {
            "title" : "Type",
            "type" : "string"
          },
          "note" : {
            "title" : "Description",
            "type" : "string"
          },
          "_repr" : {
            "title" : "Link",
            "type" : "string"
          }
        }
      }
    }
  },

  // http export helpers
  'http' : {
    title : 'Incoming Web Hook',
    type : 'object',
    properties : {
      'title' : {
        type : 'string',
        description: 'Message Title'
      },

      'body' : {
        type : 'string',
        description: 'Message Body'
      },
      'rawBody' : {
        type : 'string',
        description: 'Raw Body'
      }
    },
    definitions : {
    }
  },

  'trigger' : {
    properties : {},
    definitions : {}
  }
}

if (CFG.server.smtp_bips) {
  Bip.exports.smtp = {
    title : 'Incoming Email',
    type : 'object',
    properties : {
      'subject' : {
        type : 'string',
        description: 'Message Subject'
      },

      'body_text' : {
        type : 'string',
        description: 'Text Message Body'
      },

      'body_html' : {
        type : 'string',
        description: 'HTML Message Body'
      },

      'reply_to' : {
        type : 'string',
        description: 'Sender'
      }
    },
    definitions : {
    }
  };
}

Bip._createChannelIndex = function() {
  // create channel index
  var channels = [];
  if (this.config.channel_id && '' !== this.config.channel_id) {
    channels.push(this.config.channel_id);
  }

  for (var k in this.hub) {
    if (this.hub.hasOwnProperty(k)) {
      if (this.hub[k].edges) {
        channels = channels.concat(this.hub[k].edges);
      }
    }
  }

  if ('http' === this.type && app.helper.isObject(this.config.renderer)
    && this.config.renderer.channel_id
    && this.config.renderer.renderer) {
    channels.push(this.config.renderer.channel_id);
}

this._channel_idx = app._.uniq(channels);
}

/**
 * For any omitted attributes, use account defaults
 */
 Bip.preSave = function(accountInfo, next) {
  var self = this;
  if ('' !== this.id && undefined !== this.id) {
    var props = {
      'domain_id' : accountInfo.getSetting('bip_domain_id'),
      //        '_tz' : accountInfo.user.settings.timezone,
      'type' :  accountInfo.getSetting('bip_type'),
      'anonymize' :  accountInfo.getSetting('bip_anonymize'),
      'config' :  accountInfo.getSetting('bip_config'),
      'end_life' :  accountInfo.getSetting('bip_end_life'),
      'hub' :  accountInfo.getSetting('bip_hub'),
      'icon' : ''
    };

    app.helper.copyProperties(props, this, false);
  }

  if (!this.end_life.action || '' === this.end_life.action) {
    this.end_life.action = accountInfo.getSetting('bip_expire_behaviour');
  }

  if (this.domain_id === '') {
    this.domain_id = undefined;
  }

  var transformUnpack = [], ptr;

  // translate 'default' transforms
  for (cid in this.hub) {
    if (this.hub.hasOwnProperty(cid)) {
      if (this.hub[cid].transforms) {
        for (edgeCid in this.hub[cid].transforms) {
          if ('default' === this.hub[cid].transforms[edgeCid]) {
            this.hub[cid].transforms[edgeCid] = {};
            transformUnpack.push(
              (function(accountInfo, from, to, ptr) {
                return function(cb) {
                  self._dao.getTransformHint(accountInfo, from, to, function(err, modelName, result) {
                    if (!err && result && result.transform) {
                      app.helper.copyProperties(result.transform, ptr, true);
                    }

                    cb(err);
                  });
                }
              })(accountInfo,
              'bip.' + this.type,
              accountInfo.user.channels.get(edgeCid).action,
              this.hub[cid].transforms[edgeCid])
              );
          }
        }
      }
    }
  }

  this._createChannelIndex();

  if (transformUnpack.length > 0) {
    async.parallel(transformUnpack, function(err) {
      next(err, self);
    });
  } else {
    next(false, this);
  }
};

function getAction(accountInfo, channelId) {
  return accountInfo.user.channels.get(channelId).action;
}

Bip.normalizeTransformDefaults = function(accountInfo, next) {
// disabled until bip-508 complete
next({});
return;
  var from, to, payload, fromMatch, transforms = {}, dirty = false,
  hub = JSON.parse(JSON.stringify(this.hub));

  for (var key in hub) {
    if (hub.hasOwnProperty(key)) {
      fromMatch = new RegExp(key, 'gi');
      if (key === 'source') {
        if (this.type === 'trigger' && this.config.channel_id) {
          from = getAction(accountInfo, this.config.channel_id);
        } else {
          from = 'bip.' + this.type;
        }
      } else {
        from = getAction(accountInfo, key);
      }

      if (hub[key].transforms && Object.keys(hub[key].transforms).length > 0) {
        for (var txChannelId in this.hub[key].transforms) {
          if (hub[key].transforms.hasOwnProperty(txChannelId)) {
        		var res=app.helper.getRegUUID().test(txChannelId);
        		if(!res){
        			//remove the verison from the pointer example facebook.post_page._0, then it should just return facebook.post_page
        			var tmp=txChannelId.split(".");
        			tmp.pop();
        			txChannelId=tmp.join(".");
        		}
            to = getAction(accountInfo, txChannelId);
            if (from && to) {

			  // filter to include only transforms for these
              // adjacent channels
              for(var txKey in hub[key].transforms[txChannelId]) {

                if (hub[key].transforms[txChannelId].hasOwnProperty(txKey)) {

                  hub[key].transforms[txChannelId][txKey].replace(fromMatch, from);

                  if (app.helper.getRegUUID().test(hub[key].transforms[txChannelId][txKey])) {
                    hub[key].transforms[txChannelId][txKey] = '';
                  }

                  // strip any remaining uuid's.  Only supporting adjacent transform helpers
                  // for now
                  hub[key].transforms[txChannelId][txKey].replace(app.helper.getRegActionUUID(), '');
                }
              }

              // default transform payload
              payload = {
                from_channel : from,
                to_channel : to,
                transform : hub[key].transforms[txChannelId],
                owner_id : accountInfo.user.id
              };
              next(payload);
            }
          }
        }
      }
    }
  }
}

Bip.preRemove = function(id, accountInfo, next) {
  var self = this;

  this._dao.removeBipDeltaTracking(id, function(err) {
    if (err) {
      next(err, 'bip', self);
    } else {
      self._dao.removeBipDupTracking(id, function(err) {
        next(err, 'bip', self);
      });
    }
  });
}

Bip._postSaveChannels = function(accountInfo) {
  var self = this;

  for (var i = 0; i < this._channel_idx.length; i++) {
    self._dao.getChannel(
      this._channel_idx[i],
      accountInfo,
      function(err, channel) {
        if (!err && channel) {
          self._dao.modelFactory('channel', channel).postSave(accountInfo, function() {});
        }
      },
      this.config && this.config.channel_id && this.config.channel_id === this._channel_idx[i]
        ? this.config.config
        : null
    );
  }
}

Bip.postSave = function(accountInfo, next, isNew) {
  var self = this;

  this.normalizeTransformDefaults(accountInfo, function(payload) {
    if (payload.transform && Object.keys(payload.transform).length > 0) {
      app.bastion.createJob(DEFS.JOB_BIP_SET_DEFAULTS, payload);
    }
  });

  // create metric updates jobs
  if (isNew) {
    app.bastion.createJob(DEFS.JOB_USER_STAT, {
      owner_id : accountInfo.user.id,
      type : 'bips_total'
    } );
    app.bastion.createJob(DEFS.JOB_BIP_ACTIVITY, {
      bip_id : this.id,
      owner_id : accountInfo.user.id,
      code : 'bip_create'
    } );

    // if its a new trigger, then run it
    if ('trigger' === this.type && !this.paused) {
      this._dao.triggerAll(function() {}, { id : this.id }, false, false, true);
    }
  }

  next(false, this.getEntityName(), this);

  accountInfo.bip = this;

  this._postSaveChannels(accountInfo);
};


// ensure we have an up to date channel index
Bip.prePatch = function(patch, accountInfo, next) {
  var self = this;

  for (var k in patch) {
    if (patch.hasOwnProperty(k)) {
      if (Bip.entitySchema[k].set) {
        patch[k] = Bip.entitySchema[k].set(patch[k]);
      }

      this[k] = patch[k];
    }
  }
  this._createChannelIndex();

  patch._channel_idx = this._channel_idx;

  next(false, this.getEntityName(), patch);

  accountInfo.bip = this;

  this._postSaveChannels(accountInfo);
};


Bip.isScheduled = function( next) {
	var accountInfo = this.getAccountInfo();
//	var timeNow =  app.helper.nowTimeTz(accountInfo.user.settings.timezone);
  var timeNow = new Date();

	// check if the set schedule dictates that it is time to trigger this bip
	if (this.schedule && this.schedule.nextTimeToRun) {
		if (timeNow.getTime() >= this.schedule.nextTimeToRun) {
			next(true);
		} else {
			next(false);
		}
	} else {
		(this.schedule) ? next(false) : next(true); // legacy bips without schedule.
	}
}

Bip.hasSchedule = function() {
	return this.schedule !== undefined;
}

Bip.getNextScheduledRunTime = function(options) {
	var options = options || this.schedule.sched;
	var recur = Rrecur.create(options, new Date(), this.schedule.timeZone.offset);
	var nextRecurrence = moment(recur.next()).unix() * 1000;
	return nextRecurrence;
}


Bip.checkExpiry = function(next) {
  var accountInfo = this.getAccountInfo();

  if (this.end_life) {
    // convert bip expiry to user timezone
    var endTime = (app.moment(this.end_life.time).utc() / 1000) + (app.moment().utcOffset() * 60),
    nowTime = app.helper.nowTimeTz(accountInfo.user.settings.timezone),
    endImp =  parseInt(this.end_life.imp * 1),
    expired = false,
    self = this;

    if (endTime > 0) {
      // if its an integer, then treat as a timestamp
      if (!isNaN(endTime)) {
        // expired? then pause
        if (nowTime >= endTime) {
          // pause this bip
          expired = true;
        }
      }
    }

    if (endImp > 0) {
      if (this._imp_actual && this._imp_actual >= endImp) {
        expired = true;
      }
    }
  }

  next(expired);
};


Bip.expire = function(transactionId, next) {
  var accountInfo = this.getAccountInfo(),
  expireBehavior = (this.end_life.action && '' !== this.end_life.action)
  ? this.end_life.action
  : accountInfo.user.settings.bip_expire_behaviour;

  if ('delete' === expireBehavior) {
    this._dao.deleteBip(this, accountInfo, next, transactionId);
  } else {
    this._dao.pauseBip(this, true, next, transactionId);
  }
}

// returns the transforms for an edge, if any are present
Bip.getTransformFor = function(cid) {
  var transforms = app._.pluck(this.hub, 'transforms');

  for (var i = 0; i < transforms.length; i++) {
    if (transforms[i] && transforms[i][cid]) {
      return transforms[i][cid];
    }
  }

  return;
}

module.exports.Bip = Bip;