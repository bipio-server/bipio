/**
 *
 * The Bipio API Server
 *
 * @author Michael Pearson <github@x0rz.com>
 * Copyright (c) 2014-2015 wot.io inc http://wot.io
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
 * Mongodb DAO Strategy
 *
 * CRUD Methods
 *
 *  create(model, next, accountInfo, daoPostSave) // create from model
 *  update(modelName, id, new_properties, next, accountInfo) // update by id
 *  get(model, modelId, accountInfo, next) // get by id
 *  remove(model, modelId, accountInfo, next) // remove by id
 *  removeFilter(modelName, filter, next)
 *
 * Utilities
 *
 *  list(modelName, accountInfo, page_size, page, orderBy, filter,  next)
 *  find(modelName, filter, next)
 *  findFilter(modelName, filter, next)
 *  accumulate(modelName, props, accumulator, inc)
 *  accumulateFilter(modelName, filter, accumulator)
 *  updateColumn(modelName, filter, props, next)
 *  expire(modelName, maxTime, next)
 *  aggregate(modelName, filter, next)
 *  count(modelName, filter, next)
 *
 * Factories
 *
 *  modelFactory(modelName, properties, accountInfo, tainted) //
 *  toMongoModel(fromModel) // convert model to mongoose class
 *
 *
 * where next(bool error, string modelName, object model, int errorCode)
 *
 */
var uuid        = require('node-uuid'),
  mongoose    = require('mongoose'),
  helper      = require('../lib/helper'),
  extend = require('extend'),
  time        = require('time'),
  events = require('events'),
  eventEmitter = new events.EventEmitter(),
  mongooseOpen = false;

/**
 * Mongoose DAO Constructor
 */
function DaoMongo(config, log, next) {
  var self = this;

  events.EventEmitter.call(this);

  this._log = log;

  var options = {
    server : {},
    replset : {}
  };

  options.server.socketOptions = options.replset.socketOptions = {
    keepAlive: 1
  };

  //mongoose.set('debug', true);

  mongoose.connection.on('error', function(err) {
    log('MONGODB:UNCONNECTABLE:' + config.dbMongo.connect, 'error');
    log(err, 'error');
    if (/missing hostname/i.test(err.message)) {
      log('Exiting...', 'error');
      process.exit(0);
    } else {
      self.emit('error', err);
    }
  });

  mongoose.connection.on('open', function() {
    log('DAO:MONGODB:Connected');
    self.emit('ready', self);
    mongooseOpen = true;
  });

  if (!mongooseOpen) {
    try {
      mongoose.connect(config.dbMongo.connect, options);
    } catch (e) {
    }
  }
}

DaoMongo.prototype.__proto__ = events.EventEmitter.prototype;

DaoMongo.prototype.getConnection = function() {
  return mongoose.connection;
}

/**
 *
 * General translation from MongoDB errors to a HTTP response code
 *
 */
DaoMongo.prototype.errorMap = function(error) {
  var ret = 400;
  if (error && error.code) {
    switch (error.code) {
      case 11000 :
      case 11001 :
        ret = 409;
        break;
      default :
        ret = 400;
    }
  }
  return ret;
}

DaoMongo.prototype.hasModel = function(modelName) {
  return undefined !== this.models[modelName];
}

DaoMongo.prototype.registerModel = function(modelObj) {
  extend(true, modelObj, Object.create(this.getModelPrototype()));
  this.registerModelClass(modelObj);
}

DaoMongo.prototype.getModelClass = function(modelName) {
  return this.models[modelName]['class'];
}

/**
 * @todo - deprecate, should automatically extend mongoose model
 * Initializes a model and binds it to a Mongoose schema
 *
 * @param modelClass model prototype
 */
