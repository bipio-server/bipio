var StatsAccountNetworkNetworkModel = require('./prototype.js').BipModel,
    StatsAccountNetwork = Object.create(StatsAccountNetworkNetworkModel);

StatsAccountNetwork.entityName = 'stats_account_network';
StatsAccountNetwork.entitySchema = {
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
    data: {
        type: Object,
        renderable: false,
        writable: false
    },
    updated_at: {
        type: Number,
        renderable: false,
        writable: false
    }
};

StatsAccountNetwork.compoundKeyContraints = {
    owner_id : 1,
    day : 1

};

module.exports.StatsAccountNetwork = StatsAccountNetwork;