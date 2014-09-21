/**
 *
 * The Bipio API Server
 *
 * @author Michael Pearson <michael@wot.io@m.bip.io>
 * Copyright (c) 2010-2014 WoT.IO http://wot.io
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