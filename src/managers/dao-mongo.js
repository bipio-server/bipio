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
helper      = require('../lib/helper')
time        = require('time');
events = require('events'),
  eventEmitter = new events.EventEmitter();

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

  mongoose.connection.on('error', function(err) {
    log('MONGODB:UNCONNECTABLE:' + config.connect, 'error');
    log(err, 'error');
    self.emit('error', err);
  });

  mongoose.connection.on('open', function() {
    log('DAO:MONGODB:Connected');
    self.emit('ready', self);
  });

  mongoose.connect(config.connect, options);
}

DaoMongo.prototype.__proto__ = events.EventEmitter.prototype;

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

/**
 * Returns a collection of model_name => public/private/readonly filters
 */
DaoMongo.prototype.getModelPublicFilters = function() {
  var filters = {};
  for (key in this.models) {
    filters[key] = {
      // 'public': this.models[key]['class'].publicProps
      'read': this.models[key]['class'].getRenderablePropsArray(),
      'write' : this.models[key]['class'].getWritablePropsArray()
    }
  }
  return filters;
};

/**
 *
 * Initializes a model and binds it to a Mongoose schema
 *
 * @param modelClass model prototype
 */
DaoMongo.prototype.registerModel = function(modelClass) {
  var modelName = modelClass.entityName, validators, numValidators;
  var container = this.models;

  // Already registered? then skip
  if (undefined != container[modelName]) {
    return;
  }

  // initialize static prototype
  modelClass.staticInit(this);

  // tell the model some things about the server environment
  modelClass.bindServerMeta({
    baseUrl : CFG.proto_public + CFG.domain_public
  });

  //
  container[modelName] = {};
  // swap out 'object' types for mixed.  This lets us separate mongoose
  // from our actual models
  var modelSchema = modelClass.entitySchema;
  for (var key in modelClass.getEntitySchema()) {
    if (undefined == modelSchema[key].type) {
      delete modelSchema[key];
    }

    if (modelSchema[key].type == Object) {
      modelSchema[key].type = mongoose.Schema.Types.Mixed;
    }

    if (key == modelClass.getEntityIndex() || helper.inArray(modelClass.uniqueKeys, key)) {
      modelSchema[key].unique = true;
    }
  }

  container[modelName]['schema'] = new mongoose.Schema( modelSchema );

  // apply compound key constraints index
  var compoundConstraints = modelClass.getCompoundKeyConstraints();
  if (undefined != compoundConstraints) {
    container[modelName]['schema'].index(compoundConstraints, {
      unique: true
    });
  }

  // get item setters
  if (undefined != modelClass.entitySetters) {
    var setters = modelClass.entitySetters;

    // apply magic setters @todo deprecate into schema 'set' attribute
    for (key in setters) {
      container[modelName]['schema'].path(key).set(setters[key]);
    }
  }

  // basic model
  container[modelName]['class'] = modelClass;

  // register mongoose chema
  mongoose.model(modelClass.entityName, container[modelName]['schema']);
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
  return {
    id : fromModel.id,
    // find with the owner id filter for the authenticated user
    owner_id : accountInfo.user.id
  };
}

/**
 * Returns a populated Object of properties
 * <script type="text/javascript">alert('XSS!');</script>
 */
