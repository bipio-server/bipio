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
var uuid        = require('node-uuid'),
mongoose    = require('mongoose'),
util        = require('util'),
helper      = require('../lib/helper'),
cdn         = require('../lib/cdn'),
step        = require('../lib/step'),
dateformat  = require('dateformat'),
async       = require('async'),
http        = require('http'),
fs          = require('fs'),
time        = require('time'),
crypto      = require('crypto'),
clone       = require('clone');

function DaoMongo(connectStr, log, next) {

    var self = this;

    log('MongoDB config: ' + connectStr);

    var options = {
      server : {},
      replset : {}
    };

    options.server.socketOptions = options.replset.socketOptions = { keepAlive: 1 };
    mongoose.connection.on('error', function(err) {
        console.log('MongoDB unconnectable via :' + connectStr);
        console.log(err);
        if (next) {
            next(err);
        }
    });

    mongoose.connect(connectStr, options);

    this.log = log;
    this.models = { };
    this._env = null;
    // protocol + base url
    this._baseUrl = CFG.proto_public + CFG.domain_public;

    this.cdn = cdn;
    this._modelPrototype = require('../models/prototype.js').BipModel;

    var modelSrc = {
        // mapper
        'bip' : require('../models/bip').Bip,
        'bip_share' : require('../models/bip_share').BipShare,
        'bip_log' : require('../models/bip_log').BipLog,
        'channel' : require('../models/channel').Channel,
        'domain' : require('../models/domain').Domain,
        // 'hub' : require('../models/hub').Hub,

        'transform_default' : require('../models/transform_default').TransformDefault,

        // account
        'account' : require('../models/account').Account,
        'account_auth' : require('../models/account_auth').AccountAuth,
        'account_option' : require('../models/account_option').AccountOption,

        'stats_account' : require('../models/stats_account').StatsAccount,
        'stats_account_network' : require('../models/stats_account_network').StatsAccountNetwork
    }

    for (var key in modelSrc) {
        self.registerModel(modelSrc[key]);
    }

    mongoose.connection.on('open', function() {
        log('MongoDB Connected');

        if (next) {
            next(false, self);
        }
    });
}

DaoMongo.prototype.getBaseUrl = function() {
    return this._baseUrl;
}

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
    /*
    validators = modelClass.getValidators();
    for (key in validators) {
        container[modelName]['schema'].path(key).validate(validators[key][0], validators[key][1]);
    }
*/
    container[modelName]['class'] = modelClass;
    mongoose.model(modelClass.entityName, container[modelName]['schema']);
    return container;
}

DaoMongo.prototype.bindEnv = function(env) {
    this._env = env;
}

DaoMongo.prototype.getEnv = function() {
    return this._env;
}

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

// ------------------------------------------------------------------------ CRUD

DaoMongo.prototype.errorParse = function(err, responseData) {
    var friendlyError;
    this.log('Error: create(): ' + err);
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
        friendlyError = responseData;
    }

    return friendlyError;
};

/**
 *
 * Creates a new model in the db
 *
 * @param BipModel model source model
 * @param function callback
 * @param Object account info
 */
