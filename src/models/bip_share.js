/**
 * 
 * Shared Bip hubs
 * 
 */
var BipShare = Object.create(require('./prototype.js').BipModel);

BipShare.entityName = 'bip_share';
BipShare.entitySchema = {
    id: {   // day
        type: String,
        renderable: true,
        writable: false
    },
    bip_id : {
        type: String,
        renderable: false,
        writable: false
    },
    
    type : {
        type: String,
        renderable: true,
        writable: true
    },
    
    name : {
        type: String,
        renderable: true,
        writable: true
    },
    
    note : {
        type: String,
        renderable: true,
        writable: true
    },
    
    icon : {
        type: String,
        renderable: true,
        writable: true
    },
    
    config : {
        type: Object,
        renderable: true,
        writable: true
    },
    
    owner_id : {
        type: String, 
        renderable: true, 
        writable: false
    },
    owner_name : {
        type: String, 
        renderable: true, 
        writable: false
    },
    manifest : {
        type: Array,
        renderable: true,
        writable: false
    },
    manifest_hash : {
        type: String,
        renderable: true,
        writable: false
    },
    hub : {
        type: Object,
        renderable: true,
        writable: false
    },
    votes: {
        type: Number,
        renderable: true,
        writable: true,
        "default" : 0
    },
    created : {
        type: String,
        renderable: true,
        writable: false
    },
    updated : {
        type: String,
        renderable: true,
        writable: false
    }
};

module.exports.BipShare = BipShare;