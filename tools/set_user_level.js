#!/usr/bin/env node
/**
 *
 * The Bipio API Server
 *
 * Copyright (c) 2017 InterDigital, Inc. All Rights Reserved
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 *
 *
 * A Bipio Commercial OEM License may be obtained via hello@bip.io
 */
/**
 * Sets a user's level by username or account id
 */

process.HEADLESS = true;

var accountId = process.argv[2],
	level = process.argv[3],
  bootstrap = require(__dirname + '/../src/bootstrap'),
  dao = bootstrap.app.dao,
  modelName = 'account_auth',
  acctSearch = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/.test(accountId),
  emailSearch = -1 !== accountId.indexOf('@');

function showUsage() {
	var levels = 'admin|user';

	if (app.modules.permissions) {
		levels = Object.keys(GLOBAL.CFG.modules.permissions.config.plans).join('|')
	}

	console.log('Usage - token_get {account uuid|user_name|email address} (' + levels + ')');
	process.exit(0);
}

if (!process.argv[2]) {
	showUsage();
}

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