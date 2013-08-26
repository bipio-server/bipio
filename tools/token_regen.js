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
 * Regenerates a token for an account id
 */

var accountId = process.argv[2],
    dao = require('../src/bootstrap'),
    crypto = require('crypto');

if (!process.argv[2]) {
    console.log('Usage - token_regen {account uuid}');
    process.exit(0);
}

crypto.randomBytes(16, function(ex, buf) {
    var token = buf.toString('hex');
    setTimeout(function() {
        var pw = app.helper.AESCrypt(token);
        dao.updateColumn('account_auth', { owner_id : accountId, type : 'token'}, { password : pw}, function(err, result) {
            if (err) {
                console.log(err);
                console.log(result);
            } else {
                console.log('new token : ' + token)
                console.log('done');
                process.exit(0);
            }
        });
    }, 2000);
});
