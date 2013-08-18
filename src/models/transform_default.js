/**
 * 
 * TranslateDefault is responsible for surfacing transforms between two channels
 * based on the last saved transform for the channels by the client, or otherwise
 * from the system.
 * 
 */
var BipModel = require('./prototype.js').BipModel,
    TransformDefault = Object.create(BipModel);

TransformDefault.compoundKeyContraints = {
    owner_id : 1,
    from_channel : 1,
    to_channel : 1
}; 
TransformDefault.entityName = 'transform_default';
TransformDefault.entitySchema = {
    id: {
        type: String, 
        renderable: false, 
        writable: false
    },
    owner_id : { // owner_id 'system' = system determined map
        type: String, 
        renderable: false, 
        writable: false
    },
    from_channel: { // channel action (pod.action)
        type: String, 
        renderable: true, 
        writable: false
    },
    to_channel: { // channel action (pod.action)
        type: String, 
        renderable: true, 
        writable: false
    },
    transform : { // serialized transform
        type: Object, 
        renderable: true, 
        writable: false
    }
};

module.exports.TransformDefault = TransformDefault;
