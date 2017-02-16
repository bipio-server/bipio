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
 * Bip Activity + Error Log
 *
 */
var BipLogModel = require('./prototype.js').BipModel,
BipLog = Object.create(BipLogModel);

BipLog.codes = {
    'bip_create' : 'Created',
    'bip_deleted_auto' : 'Expired (Deleted)',
    'bip_deleted_manual' : 'Deleted',
    'bip_recieve' : 'Message Received',
    'bip_paused_auto' : 'Expired (Paused)',
    'bip_paused_manual' : 'Manually Paused',
    'bip_share' : 'Config Shared',
    'bip_unshare' : 'Config Un-Shared',
    'bip_invoke' : 'Invoked',
    'bip_channnel_error' : 'Channel Error'
}

BipLog.entityName = 'bip_log';
BipLog.entitySchema = {
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
    bip_id : {
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
            if (BipLog.codes[code]) {
                this.message = BipLog.codes[code];
            }
            return code;
        }
    },
    source : { // action source
        type: String,
        renderable: true,
        writable: false
    },
    message : {
        type: String,
        renderable: true,
        writable: false
    },
    data : {
        type: Object,
        renderable: false,
        writable: false
    },
    created : {
        type: Number,
        renderable: true,
        writable: false
    }
};

module.exports.BipLog = BipLog;
