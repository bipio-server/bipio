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
 var BipModel = require('./prototype.js').BipModel;

 var Account = Object.create(BipModel);

 GLOBAL.DEFS.ACCOUNT_LEVEL = {
  USER : 'user',
  ADMIN : 'admin'
}

Account.id = '';
Account.name = '';
Account.username = '';
Account.email_account = '';
Account.account_level = GLOBAL.DEFS.ACCOUNT_LEVEL.USER;

Account.compoundKeyConstraints = {
  username : 1,
  email_account : 1
};

Account.entityName = 'account';
Account.entitySchema = {
  id: {
   type: String,
   renderable: true,
   writable: false
  },

  username: {
    type: String,
    renderable: true,
    writable: false
  },

  name: {
    type: String,
    renderable: true,
    writable: true
  },

  email_account: {
    type: String,
    renderable: true,
    writable: false
  },

  created : {
    type: Number,
    renderable: true,
    writable: false
  },

  last_session : {
    type: Number,
    renderable: true,
    writable: false
  },

  account_level : {
    type : String,
    renderable : true,
    writable : false,
    default : GLOBAL.DEFS.ACCOUNT_LEVEL.USER,
    validators : [
      function(val, next) {
        next(
          -1 !== app._.values(GLOBAL.DEFS.ACCOUNT_LEVEL).indexOf(val)
          ? 'Invalid Account Level' : false
        );
      }
    ]
  }
};
/*
// lazy loader
Account.collections = {};

Account._load = function(collection, next) {
  var self = this;

  if (!this.collections[collection]) {
    this.dao.findFilter(
      collection,
      {
        owner_id : this.account.id
      },
      function(err, result) {
        if (err) {
          next(err);
        } else {
          self.collections[collection] = result;
        }
      }
    );

  } else {
    next(false, this.collections[collection]);
  }
};

Account.getSetting = function(name, next) {
  this._load('account_option', function(err, settings) {
    if (settings && settings.length) {
      next(err, settings[0][name])

    } else {
      next(err);
    }
  });
};

Account.getSettings = function(next) {
  this._load('account_option', function(err, settings) {
    if (settings && settings.length) {
      next(err, settings[0])

    } else {
      next(err);
    }
  });
};

Account.getName : function() {
  return this.name;
};

Account.getUsername : function() {
  return this.username;
};

Account.getDomains = function(next) {
  this._load('domain', next);
};

Account.getChannels = function(next) {
  this._load('channel', next);
};

Account.getTimezone = function(next) {
  return this.getSetting('timezone', next);
};

//
Account.getDefaultDomain = function(next) {
  var self = this;
  if (this.defaultDomain) {
    next(false, this.defaultDomain);
  } else {
    this.getDomains(function(err, domains) {
      var defaultDomain;
      if (err) {
        next(err);
      } else {
        for (var i = 0; i < domains.length; i++) {
          if ('vanity' === domains[i].type) {
            self.defaultDomain = domains[i];
          }
        }
      }
    });
  }
};

//
Account.getDefaultDomainStr = function(next) {
  this.getDefaultDomain(
    function(err, domain) {
      if (err) {
        next(err);
      } else {
        next(false, GLOBAL.CFG.proto_public + domain.name
      }
    }
  );
}
*/

module.exports.Account = Account;