DaoMongo.prototype.registerModelClass = function(modelClass, reRegister) {
  var modelName = modelClass.getEntityName(), validators, numValidators;
  var container = this.models;

  // Already registered? then skip
  if (undefined != container[modelName] && !reRegister) {
    return;
  }

  container[modelName] = {};

  // basic model
  container[modelName]['class'] = modelClass;

  // initialize static prototype
  modelClass.staticInit(this);

  // tell the model some things about the server environment
  modelClass.bindServerMeta({
    baseUrl : CFG.proto_public + CFG.domain_public
  });

  //
  var model = this.modelFactory(modelClass.getEntityName());

  // swap out 'object' types for mixed.  This lets us separate mongoose
  // from our actual models
  var modelSchema = model.getEntitySchema();

  for (var key in modelSchema) {
    if (undefined == modelSchema[key].type) {
      delete modelSchema[key];
    }

    if (modelSchema[key].type == Object) {
      modelSchema[key].type = mongoose.Schema.Types.Mixed;
    }

    if (key == model.getEntityIndex() || helper.inArray(modelClass.uniqueKeys, key)) {
      modelSchema[key].unique = true;
    }
  }

  container[modelName]['schema'] = new mongoose.Schema( modelSchema );

  // apply compound key constraints index
  var compoundConstraints = model.getCompoundKeyConstraints();
  if (undefined != compoundConstraints) {
    container[modelName]['schema'].index(compoundConstraints, {
      unique: true
    });
  }

  // register mongoose schema
  try {
    mongoose.model(modelClass.getEntityName(), container[modelName]['schema']);
  } catch (e) {
    if (e.name !== 'OverwriteModelError') {
      throw new Exception(e);
    }
  }

  return container;
}

DaoMongo.prototype.buildProperties = function(struct, idStruct) {
  propArgs = {};
  for (key in struct) {
    propArgs[key] = {
      value: struct[key],
      enumerable: true
    } ;
  }
  if (undefined != idStruct) {
    propArgs['owner_id'] = {
      value: idStruct.id,
      enumerable: true
    } ;
  }

  return propArgs
}

/**
 *
 * Forces a filter object to use the model id, owner id
 */
DaoMongo.prototype.getObjectIdFilter = function(fromModel, accountInfo) {
  var filter = {
    id : fromModel.id,
  };

  if (accountInfo) {
    // find with the owner id filter for the authenticated user
    filter.owner_id = accountInfo.getId()
  }
  return filter;
}

/*
 * Casts an object into a named model class
 *
 */
DaoMongo.prototype.modelFactory = function(modelName, properties, accountInfo, tainted) {
  var schema, propArgs;

  writable = true;
  // get properties
  if (undefined == tainted) {
    tainted = false;
  }

  if (undefined != properties) {
    schema = this.models[modelName]['class'].getEntitySchema();
    propArgs = {};
    for (var attr in schema) {
      propArgs[attr] = {
        enumerable: true,
        writable : true,
        value : properties[attr]
      };

      if (!(tainted && !schema[attr].writable) ) {

        // custom getters are a nasty workaround for some mongoose woes.
        // see bip.js model, hub getter
        var getter = schema[attr].customGetter;

        if (getter && properties[attr]) {
          propArgs[attr].value = getter(properties[attr]);

        } else {
          propArgs[attr].value = properties[attr];
        }
      }
    }

    if (accountInfo) {
      propArgs['owner_id'] = {
        value: accountInfo.getId(),
        enumerable: true
      };
    }

  } else {
    properties = {};
  }

  var model = Object.create(this.models[modelName]['class'], propArgs ).init(accountInfo);
  //var model = new this.models[modelName]['class'](this, propArgs, accountInfo)

  this.models[modelName]['class'].constructor.apply(model);
  if (!tainted || (tainted && undefined !== accountInfo)) {
    model.populate(properties, accountInfo);
  }

  if (accountInfo) {
    model.decorate(accountInfo);
  }

  return model;
};

DaoMongo.prototype.errorParse = function(err, responseData) {
  var friendlyError;
  if (err) {
    this._log(err, 'error');
  }
  if (undefined == responseData) {
    if (err && err.errors) {
      friendlyError = {};
      for (key in err.errors) {
        friendlyError[key] = err.errors[key].type;
      }
    } else {
      friendlyError = {
        status: 'ERROR'
      };
    }
  } else {
    friendlyError = err;
  }

  return friendlyError;
};

