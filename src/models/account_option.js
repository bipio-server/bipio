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
 var BipModel = require('./prototype.js').BipModel,
    AccountOption = Object.create(BipModel),
	request = require('request');

AccountOption.entityName = 'account_option';
AccountOption.uniqueKeys = ['owner_id'],

AccountOption.entitySchema = {
    id: {
        type: String,
        renderable: true,
        writable: false
    },

    owner_id : {
        type: String,
        index: true,
        renderable: false,
        writable: false
    },

    bip_hub: {
        type: Object,
        renderable: true,
        writable: true,
        validate : [
        {
            // not a very good validator, but will do for know.
            // @todo ensure edge > vertex > edge doesn't exist. linked list,
            // tortoise+hare is fine.'
            validator : function(hub, next) {
                var numEdges, edges = {}, edge, loop = false;

                if (hub) {
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
                }

                next(!loop);
            },
            msg : "Routing Loop Detected"
        },
        {
            validator : function(val, next) {
                var ok = false,
                userChannels = this.getAccountInfo().user.channels,
                numEdges,
                transforms;

                // check channels + transforms make sense
                if (val && undefined != val.source) {

                    // http can have dynamic exports, so inject them
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

                    for (var channelSource in val) {
                        // check channel exists
                        ok = (channelSource == 'source' || userChannels.test(channelSource));

                        if (ok) {
                            // check edges point to channels for this account
                            numEdges = val[channelSource].edges;
                            if (numEdges > 0) {
                                for (var e = 0; e < numEdges; e++) {
                                    ok = userChannels.test(val[channelSource].edges[e]);
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
                } else {
                    ok = true;
                }

                next(ok);
            },
            msg : 'Bad Channel in Hub'
        }
        ]
    },

    bip_domain_id: {
        type: String,
        renderable: true,
        writable: true,
        validate : [
/*            {
                validator : BipModel.validators.notempty,
                msg : "Cannot be empty"
            },
            {
                validator : function(val, next) {
                    this.getAccountInfo().testDomain(
                        val,
                        function(err, ok) {
                            next(!err && ok);
                        }
                    );
                },
                msg : 'Domain Not Found'
            }
*/
        ]
    },

    bip_end_life: {
        type: Object,
        renderable: true,
        writable: true,
        "default" : {
            imp : 0,
            time : 0
        },
        set : endLifeParse,
        validate : [
/*            {
                validator : BipModel.validators.notempty,
                msg : "Cannot be empty"
            },
            {
                validator : function(val, next) {
                    next(
                        val && (parseFloat(val.imp) == parseInt(val.imp)) && !isNaN(val.imp) &&
                        ((parseFloat(val.time) == parseInt(val.time)) && !isNaN(val.time)) ||
                        0 !== new Date(Date.parse(val.time)).getTime()
                        );
                },
                msg : 'Bad Expiry Structure'
            }
*/
        ]
    },

    bip_type: {
        type: String,
        renderable: true,
        writable: true,
        "default" : "http",
        validate : [
/*
            {
                validator : BipModel.validators.notempty,
                msg : "Cannot be empty"
            },
            {
                validator : function(val, next) {
                    next( /^(smtp|http|trigger)$/i.test(val) );
                },
                msg : 'Expected "smtp", "http" or "trigger"'
            }
*/
        ]
    },

    bip_expire_behaviour: {
        type: String,
        renderable: true,
        writable: true,
        "default" : "pause",
        validate : [
/*
            {
                validator : BipModel.validators.notempty,
                msg : "Cannot be empty"
            },
            {
                validator : function(val, next) {
                    next( /^(pause|delete)$/i.test(val) );
                },
                msg : 'Expected pause" or "delete"'
            }
*/
        ]
    },

    timezone: {
        type: String,
        renderable: true,
        writable: true,
        validate : [
/*
            {
                validator : BipModel.validators.notempty,
                msg : "Cannot be empty"
            }
*/
        ]
    },

    avatar: {
        type: String,
        renderable: true,
        writable: true
    },

    default_feed_id : {
        type: String,
        renderable: true,
        writable: false
    },

    remote_settings : {
        type : Object,
        renderable : true,
        writable : true
    }
};

AccountOption.preSave = function(accountInfo, next) {
    var self = this;
	if (this.avatar && 0 === this.avatar.toLowerCase().indexOf('http') && 0 !== this.avatar.indexOf(CFG.cdn_public ) ) {
		app.modules.cdn.saveAvatar(this.owner_id, request.get(this.avatar), '/cdn/img/av/', function(err, avatarPath) {
			if (err) {
				next(err);
			} else {
				self.avatar = CFG.cdn_public + avatarPath.replace('/cdn', '');
				next(false, self);
			}
		});
	} else {
		next(false, this);
	}
}


function endLifeParse(end_life) {
    var imp = parseInt(end_life.imp);
    if (isNaN(imp)) {
        end_life.imp = 0;
    } else {
        end_life.imp = imp;
    }

    if (end_life.time === '') {
        end_life.time = 0;
    }
    return end_life;
}

module.exports.AccountOption = AccountOption;
