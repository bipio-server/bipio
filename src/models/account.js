/**
 *
 * The Bipio API Server
 *
 * @author Michael Pearson <github@m.bip.io>
 * Copyright (c) 2010-2013 Michael Pearson https://github.com/mjpearson
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

 */
 var BipModel = require('./prototype.js').BipModel;

 var Account = Object.create(BipModel);

 GLOBAL.DEFS.ACCOUNT_LEVEL = {
  USER : 'user',
  ADMIN : 'admin'
}

Account.id = '';
Account.name = '';
Account.username = '';
Account.email_account = '';
Account.is_admin = false; // @todo deprecate
Account.account_level = GLOBAL.DEFS.ACCOUNT_LEVEL.USER;

// @todo what is uniqueKeys?>
Account.uniqueKeys = ['username', 'email_account'];

Account.compoundKeyConstraints = {
  username : 1,
  email_account : 1
};

Account.entityName = 'account';
Account.entitySchema = {
  id: {
   type: String,
   renderable: true,
   writable: false,
   index: true
  },
  username: {
    type: String,
    renderable: true,
    writable: false,
    index: true
  },
  name: {
    type: String,
    renderable: true,
    writable: true
  },
  is_admin: { // @todo deprecate for account_level
    type: Boolean,
    renderable: false,
    writable: false
  },
  email_account: {
    type: String,
    renderable: true,
    writable: false
  },
  created : {
    type: Number,
    renderable: true,
    writable: false
  },
  last_session : {
    type: Number,
    renderable: true,
    writable: false
  },
  account_level : {
    type : String,
    renderable : true,
    writable : false,
    default : GLOBAL.DEFS.ACCOUNT_LEVEL.USER,
    validate : [
      {
        validator : function(val, next) {
          next(
            -1 !== app._.values().indexOf(val)
          );
        },
        msg : 'Invalid Account Level'
      }
    ]
  }
};

module.exports.Account = Account;
