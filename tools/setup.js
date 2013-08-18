#!/usr/bin/env node
/**
 *
 *
 *
 *
 *
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

var done = function() {
    console.log("\n\nConfig written to : " + targetConfig);
    console.log("To start bipio server : node ./src/server.js\n");
    console.log('See docs at https://github.com/bipio-server/bipio for more information.');
}

var writeConfig = function(next) {
    fs.writeFile(targetConfig , JSON.stringify(sparseConfig, null, 4), function(err) {
        if (err) {
            console.log(err);
            process.exit(0);
        } else if (next) {
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

var auxServers = function(next) {
    var serverSetupMongo = {
        type : 'input',
        name : 'mongoConnectString',
        message : 'Mongo connect string (see http://docs.mongodb.org/manual/reference/connection-string) :'
    };

    inquirer.prompt(serverSetupMongo, function(answer) {
        sparseConfig.dbMongo.connect = (/^mongodb:\/\//.test(answer.mongoConnectString) ? '' : 'mongodb://') + answer.mongoConnectString;
        try {
            // try connecting
            console.log('trying ' + sparseConfig.dbMongo.connect + ' Ctrl-C to quit');
            var mongoClient = mongoose.connect(sparseConfig.dbMongo.connect);
            console.log('OK');
            next();
        } catch (err) {
            console.log('MongoDB not unconnectable via :' + sparseConfig.dbMongo.connect);
            console.log(err);
            
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
    
    var credentials = {
      username : '',
      password : ''
    };
    
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

                console.log(credentials);
                process.exit(0);
            });            
        });       
    });
}


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
                writeConfig(done);
            });
        }    
    });
}

auxServers(userSetup);
//userSetup();
//aesSetup();




