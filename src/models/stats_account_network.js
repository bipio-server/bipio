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
var StatsAccountNetworkNetworkModel = require('./prototype.js').BipModel,
    StatsAccountNetwork = Object.create(StatsAccountNetworkNetworkModel);

StatsAccountNetwork.entityName = 'stats_account_network';
StatsAccountNetwork.entitySchema = {
    id: {
        type: String,
        renderable: false,
        writable: false
    },
    day: {   // day
        type: Number,
        renderable: true,
        writable: false
    },
    owner_id : {
        type: String,
        renderable: false,
        writable: false
    },
    data: {
        type: Object,
        renderable: true,
        writable: false
    },
    updated_at: {
        type: Number,
        renderable: false,
        writable: false
    }
};

StatsAccountNetwork.compoundKeyConstraints = {
    owner_id : 1,
    day : 1
};

module.exports.StatsAccountNetwork = StatsAccountNetwork;
