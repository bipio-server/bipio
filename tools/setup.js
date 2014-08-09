#!/usr/bin/env node
/**
 *
 * The Bipio API Server
 *
 * @author Michael Pearson <michael@cloudspark.com.au>
 * Copyright (c) 2010-2013 CloudSpark pty ltd http://www.cloudspark.com.au
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
 * A Bipio Commercial OEM License may be obtained via enquiries@cloudspark.com.au
 */
var inquirer = require("inquirer"),
fs = require('fs'),
path = require('path'),
crypto = require('crypto'),
sparseFile = __dirname + '/../config/config.json-dist',
defs = require('../config/defs'),
mongoose = require('mongoose');

// load sparse config
var sparseConfig = JSON.parse(fs.readFileSync(sparseFile)),
appEnv = process.env.NODE_ENV;

GLOBAL.DEFS = defs;
GLOBAL.app = {
  logmessage : function(err, loglevel) {
    if ('error' === loglevel) {
        console.trace(message);
    } else {
      console.log(err);
    }
  }
}
GLOBAL.CFG_CDN = sparseConfig.cdn;
GLOBAL.CFG = sparseConfig;
GLOBAL.SERVER_ROOT = path.resolve(__dirname);
GLOBAL.DATA_DIR = GLOBAL.SERVER_ROOT + '/../' + sparseConfig.datadir,
GLOBAL.CDN_DIR = GLOBAL.SERVER_ROOT + '/../' + sparseConfig.cdn;

sparseConfig.timezone = process.env.SYSTEM_TZ;

// some systems report EDT while not having EDT zoneinfo
if ('EDT' === sparseConfig.timezone) {
  sparseConfig.timezone = 'EST';
}

crypto.randomBytes(48, function(ex, buf) {
  sparseConfig.server.sessionSecret = buf.toString('hex');
});

if (appEnv === 'development' || !appEnv) {
  appEnv = 'default';
}

process.on('uncaughtException', function(err) {
  console.error(err);
});

var targetConfig = path.resolve(__dirname, '../config/' + appEnv + '.json');

function writeConfig(next) {
  fs.writeFile(targetConfig , JSON.stringify(sparseConfig, null, 4), function(err) {
    if (err) {
      console.log(err);
      process.exit(0);
    } else {
      console.log("\nConfig written to : " + targetConfig + "\n");
      console.log("IMPORTANT : Ensure to remember your API password\n");
      console.log("RabbitMQ may need additional configuration.  Check the 'rabbit' section in the config file.\n");
      console.log("To start bipio server : node ./src/server.js - the REST API will be listening at http://" + sparseConfig.domain_public + "\n");
      console.log('See docs at https://github.com/bipio-server/bipio for more information.');
      next();
    }
  });
}

var credentials = {
  username : '',
  password : '',
  email : ''
};

function domainSelect() {
  var valDefault = sparseConfig.domain_public;
  var domainSelect = {
    type : 'input',
    name : 'defaultDomain',
    message : 'Hostname (FQDN). default "' + valDefault + '" :'
  }

  inquirer.prompt(domainSelect, function(answer) {
    if ('' === answer.defaultDomain) {
      answer.defaultDomain = valDefault;
    }
    sparseConfig.domain_public = answer.defaultDomain;
    portSelect();
  });
}

function portSelect() {
  var valDefault = sparseConfig.server.port;

  // if user has selected a hostname port, then use that
  var hostTokens = sparseConfig.domain_public.split(':'),
  port = Number(hostTokens.pop());

  if (!isNaN(port)) {
    valDefault = port;
  }

  var portSelect = {
    type : 'input',
    name : 'defaultPort',
    message : 'API TCP Port. default "' + valDefault + '" :'
  }

  inquirer.prompt(portSelect, function(answer) {
    if ('' === answer.defaultPort) {
      answer.defaultPort = valDefault;
    }
    sparseConfig.server.port = answer.defaultPort;
    aesSetup();
  });
}

function aesSetup() {
  var aesWarn = {
    type : 'confirm',
    name : 'aesContinue',
    message : "WARNING: Generating new AES key at version 1.  Any currently encrypted data will become invalidated. 'no' will give you the opportunity to patch any current keys; Continue?"
  }

  // throw warning that this step will invalidate any existing encrypted data
  inquirer.prompt(aesWarn, function(answer) {
    if (!answer.aesContinue) {
      console.log('Aborted');
      process.exit(0);
    } else {
      crypto.randomBytes(16, function(ex, buf) {
        var token = buf.toString('hex');
        sparseConfig.k['1'] = token;
        userSetup();
      });
    }
  });
}

/**
 * Get default username
 */
