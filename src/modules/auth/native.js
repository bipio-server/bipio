var AccountInfo = require('./models/account_info.js');

const MSG_NOT_AUTHORIZED = 'Not Authorized';

/*
 * Account Authorization Module prototype
 *
 */
function AuthModule(options) {
  this.options = options;
}

AuthModule.prototype = {
  MSG_NOT_AUTHORIZED : MSG_NOT_AUTHORIZED,
  setDAO : function(dao) {
    this.dao = dao;
  }
};

AuthModule.prototype.getAccountStruct = function(authModel, next) {
  // session usable abstract model of the account
  var account = new AccountInfo({
      id : authModel.owner_id,
      name : authModel.name,
      username : authModel.username,
      account_level: authModel.account_level,
      plan_until : authModel.plan_until,
      settings: {
        api_token: null
      }
    }, this.dao);

  // always load domain records for the account
  (function(account) {
    account.getDomains(function() {
      next(false, account);
    });
  })(account);
}

AuthModule.prototype.accountFactory = function(props) {
  return new AccountInfo(props);
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

AuthModule.prototype.getAccountStructById = function(id, next) {
  var self = this;

  this.dao.find('account', { id : id }, function(err, result) {
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

  if (masquerade && 'admin' === account.account_level) {
    this.getAccountStructByUsername(masquerade, next);

  } else {
    accountAuth.username = account.username;
    accountAuth.name = account.name;

    // this should be injectable by the permissions module somehow
    accountAuth.account_level = account.account_level;
    accountAuth.plan_until = account.get('plan_until');

    this.getAccountStruct(accountAuth, function(err, accountInfo) {

      accountInfo.user.username = account.username;

      accountInfo.setActiveDomain(activeDomainId, function() {
        next(false, accountInfo);
      });

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
AuthModule.prototype.domainAuth = function(domainName, next) {
  var self = this;

  this.dao.find('domain', {
    'name' : domainName
  }, function(err, domain) {
    if (err) {
      next(err);
    } else {
      if (domain) {
        self._test(
          domain.owner_id,
          '',
          {
            asOwner : true,
            acctBind : true,
            domainId : domain.id
          },
          function(err, accountInfo) {
            accountInfo.activeDomain = domain;

            next(err, accountInfo);
          }
        );
      } else {
        next('Not Found');
      }
    }
  });
}

module.exports = AuthModule;
