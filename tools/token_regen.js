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
 * Regenerates a token for an account id
 */

process.HEADLESS = true;
if (!process.argv[2]) {
  console.log('Usage - token_regen {account uuid}');
  process.exit(0);
}

var accountId = process.argv[2],
  crypto = require('crypto'),
  bootstrap = require(__dirname + '/../src/bootstrap'),
  dao = bootstrap.app.dao,
  modelName = 'account_auth';

dao.on('ready', function(dao) {
  dao.regenToken(accountId, function(err, token) {
    if (err) {
      console.log(err);
      console.log(result);
    } else {
      console.log('new token : ' + token)
      console.log('done');
      process.exit(0);
    }
  });
});