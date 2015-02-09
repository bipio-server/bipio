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