DaoMongo.prototype.toMongoModel = function(srcModel) {
  var modelName = srcModel.getEntityName(),
    MongooseModel = mongoose.model(modelName),
    mongoModel = new MongooseModel(srcModel),
    schema = this.models[modelName]['class'].getEntitySchema(),
    model = helper.copyProperties(srcModel, mongoModel, true);

  // mongoose doesn't look to apply defaults prior to validation??
  for (var key in schema) {
    if (schema.hasOwnProperty(key) ) {
      def = schema[key]['default'];
      if (undefined === model[key] && !/^_/.test(key)) {
        model[key] = def;
      }
    }
  }

  model.getAccountInfo = function() {
    return srcModel.getAccountInfo();
  }

  model.getDao = function() {
    return srcModel.getDao();
  }

  delete model.accountInfo;

  return model;
};

// ------------------------------------------------------------------------ CRUD

/**
 *
 * Creates a new model in the db
 *
 * @param BipModel model source model
 * @param function callback
 * @param Object account info
 */
 DaoMongo.prototype.create = function(model, next, accountInfo) {
  var self = this, resp;

  if (model) {
    model[ model.getEntityIndex() ] = uuid();

    if ( !model[ model.getEntityCreated() ] ) {
      model[ model.getEntityCreated() ] = helper.nowUTCSeconds();
    }

    model.preSave(accountInfo, function(err, model) {
      if (err) {
        next(err, model.getEntityName(), model, 500);
        return;
      }

      model.validate(function(err) {
        if (err) {
          next(err, model.getEntityName(), err, 500);
          return;
        }

        // cast to mongo collection
        var mongoModel = self.toMongoModel(model);
        mongoModel.save(function(err, mongoStruct) {

          delete model;

          model = self.modelFactory(model.getEntityName(), mongoStruct);

          if (err) {
            self._log(err, 'error');
            if (next) {
              var errResp;
              // looks like a mongo validation error? then normalize it
              if (err.errors && err.name) {
                errResp = {
                  'status' : 400,
                  'message' : err.name,
                  'errors' : err.errors
                }
              } else {
                errResp = err;
              }

              next(self.errorParse(err, model), model.getEntityName(), errResp, self.errorMap(err) );
            }
            return null;
          }

          model.postSave(accountInfo, function(err, modelName, finalModel, code) {
            if (err) {
              self.remove(modelName, finalModel.id, accountInfo, function() {
                if (next) {
                  next(err, modelName, finalModel, code );
                }
              });
            } else if (next) {
              next(
                err,
                modelName,
                self.modelFactory(model.getEntityName(), finalModel, accountInfo),
                code
              );
            }
          }, true);

          return model;
        });
      });

    });

  } else {
    this._log('Error: create(): cannot save item', 'error');
    if (next) {
      next(true, null, null, 500);
    }
  }
};

DaoMongo.prototype._update = function(modelName, filter, props, accountInfo, next) {
  var self = this,
  MongooseClass = mongoose.model(modelName),
  model = this.modelFactory(modelName, helper.pasteurize(props));

  var f = filter; // something in mongoose is clobbering 'filter'

  model.preSave(accountInfo, function(err, model) {
    if (err) {
      next(err, model.getEntityName(), model, 500);
      return;
    }

    MongooseClass.update(filter, model.toObj(), function(err) {
      if (err) {
        if (next) {
            var errResp;
            // looks like a mongo validation error? then normalize it
            if (err.errors && err.name) {
              errResp = {
                'status' : 400,
                'message' : err.name,
                'errors' : err.errors
              }
            } else {
              errResp = err;
            }
            next(
              self.errorParse(err, model),
              model.getEntityName(),
              errResp,
              self.errorMap(err)
              );
        }
        return null;
      } else {

        // mongoose .update doesn't tell us how things changed,
        // reload from db
        MongooseClass.findOne(
          f,
          function(err, result) {
            if (err || !result) {
              next(
                self.errorParse(err),
                null,
                null,
                self.errorMap(err)
                );
            } else {
              // populate from mongo model into our model, and build a representation
              var model = self.modelFactory(modelName, {}, accountInfo);
              model.populate(result, accountInfo);
              next(false, model.getEntityName(), model);
            }
          });
      }
      return model;
    });
  });
};

