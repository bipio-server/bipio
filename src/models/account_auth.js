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
// // Never expose this as a RESTful model.
// never ever ever ever.
// never ever ever ever ever.
//
// never.
var bcrypt      = require('bcrypt'),
    crypto = require('crypto'),
    BipModel = require('./prototype.js').BipModel;

var AccountAuth = Object.create(BipModel);

function strCryptSync(str) {
    return bcrypt.hashSync(str, bcrypt.genSaltSync(10));
}

function strCryptCmpSync(taintedClear, localHash) {
    return bcrypt.compareSync(taintedClear, localHash);
}

function AESCrypt(value) {
    var key, keyVersion,
        iv = crypto.randomBytes(32).toString('hex').substr(0, 16);
    // get latest key
    for (keyVersion in CFG.k) {
        key = CFG.k[keyVersion];
    }

    var cipher = crypto.createCipheriv('aes-256-cbc', key, iv),
        crypted = cipher.update(value, 'ascii', 'base64') + cipher.final('base64');

    cryptEncoded = new Buffer(keyVersion + iv + crypted).toString('base64');
    /* @todo encrypted objects not equating correctly
    if (value !== AESDecrypt(cryptEncoded, true)) {        
        throw new Error('Cipher Failure');
    }
    */

    return cryptEncoded;
}

function AESDecrypt(cryptedStr, autoPadding) {
    var crypted = new Buffer(cryptedStr, 'base64').toString('utf-8');
    var keyVersion = crypted.substr(0, 1),
        iv = crypted.substr(1, 16),
        key = CFG.k[keyVersion],
        cypher = crypted.substr(17);

    var decipher = crypto.createDecipheriv('aes-256-cbc', key, iv);
    
    if (!autoPadding) {
        autoPadding = false;
    }
    decipher.setAutoPadding(autoPadding);

    var decrypted = decipher.update(cypher, 'base64', 'ascii');

    return decrypted + decipher.final('ascii');
}

function pwHash(pwValue) {
    var crypted;
    // tokens use AES
    if (this.type == 'token' || this.type == 'oauth') {
        /*
        var cipher = crypto.createCipher('aes-256-cbc', CFG.cSalt);
        crypted = cipher.update(pwValue, 'utf8', 'hex');
        crypted += cipher.final('hex');
        */
        crypted = AESCrypt(pwValue);
    // or seeded crypt
    } else {
        crypted = strCryptSync(pwValue);
    }
    return crypted;
}

function cryptSave(value) {
    var crypted = value;
    
    // passwords get 
    if (this.type == 'login_primary' || this.type == 'login_sub') {
        app.logmessage('Trying to write login primary to account_auth [' + this.id + ']', 'error');
        throw new Error('Bad Type');
    } else {
        crypted = AESCrypt(value);
        
    }
    
    return crypted;   
}

function cryptSaveObj(value) {
    return cryptSave(JSON.stringify(value));
}

AccountAuth.id = '';
AccountAuth.username = '';
AccountAuth.owner_id = '';
// enum 'login_primary', 'login_sub', 'token', 'token_invite', 'oauth', 'api_token'
AccountAuth.type = '';
AccountAuth.password = '';

AccountAuth.oauth_provider = ''; // pod/provider name, where type = 'oauth'
AccountAuth.oauth_refresh = ''; // AES refresh token, where type = 'oauth'
AccountAuth.oauth_profile = ''; // AES serialized profile, where type = 'oauth'

AccountAuth.entityName = 'account_auth';
AccountAuth.entitySchema = {
    id: {
        type: String,
        renderable: true,
        writable: false
    },
    type: {
        type: String,
        renderable: true,
        writable: false
    },    
    password: {
        type: String,
        renderable: true,
        writable: false,
        set : cryptSave
    },
    username: {
        type: String,
        renderable: true,
        writable: false
    },
    owner_id : {
        type: String,
        renderable: true,
        writable: false
    },
    oauth_provider: {
        type: String,
        renderable: true,
        writable: false
    },
    oauth_refresh: {
        type: String,
        renderable: true,
        writable: false,
        set : cryptSave
    },
    oauth_profile: {
        type: Object,
        renderable: true,
        writable: false,
        set : cryptSaveObj
    }
};

// @todo crypt this!!!
/*
AccountAuth.entitySetters = {
    password : cryptSave
}
*/
/*    
    oauth_refresh : AESCrypt,
    oauth_profile : AESCrypt,
    oauth_profile : function(profile) {
        return JSON.stringify(profile);
    }*/


AccountAuth.hash = function(value) {
    return pwHash(value);
}

AccountAuth.cmpPassword = function(passwordTainted) {
    var password = this.getPassword();

    // compare hash
    /* disabled
    if (this.type == 'login_primary') {
        return bcrypt.compareSync(passwordTainted, password);
    */
    // AES
    if (this.type == 'token') {
        return passwordTainted == password;
    }
    return false;
};

// gets the password, if it's async then try to decrypt
AccountAuth.getPassword = function() {
    // AES
    if (this.type == 'token') {
       return AESDecrypt(this.password).substr(0,32);
    } else {
       // return this.password;
       return AESDecrypt(this.password, true);
    }
};

AccountAuth.getOAuthRefresh = function() {
    if (this.oauth_refresh) {
        return AESDecrypt(this.oauth_refresh, true);
    } else {
        return null;
    }
}

AccountAuth.getOauthProfile = function() {
    return JSON.parse(AESDecrypt(this.oauth_profile, true));
}

AccountAuth.preSave = function(sysInfo) {
    // never allow non oauth saves
    /*
    console.log(this);
    if (this.type != 'oauth') {
        console.log('crit: AccountAuth [' + this.id + '] Attempted Save');
        console.log(sysInfo);
        throw DEFS.ERR_CONSTRAINT;
    }
    */
}


module.exports.AccountAuth = AccountAuth;