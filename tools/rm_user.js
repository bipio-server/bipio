#!/usr/bin/env node
/**
 *
 * The Bipio API Server
 *
 * @author Michael Pearson <michael@bip.io>
 * Copyright (c) 2010-2014 Michael Pearson https://github.com/mjpearson
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
 * A Bipio Commercial OEM License may be obtained via hello@bip.io
 */
/**
 * Removes a user by UUID
 */

var async = require('async');

process.HEADLESS = true;
if (!process.argv[2]) {
  console.log('Usage - rm_user {account uuid}');
  process.exit(0);
}

var accountId = process.argv[2],
  bootstrap = require(__dirname + '/../src/bootstrap'),
  dao = bootstrap.app.dao,
  modelName = 'account_auth';

dao.on('ready', function(dao) {
	// retain this drop order!
	var models = [
		'bip',
		'bip_log',
		'bip_share',

		'channel',
		'channel_log',

		'domain',

		'account_auth',
		'account_option',
		'account'
	],
	filter = {
		owner_id : accountId
	}, modelName, callbacks = {};

	for (var i = 0; i < models.length; i++) {

		callbacks[models[i]] = (function(modelName, dao) {
			if ('channels' === modelName) {
				return function(next) {
					dao.findFilter(modelName, filter, function(err, results) {
						if (err) {
							next(err);
						} else {
							var proc = 0, errStr = '';
							for (var i = 0; i < results.length; i++) {
								dao.remove(modelName, results[i].id, function(err) {
									proc++;
									if (err) {
										errStr += err + ';';
									}

									if (proc >= (results.length - 1)) {
										next(errStr, true);
									}
								});
							}
						}
					});
				}
			} else {
				return function(next) {
					if ('account' === modelName) {
						dao.removeFilter(modelName, { "id" : filter.owner_id }, next);
					} else {
						dao.removeFilter(modelName, filter, next);
					}
				}
			}
		})(models[i], dao);
	}


	async.series(callbacks, function(err, results) {
		if (err) {
			console.error(err);
		}
		for (var k in results) {
			if (results.hasOwnProperty(k)) {
				if (results[k]) {
					console.log(results[k][0], results[k][1]);
				} else {
					console.log(k + ' : ', results[k]);
				}
			}
		}
		process.exit(0);
	});

});
