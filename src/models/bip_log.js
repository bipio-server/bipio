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