DaoMongo.prototype.modelFactory = function(modelName, initProperties, accountInfo, tainted) {

  var writeOnlyProps = this.models[modelName]['class'].getWritablePropsArray();
  writable = true;
  // get properties
  if (undefined == tainted) {
    tainted = false;
  }

  if (undefined != initProperties) {
    modelProperties = this.models[modelName]['class'].getPropNamesAsArray();
    numProperties = modelProperties.length;

    var propArgs = {};

    for (i = 0; i < numProperties; i++) {
      propArgs[modelProperties[i]] = {
        //            value: initProperties[modelProperties[i]],
        enumerable: true,
        //writable: writable
        writable : true
      };

      if (!(tainted && !helper.inArray(writeOnlyProps, modelProperties[i]))) {
        propArgs[modelProperties[i]].value = initProperties[modelProperties[i]];
      }
    }

    if (undefined != accountInfo) {
      propArgs['owner_id'] = {
        value: accountInfo.user.id,
        enumerable: true
      } ;
    }
  } else {
    initProperties = {};
  }

  var model = Object.create(this.models[modelName]['class'], propArgs ).init(accountInfo);

  if (!tainted || (tainted && undefined !== accountInfo)) {
    model.populate(initProperties, accountInfo);
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
  mongoModel = new MongooseModel(srcModel);

  var model = helper.copyProperties(srcModel, mongoModel, true);
  var self = this;

  // mongoose doesn't look to apply defaults prior to validation??
  for (var key in this.models[modelName]['class'].entitySchema) {
    if (this.models[modelName]['class'].entitySchema.hasOwnProperty(key) ) {
      def = this.models[modelName]['class'].entitySchema[key]['default'];
      if (undefined === model[key] && !/^_/.test(key)) {
        model[key] = def;
      }
    }
  }

  model.getAccountInfo = function() {
    return srcModel.getAccountInfo();
  }

  return model;
};

DaoMongo.prototype._hydrateModelFromFilter = function(model, filter, accountInfo, next) {
  var self = this;
  mongoose.model(model.getEntityName()).findOne(filter, function(err, result) {
    if (err || !result) {
      next(self.errorParse(err), null, null, self.errorMap(err) );
    } else {
      model.populate(result, accountInfo);
      next(
        self.errorParse(err, model),
        model.getEntityName(),
        model,
        self.errorMap(err)
        );
    }
  });
}

// ------------------------------------------------------------------------ CRUD

/**
 *
 * Creates a new model in the db
 *
 * @param BipModel model source model
 * @param function callback
 * @param Object account info
 */
DaoMongo.prototype.create = function(model, next, accountInfo, daoPostSave) {
  var self = this, resp;
  var nowTime = helper.nowUTCSeconds();
  if (model) {
    model[ model.getEntityIndex() ] = uuid();
    model[ model.getEntityCreated() ] = nowTime;
    model.preSave(accountInfo, function(err, model) {
      if (err) {
        next(err, model.getEntityName(), model, 500);
        return;
      }
      
      var mongoModel = self.toMongoModel(model);

      mongoModel.save(function(err) {
        if (err) {
          self._log(err, 'error');
          if (next) {
            // conflict? Then load the record and return the payload
            // with an error response
            if (err.code == 11000) {
              // always bind to the authed user
              var filter = {
                'owner_id' : accountInfo.user.id
              };

              // get key constraints from model
              var compoundConstraints = model.getCompoundKeyConstraints();
              if (undefined != compoundConstraints) {
                for (key in compoundConstraints) {
                  if (key != 'owner_id') {
                    filter[key] = mongoModel[key];
                  }
                }
              }

              self._hydrateModelFromFilter(model, filter, accountInfo, next);

            } else {
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
          }
          return null;
        }
        // populate from mongo model into our model, and build a representation
        model.populate(mongoModel, accountInfo);
        model.postSave(accountInfo, function(err, modelName, retModel, code) {
          if (next) {
            next(err, modelName, retModel, code );
          }
          // depending on the model, we can inject post-saves which are
          // outside the model's scope, such as notifications, or other
          // types of bindings.
          if (daoPostSave) {
            daoPostSave(err, modelName, retModel, code );
          }
        }, true);

        return model;
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
  model = this.modelFactory(modelName, helper.pasteurize(props), accountInfo);

  var f = filter; // something in mongoose is clobbering 'filter'

  model.preSave(accountInfo, function(err, model) {
    if (err) {
      next(err, model.getEntityName(), model, 500);
      return;
    }
    
    MongooseClass.update(filter, model.toObj(), function(err) {
      if (err) {
        if (next) {
          // conflict? Then load the record and return the payload
          // with an error response
          if (err.code == 11000) {
            // always bind to the authed user
            var filter = {
              'owner_id' : accountInfo.user.id
            };

            // get key constraints from model
            var compoundConstraints = model.getCompoundKeyConstraints();
            if (undefined != compoundConstraints) {
              for (key in compoundConstraints) {
                if (key != 'owner_id') {
                  filter[key] = model[key];
                }
              }
            }

            MongooseClass.findOne(filter, function(gErr, result) {
              if (gErr || !result) {
                next(
                  self.errorParse(gErr),
                  null,
                  null,
                  self.errorMap(gErr)
                  );
              } else {
                model.populate(result, accountInfo);
                next(
                  self.errorParse(gErr, model),
                  model.getEntityName(),
                  model,
                  self.errorMap(gErr)
                  );
              }
            });
          } else {
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
            /*
                          model.postSave(accountInfo, function(err, modelName, retModel, code) {
                               next(
                                   self.errorParse(err, model),
                                   model.getEntityName(),
                                   model
                               );
                           });
                          */
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
  model = this.modelFactory(modelName, helper.pasteurize(props), accountInfo);
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

  var findObject = self.getObjectIdFilter({
    id : modelId
  }, accountInfo);

  MongoClass.findOne(findObject, function (err, result) {
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
      model.populate(result, accountInfo);
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
    if (err || result == 0) {
      self._log('Error: remove(): ' + err);
      if (next) {
        next(false, null);
        return null;
      }
    }

    if (next) {
      next(false, modelName, {
        'status' : 'OK'
      });
    }
    return result;
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
DaoMongo.prototype.list = function(modelName, accountInfo, page_size, page, orderBy, filter,  callback) {
  var owner_id = accountInfo ? accountInfo.user.id : undefined;
  var self = this, cacheKey = 'slist_' + modelName + '_' + owner_id + '_' + page + '_' + page_size;
  var mongoFilter = {
    'owner_id' : owner_id
  }

  var sortMap = {
    'recent' : 'created',
    'active' : 'imp_actual',
    'alphabetical' : 'name'
  }

  var model = mongoose.model(modelName);

  var query = model.find( mongoFilter.owner_id ? mongoFilter : null );

  // @todo this is expensive, filter out keys which are not
  // indexed
  if (undefined != filter) {
    for (key in filter) {
      query = query.where(key).regex(new RegExp(filter[key], 'i'));
    }
  }

  // count
  query.count(function(err, count) {
    if (err) {
      self._log('Error: list(): ' + err);
      if (callback) {
        callback(err, err);
      }
    } else {
      if (page_size && page) {
        query = query.limit(page_size).skip( (page - 1)  * page_size );
      }

      if (sortMap[orderBy] || orderBy) {
        var s = {};
        s[sortMap[orderBy] ? sortMap[orderBy] : orderBy] = (orderBy === 'alphabetical' ? 'asc' : 'desc');
        query = query.sort(s);
      }

      query.execFind(function (err, results) {
        var model;
        if (err) {
          self._log('Error: list(): ' + err);
          if (callback) {
            callback(false, err);
          }
        } else {
          // convert to models
          realResult = [];
          for (key in results) {
            model = self.modelFactory(modelName, results[key], accountInfo);
            realResult.push(model.toObj());
          }

          var resultStruct = {
            'page' : page,
            'page_size' : page_size,
            'num_pages' : (Math.ceil( count / page_size )),
            'order_by' : orderBy,
            'total' : count,
            'data' : realResult
          }

          if (callback) {
            callback(false, modelName, resultStruct );
          }
        }
      });
    }
  });
};

DaoMongo.prototype.find = function(modelName, filter, next) {
  var self = this;
  mongoose.model(modelName).findOne(filter, function (err, result) {
    if (err) {
      self._log('Error: find(): ' + err);
    }
    next(err, result);
  });
};

DaoMongo.prototype.findFilter = function(modelName, filter, next) {
  var self = this;
  mongoose.model(modelName).find(filter, function (err, result) {
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
  var model = this.modelFactory(modelName, props);

  // cast to mongoose model
  var MongoModel = mongoose.model(model.getEntityName());
  var idx = model.getEntityIndex();

  var filter = {};
  filter[idx] = model.getIdValue()

  var acc = {};
  acc[accumulator] = inc || 1;

  var incUpdate = {
    "$inc" : acc
  }

  // increment it
  MongoModel.update( filter, incUpdate ).exec();
};

DaoMongo.prototype.accumulateFilter = function(modelName, filter, accumulator) {
  var model = this.modelFactory(modelName),
  // cast to mongoose model
  MongoModel = mongoose.model(model.getEntityName()),
  idx = model.getEntityIndex(),
  acc = {};

  acc[accumulator] = 1;

  var incUpdate = {
    "$inc" : acc
  }

  // increment it
  MongoModel.update( filter, incUpdate ).exec();
};

/**
 * Updates an explicit set of columns.  No taint check or validation,
 * trusted sources only.
 *
 */
DaoMongo.prototype.updateColumn = function(modelName, filter, props, next) {
  var model = this.modelFactory(modelName),
  updateFilter;

  // cast to mongoose model
  var MongoModel = mongoose.model(model.getEntityName());

  if (helper.isObject(filter)) {
    updateFilter = filter;
  } else {
    updateFilter = {};
    updateFilter[model.getEntityIndex()] = filter
  }

  var updateCols = {
    "$set" : props
  }

  // increment it
  MongoModel.update( updateFilter, updateCols ).exec(next);
};

module.exports = DaoMongo;
