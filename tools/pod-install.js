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
/**
 * Installs the singletons for a pod against accounts which do not currently
 * have it installed.
 */
process.HEADLESS = true;
var program = require('commander'),
    fs = require('fs'),
    path = require('path'),
    os = require('os'),
    helper = require('../src/lib/helper'),
    bootstrap = require(__dirname + '/../src/bootstrap');

program
    .version('0.0.1')
    .option('-a, --add [name]', 'Initialize a new Pod for this environment')
    .option('-r, --remove [name]', 'Drops a Pod from this environment (+destroys config)')
    .option('-c, --corpus', 'Update system transform corpus')
    .option('-u, --upgrade', 'Upgrade Host Cluster. Auto installs singletons **experimental, still requires a restart')
    // .option('-i, --interactive', 'Interactive Config, sets config values now')
    .parse(process.argv);

if (program.add && program.remove) {
    console.log('Can not --add and --remove in the same step');
    program.help();
} else if (!program.add && !program.remove) {
    program.help();
}

var mode, podName;

if (program.add) {
    mode = 'add';
    podName = program.add;
} else if (program.remove) {
    mode = 'remove';
    podName = program.remove;
}
try {
    pod = require('bip-pod-' + podName);
} catch (Err) {
    console.log(Err.toString());
    console.log('Trying literal module name...');
    pod = require(podName)
}

var appEnv = process.env.NODE_ENV;
if (appEnv === 'development' || !appEnv) {
    appEnv = 'default';
}

if (pod && pod._name) {
    var configFile = path.resolve(__dirname + '/../config/' + appEnv + '.json'),
      corpusFile = path.resolve(__dirname + '/node_modules/bip-pod-' + podName + '/corpus.json');

    console.log('Installing "' + podName + '" POD');

    // load local
    var currentConfig = JSON.parse(fs.readFileSync(configFile)),
    config = pod._config || {};

    if (currentConfig) {
        var imgDir = __dirname + '/../data/cdn/img/pods';
        if (!fs.existsSync(imgDir)) {
            helper.mkdir_p(imgDir);

            // just block the process.
            require('sleep').sleep(2);
                        console.log(' created ' + imgDir);
        }

        var actionDone = false;
        if (mode === 'add' && !currentConfig.pods[pod._name]) {
            currentConfig.pods[pod._name] = config;
            /*
            if (config.oauth && config.oauth.callbackURL) {
              currentConfig.pods[pod._name].oauth.callbackURL = currentConfig.proto_public
                + currentConfig.domain_public
                + config.oauth.callbackURL;
            }
            */
            actionDone = true;

        } else if (mode === 'remove' && currentConfig.pods[pod._name]) {
            delete currentConfig.pods[pod._name];
            actionDone = true;
        }

        if (actionDone) {
            fs.writeFileSync(configFile, JSON.stringify(currentConfig, null, 4));
            console.log('Wrote to ' + configFile);
        } else {
            console.log('Skipped write. Nothing to change');
            var podIcon = __dirname + '/../node_modules/bip-pod-' + podName + '/' + podName + '.png';
            if (fs.existsSync(podIcon)) {
                fs.createReadStream(podIcon).pipe(fs.createWriteStream(imgDir + '/' + podName + '.png'));
                console.log('Icon Synced');
            }
        }

        if (program.upgrade) {
            if (mode !== 'remove') {
                console.log('Upgrading Cluster on ' + os.hostname());
                var podContext = bootstrap.app.dao.pod(pod._name);

                module.exports.app = app;

                bootstrap.app.bastion.on('readyQueue', function(readyQueue) {
                    if (readyQueue == 'queue_jobs') {
                        app.logmessage('Queue is up [queue_jobs]');

                        // get all users
                        bootstrap.app.dao.findFilter('account', {}, function(err, accounts) {
                            if (err) {
                                console.log(err);
                                process.exit(0);
                            } else {
                                if (accounts.length > 0) {
                                    for (var j = 0; j < accounts.length; j++) {
                                        account = accounts[j];
                                        // install singletons
                                        podContext.autoInstall(account, function(err, result) {
                                            if (err) {
                                                app.logmessage(result, 'error');
                                            } else {
                                                console.log('installed ' + result + ' into ' + result.owner_id);
                                            }

                                            if (j >= accounts.length - 1) {
                                                process.exit(0);
                                            }
                                        });


                                    }
                                } else {
                                    app.logmessage('No Accounts!', 'error');
                                    process.exit(0);

                                }
                            }
                        });

                    }
                });
            }
        } else {
          console.log('DONE!');
          if (config.oauth) {
            console.log('*** Manual OAuth Setup Required - update the pods.' + pod._name + '.oauth section of ' + configFile + ' with your app credentials before restart');

          } else if (config.api_key) {
            console.log('*** Manual API Key Setup Required - update the pods.' + pod._name + '.api_key section of ' + configFile + ' with your app API key before restart');
          } else {
            console.log('Please restart the server at your convenience');
          }
          process.exit(0);
        }

    }
} else {
    console.log('Pod not found, no config or pod object has no name');
    process.exit(0);
}