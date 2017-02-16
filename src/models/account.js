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
    validate : [
      {
        validator : function(val, next) {
          next(
            -1 !== app._.values(GLOBAL.DEFS.ACCOUNT_LEVEL).indexOf(val)
          );
        },
        msg : 'Invalid Account Level'
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