DaoMongo.prototype.update = function(modelName, id, props, next, accountInfo) {
  var self = this,
  propName,
  repr,
  objProp,
  options = {},
  newModel,
  nowTime = helper.nowUTCSeconds();

  // create model container
  model = this.modelFactory(modelName, props, accountInfo);
  if (model) {
    model.id = id;
    var mongoModel = this.toMongoModel(model);
    mongoModel.validate(function(err) {
      if (err) {
        var errResp;
        // looks like a mongo validation error? then normalize it
        if (err.errors && err.name) {
          errResp = {
            'status' : 400,
            'message' : err.name,
            'errors' : err.errors
          }
        } else {
          errResp = err;
        }

        next(
          self.errorParse(err, model),
          model.getEntityName(),
          errResp,
          self.errorMap(err)
          );
      } else {
        // create a model and then cast it back to plain'ol/JSON
        // so that setter middleware is applied :|
        var cleanModel = mongoModel.toJSON();

        delete cleanModel._id;
        self._update(modelName, self.getObjectIdFilter(mongoModel, accountInfo), cleanModel, accountInfo, next);
      }
    });

  } else {
    this._log('Invalid model', 'error');
    this._log(model, 'error');
    if (next) {
      next(true, null, null, 500);
    }
  }
}

/**
 * Retrieve a model by id
 *
 * @param BipModel model
 * @param String modelId
 * @param AccountInfo accountInfo
 * @param Function next
 *
 */
DaoMongo.prototype.get = function(model, modelId, accountInfo, next) {
  var self = this;

  var MongoClass = mongoose.model(model.getEntityName());

  var filter = {};

  if(!app.helper.getRegUUID().test(modelId)) {
	  filter.name = modelId;
  } else {
	  filter.id = modelId;
  }

  if (accountInfo) {
    // find with the owner id filter for the authenticated user
    filter.owner_id = accountInfo.user.id
  }

  MongoClass.findOne(filter, function (err, result) {
    var loadedModel;
    if (err) {
      self._log('Error: get(): ' + err);
      if (next) {
        next(false, null);
        return null;
      }
    }

    if (result) {
      // hydrate model
      model = self.modelFactory(model.getEntityName(), result, accountInfo);
    }

    if (next) {
      // cast results in its result object
      next(false, model.getEntityName(), result ? model : result);
    }
  });
};


/**
 * Removes a model, invokes any teardowns
 *
 *
 */
DaoMongo.prototype.remove = function(modelName, modelId, accountInfo, next) {
  var self = this,
  MongoClass = mongoose.model(modelName),
  findObject = self.getObjectIdFilter({
    id : modelId
  }, accountInfo);

  MongoClass.findOne(findObject, function (err, result) {
    if (err) {
      self._log(err);
      next(err);

    } else if (!result) {
      next(false, modelName, null);

    } else {
      var model = self.modelFactory(modelName, result, accountInfo);
      model.preRemove(model.id, accountInfo, function(err, modelName, model, code) {
        if (err) {
          next(
            self.errorParse(err, model),
            modelName,
            model,
            code || self.errorMap(err)
            );
        } else {
          MongoClass.remove({
            id : model.id
          }, function (err, result) {
            if (err || result == 0) {
              self._log(err);
              if (next) {
                next(false, null);
                return null;
              }
            } else {
              next(false, modelName, {
                'status' : 'OK'
              });
            }
          });
        }
      });
    }
  });
};

DaoMongo.prototype.removeFilter = function(modelName, filter, next) {
  var self = this,
  MongoClass = mongoose.model(modelName);

  MongoClass.remove(filter, function (err, result) {
    if (next) {
      if (err) {
        next(err);
      } else {
        next(false, modelName, {
          'status' : 'OK'
        });
      }
    }
  });
};

// -------------------------------------------------------------------- END CRUD

/**
 *
 * Lists all models of type modelName for the authenticated account
 *
 * @param string modelName model class name (resource name)
 * @param Object accountInfo account info
 * @param int page_size page size
 * @param int page page number (page 1 start)
 * @param function callback completed callback
 */
