var step = require('../../lib/step'); // @todo deprecate, use Q

const MSG_NOT_AUTHORIZED = 'Not Authorized';

/*
 * Account Authorization Module prototype
 *
 */
function AuthModule(options) {
  this.options = options;
}

AuthModule.MSG_NOT_AUTHORIZED = MSG_NOT_AUTHORIZED;

AuthModule.prototype = {
  setDAO : function(dao) {
    this.dao = dao;
  }
};

function AccountInfo(account) {
  this.user = account;
}

AccountInfo.prototype = {
  getSetting : function(setting) {
    return this.user.settings.getValue(setting);
  },
  getId : function() {
    return this.user.id;
  },
  // @todo refactor - naming makes no sense
  getActiveDomain : function() {
    return this.user.activeDomainId;
  },
  getActiveDomainObj : function() {
    return this.user.domains.get(this.user.activeDomainId);
  },
  getDefaultDomain: function() {
    return this.user.domains.get(this.user.defaultDomainId);
  },
  getDefaultDomainStr : function(incProto) {
    var defaultDomain = this.getDefaultDomain();
    var proto = (incProto) ? CFG.proto_public : '';
    return proto + defaultDomain.name;
  },
  getName : function() {
    return this.user.name;
  }
};

AuthModule.prototype.getAccountStruct = function(authModel, next) {
  var self = this,
    dao = this.dao,
    resultModel = { // session usable abstract model of the account
      id : authModel.owner_id,
      name : authModel.name,
      username : authModel.username,
      is_admin: authModel.is_admin,
      settings: {
        api_token: null
      }
    };

  // finally, try to pull out the users auth token and account options
  step(
    function loadAcctInfo() {
      dao.find(
        'account_option',
        {
          'owner_id' : authModel.owner_id
        },
        this.parallel());

      // get domains (for bip/channel representations
      dao.findFilter(
        'domain',
        {
          'owner_id' : authModel.owner_id
        },
        this.parallel());

      // get channels (for id lookups)
      dao.findFilter(
        'channel',
        {
          'owner_id' : authModel.owner_id
        },
        this.parallel());
    },
    function collateResults(err, options, domains, channels) {
      if (err || !options || !domains || !channels) {
        err = true;
        resultModel = null;
      } else {

        var domainModels = {
          domains : {},
          set: function(model) {
            this.domains[model.id] = model;
          },
          get: function( id ) {
            return this.domains[id];
          },
          test: function(id) {
            return (undefined != this.domains[id]);
          }
        };

        for (idx in domains ) {
          domainModels.set(dao.modelFactory('domain', domains[idx]));
          // set default domain.  system allocated 'vanity' domains
          // will respond to RPC calls etc.
          if (domains[idx].type == 'vanity') {
            resultModel.defaultDomainId = domains[idx].id;
          }
        }

        if (undefined === resultModel.defaultDomainId) {
          resultModel.defaultDomainId = "";
        }

        // there may be quite a few channels, but this
        // still seems a little cheaper
        var channelModels = {
          channels : {},
          set: function(model) {
            this.channels[model.id] = model;
          },
          get: function( id ) {
            return this.channels[id];
          },
          test: function(id) {
            return (undefined != this.channels[id]);
          },
          isAvailable : function(id) {
            return (undefined === this.channels[id]._available || (undefined != this.channels[id] && true === this.channels[id].isAvailable() ) );
          }
        };

        for (idx in channels ) {
          channelModels.set(dao.modelFactory('channel', channels[idx]));
        }

        resultModel.domains = domainModels;
        resultModel.channels = channelModels;
        resultModel.settings = options;
      }

      var accountInfo = new AccountInfo(resultModel);

      next(err, accountInfo);
    }
    );
}

/**
 *
 * Creates an AccountStruct from a username
 */
AuthModule.prototype.getAccountStructByUsername = function(username, next) {
  var self = this;

  this.dao.find('account', { username : username }, function(err, result) {
    if (err || !result) {
      next(err ? err : "Not Found");
    } else {
      result.owner_id = result.id;
      self.getAccountStruct(result, next);
    }
  });
}

AuthModule.prototype.acctBind = function(account, accountAuth, options, next) {
  var masquerade = options.masquerade,
    activeDomainId = options.domainId,
    authModel = this.dao.modelFactory('account_auth', accountAuth);

  if (masquerade && account.is_admin) {
    self.getAccountStructByUsername(masquerade, next);

  } else {
    authModel.username = account.username;
    authModel.name = account.name;
    authModel.is_admin = account.is_admin;

    this.getAccountStruct(accountAuth, function(err, accountInfo) {
      if (undefined == activeDomainId) {
        accountInfo.user.activeDomainId = accountInfo.defaultDomainId;
      } else {
        accountInfo.user.activeDomainId = activeDomainId;
      }
      next(false, accountInfo);
    });
  }
}

// --------- PUBLIC INTERFACES

/**
 *
 * Tests authorization
 *
 * @param string username
 * @param string password
 * @param string type ()
 */
AuthModule.prototype._test = function(username, password, options, next) {
  var dao = this.dao,
    self = this,
    filter = {};

  if (options.asOwner) {
    filter.id = username;
  } else {
    filter.username = username;
  }

  dao.find(
    'account',
    filter,
    function(err, acctResult) {
      if (!err && (null != acctResult)) {
        var filter = {
          'owner_id' : acctResult.id,
          'type' : 'token'
        }

        dao.find('account_auth', filter, function(isErr, authResult) {

          var resultModel = null;
          if (!isErr && null != authResult) {
            var authModel = dao.modelFactory('account_auth', authResult);
            if (options.acctBind || authModel.cmpPassword(password)) {
              self.acctBind(acctResult, authResult, options, next);

            } else {
              next(MSG_NOT_AUTHORIZED);
            }
          } else {
            next(MSG_NOT_AUTHORIZED);
          }
        });
      } else {
        next(MSG_NOT_AUTHORIZED);
      }
    }
  );
}

AuthModule.prototype.test = function(username, password, options, next) {
  this.__proto__._test.apply(this, arguments);
}


/**
 * Creates AccountInfo context for a domain
 *
 * @param string domain domain name
 * @param function next callback(error, accountResult)
 */
AuthModule.prototype.domainAuth = function(domain, next) {
  var self = this;

  this.dao.find('domain', {
    'name' : domain
  }, function(err, result) {
    if (err) {
      next(err);
    } else {
      if (result) {
        self._test(
          result.owner_id,
          '',
          {
            asOwner : true,
            acctBind : true,
            domainId : result.id
          },
          function(err, acctResult) {
            acctResult.domain_id = result.id;
            next(err, acctResult);
          }
        );
      } else {
        next('Not Found');
      }
    }
  });
}

module.exports = AuthModule;