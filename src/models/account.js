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
var BipModel = require('./prototype.js').BipModel;

var Account = Object.create(BipModel);

Account.id = '';
Account.name = '';
Account.email_account = '';
Account.is_admin = false;

// @todo what is uniqueKeys?>
Account.uniqueKeys = ['name', 'email_account'];

Account.compoundKeyContraints = {
    name : 1,
    email_account : 1
};

Account.entityName = 'account';
Account.entitySchema = {
    id: { type: String, renderable: true, writable: false },
    name: { type: String, renderable: true, writable: true },
    is_admin: { type: Boolean, renderable: false, writable: false },
    email_account: { type: String, renderable: true, writable: false }
};

module.exports.Account = Account;