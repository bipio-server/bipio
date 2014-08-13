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
 * Provides general system statistics, by day
 * 
 */
var StatsGlobalModel = require('./prototype.js').BipModel,
    StatsGlobal = Object.create(StatsGlobalModel);

StatsGlobal.entityName = 'stats_account';
StatsGlobal.entitySchema = {
    id: {   // day
        type: String,
        renderable: true,
        writable: false
    },
    users_new : {
        type: String,
        renderable: true,
        writable: true
    },
    users_signin : {
        type: String,
        renderable: true,
        writable: true
    },
    
    // by bip type
    new_bip_breakdown : {
        type : Object,
        renderable: true,
        writable: true
    },
    new_bips_total: {
        type: Integer,
        renderable: true,
        writable: true
    },
    
    // by channel action
    new_channel_breakdown : {
        type : Object,
        renderable: true,
        writable: true
    },
    new_channels_total: {
        type: Integer,
        renderable: true,
        writable: true
    },
    
    channels_unverified: {
        type: Integer,
        renderable: true,
        writable: true
    },
    
    
    new_domains_total: {
        type: Integer,
        renderable: true,
        writable: true
    },
    
    delivered_bip_inbound: {
        type: Integer,
        renderable: true,
        writable: true
    },
    delivered_channel_outbound : {
        type: Array,
        renderable: true,
        writable: true
    },

    traffic_inbound: {
        type: Integer,
        renderable: true,
        writable: true
    },
    traffic_outbound: {
        type: Integer,
        renderable: true,
        writable: true
    },

    demographic_users_male: {
        type: Integer,
        renderable: true,
        writable: true
    },
    
    demographic_users_female: {
        type: Integer,
        renderable: true,
        writable: true
    },
    
    demographic_users_unknown: {
        type: Integer,
        renderable: true,
        writable: true
    }
};

module.exports.StatsGlobal = StatsGlobal;