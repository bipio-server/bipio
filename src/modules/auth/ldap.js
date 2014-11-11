
var proto = require('./prototype'),
  ldap = require('ldapjs');

function LDAP(options) {
  this.options = options;

  this._ldapClient = ldap.createClient(options.server);
}

LDAP.prototype = proto.prototype;

/*
 *  Remote HTTP Basic Auth
 */
LDAP.prototype.test = function(username, password, options, next) {
  var self = this,
    dao = this.dao,
    filter = {},
    options = this.options;

  if ('admin' === username || options.asOwner) {
    this.__proto__._test.apply(this, arguments);

  } else if (!username || !password) {
    next(self.MSG_NOT_AUTHORIZED, null);

  } else {

    var client = this._ldapClient,
      base = options.base,
      search = app._.clone(options.search),
      bind = true;

    if (search.filter) {
      search.filter = search.filter.replace(/{{username}}/, username);
    }

    client.search(base, search, function(err, res) {
      if (err) {
        next(err);
      } else {

        var foundMatch = false,
          notFoundMsg = 'Not Found';

        res.on('end', function() {
          if (!foundMatch) {
            next(notFoundMsg, null);
          }
        });

        res.on('searchEntry', function(entry) {
          foundMatch = true;

          client.compare(entry.dn, 'userPassword', password, function(err, pass ) {

            if (err) {
              next(err);

            } else if (!pass) {
              next('Not Authorized')

            } else {

              // auth continue
              dao.find(
                'account',
                {
                  username : username
                },
                function(err, acctResult) {
                  if (!err && (null != acctResult)) {

                    var filter = {
                      'owner_id' : acctResult.id,
                      'type' : 'token'
                    }

                    dao.find('account_auth', filter, function(isErr, authResult) {
                      var resultModel = null;
                      if (!isErr && null != authResult) {

                        self.acctBind(acctResult, authResult, options, function(err, accountInfo) {
                          next(false, accountInfo);
                        });

                      } else {
                        next(self.MSG_NOT_AUTHORIZED, resultModel);
                      }
                    });

                  // if user auths off and option set, auto create
                  // local account
                  } else if (!acctResult && options.auto_sync && options.auto_sync.mail_field) {
                    var emailAddress;

                    // if no email address found, create a local dummy
                    if ('none' === options.auto_sync.mail_field) {
                      emailAddress = 'noreply@' + username + '.' + CFG.domain;
                    } else {
                      for (var i = 0; i < entry.attributes.length; i++) {
                        if (options.auto_sync.mail_field === entry.attributes[i].type) {
                          emailAddress = entry.attributes[i].vals.pop();
                          break;
                        }
                      }
                    }

                    if (emailAddress) {

                      dao.createUser(username, emailAddress, null, function(err, authResult) {
                        authResult.username = username;
                        authResult.name = username
                        authResult.is_admin = false;

                        self.acctBind(authResult, authResult, options, function(err, accountInfo) {
                          next(false, accountInfo);
                        });

                      });

                    } else {
                      next(self.MSG_NOT_AUTHORIZED, null);
                    }
                  } else {
                    app.logmessage('No Email field found to sync for ' + username + ', skipping auth', 'error');
                    next(self.MSG_NOT_AUTHORIZED, null);
                  }
                }
              );
            }
          });
        });
      }
    });
  }
}

module.exports = LDAP;