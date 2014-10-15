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
 * Gets a token by account uuid
 */

process.HEADLESS = true;
if (!process.argv[2]) {
  console.log('Usage - token_get {account uuid}');
  process.exit(0);
}

var accountId = process.argv[2],
  bootstrap = require(__dirname + '/../src/bootstrap'),
  dao = bootstrap.app.dao,
  modelName = 'account_auth';

dao.on('ready', function(dao) {
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
        console.log('Token : ' + dao.modelFactory(modelName, result).getPassword());
        process.exit(0);
      }
    }
  );
});
