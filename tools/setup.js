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
    crypto = require('crypto'),
    sparseFile = __dirname + '/../config/config.json-dist',
    mongoose = require('mongoose');

// load sparse config
var sparseConfig = JSON.parse(fs.readFileSync(sparseFile)),
    appEnv = process.env.NODE_ENV,
    targetConfig = __dirname + '/../config/' + appEnv + '.json';

if (appEnv === 'development' || !appEnv) {
    appEnv = 'default';
}

function writeConfig() {
    fs.writeFile(targetConfig , JSON.stringify(sparseConfig, null, 4), function(err) {
        if (err) {
            console.log(err);
            process.exit(0);        
        } else {
            console.log("\n\nConfig written to : " + targetConfig);
            console.log("To start bipio server : node ./src/server.js\n");
            console.log('See docs at https://github.com/bipio-server/bipio for more information.');
        }
    });
}

var credentials = {
    username : '',
    password : ''
};

v

var aesSetup = function() {
    var aesWarn = {
        type : 'confirm',
        name : 'aesContinue',
        message : "WARNING: Generating new AES key at version 1.  Any currently encrypted data will become invalidated. 'no' will give you the opportunity to patch any current keys; Continue?"
    }

    // throw warning that this step will invalidate any existing encrypted data
    inquirer.prompt(aesWarn, function(answer) {
        if (!answer.aesContinue) {
            writeConfig();
            console.log('Aborted');
            process.exit(0);
        } else {
            crypto.randomBytes(16, function(ex, buf) {
                var token = buf.toString('hex');
                sparseConfig.k['1'] = token;
                userSetup();
                //writeConfig(done);
            });
        }
    });
}

/**
 * Get default username
 */
var userSetup = function() {
    var userInstall = {
        type : 'input',
        name : 'username',
        message : 'API Username (HTTP Basic Auth Username, default "admin") :'
    }

    inquirer.prompt(userInstall, function(answer) {
        if ('' === answer.username) {
            answer.username = 'admin';
        }

        credentials.username = answer.username.replace("\s_+", '');

        crypto.randomBytes(24, function(ex, buf) {
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
                auxServers();
            });
        });
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

var auxServers = function() {
    var serverSetupMongo = {
        type : 'input',
        name : 'mongoConnectString',
        message : 'Mongo connect string (see http://docs.mongodb.org/manual/reference/connection-string) :'
    };

    inquirer.prompt(serverSetupMongo, function(answer) {
        sparseConfig.dbMongo.connect = (/^mongodb:\/\//.test(answer.mongoConnectString) ? '' : 'mongodb://') + answer.mongoConnectString;

        // try connecting
        console.log('trying ' + sparseConfig.dbMongo.connect + ' Ctrl-C to quit');
        GLOBAL.CFG = sparseConfig;
        var mongoClient = mongoose.connect(sparseConfig.dbMongo.connect);
        mongoose.connection.on('error', function(err) {
            console.log('MongoDB unconnectable via :' + sparseConfig.dbMongo.connect);
            console.log(err);
            auxServers(next);
        });

        mongoose.connection.on('open', function() {
            var DaoMongo = require(__dirname + '/../src/managers/dao-mongo').DaoMongo;
            var dao = new DaoMongo({}, mongoClient, console.log, null);
            var account = dao.modelFactory('account', { name : credentials.username, admin : true });
            dao.create(account, function(err, result) {
                if (err) {
                    console.log(err);
                    process.exit(0);
                } else {
                    var accountAuth = dao.modelFactory(
                        'account_auth',
                        {
                            username : credentials.username,
                            password : credentials.password,
                            type : 'token',
                            owner_id : result.id
                        }
                    );
                    dao.create(accountAuth, function(err, result) {
                        if (err) {
                            console.log(err);
                            process.exit(0);
                        } else {
                            writeConfig();
                        }
                    });                    
                    
                    /*
                    var accountOptions = dao.modelFactory(
                        'account_option',
                        {
                            owner_id : result.id
                        }
                    );
                    */
                    
                }

            });

        });
    });
}

aesSetup();



