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
 * Sets a user's level by username or account id
 */

process.HEADLESS = true;

function showUsage() {
	console.log('Usage - token_get {account uuid|user_name|email address} (admin|user|..other)');
	process.exit(0);
}

if (!process.argv[2]) {
	showUsage();
}

var accountId = process.argv[2],
	level = process.argv[3],
  bootstrap = require(__dirname + '/../src/bootstrap'),
  dao = bootstrap.app.dao,
  modelName = 'account_auth',
  acctSearch = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/.test(accountId),
  emailSearch = -1 !== accountId.indexOf('@');

dao.on('ready', function(dao) {
	var levelOK = false;
	for (var k in GLOBAL.DEFS.ACCOUNT_LEVEL) {
		if (level === GLOBAL.DEFS.ACCOUNT_LEVEL[k]) {
			levelOK = true;
			break;
		}
	}

	if (!levelOK) {
		console.error('Unknown Account Level');
		showUsage();
	} else {

	  if (acctSearch) {
	    accountQuery(accountId);
	  } else {
	    var filter = {};
	    if (emailSearch) {
	      filter.email_account = accountId;
	    } else {
	      filter.username = accountId;
	    }

	    dao.find(
	      'account',
	      filter,
	      function(err, result) {
	        if (err || !result) {
	          if (!result) {
	            console.log('account id not found');
	          }
	          process.exit(0);
	        } else {
	        	dao.updateColumn('account', result.id, { account_level : level }, function() {
	        		if (err) {
	        			console.error(err);
	        		} else {
	        			console.log('Account Level ' + level + ' Set For ' + result.id);
	        		}
	        		process.exit(0);
	        	});
	        }
	      }
	    );
	  }
	}
});