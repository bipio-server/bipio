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
