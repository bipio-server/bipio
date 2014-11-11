
var proto = require('./prototype');

function HTTPBasic(options) {
  this.options = options;
}

HTTPBasic.prototype = proto.prototype;

/*
 *  Remote HTTP Basic Auth
 */
HTTPBasic.prototype.test = function(username, password, options, next) {
  var self = this,
    dao = this.dao,
    filter = {},
    options = this.options;

  if ('admin' === username || options.asOwner) {
    this.__proto__._test.apply(this, arguments);

  } else if (!username || !password) {
    next(self.MSG_NOT_AUTHORIZED, null);

  } else {
    request.get(
      {
        "url" : options.url,
        "auth" : {
          "user" : username,
          "pass" : password,
          "sendImmediately" : true
        }
      },
      function(err, res, body) {
        if (err) {
          next(err);
        } else if (200 !== res.statusCode) {
          next('Not Authorized');
        } else {
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
                      if (err) {
                        next(err);
                      } else {
                        try {
                          accountInfo._remoteBody = JSON.parse(body);
                        } catch (e) {
                          accountInfo._remoteBody = body;
                        }
                        next(false, accountInfo);
                      }
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
                  emailAddress = app.helper.jsonPath(body, options.auto_sync.mail_field);
                }

                if (emailAddress) {

                  dao.createUser(username, emailAddress, null, function(err, authResult) {

                    authResult.username = username;
                    authResult.name = username
                    authResult.is_admin = false;

                    self.acctBind(authResult, authResult, options, function(err, accountInfo) {
                      if (err) {
                        next(err);

                      } else {
                        try {
                          accountInfo._remoteBody = JSON.parse(body);
                        } catch (e) {
                          accountInfo._remoteBody = body;
                        }
                        next(false, accountInfo);
                      }
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
      }
    );
  }
}

module.exports = HTTPBasic;