DaoMongo.prototype.list = function(modelName, accountInfo, page_size, page, orderBy, filter, callback) {
  var owner_id = accountInfo ? accountInfo.getId() : undefined;
  var self = this;
  var mongoFilter = {
    'owner_id' : owner_id
  }

  var sortMap = {
    'recent' : 'created',
    'active' : 'imp_actual',
    'alphabetical' : 'name'
  }

  var model = mongoose.model(modelName),
    m = this.modelFactory(modelName);

  var query = model.find( mongoFilter.owner_id ? mongoFilter : null ),
    countQuery = model.find( mongoFilter.owner_id ? mongoFilter : null );

  // @todo this is expensive, filter out keys which are not
  // indexed
  if (undefined != filter) {
    var q;
    for (key in filter) {
      if (app.validator('isObject')(filter[key])) {
        q = {};
        q[key] = filter[key];
        query = query.find(q);
        countQuery = countQuery.find(q);

      } else {
        query = query.where(key).equals(filter[key]);
        countQuery = countQuery.where(key).equals(filter[key]);
      }
    }
  }

  // count
  countQuery.count(function(err, count) {
    if (err) {
      self._log('Error: list(): ' + err);
      if (callback) {
        callback(err, err);
      }
    } else {
      if (page_size && page) {
        query = query.limit(page_size).skip( (page - 1)  * page_size );
      }

      if (app.validator('isArray')(orderBy) && /asc|desc/.test(orderBy[1]) && m.testProperty(orderBy[0])) {
        var s = {};
        s[orderBy[0]] = orderBy[1];
        query = query.sort(s);

      } else if (sortMap[orderBy] || orderBy) {
        var s = {};
        s[sortMap[orderBy] ? sortMap[orderBy] : orderBy] = (orderBy === 'alphabetical' ? 'asc' : 'desc');
        query = query.sort(s);
      }

      query.exec(function anonQuery(err, results) {

        if (err) {
          self._log('Error: list(): ' + err);
          if (callback) {
            callback(false, err);
          }

        } else {
          var resultStruct = {
            'page' : page,
            'page_size' : page_size,
            'num_pages' : page_size ? (Math.ceil( count / page_size )) : 1,
            'order_by' : orderBy,
            'total' : count,
            'data' : []
          }

          for (var i = 0; i < results.length; i++) {
            resultStruct.data.push(
              self.modelFactory(modelName, results[i], accountInfo).toObj()
            );
          }

          callback(false, modelName, resultStruct );
        }
      });
    }
  });
};

DaoMongo.prototype.count = function(modelName, filter, next) {
  var model = mongoose.model(modelName),
    countQuery = model.find( filter );

  // count
  countQuery.count(function anonCount(err, count) {
    if (err) {
      app.logmessage(err, 'error');
    }
    next(err, count);
  });
}

DaoMongo.prototype.find = function(modelName, filter, next) {
  var self = this;
  mongoose.model(modelName).findOne(filter, function anonFind(err, result) {
    if (err) {
      self._log('Error: find(): ' + err);
    }
    next(err, result);
  });
};

DaoMongo.prototype.findFilter = function(modelName, filter, next, projection) {
  var self = this;
  mongoose.model(modelName).find(filter, projection || {}, function anonFindFilter(err, result) {
    if (err) {
      self._log('Error: findFilter(): ' + err, 'error');
    }
    next(err, result);
  });
};

DaoMongo.prototype.findDistinct = function(modelName, filter, attribute, next) {
  var self = this;
  mongoose.model(modelName).find(filter).distinct(attribute, function anonFindDistinct(err, result) {
    if (err) {
      self._log('Error: findFilter(): ' + err, 'error');
    }
    next(err, result);
  });
};

// ------------------------------------------------------------------- UTILITIES

/**
 * Increments an accumulator field on a model
 */
DaoMongo.prototype.accumulate = function(modelName, props, accumulator, inc) {
//  var model = this.modelFactory(modelName, props);

  var model = this.models[modelName]['class'];

  // cast to mongoose model
  var MongoModel = mongoose.model(model.getEntityName());
  var idx = model.getEntityIndex();

  var filter = {};
  filter[idx] = props[idx]

  var acc = {};
  acc[accumulator] = inc || 1;

  var incUpdate = {
    "$inc" : acc
  }

  // increment it
  MongoModel.update( filter, incUpdate ).exec();
};

