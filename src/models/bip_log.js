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
 * Bip Activity + Error Log
 * 
 */
var BipLogModel = require('./prototype.js').BipModel,
BipLog = Object.create(BipLogModel);

BipLog.codes = {
    'bip_create' : 'Created',
    'bip_delete' : 'Deleted',
    'bip_recieve' : 'Message Received',
    'bip_paused' : 'Expired (Paused)',
    'bip_paused_manual' : 'Manually Paused'
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
        writable: false
    },
    bip_id : {
        type: String,
        renderable: false,
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
        writable: false
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
        type: String,
        renderable: true,
        writable: false
    }    
};

/*
BipLog.compoundKeyContraints = {
    owner_id : 1,
    bip_id : 1,
    transaction_id : 1
};
*/

module.exports.BipLog = BipLog;