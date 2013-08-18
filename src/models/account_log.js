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
        type: String,
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