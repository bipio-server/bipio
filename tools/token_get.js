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
 * Gets a token by account uuid
 */

process.HEADLESS = true;
if (!process.argv[2]) {
  console.log('Usage - token_get {account uuid|user_name}');
  process.exit(0);
}

var accountId = process.argv[2],
  bootstrap = require(__dirname + '/../src/bootstrap'),
  dao = bootstrap.app.dao,
  modelName = 'account_auth',
  acctSearch = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/.test(accountId),
  emailSearch = -1 !== accountId.indexOf('@');

function accountQuery(accountId, username) {
  dao.find(
    modelName,
    {
      owner_id : accountId,
      type : 'token'
    },
    function(err, result) {
      if (err || !result) {
        console.log(err);
        if (!result) {
          console.log('account id not found');
        }
        process.exit(0);
      } else {
        if (username) {
          console.log('Username : ' + username)
        }
        console.log('Token : ' + dao.modelFactory(modelName, result).getPassword());
        process.exit(0);
      }
    }
  );
}

dao.on('ready', function(dao) {
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
          accountQuery(result.id, result.username);
        }
      }
    );
  }
});
