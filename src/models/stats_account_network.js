/**
 *
 * The Bipio API Server
 *
 * @author Michael Pearson <github@m.bip.io>
 * Copyright (c) 2010-2013 Michael Pearson https://github.com/mjpearson
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
        type: Number,
        renderable: true,
        writable: false
    },
    owner_id : {
        type: String,
        renderable: false,
        writable: false
    },
    data: {
        type: Object,
        renderable: true,
        writable: false
    },
    updated_at: {
        type: Number,
        renderable: false,
        writable: false
    }
};

StatsAccountNetwork.compoundKeyConstraints = {
    owner_id : 1,
    day : 1
};

module.exports.StatsAccountNetwork = StatsAccountNetwork;
