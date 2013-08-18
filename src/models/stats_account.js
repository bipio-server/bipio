var StatsAccountModel = require('./prototype.js').BipModel,
    StatsAccount = Object.create(StatsAccountModel);

StatsAccount.entityName = 'stats_account';
StatsAccount.entitySchema = {
    id: {
        type: String,
        renderable: false,
        writable: false
    },
    day: {   // day
        type: String,
        renderable: false,
        writable: false
    },
    owner_id : {
        type: String,
        renderable: false,
        writable: false
    },
    bips_total: {
        type: Number,
        renderable: true,
        writable: true,
        "default" : 0
    },
    share_total: {
        type: Number,
        renderable: true,
        writable: true,
        "default" : 0
    },
    channels_total: {
        type: Number,
        renderable: true,
        writable: true,
        "default" : 0
    },
    delivered_bip_inbound: {
        type: Number,
        renderable: true,
        writable: true,
        "default" : 0
    },
    delivered_channel_outbound : {
        type: Number,
        renderable: true,
        writable: true,
        "default" : 0
    },
    traffic_inbound_mb: {
        type: Number,
        renderable: true,
        writable: true,
        "default" : 0
    },
    traffic_outbound_mb: {
        type: Number,
        renderable: true,
        writable: true,
        "default" : 0
    }
};

StatsAccount.compoundKeyContraints = {
    owner_id : 1,
    day : 1,
    id : 1
};

module.exports.StatsAccount = StatsAccount;