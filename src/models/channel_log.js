/**
 *
 * The Bipio API Server
 *
 * @author Michael Pearson <michael@cloudspark.com.au>
 * Copyright (c) 2010-2013 CloudSpark pty ltd http://www.cloudspark.com.au
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
 * A Bipio Commercial OEM License may be obtained via enquiries@cloudspark.com.au
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