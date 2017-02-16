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
 */
var StatsAccountModel = require('./prototype.js').BipModel,
    StatsAccount = Object.create(StatsAccountModel);

StatsAccount.entityName = 'stats_account';
StatsAccount.entitySchema = {
    id: {
        type: String,
        renderable: false,
        writable: false
    },
    day: {   // day
        type: String,
        renderable: false,
        writable: false
    },
    owner_id : {
        type: String,
        renderable: false,
        writable: false
    },
    bips_total: {
        type: Number,
        renderable: true,
        writable: true,
        "default" : 0
    },
    share_total: {
        type: Number,
        renderable: true,
        writable: true,
        "default" : 0
    },
    channels_total: {
        type: Number,
        renderable: true,
        writable: true,
        "default" : 0
    },
    delivered_bip_inbound: {
        type: Number,
        renderable: true,
        writable: true,
        "default" : 0
    },
    delivered_channel_outbound : {
        type: Number,
        renderable: true,
        writable: true,
        "default" : 0
    },
    traffic_inbound_mb: {
        type: Number,
        renderable: true,
        writable: true,
        "default" : 0
    },
    traffic_outbound_mb: {
        type: Number,
        renderable: true,
        writable: true,
        "default" : 0
    }
};

StatsAccount.compoundKeyConstraints = {
    owner_id : 1,
    day : 1,
    id : 1
};

module.exports.StatsAccount = StatsAccount;
