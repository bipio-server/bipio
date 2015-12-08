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
/**
 *
 * BipModel is our local representation of a persistent model
 *
 */
var lodash = require('lodash');

var BipModel = function(dao, accountInfo, properties) {
  this._dao = dao;
  this._accountInfo = accountInfo;

  this.populate(properties);
}

BipModel.prototype = {
  entityIndex: 'id',
  entityCreated: 'created',

  properties : {},

  _accountInfo : null,

  compoundKeyConstraints: undefined,

  // list of unique keys
  uniqueKeys: [],

  _dao : undefined,

  serverInfo : undefined,

  getIdValue: function() {
    return this.id;
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

  getEntityCreated: function() {
    return this.entityCreated;
  },

  getEntitySchema: function() {
    return this.entitySchema;
  },

  bindServerMeta: function(serverInfo) {
    this.serverInfo = serverInfo;
  },

  // default href for resource
  href: function() {
    return this._dao.getBaseUrl() + '/rest/' + this.entityName + '/' + this.getIdValue();
  },

  getDao: function() {
    return this._dao;
  },

  getAccountInfo: function() {
    return this.accountInfo;
  },

  getCompoundKeyConstraints: function() {
    return this.compoundKeyConstraints;
  },

  repr: function(accountInfo) {
    return '';
  },

  links : function() {
    return [];
  },

  /**
   * populates this object with src
   *
   * trusts tainted sources
   */
  populate: function(properties, accountInfo) {
    this.properties = lodash.cloneDeep(properties);

    // apply setters
    // apply getters
    lodash.each(this.entitySchema, function(schema, attr) {
      if (schema.set) {
        this.properties[attr] = schema.set(properties[attr]);
      }
    });

    this.decorate(accountInfo);
  },

  /*
   * adds attribute decorators
   */
  decorate: function(accountInfo) {
    if (undefined != accountInfo && this.get('id') ) {
      this._repr = this.repr(accountInfo);
      this._links = this.links(accountInfo);
    }

    if (this.getEntityIndex() && this[this.getEntityIndex()]) {
      this._href = this.href();
    }
  },

  get : function(attr) {
    return this.properties[attr];
  },

  set : function(attr, value) {
    this.properties[attr] = value;
  },

  toObj : function() {
    var obj = lodash.cloneDeep(this.properties);

    // apply getters
    lodash.each(this.entitySchema, function(schema, attr) {
      if (schema.get) {
        obj[attr] = schema.get(obj[attr]);
      }
    });

    obj._repr = this._repr;
    obj._links = this._links;
    obj._href = this._href;

    return obj;
  },

  isWritable : function(attr) {
    return this.entitySchema && this.entitySchema[attr] && this.entitySchema[attr].writable;
  },

  isRenderable : function(attr) {
    return this.entitySchema && this.entitySchema[attr] && this.entitySchema[attr].renderable;
  },

  // DAO hooks

  // called after successfully saving the object
  postSave: function(accountInfo, cb) {
    cb(false, this.getEntityName(), this);
  },

  // called prior to save
  preSave: function(accountInfo, next) {
    next(false, this);
  },

  preRemove : function(id, accountInfo, cb) {
    cb(false, this.getEntityName(), this)
  },

  prePatch : function(patch, accountInfo, cb) {
    cb(false, this.getEntityName(), patch);
  }
}

module.exports.BipModel = BipModel;