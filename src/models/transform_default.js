/**
 *
 * The Bipio API Server
 *
 * Copyright (c) 2017 InterDigital, Inc. All Rights Reserved
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 *
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

TransformDefault.compoundKeyConstraints = {
  owner_id : 1,
  from_channel : 1,
  to_channel : 1
};
TransformDefault.entityName = 'transform_default';
TransformDefault.entitySchema = {
  id: {
    type: String,
    index: true,
    renderable: false,
    writable: false
  },
  owner_id : { // owner_id 'system' = system determined map
    type: String,
    index: true,
    renderable: false,
    writable: false
  },
  from_channel: { // channel action (pod.action)
    type: String,
    index: true,
    renderable: true,
    writable: false
  },
  to_channel: { // channel action (pod.action)
    type: String,
    index: true,
    renderable: true,
    writable: false
  },
  transform : { // serialized transform
    type: Object,
    renderable: true,
    writable: false
  },
  created : {
    type: Number,
    renderable: true,
    writable: false
  }
};

module.exports.TransformDefault = TransformDefault;
