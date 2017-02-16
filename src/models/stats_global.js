/**
 *
 * The Bipio API Server
 *
 * Copyright (c) 2017 InterDigital, Inc. All Rights Reserved
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 *
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