DaoMongo.prototype.accumulateFilter = function(modelName, filter, accumulator, setter, next, incBy) {
  var model = this.modelFactory(modelName),
  // cast to mongoose model
  MongoModel = mongoose.model(model.getEntityName()),
  idx = model.getEntityIndex(),
  acc = {},
  upsert = false;

  acc[accumulator] = (undefined === incBy ? 1 : incBy);

  var incUpdate = {
    "$inc" : acc
  }

  if (setter) {
    incUpdate['$set'] = setter;
    upsert = true;
  }

  // increment it
  MongoModel.update( filter, incUpdate, { upsert : upsert } ).exec(next);
};

// expire a model
DaoMongo.prototype.expire = function(modelName, filter, maxTime, next) {
  filter.created = {
    '$lt' : maxTime
  };

  this.removeFilter(modelName, filter, next);
};

// expire a model
DaoMongo.prototype.aggregate = function(modelName, filter, next, sort) {
  var model = this.modelFactory(modelName),
    // cast to mongoose model
    MongoModel = mongoose.model(model.getEntityName());

  var q = MongoModel.aggregate(filter);

  if (sort) {
//    q = q.sort(sort);
  }

  q.exec(next);
};

/**
 * Upserts a document, no taint check
 */
DaoMongo.prototype.upsert = function(modelName, filter, props, next) {
  var model = this.modelFactory(modelName),
  // cast to mongoose model
  MongoModel = mongoose.model(model.getEntityName()),
  idx = model.getEntityIndex();

  var upsertProps = {
    '$set' : props
  }

  // increment it
  MongoModel.update( filter, upsertProps, { upsert : true } ).exec(next);
};

/**
 * Updates an explicit set of columns.  No taint check or validation,
 * trusted sources only.
 */
DaoMongo.prototype.updateColumn = function(modelName, filter, props, next) {
  var model = this.modelFactory(modelName),
  updateFilter;

  // cast to mongoose model
  var MongoModel = mongoose.model(model.getEntityName());

  if (app.validator('isObject')(filter)) {
    updateFilter = filter;
  } else {
    updateFilter = {};
    updateFilter[model.getEntityIndex()] = filter
  }

  var updateCols = {
    "$set" : props
  }

  MongoModel.update( updateFilter, updateCols, { multi :  true } ).exec(next);
};

DaoMongo.prototype.patch = function(modelName, id, props, accountInfo, next) {
  var model = this.modelFactory(modelName, props, accountInfo),
    self = this;

  this.get(model, id, accountInfo, function(err, modelName, result) {
    if (err) {
      next.apply(self, arguments);
    } else {

      var model = self.modelFactory(modelName, result);

      //MFE, track the old values of the model
      accountInfo["previous_"+modelName] = app._.clone(model);

      model.prePatch(props, accountInfo, function(err, modelName, patch) {

        if (err) {
          next(err, model.getEntityName(), model, 500);
        } else {

          var updateCols = {
            "$set" : app._.clone(patch)
          }

          var updateFilter = {};

          updateFilter[model.getEntityIndex()] = result.id;

          mongoose.model(model.getEntityName()).update( updateFilter, updateCols ).exec(function(err) {
            if (err) {
              next(err, modelName, {});
            } else {
              self.get(model, id, accountInfo, function(err, modelName, result) {
                next(err, modelName, result);
              });
            }
          });

        }
      });
    }
  })
}

/**
 * Updates properties into a model by id, with setters applied. No Taint Check.
 */
DaoMongo.prototype.updateProperties = function(modelName, id, props, next) {
  var model = this.modelFactory(modelName, props),
    updateFilter = {},
    setProperties = {},
    value;

  if (app.validator('isObject')(id)) {
    updateFilter = id;
  } else {
    updateFilter[model.getEntityIndex()] = id;
  }

  // cast to mongoose model
  var mongoModel = this.toMongoModel(model);
  for (var k in props) {
    if (props.hasOwnProperty(k)) {
      val = mongoModel.getValue(k);
      if (app.validator('isObject')(val) && Object.keys(val).length === 0) {
        mongoModel[k] = undefined;
      }
      setProperties[k] = val;
    }
  }

  var updateCols = {
    "$set" : app._.clone(setProperties)
  }

  mongoose.model(model.getEntityName()).update( updateFilter, updateCols, { multi : true } ).exec(next);
};

module.exports = DaoMongo;