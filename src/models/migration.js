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
var BipModel = require('./prototype.js').BipModel;
var Migration = Object.create(BipModel);

Migration.entityName = 'migration';
Migration.entitySchema = {
    id: {
        type: String,
        renderable: false,
        writable: false
    },
    zone : {
        type : String,
        renderable : false,
        writable : false,
        "default" : "system"
    },
    version : {
        type: String,
        renderable: false,
        writable: false
    },
    versionInt : {
        type: Number,
        renderable: false,
        writable: false
    }
};

module.exports.Migration = Migration;
