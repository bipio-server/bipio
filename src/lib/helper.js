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
var    bcrypt      = require('bcrypt'),
crypto = require('crypto'),
baseConverter = require('base-converter'),
tldtools    = require('tldtools'),
url = require('url'),
fs = require('fs'),
path = require('path'),
http    = require('http'),
https    = require('https'),
mkdirp = require('mkdirp'),
validator = require('validator'),
djs = require('datejs');

var helper = {

  isObject: function(src) {
    return (this.getType(src) == '[object Object]');
  },

  isArray: function(src) {
    return (this.getType(src) == '[object Array]');
  },

  isString : function(src) {
    return (this.getType(src) == '[object String]');
  },

  isFunction : function(src) {
    return (this.getType(src) == '[object Function]');
  },

  getType: function(src) {
    return Object.prototype.toString.call( src );
  },

  sanitize : function(str) {
    return validator.sanitize(str);
  },

  /**
     * sanitized a string.  Pretty nasty, the templating scheme is viewed as
     * being xss.  Scrub tokens individually if it looks like a template string.
     * nasty hackity hack
     */
  _realScrub : function(str) {
    var retStr = helper.sanitize(str).xss();
    retStr = helper.sanitize(retStr).trim();
    retStr = helper.sanitize(retStr).escape();
    //retStr = helper.sanitize(retStr).entityEncode();
    return retStr;
  },

  _scrub: function(str) {
    var regex = this.getRegActionUUID(),
    retStr;

    if (regex.test(str)) {
      var tokens = str.split(' ');
      for (var i = 0; i < tokens.length; i++) {
        if (regex.test(tokens[i])) {
          tokens[i] = this._realScrub(tokens[i]);
        }
      }
      retStr = tokens.join(' ');
    } else {
      retStr = this._realScrub(str);
    }

    return retStr;
  },

  /**
     * Cleans an object thoroughly.  Script scrubbed, html encoded.
     */
  pasteurize: function(src) {
    var attrLen, newKey;
    if (this.isArray(src)) {
      var attrLen = src.length;
      for (var i = 0; i < attrLen; i++) {
        src[i] = this.pasteurize(src[i]);
      }
    } else if (this.isString(src)) {
      src = this._scrub(src);
    } else if (this.isObject(src)) {
      var newSrc = {};
      for (key in src) {
        newKey = this._scrub(key);
        newSrc[newKey] = this.pasteurize(src[key]);
      }
      src = newSrc;
    }
    return src;
  },

  naturalize : function(src) {
    var attrLen, newKey;
    if (this.isArray(src)) {
      var attrLen = src.length;
      for (var i = 0; i < attrLen; i++) {
        src[i] = this.naturalize(src[i]);
      }
    } else if (this.isString(src)) {
      src = validator.sanitize(src).entityDecode();
    } else if (this.isObject(src)) {
      var newSrc = {};
      for (key in src) {
        newKey = validator.sanitize(key).entityDecode();
        newSrc[newKey] = this.naturalize(src[key]);
      }
      src = newSrc;
    }
    return src;
  },

  /**
     *
     * Flattens an object down to a key representation.
     * eg:
     *    { a : { b : { c : { d : 'something } } } }
     *
     *  into a.b.c.d = 'something'
     *
     */
  flattenObject : function(obj, delimiter, includePrototype, container, key) {
    container = container || {};
    key = key || "";
    delmiter = delimiter || '.';

    for (var k in obj) {
      if (includePrototype || obj.hasOwnProperty(k)) {
        var prop = obj[k];
        if (prop && this.isObject(prop)) {
          this.flattenObject(prop, delimiter, includePrototype, container, key + k + delimiter);
        }
        else {
          container[key + k] = prop;
        }
      }
    }

    return container;
  },

  strHash : function(str) {
    return crypto.createHash('md5').update(str.toLowerCase()).digest("hex");
  },

  randStr : function(bits) {
    var chars, rand, i, ret;

    chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789_-';
    ret = '';

    // in v8, Math.random() yields 32 pseudo-random bits (in spidermonkey it gives 53)
    while (bits > 0) {
      // 32-bit integer
      rand = Math.floor(Math.random() * 0x100000000);
      // base 64 means 6 bits per character, so we use the top 30 bits from rand to give 30/6=5 characters.
      for (i = 26; i > 0 && bits > 0; i -= 6, bits -= 6) {
        ret += chars[0x3F & rand >>> i];
      }
    }

    return ret;
  },

  randCharStr : function(length) {
    var chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789_-',
    ret = '';

    for( var i = 0; i < length; i++ ) {
      ret += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return ret;
  },

  validator : function() {
    return validator.check;
  },

  exists : function(path, cb) {
    return (fs.exists || path.exists)(path, cb);
  },

  existsSync : function(path) {
    return (fs.existsSync || path.existsSync)(path);
  },

  copyProperty : function(src, dst, overrideDst, propName) {
    var srcActual;

    // propName = propNames[i];
    dstIsEmpty = false;

    // skip undefined properties
    if (this.isArray(dst[propName]) && (dst[propName].length == 0) ) {
      dstIsEmpty = true;
    } else if (dst[propName] == undefined) {
      dstIsEmpty = true;
    }

    if (helper.isObject(src)) {
      srcActual = src[ propName ];
    } else {
      srcActual = src;
    }

    // if source is empty or the destination is empty and we dont' want to
    // override its value then continue
    // if ((undefined == srcActual) || (!overrideDst && !dstIsEmpty) || /^_/.test(srcActual)) {
    if ((undefined == srcActual) || (!overrideDst && !dstIsEmpty) ) {
      return dst;
    }

    if( helper.isObject( srcActual ) ) {

      objProp = Object.create({});

      for (key in srcActual) {
        objProp[key] = srcActual[key];
      }
      dst[ propName ] = objProp;

    } else if( helper.isArray( srcActual ) ) {

      if (undefined  == dst[propName] ||  overrideDst) {
        dst[propName] = [];
      } else {
        // don't copy into arrays that already exist, if explicit no override
        if (!overrideDst && dst[propName].length > 0) {
          return dst;
        }
      }

      arrLen = src[propName].length;
      for (var j = 0; j < arrLen; j++) {
        dst[propName].push( srcActual[j] );
      }

    } else {
      if (undefined != src[propName]) {

        dst[ propName ] = srcActual;
      } else if (!helper.isObject(src) && !helper.isArray(src)) {
        dst[ propName ] = srcActual;
      }
    }

    return dst;
  },

  /**
     * Duplicates an objects properties from src to dest
     *
     * @param src Object source container
     * @param dst Object destination container
     * @param overrideDst Boolean (default false) Override property in destination if property already exists*
     * @param propNames Array properties optional filter
     *
     */
  copyProperties: function (src, dst, overrideDst, propNames) {
    var arrLen, dstPropType, dstIsEmpty;

    if (undefined == overrideDst) {
      overrideDst = false;
    }

    if (undefined != propNames) {
      var propLen = propNames.length;
      for (var i = 0; i < propLen; i++) {
        dst = this.copyProperty(src, dst, overrideDst, propNames[i]);
      }
    } else {
      for (propName in src) {
        // shallow copy only when no propnames specified
        if (!src.hasOwnProperty(propName)) {
          continue;
        }
        dst = this.copyProperty(src, dst, overrideDst, propName);
      }
    }

    return dst;
  },

  toUTC: function(date) {
    return new Date(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate(), date.getUTCHours(), date.getUTCMinutes(), date.getUTCSeconds());
  },

  now: function() {
    return new Date();
  },

  nowUTC: function() {
    return this.toUTC(this.now());
  },

  nowUTCSeconds: function() {
    var d = this.toUTC(this.now());

    // @todo looks like a bug in datejs, no seconds for getTime?
    seconds = d.getSeconds() + (d.getMinutes() * 60) + (d.getHours() * 60 * 60);
    return (d.getTime() + seconds);
  },

  // @return string yyyymmdd UTC
  nowDay : function() {
    var n = this.now();
    return n.toString('yyyyMMdd');
  },

  capitalize: function(str) {
    return str.charAt(0).toUpperCase() + str.slice(1);
  },

  indexOf: function(arr, search) {
    for (var i = 0; i < arr.length; i++ ) {
      if (arr[i] == search) {
        return i;
      }
    }
    return -1;
  },

  inArray: function(arr, search) {
    return this.indexOf(arr, search) != -1;
  },


  strCryptSync: function(str, saltLen) {
    if (undefined == saltLen) {
      saltLen = 10;
    }
    return bcrypt.hashSync(str, bcrypt.genSaltSync(saltLen));
  },

  strCryptCmpSync: function(taintedClear, localHash) {
    return bcrypt.compareSync(taintedClear, localHash);
  },

  genShortenerBase: function() {
    var ret = '';
    var charRanges = {
      48 : 57,
      65 : 90,
      97 : 122
    }

    for (lower in charRanges) {
      for (var i = lower; i <= charRanges[lower]; i++) {
        ret += String.fromCharCode(i);
      }
    }

    return '.' + ret + '_';
  },

  shortenerBase: null,

  genShortened: function(target) {
    return baseConverter.decToGeneric(target, this.shortenerBase);
  },

  /**
     * @todo deprecate.  This was handrolled, just use the mkdirp package
     */
  mkdir_p: function(path, mode, callback) {
    mkdirp(path, mode, function(err) {
      callback(err, path);
    });
  },

  getDomain: function(domain, withProto, withPort) {
    var proto = (withProto) ? CFG.proto_public : '',
    extracted = tldtools.extract(proto + domain);
    return (withPort) ? extracted.url_tokens.host : extracted.url_tokens.hostname;
  },

  getDomainTokens : function(domain) {
    return tldtools.extract(domain);
  },

  tldtools : tldtools,

  parseUrl : function(uri) {
    return url.parse(uri, true);;
  },

  regUUID : /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi,
  regActionUUID : /\[%(\s*?)(source|[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})#[a-zA-Z0-9_#]*(\s*?)%\]/gi,

  getRegUUID : function() {
    return this.regUUID;
  },

  getRegActionUUID : function() {
    return this.regActionUUID;
  },


  AESCrypt : function(value) {
    var key, keyVersion,
    iv = crypto.randomBytes(32).toString('hex').substr(0, 16);
    // get latest key
    for (keyVersion in CFG.k) {
      key = CFG.k[keyVersion];
    }

    var cipher = crypto.createCipheriv('aes-256-cbc', key, iv),
    crypted = cipher.update(value, 'ascii', 'base64') + cipher.final('base64');

    cryptEncoded = new Buffer(keyVersion + iv + crypted).toString('base64');
    // @todo encrypted objects not equating correctly
    if (value !== this.AESDecrypt(cryptEncoded, true)) {
      throw new Error('Cipher Failure');
    }

    return cryptEncoded;
  },

  AESDecrypt : function(cryptedStr, autoPadding) {
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
  },

  isTrue : function(input) {
    return (true === input || /1|yes|y|true/g.test(input));
  }

}

//
var ret = '';
var charRanges = {
  48 : 57,
  65 : 90,
  97 : 122
}

for (lower in charRanges) {
  for (var i = lower; i <= charRanges[lower]; i++) {
    ret += String.fromCharCode(i);
  }
}

helper.shortenerBase = '.' + ret + '_';

module.exports = helper;
