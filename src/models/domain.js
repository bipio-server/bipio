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
var BipModel = require('./prototype.js').BipModel,
Domain = Object.create(BipModel),
dns = require('dns'),
step = require('../lib/step');

Domain.uniqueKeys = ['name'];
Domain.entityName = 'domain';
Domain.entitySchema = {
  id: {
    type: String,
    index : true,
    renderable: true,
    writable: false
  },
  owner_id : {
    type: String,
    index : true,
    renderable: false,
    writable: false
  },
  type: {
    type: String,
    renderable: false,
    writable: false,
    "default" : "custom"
  },
  _available: {
    type: Boolean,
    renderable: true,
    writable: false,
    "default" : false
  },
  name: {
    type: String,
    renderable: true,
    index : true,
    writable: true,
    validate : [
      {
        validator : function(val, next) {
          if (process.env.NODE_ENV !== 'production') {
            next(true);
            return;
          }

          var ok = /[\w\d]+\.[a-zA-Z]{2,}$/.test(val);
          if (ok) {

            var isLocal = Domain.isLocal(val);
            if (this.type == 'custom') {
              ok = !isLocal;
            } else {
              // lock vanity domains as unwritable
              ok = (!isLocal && this.type != 'vanity');
            }
          }
          next(ok);
        },
        msg : "Can not overwrite a protected Domain"
      },
    ]
  },
  renderer : {
    type : Object,
    renderable : true,
    writable : true,
    validate : [
      {
        validator : function(val, next) {
          self._dao.validateRPC(
            val,
            this.getAccountInfo(),
            function(err, ok) {
              next(!err && ok);
            }
          );
        },
        msg : 'Renderer RPC Not Found'
      }
    ]
  }
};

// is a local domain
Domain.isLocal = function(domain) {
  var local = GLOBAL.CFG.domain_public.split(':').shift().replace(/\./g, '\\.'),
  reg = new RegExp(local + '$');
  return reg.test(domain);
}

/**
 *
 *
 */
Domain.setAvailable = function(available, next) {
  var self = this;
  self._available = available;

  if (self.id) {
    this._dao.updateColumn(
      'domain',
      self.id,
      {
        '_available' : available
      },
      function(err, result) {
        if (err) {
          console.log(err);
        }
        next(err, 'domain', self, 200);
      }
      );
  } else {
    next(false, 'domain', self, 200);
  }
};

Domain.verify = function(accountInfo, next) {
  var self = this, dao = this._dao;
  if (/.?localhost$/.test(self.name)) {
    self.setAvailable(true, next);
    return;
  }

  step(
    function domainVerify() {
      dns.resolveMx(
        self.name,
        this.parallel()
        );

      dns.resolveCname(
        self.name,
        this.parallel()
        );
    },
    function collateResults(err, MXAddr, CNAMEAddr) {
      self._available = false;
      if (!MXAddr && !CNAMEAddr && null != err) {
        if (err.errno == 'ENOTFOUND' || err.errno == 'ENODATA') {
          next(err, 'domain', self, 202);
        } else {
          next(err, 'domain', self, 500);
        }

      } else {

        accountInfo.getDefaultDomain(function(err, domain) {

          var ok = false;

          if (MXAddr && MXAddr.length > 0) {
            for (var i = 0; i < MXAddr.length; i++) {
              if (MXAddr[i].exchange && MXAddr[i].exchange == domain.name) {
                ok = true;
              }
            }
          }

          if (CNAMEAddr && CNAMEAddr.length > 0) {
            if (app.helper.inArray(CNAMEAddr, domain.name)) {
              ok = true;
            }
          }

          if (ok) {
            self.setAvailable(true, next);
          } else {
            // accepted - domain exists but is not bound to local application
            next(err, 'domain', self, 202);
          }

        });
      }

    }
  );
}

// domains behave a little differently, they can have postponed availability
// after creation as we verify the domain is properly configured
Domain.postSave = function(accountInfo, next) {
  var self = this, dao = this._dao;
  if (!this.isLocal(this.name)) {
    this.verify(accountInfo, next);
  } else {
    next(false, 'domain', self, 200);
  }
}

Domain.repr = function(accountInfo, next) {
  return this.name;
}

Domain.entitySetters = {
  'name' : function(name) {
    return name.toLowerCase();

  }
};

Domain.compoundKeyConstraints = {
  name : 1
};

module.exports.Domain = Domain;