DaoMongo.prototype.create = function(model, callback, accountInfo, daoPostSave) {
    var self = this, mongoModel, resp;
    var nowTim = helper.nowUTCSeconds();

    if (model) {
        var MongooseModel = mongoose.model(model.getEntityName());

        model[ model.getEntityIndex() ] = uuid();
        model[ model.getEntityCreated() ] = nowTim;
        model.preSave(accountInfo);

        var mongoModel = model.toMongoModel(new MongooseModel());

        mongoModel.save(function(err) {
            if (err) {
                app.logmessage(err, 'error');
                if (callback) {
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

                        MongooseModel.findOne(filter, function(gErr, result) {
                            if (gErr || !result) {
                                callback(self.errorParse(err), null, null, self.errorMap(err) );
                            } else {
                                model.populate(result, accountInfo);
                                callback(
                                    self.errorParse(err, model),
                                    model.getEntityName(),
                                    model,
                                    self.errorMap(err)
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
                        callback(self.errorParse(err, model), model.getEntityName(), errResp, self.errorMap(err) );
                    }
                }
                return null;
            }

            // populate from mongo model into our model, and build a representation
            model.populate(mongoModel, accountInfo);
            model.postSave(accountInfo, function(err, modelName, retModel, code) {
                callback(err, modelName, retModel, code );
                // depending on the model, we can inject post-saves which are
                // outside the model's scope, such as notifications, or other
                // types of bindings.
                if (daoPostSave) {
                    daoPostSave(err, modelName, retModel, code );
                }
            }, true);

            return model;
        });
    } else {
        this.log('Error: create(): cannot save item');
        if (callback) {
            callback(true, null, null, 500);
        }
    }
};

// model = dao.modelFactory(resourceName, filterModel(writeFilters.length, writeFilters, req.body), accountInfo, true);
// dao.update(req.body.id, model, restResponse(res), accountInfo);

function getObjectClass(obj) {
    if (obj && obj.constructor && obj.constructor.toString) {
        var arr = obj.constructor.toString().match(
            /function\s*(\w+)/);

        if (arr && arr.length == 2) {
            return arr[1];
        }
    }

    return undefined;
}

DaoMongo.prototype.update = function(modelName, id, props, next, accountInfo) {
    var self = this,
    propName,
    repr,
    objProp,
    options = {},
    newModel,
    nowTime = helper.nowUTCSeconds();
    // create model container
    model = this.modelFactory(modelName, {}, accountInfo);

    if (model) {
        var MongooseClass = mongoose.model(model.getEntityName());
        model.id = id;

        var filter = self.getObjectIdFilter(model, accountInfo);

        props = helper.pasteurize(props);

        // find matching document
        MongooseClass.findOne(filter, function(err, result) {

            if (err) {
                next(true, null, null, 500);
            } else if (!result) {
                next(true, null, null, 404);

            } else {
                var propKeys = [];
                props.updated = nowTime;

                for (key in props) {
                    propKeys.push(key);
                }

                // cast result into a mongomodel
                var updateModel = self.modelFactory(modelName, result, accountInfo);
                updateModel = helper.copyProperties(props, updateModel, true);

                // pass in result so we can make preSave decisions based on
                // what's been changed (outside of model validation)
                updateModel.preSave(accountInfo, result);

                var newMongoModel = updateModel.toMongoModel(result);

                newMongoModel.save(function(err) {
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
                                            filter[key] = result[key];
                                        }
                                    }
                                }

                                MongooseClass.findOne(filter, function(gErr, result) {
                                    if (gErr || !result) {
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
                    model.populate(result, accountInfo);

                    model.postSave(accountInfo, function(err, modelName, retModel, code) {
                        next(err, modelName, retModel, code );
                    });

                    return model;
                });
            }
        });
    } else {
        this.log('Error: update(): cannot save item');
        if (next) {
            next(true, null, null, 500);
        }
    }
}

DaoMongo.prototype.get = function(model, modelId, accountInfo, callback) {
    var self = this;

    var TargetMongoModelClass = mongoose.model(model.getEntityName());

    var findObject = self.getObjectIdFilter({
        id : modelId
    }, accountInfo);

    TargetMongoModelClass.findOne(findObject, function (err, result) {
        var loadedModel;
        if (err) {
            self.log('Error: get(): ' + err);
            if (callback) {
                callback(false, null);
                return null;
            }
        }

        if (result) {
            // hydrate model
            model.populate(result, accountInfo);
        }

        if (callback) {
            // cast results in its result object
            callback(false, model.getEntityName(), result ? model : result);
        }
    });
};

DaoMongo.prototype.remove = function(model, modelId, accountInfo, callback) {
    var self = this;

    var MongoClass = mongoose.model(model.getEntityName());

    var findObject = self.getObjectIdFilter({
        id : modelId
    }, accountInfo);

    // @todo ensure the row can actually be removed without conflict

    MongoClass.remove(findObject, function (err, result) {
        if (err || result == 0) {
            self.log('Error: remove(): ' + err);
            if (callback) {
                callback(false, null);
                return null;
            }
        }

        if (callback) {
            callback(false, model.getEntityName(), {
                'status' : 'OK'
            });
        }
        return result;
    });
};

DaoMongo.prototype.removeFilter = function(modelName, filter, next) {
    var self = this,
    MongoClass = mongoose.model(modelName);

    MongoClass.remove(filter, function (err, result) {
        if (err || result == 0) {
            self.log('Error: remove(): ' + err);
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
    var owner_id = accountInfo.user.id;
    var self = this, cacheKey = 'slist_' + modelName + '_' + owner_id + '_' + page + '_' + page_size;
    var mongoFilter = {
        'owner_id' : owner_id
    }

    var sortMap = {
        'recent' : 'created',
        'active' : 'imp_actual',
        'alphabetical' : 'name'
    }


    var model = self.mongooseFactory(modelName);
    var query = model.find( mongoFilter );

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
            self.log('Error: list(): ' + err);
            if (callback) {
                callback(false, err);
            }
        } else {
            if (page_size && page) {
                query = query.limit(page_size).skip( (page - 1)  * page_size );
            }

            if (sortMap[orderBy]) {
                query = query.sort(sortMap[orderBy] + ' -test');
            }

            query.execFind(function (err, results) {
                var model;
                if (err) {
                    self.log('Error: list(): ' + err);
                    if (callback) {
                        callback(false, err);
                    }
                } else {
                    // convert to models
                    realResult = [];
                    for (key in results) {
                        model = self.modelFactory(modelName, results[key], accountInfo);
                        //model.decorate();
                        realResult.push(model);
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

/**
 * Lists all actions for an account
 *
 * @todo cache
 */
DaoMongo.prototype.listChannelActions = function(type, accountInfo, callback) {
    // get available actions for account
    var modelName = 'channel',
    self = this,
    c = this.modelFactory(modelName),
    owner_id = accountInfo.user.id,
    actions = type == 'actions' ? c.getActionList() : c.getEmitterList(),
    filter = {
        action : {
            $in : actions
        },
        owner_id : owner_id
    },
    model = self.mongooseFactory(modelName),
    query = model.find( filter );

    query.execFind(function (err, results) {
        var model;
        if (err) {
            self.log('Error: list(): ' + err);
            if (callback) {
                callback(false, err);
            }
        } else {
            // convert to models
            realResult = [];
            for (key in results) {
                model = self.modelFactory(modelName, results[key], accountInfo);
                realResult.push(model);
            }

            var resultStruct = {
                'data' : realResult
            }

            if (callback) {
                callback(false, modelName, resultStruct );
            }
        }
    });
}

DaoMongo.prototype.getModelPrototype = function() {
    return this._modelPrototype;
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

DaoMongo.prototype.mongooseFactory = function(modelName) {
    return mongoose.model(modelName);
}

/**
 * @todo cache
 */
DaoMongo.prototype.find = function(modelName, filter, callback) {
    this.mongooseFactory(modelName).findOne(filter, function (err, result) {
        if (err) {
            console.log('Error: get(): ' + err);
            if (callback) {
                callback(true, null);
            }
        }
        if (callback) {
            // cast results in its result object
            callback(false, result);
        }
    });
};

DaoMongo.prototype.findFilter = function(modelName, filter, callback) {
    this.mongooseFactory(modelName).find(filter, function (err, result) {
        if (err) {
            console.log('Error: get(): ' + err);
            if (callback) {
                callback(true, null);
            }
        }
        if (callback) {
            // cast results in its result object
            callback(false, result);
        }
    });
};

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

// ---------------------- USERS
function AccountInfo(account) {
    this.user = account;
}

AccountInfo.prototype = {
    getSetting : function(setting) {
        return this.user.settings.getValue(setting);
    },
    getId : function() {
        return this.user.id;
    },
    getActiveDomain : function() {
        return this.user.activeDomainId;  
    },
    getDefaultDomain: function() {
        return this.user.domains.get(this.user.defaultDomainId);
    },
    getDefaultDomainStr : function(incProto) {
        var defaultDomain = this.getDefaultDomain();
        var proto = (incProto) ? CFG.proto_public : '';
        return proto + defaultDomain.name;
    },
    getName : function() {
        return this.user.name;
    }
};

/**
 *
 */
DaoMongo.prototype.checkAuth = function(username, password, type, cb, asOwnerId, activeDomainId) {
    var self = this;
    var filter = {};

    if (asOwnerId) {
        filter['id'] = username;
    } else {
        filter['username'] = username;
    }

    this.find(
        'account',
        filter,
        function(err, acctResult) {
            if (!err && (null != acctResult)) {

                var filter = {
                    'owner_id' : acctResult.id,
                    'type' : type
                }

                self.find('account_auth', filter, function(isErr, result) {
                    var resultModel = null;
                    if (!isErr && null != result) {
                        var authModel = self.modelFactory('account_auth', result);

                        if (asOwnerId || authModel.cmpPassword(password)) {
                            authModel.username = username;
                            isErr = false;
                            // session usable abstract model of the account
                            resultModel = {
                                id : acctResult.id,
                                name : acctResult.name,
                                username : username,
                                is_admin: acctResult.is_admin,
                                settings: {
                                    api_token: null
                                }
                            }

                            // finally, try to pull out the users auth token and account options
                            step(
                                function loadAcctInfo() {
                                    self.find(
                                        'account_auth',
                                        {
                                            'owner_id' : acctResult.id,
                                            'type' : 'token'
                                        },
                                        this.parallel()
                                        );

                                    self.find(
                                        'account_option',
                                        {
                                            'owner_id' : acctResult.id
                                        },
                                        this.parallel());

                                    // get domains (for bip/channel representations
                                    self.findFilter(
                                        'domain',
                                        {
                                            'owner_id' : acctResult.id
                                        },
                                        this.parallel());

                                    // get channels (for id lookups)
                                    self.findFilter(
                                        'channel',
                                        {
                                            'owner_id' : acctResult.id
                                        },
                                        this.parallel());
                                },
                                function collateResults(err, auth, options, domains, channels) {
                                    if (null == auth || null == options) {
                                        err = true;
                                        resultModel = null;
                                    } else {

                                        var domainModels = {
                                            domains : {},
                                            set: function(model) {
                                                this.domains[model.id] = model;
                                            },
                                            get: function( id ) {
                                                return this.domains[id];
                                            },
                                            test: function(id) {
                                                return (undefined != this.domains[id]);
                                            }
                                        };

                                        for (idx in domains ) {
                                            domainModels.set(self.modelFactory('domain', domains[idx]));
                                            // set default domain.  system allocated 'vanity' domains
                                            // will respond to RPC calls etc.
                                            if (domains[idx].type == 'vanity') {
                                                resultModel.defaultDomainId = domains[idx].id;
                                            }
                                        }

                                        if (undefined === resultModel.defaultDomainId) {
                                            resultModel.defaultDomainId = "";
                                        }

                                        // attach authenticating domain context
                                        if (undefined == activeDomainId) {
                                            resultModel.activeDomainId = resultModel.defaultDomainId;
                                        } else {
                                            resultModel.activeDomainId = activeDomainId;
                                        }

                                        // there may be quite a few channels, but this
                                        // still seems a little cheaper
                                        var channelModels = {
                                            channels : {},
                                            set: function(model) {
                                                this.channels[model.id] = model;
                                            },
                                            get: function( id ) {
                                                return this.channels[id];
                                            },
                                            test: function(id) {
                                                return (undefined != this.channels[id]);
                                            }

                                        };

                                        for (idx in channels ) {
                                            channelModels.set(self.modelFactory('channel', channels[idx]));
                                        }

                                        resultModel.domains = domainModels;
                                        resultModel.channels = channelModels;
                                        resultModel.settings = options;

                                        var model = self.modelFactory('account_auth', auth);
                                        resultModel.settings.api_token = model.getPassword();
                                        resultModel.settings.api_token_auth = 'Basic ' + (new Buffer(username + ':' + model.getPassword()).toString('base64'));
                                    }

                                    var accountInfo = new AccountInfo(resultModel);
                                    cb(err, accountInfo);
                                });
                        } else {
                            result = null;
                        }
                    }

                    if (null == resultModel || null == result) {
                        cb(true, resultModel);
                    }
                });
            //            }
            } else {
                cb(true, null);
            }
        });
}

/**
 * Matches a domain and loads
 */
DaoMongo.prototype.domainAuth = function(domain, getUserInfo, cb) {
    var self = this;
    this.find('domain', {
        'name' : domain
    }, function(err, result) {
        if (err) {
            console.log(err);
        }

        if (getUserInfo) {
            if (result) {
                self.checkAuth(result.owner_id, '', 'token', function(err, acctResult) {
                    cb(err, acctResult);
                }, true, result.id);
            } else {
                cb(true, null);
            }
        } else {
            cb(err, result);
        }
    });
}


/**
 * Creates a user notification entry.  Expects payload of the form
 *
 * {
 *  account_id : 'abc123',
 *  message : 'text message',
 *  code : '@see account_log'
 * }
 */
DaoMongo.prototype.userNotify = function(payload, next) {
    var entry = {
        owner_id : payload.account_id,
        code : payload.code,
        content : payload.message
    }

    var model = dao.modelFactory('account_log', entry);
    dao.create(model);
}

// --------------------------------- Bip helpers

DaoMongo.prototype.pauseBip = function(props, cb, pause, transactionId) {
    // default pause (true == unpause)
    if (undefined == pause) {
        pause = true;
    }

    var jobPacket = {
        owner_id : props.owner_id,
        bip_id : props.id
    };

    if (transactionId ) {
        var model = this.modelFactory('bip', props);

        var MongoModel = this.mongooseFactory(model.getEntityName());
        var idx = model.getEntityIndex();

        var filter = {};
        filter[idx] = model.getIdValue()
        MongoModel.update( filter, {
            'paused' : pause
        } ).exec();

        jobPacket.transaction_id = transactionId;
        jobPacket.code = 'bip_paused';

    } else {
        jobPacket.code = 'bip_paused_manual';
    }

    app.bastion.createJob(DEFS.JOB_BIP_ACTIVITY, jobPacket);

};


// update account options with the selected bip's config.
DaoMongo.prototype.setDefaultBip = function(bipId, targetModel, accountInfo, cb) {
    var self = this;
    // get bip
    this.find('bip', {
        id : bipId,
        owner_id : accountInfo.user.id
    }, function(err, result) {
        if (err) {
            cb(self.errorParse(err), null, null, self.errorMap(err) );
        } else {
            // update into account options
            targetModel.bip_config = result.config;
            targetModel.bip_domain_id = result.domain_id;
            targetModel.bip_end_life = result.end_life;
            targetModel.bip_hub = result.hub;
            targetModel.bip_type = result.type;

            // update into account options
            self.update(
                'account_option',
                targetModel.id,
                targetModel,
                cb,
                accountInfo
            );
        }
    });
};

DaoMongo.prototype.webFinger = function(emailAddress, next) {
    next();
}

DaoMongo.prototype.shareBip = function(bip, cb) {
    var self = this,
    modelName = 'bip_share',
    hub = helper.copyProperties(bip.hub, {}, true),
    derivedHub = {},
    manifest = {},
    channels = bip.accountInfo.user.channels,
    derivedSrc = '',
    txSrcNorm = '',
    template = '',
    regUUID = helper.getRegUUID(),
    cMatch;

    function channelTranslate(src) {
        // skip source in manifest
        if (src !== 'source') {
            src = channels.get(src).action;
            manifest[src] = true;
        }

        return src;
    }

    // ugh.
    function keyNormalize(src) {
        return src.replace('.', '-');
    }

    for (var src in hub) {
        if (hub.hasOwnProperty(src)) {
            derivedSrc = channelTranslate(src);

            derivedSrc = keyNormalize(derivedSrc);

            derivedHub[derivedSrc] = {
                edges : [],
                transforms : {}
            };

            for (var i = 0; i < hub[src].edges.length; i++) {
                derivedHub[derivedSrc].edges.push(channelTranslate(hub[src].edges[i]));
            }

            if (hub[src].transforms) {
                for (var txSrc in hub[src].transforms) {
                    txSrcNorm = keyNormalize(channelTranslate(txSrc));
                    derivedHub[derivedSrc].transforms[txSrcNorm] = {};

                    for (var cImport in hub[src].transforms[txSrc]) {
                        template = hub[src].transforms[txSrc][cImport];
                        cMatch = template.match(regUUID);
                        if (cMatch && cMatch.length) {
                            for (var j = 0; j < cMatch.length; j++) {
                                template = template.replace(cMatch[j], channelTranslate(cMatch[j]));
                            }
                        }
                        derivedHub[derivedSrc].transforms[txSrcNorm][cImport] = template;
                    }
                }
            }
        }
    }

    var config = helper.copyProperties(bip.config, {});
    // always force auth on shared http bips.
    if (bip.type === 'http') {
        config.auth = 'token'
        delete config.username;
        delete config.password;
    } else if (bip.type === 'trigger' && bip.config.channel_id) {
        config.channel_id = channelTranslate(bip.config.channel_id);
    }

    // bip share struct
    var bipShare = {
        bip_id : bip.id,
        type : bip.type,
        name : bip.name,
        note : bip.note,
        icon : bip.icon,
        config : config,
        hub : derivedHub,
        manifest : Object.keys(manifest),
        owner_id : bip.owner_id,
        owner_name : bip.accountInfo.user.name
    },
    model = this.modelFactory(modelName, bipShare, bip.accountInfo);

    bipShare.manifest_hash = helper.strHash(bipShare.manifest.join());

    var MongooseModel = mongoose.model(model.getEntityName());

    // find & update or create for bip/owner pair
    MongooseModel.findOne(
    {
        owner_id : bip.accountInfo.user.id,
        bip_id : bip.id
    },
    function(err, result) {
        if (err) {
            cb(self.errorParse(err), null, null, self.errorMap(err) );
        } else {
            if (!result) {
                self.create(model, cb, bip.accountInfo);
                app.bastion.createJob(DEFS.JOB_USER_STAT, {
                    owner_id : bip.owner_id,
                    type : 'share_total'
                } );

            } else {
                self.update(modelName, result.id, bipShare , cb, bip.accountInfo);
            }
        }
    }
    );
}


DaoMongo.prototype.generateHubStats = function(next) {
    var self = this;
    // get users
    this.findFilter('account', {}, function(err, results) {
        var accountId,
        globalStats = {

        };

        if (err) {
            next(err);
        } else {
            if (!results) {
                next(true, 'NO ACCOUNTS FOUND');
            } else {
                var numProcessed = 0, numResults = results.length;
                for (var i = 0; i < numResults; i++) {
                    accountId = results[i].id;
                    step(
                        function loadNetwork() {
                            //console.log('processing ' + results[i].id)
                            self.findFilter(
                                'channel',
                                {
                                    'owner_id' : accountId
                                },
                                this.parallel()
                                );

                            self.findFilter(
                                'bip',
                                {
                                    'owner_id' : accountId
                                },
                                this.parallel()
                                );
                        },

                        function done(err, channels, bips) {
                            if (!err) {
                                var channelMap = {},
                                j,
                                bip,
                                from,
                                to,
                                chordKey = '',
                                //chordKeyPod = '',
                                networkData = {};

                                // translate channel id's into actions
                                for (j = 0; j < channels.length; j++) {
                                    if (!channelMap[channels[j].id]) {
                                        channelMap[channels[j].id] = channels[j].action;
                                    }
                                }

                                delete channels;

                                for (j = 0; j < bips.length; j++) {
                                    bip = bips[j];
                                    for (var key in bip.hub) {
                                        if (bip.hub.hasOwnProperty(key)) {
                                            if (key === 'source') {
                                                from = bip.type === 'trigger' ?
                                                channelMap[bip.config.channel_id] :
                                                'bip.' + bip.type;
                                            } else {
                                                from = channelMap[key]
                                            }

                                            // skip bad hubs or deleted channels that
                                            // are yet to resolve.
                                            if (from) {
                                                for (var k = 0; k < bip.hub[key].edges.length; k++) {
                                                    to = channelMap[bip.hub[key].edges[k]];
                                                    if (to) {
                                                        // truly nasty.
                                                        chordKey = (from + ';' + to).replace(new RegExp('\\.', 'g'), '#');
                                                        //chordKey = .replace('.', '_');

                                                        //chordKeyPod = from.split('.')[0] + '-' + to.split('.')[0];
                                                        if (!networkData[chordKey]) {
                                                            networkData[chordKey] = 0;
                                                        }
                                                        networkData[chordKey]++;

                                                        if (!globalStats[chordKey]) {
                                                            globalStats[chordKey] = 0;
                                                        }
                                                        globalStats[chordKey]++;
                                                    }
                                                }
                                            }

                                        }
                                    }
                                }

                                numProcessed++;
                                // write
                                if (Object.keys(networkData).length > 0) {
                                    self.setNetworkChordStat(
                                        accountId,
                                        {
                                            data : networkData
                                        },
                                        function(err) {
                                            if (err) {
                                                next(err, err);
                                            } else if (numProcessed === numResults ) {
                                                app.logmessage('Processed ' + numProcessed + ' accounts');
                                                app.logmessage('Writing System Entry ');
                                                self.setNetworkChordStat(
                                                    'system',
                                                    {
                                                        data : globalStats
                                                    },
                                                    function(err) {
                                                        if (err) {
                                                            next(err, err);
                                                        } else {
                                                            next(false, 'ok');
                                                        }
                                                    }
                                                    );
                                            }
                                        }
                                        );
                                }
                            } else {
                                next(true, err);
                            }

                        }
                        );
                }

            /*
                while (done >= results.length) {

                }
                // write global stats
                self.setNetworkChordStat(
                    'system',
                    {
                        data : globalStats
                    },
                    function(err) {
                        if (err) {
                            console.log(err);
                        }
                    }
                );
                        */
            }
        }
    });
/*
    this.findFilter('bips', {}, function(err, results) {
        if (err) {
            next(err);
        } else {
            if (!results) {
                next(false, 'NO HUB STATS');
            } else {
                var userStats = {}, r, statKey;
                for (var i = 0; i < results.length; i++) {
                    r = results[i];

                    if (!userStats[r]) {
                        userStats[r] = {};
                    }

                    for (var key in r.hub) {

                    }


                    console.log(r);

                }

                console.log(userStats);

                next(false, 'ok');
            }
        }
    });
    */
}

/**
 * Gets a transformation hint for the requested adjacent channels
 */
DaoMongo.prototype.getTransformHint = function(accountInfo, from, to, next) {
    var filter = {
        $or : [ {
            owner_id : accountInfo.user.id
        }, {
            owner_id : 'system'
        } ],
        from_channel : from,
        to_channel : to
    };

    this.findFilter('transform_default', filter, function(err, results) {
        var result;

        if (err || !results || results.length === 0) {
            //next(err, 'transform_default');
            next(err, null);
        } else {
            if (results) {
                console.log(results);
                results.sort(function(a, b) {
                    if (a.owner_id > b.owner_id) {
                        return 1;
                    } else if (a.owner_id < b.owner_id) {
                        return -1;
                    } else {
                        return 0;
                    }
                });
                result = results[0];
            } else {
                result = {};
            }
            next(false, 'transform_default', result);
        }
    });
};


DaoMongo.prototype.setTransformDefaults = function(newDefaults) {
    var filter = {
        owner_id : newDefaults.owner_id,
        from_channel : newDefaults.from_channel,
        to_channel : newDefaults.to_channel
    },
    self = this,
    model,
    modelName = 'transform_default';

    this.findFilter(modelName, filter, function(err, result) {
        if (!err) {
            if (result && result.length > 0 ) {
                self.updateColumn(modelName, filter, newDefaults, function(err, result) {
                    if (err) {
                        app.logmessage(err, 'error');
                    }
                });
            } else {
                model = self.modelFactory(modelName, newDefaults);
                self.create(model, function(err, result) {
                    if (err) {
                        app.logmessage(err, 'error');
                    }
                });
            }
        } else {
            app.logmessage(err, 'error');
        }
    });
};

DaoMongo.prototype.setNetworkChordStat = function(ownerId, newNetwork, next) {
    var nowDay = helper.nowDay(),
    filter = {
        owner_id : ownerId,
        day : nowDay
    },
    self = this,
    model,
    modelName = 'stats_account_network';

    newNetwork.day = nowDay;
    newNetwork.owner_id = ownerId;
    newNetwork.updated_at = helper.nowUTCSeconds();

    this.findFilter(modelName, filter, function(err, result) {
        if (!err) {
            if (result && result.length > 0 ) {
                self.updateColumn(modelName, filter, newNetwork, function(err, result) {
                    if (err) {
                        app.logmessage(err, 'error');
                    }
                    next(err, result);
                });
            } else {
                model = self.modelFactory(modelName, newNetwork);
                self.create(model, function(err, result) {
                    if (err) {
                        app.logmessage(err, 'error');
                    }
                    next(err, result);
                });
            }
        } else {
            app.logmessage(err, 'error');
            next(err, result);
        }
    });
}

DaoMongo.prototype.bipLog = function(payload) {
    var self = this,
    model,
    modelName = 'bip_log';

    model = self.modelFactory(modelName, payload);
    self.create(model, function(err, result) {
        if (err) {
            app.logmessage(err, 'error');
        }
    });
}

/*
DaoMongo.prototype.bipLog = function(payload) {
    var filter = {
        owner_id : payload.owner_id,
        bip_id : payload.bip_id,
        code : payload.code
    },
    self = this,
    model,
    modelName = 'bip_log';

    if (filter.transaction_id) {
        filter.transaction_id = payload.transaction_id
    }

    this.findFilter(modelName, filter, function(err, result) {
        if (!err) {
            if (result && result.length > 0 ) {
                // @todo - should show delivery errors etc.
                self.updateColumn(modelName, filter, payload, function(err, result) {
                    if (err) {
                        app.logmessage(err, 'error');
                    }
                });
            } else {
                model = self.modelFactory(modelName, payload);
                self.create(model, function(err, result) {
                    if (err) {
                        app.logmessage(err, 'error');
                    }
                });
            }
        } else {
            app.logmessage(err, 'error');
            next(err, result);
        }
    });
}
*/
/**
 *
 * Given a referer, attempts to call out to the site and discover a usable
 * image which we can normalise and store. (favicon.ico for now)
 *
 * Where the icon already exists locally, we return a cached link to the site CDN
 * icon factory of /static/img/cdn/icofactory/{referer hash}.ico
 *
 * @param string bip id
 * @param string referer FQDN - including protocol
 */
DaoMongo.prototype.getBipRefererIcon = function(bipId, referer, blocking, cb) {
    var iconUri,
    fileSuffix = '.ico',
    ok = true,
    iconSource = referer.replace("https", 'http') + '/favicon' + fileSuffix,
    cdnPath = 'icofactory',
    jobPayload;

    if (referer) {
        // create hash
        var hashFile = helper.strHash(iconSource) + fileSuffix,
        dDir = process.cwd() + DEFS.DATA_DIR + '/cdn/img/' + cdnPath + '/',
        filePath = dDir + hashFile,
        cdnUri = CFG.cdn_public + '/' + cdnPath + '/' + hashFile;

        jobPayload = {
            bip_id : bipId,
            referer_icon_path : iconSource,
            dst_file : filePath,
            icon_uri : cdnUri
        };

        // !!warning!! sync check
        if (helper.existsSync(filePath)) {
            iconUri = cdnUri;
            if (cb) {
                cb(false, jobPayload);
            }
        } else {
            if (!blocking) {
                // @todo stubbed. Queue not yet implemented
                app.bastion.createJob(DEFS.JOB_ATTACH_REFERER_ICON, jobPayload);
            } else {
                // for testing purposes
                this._jobAttachBipRefererIcon(jobPayload, cb);
            }
        }
    }
    return iconUri;
}

/**
 * Deferred job to attach a 3rd party icon to the given bip after saving to the CDN
 *
 * @todo move this into a jobRunner class (bsation)
 *
 */
DaoMongo.prototype._jobAttachBipRefererIcon = function(payload, next) {
    var bipId = payload.bip_id,
    dstFile = payload.dst_file,
    refererIconPath = payload.referer_icon_path,
    iconUri = payload.icon_uri,
    self = this;

    if (!next) {
        next = function(err, response) {
            console.log(err);
        }
    }

    helper.exists(dstFile, function(exists) {
        if (!exists) {
            cdn.httpFileSnarf(refererIconPath, dstFile, function(err, resp) {
                if (err) {
                    next(true, resp);
                } else {
                    if (bipId) {
                        self.updateColumn('bip', bipId, {
                            icon : iconUri
                        });
                    }
                    next(false, payload);
                }
            });
        } else {
            if (bipId) {
                self.updateColumn('bip', bipId, {
                    icon : iconUri
                });
            }
            next(false, payload);
        }
    });
}

/**
 *
 *
 * @todo - convert to png
 */
DaoMongo.prototype.getAvRemote = function(ownerId, avUrl, blocking, cb) {
    var iconUri,
    fileSuffix = '.ico',
    ok = true,
    jobPayload,
    tokens = avUrl.split('.'),
    ext = tokens[tokens.length - 1];
    fileName = ownerId + '.' + ext,
    // via {username}.bip.io/profile/av
    // or website bip.io/static/cdn/av/{owner_id}.png
    dDir = process.cwd() + DEFS.DATA_DIR + '/cdn/img/av/';
    filePath = dDir + fileName;


    jobPayload = {
        owner_id : ownerId,
        avatar_url : avUrl,
        dst_file : filePath
    };

    if (!blocking) {
        // @todo stubbed. Queue not yet implemented
        app.bastion.createJob(DEFS.JOB_ATTACH_REFERER_ICON, jobPayload);
    } else {
        // for testing purposes
        this._jobAttachUserAvatarIcon(jobPayload, cb);
    }
}

/**
 *
 * Deferred job to pull an image url to the cdn and bind it to a users avatar.
 *
 */
DaoMongo.prototype._jobAttachUserAvatarIcon = function(payload, next) {
    var ownerId = payload.owner_id,
    avPath = payload.avatar_url,
    dstFile = payload.dst_file
    self = this;

    if (!next) {
        next = function(err, response) {
            console.log(err);
            console.log(response);
        }
    }

    // don't care if the file exists or not, just suck it down.
    cdn.httpFileSnarf(avPath, dstFile, function(err, resp) {
        var convertArgs = [ dstFile, '-resize', '125x125' ];

        // if avPath isn't a jpeg, convert it
        if (! /(jpg|jpeg)$/i.test(dstFile)  ) {
            var newDst = dstFile.split('.');
            newDst.pop();
            newDst = newDst.join('.') + '.jpg';
            convertArgs.push(newDst);
        }

        cdn.convert(convertArgs, function(err, stdout) {
            if (err) {
                next(true, resp);
            } else {
                next(false, payload);
            }
        });
    });
}

/**
 *
 * Trigger all trigger bips
 *
 */
DaoMongo.prototype.triggerAll = function(cb) {
    var self = this,
    filter = {
        type : 'trigger',
        paused : false
    };

    this.mongooseFactory('bip').find(filter).exec(function(err, results) {
        if (!err && results) {
            numResults = results.length;
            numProcessed = 0;
            // @todo this is some ghetto shit. Hope we can get these triggers off fast enough.
            for (var i = 0; i < numResults; i++) {
                // fire off a bip trigger job to rabbit
                app.logmessage('Triggering [' + results[i].id + ']');
                app.bastion.createJob( DEFS.JOB_BIP_TRIGGER,results[i], function() {
                    numProcessed++;
                    app.logmessage('Trigger [' + results[i].id + '] Complete');
                    if (numProcessed == numResults) {
                        cb(false, numProcessed + ' Triggers Fired');
                    }
                });
            }
        } else {
            cb(false, 'No Bips'); // @todo maybe when we have users we can set this as an error! ^_^
        }
    });
}

/**
 *
 * Expires bips
 *
 */
DaoMongo.prototype.expireAll = function(cb) {
    var self = this;
    // find all users
    this.mongooseFactory('account_option').find().exec(function(err, results) {
        var ownerPref = {},
        numResults,
        nowTime = Math.floor(
            new time.Date().
            setTimezone('UTC').
            getTime() / 1000
            );

        if (!err && results) {
            numResults = results.length;
            for (var i = 0; i < numResults; i++) {
                ownerPref[results[i].owner_id] = {
                    tz : results[i].timezone,
                    mode : results[i].bip_expire_behaviour
                }
            }
            self.mongooseFactory('bip').find({
                paused : false
            } ).
            where('end_life.time').
            gt(0).
            lt(nowTime).
            exec(function(err, results) {
                var numResults, result, pref, offsetSeconds;
                if (!err && results) {
                    numResults = results.length;
                    for (var i = 0; i < numResults; i++) {
                        result = results[i];
                        pref = ownerPref[result.owner_id];
                        if ('pause' === pref['mode']) {
                            console.log(result.id + ' pausing');
                            self.updateColumn('bip', result.id, {
                                paused : true
                            }, function(err) {
                                if (err) {
                                    console.log('ERROR');
                                    cb(true, result);
                                } else {
                                    console.log(result.id + ' paused');
                                }
                            });
                        // self.updateColumn = function(modelName, id, props, next) {
                        } else if ('delete' === pref['mode']) {
                            console.log(result.id + ' deleting');
                            result.remove(function(err, result) {
                                if (err) {
                                    cb(true, result);
                                } else {
                                    console.log(result.id + ' deleted');
                                }
                            });
                        }
                    }
                }
                cb(false, '');
            });
        } else {
            cb(false, '');
        }
    });
}

// --------------------------------- Channel helpers
//
// POD RPC
DaoMongo.prototype.pod = function(podName) {
    return this.models['channel']['class'].pod(podName);
}

// --------------------------------- Public Utilities

/**
 * @todo cache bust
 *
 *
 * Increments an accumulator field on a model
 */
DaoMongo.prototype.accumulate = function(modelName, props, accumulator, inc) {
    var model = this.modelFactory(modelName, props);

    // cast to mongoose model
    var MongoModel = this.mongooseFactory(model.getEntityName());
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
    MongoModel = this.mongooseFactory(model.getEntityName()),
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
    var MongoModel = this.mongooseFactory(model.getEntityName());

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

DaoMongo.prototype.describe = function(model, subdomain, next, accountInfo) {
    var modelClass, resp = {}, exports = {};

    if (model == 'pod') {
        model = 'channel';
        modelClass = this.modelFactory(model);

        // describe all pods
        var pods = modelClass.pod();
        var authChecks = [], checkFunction;

        for (var key in pods) {
            // introspect a single pod if flagged
            if (subdomain && key != subdomain) {
                continue;
            }
            resp[key] = pods[key].describe(accountInfo);

            // prep the oAuthChecks array for a parallel datasource check
            if (resp[key].auth.type != 'none') {
                authChecks.push(
                    function(podName) {
                        return function(cb) {
                            return pods[podName].authStatus( accountInfo.getId(), podName, cb );
                        }
                    }(key) // self exec
                    );
            }
        }

        // for any pods which have oauth, try to discover their status
        if (authChecks.length > 0) {
            async.parallel(authChecks, function(err, results) {
                if (!err) {
                    for (idx in results) {
                        var podName = results[idx][0],
                        authType = results[idx][1],
                        result = results[idx][2];

                        if (null !== result && resp[podName]) {
                            resp[podName].auth.status = 'accepted';
                        }
                    }
                    next(false, null, resp);
                } else {
                    next(err, null, resp);
                }
            });
        } else {
            next(false, null, resp);
        }

    // describe bip type exports
    } else if (model == 'bip') {
        modelClass = this.modelFactory(model);
        next(false, null, modelClass.exports);

    } else {
        //modelClass = this.modelFactory(model);
        next(false, null);
    }
}

module.exports.DaoMongo = DaoMongo;
