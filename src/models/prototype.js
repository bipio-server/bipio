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
 *
 * BipModel is our local representation of a persistent model
 *
 */
var clone = require('clone'),
    helper      = require('../lib/helper');

var BipModel = {
    entityIndex: 'id',
    entityExpiration: 60*5,
    entityCreated: 'created',

    entitySetters: {},
    // validators : field : function(value, cb) {} // where cb(true) or cb(false)
    // entityValidators: {},

    accountInfo : null,
    /*
    getValidators: function() {
        return this.entityValidators;
    },
    */
    compoundKeyContraints: undefined,

    // list of unique keys
    uniqueKeys: [],

    helper : helper,
    _dao : undefined,

    serverInfo : undefined,

    bindServerMeta: function(serverInfo) {
        this.serverInfo = serverInfo;
    },

    href: function() {
        return this._dao.getBaseUrl() + '/rest/' + this.entityName + '/' + this.getIdValue();
    },

    // static prototype constructor
    staticInit: function(dao) {

        // initialize property helpers
        this.getPropNamesAsArray();
        this.getRenderablePropsArray();
        this.getWritablePropsArray();
        this._dao = dao;

        this.staticChildInit();
    },

    // @todo create a proper inheritence chain
    staticChildInit : function() {

    },

    // instance constructor
    init: function(accountInfo) {
        this.accountInfo = accountInfo;

        return this;
    },

    propNamesAsArray : undefined,
    renderablePropsArray : undefined,
    writablePropsArray : undefined,

    getDao: function() {
        return this._dao;
    },

    getAccountInfo: function() {
        return this.accountInfo;
    },

    getCompoundKeyConstraints: function() {
      return this.compoundKeyContraints;
    },

    repr: function() {
      return '';
    },

    decorate : function() {

    },

    setValue: function(key, value) {
        this.key = value;
    },

    /**
     * populates this object with src, for matching properties
     *
     * trusts tainted sources
     */
    populate: function(src, accountInfo) {
        // copy from source into this model, override
        helper.copyProperties(src, this, true, this.getPropNamesAsArray());
        if (undefined != accountInfo && this.id) {
            this._repr = this.repr(accountInfo);
        }
        this._href = this.href();
    },

    toObj : function() {
        return helper.copyProperties(this, {}, true, this.getPropNamesAsArray());
    },

    toMongoModel: function(mongoModel) {
        var model = helper.copyProperties(this, mongoModel, true);
        var self = this;
        model.getAccountInfo = function() {
            return self.getAccountInfo();
        }

        return model;
    },

    // called after successfully saving the object
    postSave: function(accountInfo, cb) {
        cb(false, this.getEntityName(), this);
    },

    // called prior to save
    preSave: function() {

    },

    postRemove : function(accountInfo, cb) {
        cb(false, this.getEntityName(), this);
    },
    
    preRemove : function(id, accountInfo, cb) {
        cb(false, this.getEntityName(), this)
    },

    getIdValue: function() {
        return this.id;
    },

    getValue: function(prop) {
        return (this.hasOwnProperty(prop)) ? this[prop] : undefined;
    },

    setId: function(newId) {
        this.id = newId;
    },

    getEntityName: function() {
        return this.entityName
    },

    getEntityIndex: function() {
        return this.entityIndex;
    },

    getEntityExpiration: function() {
        return this.entityExpiration;
    },

    getEntityCreated: function() {
        return this.entityCreated;
    },

    getEntitySchema: function() {
        return this.entitySchema;
    },

    // builds the all properties list for this model
    getPropNamesAsArray: function() {
        if (undefined == this.propNamesAsArray) {
            this.propNamesAsArray = [];
            for (key in this.entitySchema) {
                this.propNamesAsArray.push(key);
            }
        }

        return this.propNamesAsArray;
    },

    // builds the renderable properities for this model
    getRenderablePropsArray: function() {
        if (undefined == this.renderablePropsArray) {
            this.renderablePropsArray = [];
            for (key in this.entitySchema) {
                if (this.entitySchema[key].renderable) {
                    this.renderablePropsArray.push(key);
                }
            }
        }
        return this.renderablePropsArray;
    },

    // builds the publicly writable properties for this model
    getWritablePropsArray: function() {
        if (undefined == this.writablePropsArray) {
            this.writablePropsArray = [];
            for (key in this.entitySchema) {
                if (this.entitySchema[key].writable) {
                    this.writablePropsArray.push(key);
                }
            }
        }
        return this.writablePropsArray;
    },

    getClass: function() {
        return this;
    },

    getValidators : function(attr) {
        var validators;
        if (this.entitySchema[attr] && this.entitySchema[attr].validate) {
            validators = this.entitySchema[attr].validate;
        }
        return validators;
    }
}

BipModel.validators = {
    'notempty' : function(val, next) {
        next(undefined != val && val != '' && null != val);
    },
    'len_64' : function(val, next) {
        next(!val || val.length <= 64);
    },
    'len_32' : function(val, next) {
        next(!val || val.length <= 32);
    },
    'max_32' : function(val, next) {
        next(!val || val.length <= 32);
    },
    'max_64' : function(val, next) {
        next(!val || val.length <= 64);
    },
    'max_text' : function(val, next) {
        next(!val || val.length <= 1024);
    },
    'bool_int' : function(val, next) {
        next(val == 0 || val == 1);
    },
    'bool_any' : function(val, next) {
        var bools = [
            1,
            0,
            '1',
            '0',
            true,
            false,
            'true',
            'false'
        ];
        next(-1 !== bools.indexOf(val));
    },
    //
    'accountModelDomain' : function(val, next) {
        var filter = {
            id : this.domain_id,
            owner_id : this.owner_id
        };

        this.getDao().find('domain', filter, function(err, result) {
            next(!err);
        });
    },
    // validates email format and whether the domian looks to be valid
    'email' : function(val, next) {
        var validFormat = /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,6}$/i.test(val);
        var domainTokens = tldtools.extract('mailto:' + val);
        next(validFormat && domainTokens.inspect.useful() );
    }
}

module.exports.BipModel = BipModel;