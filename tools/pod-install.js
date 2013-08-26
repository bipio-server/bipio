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
var program = require('commander'),
fs = require('fs'),
os = require('os'),
helper = require('../src/lib/helper');

program
    .version('0.0.1')
    .option('-a, --add [name]', 'Initialize a new Pod for this environment')
    .option('-r, --remove [name]', 'Drops a Pod from this environment (+destroys config)')
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
    var configFile = __dirname + '/../config/' + appEnv + '.json';
    console.log('Installing ' + podName + ' into ' + configFile);

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
                var dao = require(__dirname + '/../src/bootstrap'),
                    Bastion = require(process.cwd() + '/src/managers/bastion');
                    app = dao.app,
                    podContext = dao.pod(pod._name);


                var bastion = new Bastion(
                    dao,
                    false,
                    function(readyQueue) {
                        if (readyQueue == 'queue_jobs') {
                            app.logmessage('Queue is up [queue_jobs]');
                            app.bastion = bastion;


                            // get all users
                            dao.findFilter('account', {}, function(err, accounts) {
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
                                                    console.log('installed ' + result + ' into ' + account.id);
                                                }

                                                if (j === accounts.length) {
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
        }

    }
} else {
    console.log('Pod not found, no config or pod object has no name');
    process.exit(0);
}