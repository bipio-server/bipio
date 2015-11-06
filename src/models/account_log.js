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
        writable: false,
        set : function(code) {
            this.description = AccountLog.codes[code];
        }
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

module.exports.AccountLog = AccountLog;