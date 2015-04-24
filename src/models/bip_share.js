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

    slug : {
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
    search : {
        type : String,
        renderable : false,
        writable : false
    },
    votes: {
        type: Number,
        renderable: true,
        writable: true,
        "default" : 0
    },
    created : {
        type: Number,
        renderable: true,
        writable: false
    },
    updated : {
        type: Number,
        renderable: true,
        writable: false
    }
};

BipShare.links = function( accountInfo ) {
    var links = [];

    links.push({
      name : 'oembed',
      title : 'oEmbed',
      description : 'Retrieves The oEmbed For This Share',
      contentType : DEFS.CONTENTTYPE_JSON,
      _href : this._dao.getBaseUrl() + '/rpc/oembed/?url=' + this.href()
    });

    return links;
}

//
BipShare.preSave = function(accountInfo, next) {
    // rebuild search terms
    var note = this.note || '',
        name = this.name || '',
        manifest = this.manifest ? this.manifest.join('" "') : '',
        searchStr = '',
        pod,
        tokens;

    searchStr += (note ? ('"' + note + '"') : '') + '"' + name + '" "' + manifest + '"';

    if (this.manifest) {
        for (var i = 0; i < this.manifest.length; i++) {
            tokens = this.manifest[i].split('.');
            pod = this._dao.pod(tokens[0]);
            if (pod) {
                searchStr += ' "' + pod.getAction(tokens[1]).title + '"';
            }
        }
    }

    this.search = searchStr;

    next(false, this);
};

module.exports.BipShare = BipShare;