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
var baseConverter = require('base-converter'),
djs = require('datejs'),
BipModel = require('./prototype.js').BipModel,
Bip = Object.create(BipModel);

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

/**
 * Takes a time string
 */
function endLifeParse(end_life) {
    var seconds, d;
    // passed validation but isn't a number, then set it zero (never end based on impressions)
    if (isNaN(parseInt(end_life.imp))) {
        end_life.imp = 0;
    }

    if (end_life.time !== '0' && end_life.time !== 0 && end_life.time !== '') {
        d = new Date(Date.parse(end_life.time));
        if (d.getTime() != 0) {
            // @todo looks like a bug in datejs, no seconds for getTime?
            //            seconds = d.getSeconds() + (d.getMinutes() * 60) + (d.getHours() * 60 * 60);
            // from microseconds to seconds
            // end_life.time = (d.getTime() / 100) + seconds;
            end_life.time = Math.floor(d.getTime() / 1000);
        }
    } else {
        end_life.time = 0;
    }

    return end_life;
}

// -----------------------------------------------------------------------------
Bip.repr = function(accountInfo) {
    if (undefined === this.domain_id || '' === this.domain_id) {
        return '';
    }

    var repr = '',
    domainName = accountInfo.user.domains.get(this.domain_id).repr();

    // inject the port for dev
    if (process.env.NODE_ENV == 'development') {
        domainName += ':' + CFG.server.port;
    }

    if (this.type == 'http') {
        repr = CFG.proto_public + domainName + '/bip/http/' + this.name;
    } else if (this.type == 'smtp') {
        repr = this.name + '@' + domainName;
    }
    return repr;
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
                next( /^(smtp|http|trigger)$/i.test(val) );
            },
            msg : 'Expected "smtp", "http" or "trigger"'
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
            if ('trigger' !== type) {
                this.name = this.name.replace(/\s/g, '-');
                this.name = this.name.replace(/[^a-zA-Z0-9-_]/g, '');
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
                    userChannels = this.getAccountInfo().user.channels,
                    channel = userChannels.get(cid),
                    podTokens;

                    if (channel) {
                        podTokens = channel.getPodTokens();

                        ok = userChannels.test(cid) && podTokens.isTrigger();
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
        }]
    },
    hub: {
        type: Object,
        renderable: true,
        writable: true,
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
                userChannels = this.getAccountInfo().user.channels,
                numEdges,
                transforms;
                // check channels + transforms make sense
                if (undefined != val.source) {

                    // http can have dynamic exports, so inject them
                    /*
                        if (this.type == 'http' && this.config.exports) {
                            var expLen = this.config.exports.length;
                            if (expLen > 0) {
                                for (var i = 0; i < expLen; i++) {
                                    localExports[this.config.exports[i]] = {
                                        type : 'string'
                                    }
                                }
                            }
                        }
*/

                    for (var cid in val) {
                        if (val.hasOwnProperty(cid)) {
                            // check channel exists
                            ok = (cid == 'source' || userChannels.test(cid));
                            if (ok) {
                                // check edges point to channels for this account
                                numEdges = val[cid].edges.length;
                                if (numEdges > 0) {
                                    for (var e = 0; e < numEdges; e++) {
                                        ok = userChannels.test(val[cid].edges[e]);
                                        if (!ok) {
                                            break;
                                        }
                                    }
                                }
                            }

                            if (!ok) {
                                break;
                            }
                        }
                    }
                }
                next(ok);
            },
            msg : 'Bad Channel in Hub'
        }
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
        }]
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
    owner_id : {
        type: String,
        index: true,
        renderable: false,
        writable: false
    },
    created : {
        type: String,
        renderable: true,
        writable: false
    },
    _imp_actual : {
        type : Number,
        renderable : true,
        writable : false,
        "default" : 0
    },
    _tz : { // user timezone
        type : String,
        renderable : false,
        writable : false
    }
};

Bip.compoundKeyContraints = {
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
                type : 'string',
                description : 'Sender Info',
                oneOf : [{
                    "$ref" : "#/definitions/client_attribute"
                }]
            },
            '_bip' : {
                type : 'string',
                description : 'Bip Info',
                oneOf : [{
                    "$ref" : "#/definitions/bip_attribute"
                }]
            }
        },
        definitions : {
            "client_attribute" : {
                "description" : "Connecting client attributes",
                "enum" : [ "host" , "repr" ]
            },
            "bip_attribute" : {
                "description" : "This Bip's attribute",
                "enum" : [ "name" , "type", "config", "_repr" ]
            }
        }
    },

    'smtp' : {
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
    },

    // http export helpers
    'http' : {
        properties : {
            'title' : {
                type : String,
                description: 'Message Title'
            },

            'body' : {
                type : String,
                description: 'Message Body'
            }
        },
        definitions : {
    }
    },

    'trigger' : {
        properties : {
        },
        definitions : {
    }
    }
}



/**
 * For any omitted attributes, use account defaults
 */
Bip.preSave = function(accountInfo) {
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

    if (this.domain_id === '') {
        this.domain_id = undefined;
    }

    app.helper.copyProperties(props, this, false);

    return;
};

function getAction(accountInfo, channelId) {
    return accountInfo.user.channels.get(channelId).action;
}

Bip.normalizeTransformDefaults = function(accountInfo, next) {
    var from, to, payload, fromMatch, transforms = {}, dirty = false;
    for (var key in this.hub) {
        if (this.hub.hasOwnProperty(key)) {
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

            if (this.hub[key].transforms && Object.keys(this.hub[key].transforms).length > 0) {
                for (var txChannelId in this.hub[key].transforms) {
                    if (this.hub[key].transforms.hasOwnProperty(txChannelId)) {
                        to = getAction(accountInfo, txChannelId);
                        if (from && to) {
                            // filter to include only transforms for these
                            // adjacent channels
                            for(var txKey in this.hub[key].transforms[txChannelId]) {
                                if (this.hub[key].transforms[txChannelId].hasOwnProperty(txKey)) {
                                    this.hub[key].transforms[txChannelId][txKey].replace(fromMatch, from);

                                    // strip any remaining uuid's.  Only supporting adjacent transform helpers
                                    // for now.
                                    this.hub[key].transforms[txChannelId][txKey].replace(app.helper.getRegActionUUID(), '');
                                }
                            }

                            // default transform payload
                            payload = {
                                from_channel : from,
                                to_channel : to,
                                transform : this.hub[key].transforms[txChannelId],
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

Bip.postSave = function(accountInfo, next, isNew) {    
    this.normalizeTransformDefaults(accountInfo, function(payload) {
        app.bastion.createJob(DEFS.JOB_BIP_SET_DEFAULTS, payload);
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
    }

    next(false, this.getEntityName(), this);
};

module.exports.Bip = Bip;