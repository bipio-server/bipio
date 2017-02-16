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

/**
 *
 * Channel Activity + Error Log
 *
 */
var ChannelLogModel = require('./prototype.js').BipModel,
ChannelLog = Object.create(ChannelLogModel);

ChannelLog.codes = {
    'channel_create' : 'Created',
    'channel_error' : 'Error'
}

ChannelLog.entityName = 'channel_log';
ChannelLog.entitySchema = {
    id: {   // log
        type: String,
        renderable: true,
        writable: false
    },
    owner_id : {
        type: String,
        renderable: false,
        index: true,
        writable: false
    },
    channel_id : {
        type: String,
        renderable: false,
        index: true,
        writable: false
    },
    transaction_id : {
        type: String,
        renderable: true,
        writable: false
    },
    code : {
        type: String,
        renderable: true,
        writable: false,
        set : function(code) {
            if (ChannelLog.codes[code]) {
                this.message = ChannelLog.codes[code];
            }
            return code;
        }
    },
    bip_id : { // transaction source
        type: String,
        renderable: true,
        writable: false
    },
    message : {
        type: String,
        renderable: true,
        writable: false
    },
    created : {
        type: Number,
        renderable: true,
        writable: false
    }
};

module.exports.ChannelLog = ChannelLog;
