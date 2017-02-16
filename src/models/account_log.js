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
 * Rolling account activity
 *
 */
var AccountLogModel = require('./prototype.js').BipModel,
AccountLog = Object.create(AccountLogModel);

AccountLog.codes = {

    'channel_verify_email' : 'Email Verification Sent',
    'channel_verify_email_yes' : 'Email Verified',
    'channel_verify_email_no' : 'Email Opted Out',

    'channel_create' : 'Channel Created',
    'channel_deliver' : 'Message Delivered to Channel',

    'bip_create' : 'Bip Created',
    'bip_recieve' : 'Message received by Bip',
    'bip_expired' : 'Bip Expired (Paused)'
}

AccountLog.entityName = 'account_log';
AccountLog.entitySchema = {
    id: {   // log
        type: String,
        renderable: true,
        writable: false
    },
    owner_id : {
        type: String,
        renderable: false,
        writable: false
    },
    code : {
        type: String,
        renderable: true,
        writable: false
    },
    description : {
        type: String,
        renderable: true,
        writable: false
    },
    content : {
        type: String,
        renderable: true,
        writable: false
    },
    'public' : {
        type: String,
        renderable: false,
        writable: false
    },
    created : {
        type: Number,
        renderable: true,
        writable: false
    }
};

function setDescription(code) {
    this.description = AccountLog.codes[code];
}

Bip.entitySetters = {
    'code' : setDescription
};

module.exports.AccountLog = AccountLog;