function userSetup() {
  var defaultUsername =  ('testing' === appEnv) ? 'testing' : 'admin';
  var userInstall = {
    type : 'input',
    name : 'username',
    message : 'API Username (HTTP Basic Auth Username, default "' + defaultUsername + '") :'
  }

  inquirer.prompt(userInstall, function(answer) {
    if ('' === answer.username) {
      answer.username = defaultUsername;
    }

    credentials.username = answer.username.replace("\s_+", '');

    crypto.randomBytes(16, function(ex, buf) {
      var token = buf.toString('hex');

      var userInstallPW = {
        type : 'input',
        name : 'password',
        message : 'API Password (HTTP Basic Auth Password, default "' + token + '") :'
      }

      inquirer.prompt(userInstallPW, function(answer) {
        if ('' === answer.password) {
          answer.password = token;
        }
        credentials.password = answer.password;

        // install user.
        var userInstallEmail = {
          type : 'input',
          name : 'email',
          message : 'Administrator email (default "root@localhost") :'
        }

        inquirer.prompt(userInstallEmail, function(answer) {
          if ('' === answer.email) {
            answer.email = 'root@localhost';
          }
          credentials.email = answer.email;

          if ('testing' === appEnv) {
            sparseConfig.testing_user = credentials;
          }

          // install user.
          auxServers();
        });
      });
    });
  });
}

function _createAccount(dao, next) {
  var account = dao.modelFactory(
    'account',
    {
      name : credentials.username,
      username : credentials.username,
      is_admin : true,
      email_account : credentials.email
    });

  dao.create(account, function(err, modelName, result) {
    if (err) {
      console.log(err);
      process.exit(0);
    } else {
      _createAuth(
        dao,
        {
          user : {
            id : result.id
          }
        },
        next);
    }

  });
}

function _createAuth(dao, accountInfo, next) {
  // create auth
  var accountAuth = dao.modelFactory(
    'account_auth',
    {
      username : credentials.username,
      password : credentials.password,
      type : 'token'
    }, accountInfo);

  dao.create(accountAuth, function(err, modelName, result) {
    if (err) {
      console.log(err);
      process.exit(0);
    } else {
      _createDomain(dao, accountInfo, next);
    }
  });
}

function _createDomain(dao, accountInfo, next) {
  // create auth
  var domain = dao.modelFactory(
    'domain',
    {
      name : (credentials.username + '.' + sparseConfig.domain_public).replace(/:.*$/, ''),
      type : 'custom',
      _available : true
    }, accountInfo);

  dao.create(domain, function(err, modelName, result) {    
    // skip name lookup errors
    if (err && err.code !== 'ENOTFOUND') {
      console.log(err);
      process.exit(0);
    } else {
      // upgrade to vanity
      dao.updateColumn('domain', { id : result.id}, { type : 'vanity'});

      // pseudo accountInfo structure
      accountInfo.user.domains = {
        test : function() {
          return true
        }
      };
      _createOptions(dao, result.id, accountInfo, next);
    }
  });
}

function _createOptions(dao, domainId, accountInfo, next) {
  // create auth
  var accountOptions = dao.modelFactory(
    'account_option',
    {
      bip_type : 'http',
      bip_domain_id : domainId,
      bip_end_life : {
        imp : 0,
        time : 0
      },
      bip_expire_behaviour: 'pause',
      timezone : 'America/New_York' // @todo get from system, configurable
    }, accountInfo);

  dao.create(accountOptions, function(err, modelName, result) {
    if (err) {
      console.log(err);
      process.exit(0);
    } else {
      next();
    }
  });
}

/**
 * Things we want to configure
 *
 * mongo connect string 'mongodb://{username}:{password}@{host}:{port}/{dbname};
 * rabbit - host, port, username, password
 *
 * default domain name :optional port
 */
function auxServers() {
  var valDefault = sparseConfig.dbMongo.connect + (('testing' === appEnv) ? '_testing' : '');
  var serverSetupMongo = {
    type : 'input',
    name : 'mongoConnectString',
    message : 'Mongo connect string (see http://docs.mongodb.org/manual/reference/connection-string). Default "' + valDefault + '" :'
  };

  inquirer.prompt(serverSetupMongo, function(answer) {
    if ('' === answer.mongoConnectString) {
      answer.mongoConnectString = valDefault;
    }
    sparseConfig.dbMongo.connect = (/^mongodb:\/\//.test(answer.mongoConnectString) ? '' : 'mongodb://') + answer.mongoConnectString;

    // try connecting
    console.log('trying ' + sparseConfig.dbMongo.connect + ' Ctrl-C to quit');
    GLOBAL.CFG = sparseConfig;

    var Dao = require(__dirname + '/../src/managers/dao');    
    var dao = new Dao(sparseConfig,  function(message) {      
      writeConfig(function() {
        var bootstrap = require(__dirname + '/../src/bootstrap');
        _createAccount(bootstrap.app.dao, function() {
          process.exit(0);
        });
      });
    });

    dao.on('error', function(err) {
      console.log('MongoDB unconnectable via : ' + sparseConfig.dbMongo.connect);
      console.log(err);
      auxServers();
    });
  });
}

if (!fs.existsSync(targetConfig)) {
  domainSelect();
} else {
  // @todo add any migrations 
  console.log('Nothing To Do')
}
