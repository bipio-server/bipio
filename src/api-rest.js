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
app = module.parent.exports.app;

var util        = require('util'),
    express     = require('express'),
    helper      = require('./lib/helper'),
    DaoMongo    = require('./managers/dao-mongo').DaoMongo,
    Bastion    = require('./managers/bastion').Bastion,
    CacheRedis  = require('./managers/cache-redis').CacheRedis,
    //    tldtools    = require('tldtools'),
    uuid            = require('node-uuid'),
    utils = require('express/node_modules/connect/lib/utils'),
    cdn      = require('./lib/cdn');

var cache       = new CacheRedis(app.envConfig.storeRedis, app.redisClient, app.logmessage, app.defs.DEFAULT_CACHE_EXPIRE_SECS);

var dao         = new DaoMongo(app.envConfig.dbMongo, app.mongoClient, app.logmessage, cache);
var modelPublicFilter = dao.getModelPublicFilters();
var bastion     = new Bastion(dao);
app.bastion = bastion;

function filterModel(filterLen, modelPublicFilters, modelStruct) {
    var result = {};
    for (var i = 0; i < filterLen; i++) {
        publicAttribute = modelPublicFilters[i];
        if (undefined != modelStruct[publicAttribute]) {
            result[publicAttribute] = modelStruct[publicAttribute];
        }
    }
    return result;
}

/**
 * takes a result JSON struct and filters out whatever is not in a public
 * filter for the supplied model
 */
function publicFilter(modelName, modelStruct) {
    var result = {}, filterLen, modelLen,
        publicAttribute,
        context = modelStruct,
        modelPublicFilters;

    if (modelName) {
        modelPublicFilters = modelPublicFilter[modelName]['read'];
    } else {
        modelPublicFilters = [];
    }


    // always allow representations and meta data
    modelPublicFilters.push('_repr');
    modelPublicFilters.push('_href');
    modelPublicFilters.push('_renderers');
    modelPublicFilters.push('status');
    modelPublicFilters.push('message');
    modelPublicFilters.push('code');
    modelPublicFilters.push('errors');

    filterLen = modelPublicFilters.length;

    // if it looks like a collection, then filter into the collection
    if (undefined != modelStruct.data) {
        for (key in modelStruct) {
            if (key == 'data') {
                result['data'] = [];

                context = modelStruct.data;
                modelLen = context.length;

                // filter every model in the collection
                for (var i = 0; i < modelLen; i++) {
                    result['data'].push(filterModel(filterLen, modelPublicFilters, context[i]));
                }
            } else {
                result[key] = modelStruct[key];
            }
        }
    } else {
        result = filterModel(filterLen, modelPublicFilters, modelStruct);
    }

    return result;
}

/**
 * Wrapper for express.basicAuth. Checks the session for an authed flag and
 * if fails, defers to http basic auth.
 */
function restAuthWrapper(req, res, cb) {
    return express.basicAuth(function(user, pass, cb){
        dao.checkAuth(user, pass, 'token', cb);
    })(req, res, cb);
}

/**
 * Normalizes response data, catches errors etc.
 */
var restResponse = function(res) {
    return function(error, modelName, results, code, options) {
        var contentType = app.defs.CONTENTTYPE_JSON;

        if (options) {
            if (options.content_type) {
                contentType = options.content_type;
            }
        }

        res.contentType(contentType);

        /**
         * Post filter. Don't expose attributes that aren't in the public filter
         * list.
         */
        if (null != modelName) {
            if (results instanceof Array) {
                realResult = [];
                for (key in results) {
                    realResult.push(publicFilter(modelName, results[key]));
                }
            } else {
                realResult = publicFilter(modelName, results);
            }
        } else {
            realResult = results;
        }

        var payload = realResult;

        if (error) {
            if (!code) {
                code = 500;
                app.logmessage('Error response propogated without code', 'warning');
            }
            res.send(code, payload);
            return;
        } else {
            if (!results) {
                res.send(404);
                return;
            }
        }

        // results should contain a '_redirect' url
        if (code == 301) {
            res.redirect(results._redirect);
            return;
        }
        if (contentType == app.defs.CONTENTTYPE_JSON) {
            res.jsonp(!code ? '200' : code, payload);
        } else {
            res.send(!code ? '200' : code, payload);
        }
        return;
    }
}

function getReferer(req) {
    referer = req.query.referer;
    if (undefined == referer) {
        referer = req.header('Referer');
    }

    if (undefined == referer) {
        return null;
    } else {
        return helper.getDomainTokens(referer);
    }
}

// models exposed via rest
var restResources = ['bip', 'channel', 'domain', 'account_option'];

function decorateAccountInfo(remoteUser) {
    var accountInfo = {
        'user' : remoteUser,
        getSetting : function(setting) {
            return this.user.settings.getValue(setting);
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
    }
    return accountInfo;
}

/**
 * Generic RESTful handler for restResources
 */
var restAction = function(req, res) {
    var rMethod = req.method,
    accountInfo = decorateAccountInfo(req.remoteUser),
    owner_id = req.remoteUser.id,
    resourceName = req.params.resource_name,
    subResourceId = req.params.subresource_id,
    postSave;

    if (undefined != owner_id && helper.indexOf(restResources, resourceName) != -1) {
        if (rMethod == 'POST' || rMethod == 'PUT') {

            // hack for bips, inject a referer note if no note has been sent
            if (resourceName == 'bip') {
                var referer = getReferer(req);
                if (null != referer) {
                    if (undefined == req.body.note) {
                        req.body.note = 'via ' + referer.url_tokens.hostname;
                    }

                    // inject the referer favico
                    if (undefined == req.body.icon) {
                        postSave = function(err, modelName, retModel, code ) {
                            if (!err && retModel.icon == '') {
                                // @todo defer to out of band job
                                iconUri = dao.getBipRefererIcon(retModel.id, 'http://' + referer.url_tokens.hostname, true);
                                if (iconUri) {
                                    dao.updateColumn('bip', retModel.id, { icon : iconUri  });
                                }
                            }
                        }
                    }
                }
            }

            var model;

            if (rMethod == 'POST') {
                // populate our model with the request.  Set an owner_id to be the
                // authenticated user before doing anything else
                model = dao.modelFactory(resourceName, helper.pasteurize(req.body), accountInfo, true);
                dao.create(model, restResponse(res), accountInfo, postSave);
            } else if (rMethod == 'PUT') {

                // filter request body to public writable
                var writeFilters = modelPublicFilter[resourceName]['write'];
                if (undefined != req.body.id) {
                    dao.update(
                        resourceName,
                        req.body.id,
                        filterModel(writeFilters.length, writeFilters, req.body),
                        restResponse(res),
                        accountInfo
                    );
                } else {
                    res.send(404);
                }
            }
        } else if (rMethod == 'DELETE') {
            if (undefined != req.params.id) {
                var model = dao.modelFactory(resourceName, req.body, accountInfo, true);
                dao.remove(model, req.params.id, accountInfo, restResponse(res));
            } else {
                res.send(404);
            }
        } else if (rMethod == 'GET') {
            var filter = {};
            
            // @todo a little kludging for bip logs.  do something nicer later
            if ('bip' === resourceName && 'logs' === subResourceId) {
                filter.bip_id = req.params.id;
                resourceName = 'bip_log';
                
                req.params.id = undefined;
            }
                       
            if (undefined != req.params.id) {
                if (resourceName == 'channel' && (req.params.id == 'actions' || req.params.id == 'emitters' )) {
                    dao.listChannelActions(req.params.id, accountInfo, restResponse(res));
                } else {
                    var model = dao.modelFactory(resourceName, {}, accountInfo);
                    dao.get(model, req.params.id, accountInfo, restResponse(res));                   
                }
            } else {
                var page_size = 10,
                page = 1,
                order_by = 'recent';

                if (undefined != req.query.page_size) {
                    page_size = parseInt(req.query.page_size);
                }

                if (undefined != req.query.page) {
                    page = parseInt(req.query.page);
                }

                if (undefined != req.query.order_by &&
                    (req.query.order_by == 'recent' ||
                        req.query.order_by == 'active' ||
                        req.query.order_by == 'alphabetical')
                    ) {
                    order_by = req.query.order_by;
                }

                // extract filters
                if (undefined != req.query.filter) {
                    var tokens = req.query.filter.split(',');
                    for (i in tokens) {
                        var filterVars = tokens[i].split(':');
                        if (undefined != filterVars[0] && undefined != filterVars[1]) {
                            filter[filterVars[0]] = filterVars[1];
                        }
                    }
                }

                dao.list(resourceName, accountInfo, page_size, page, order_by, filter, restResponse(res));
            }
        }
    } else {
        res.send(404);
    }
    return;
}

app.all('*', function(req, res, next) {
    // these response headers handled by LB outside of dev
    if (app.settings.env == 'development') {
        res.header('Access-Control-Allow-Origin', '*');
        res.header("Access-Control-Allow-Headers", "X-Requested-With,Authorization,Accept,Origin,Content-Type");
        res.header("Access-Control-Allow-Methods", "GET,POST,PUT,DELETE,OPTIONS");
    }
    if (req.method == 'OPTIONS') {
        res.send(200);
    } else {
        next();
    }
});

app.post( '/rest/:resource_name', restAuthWrapper, restAction);
app.get( '/rest/:resource_name/:id?', restAuthWrapper, restAction);
app.get( '/rest/:resource_name/:id?/:subresource_id?', restAuthWrapper, restAction);
app.put( '/rest/:resource_name/:id?', restAuthWrapper, restAction);
app.del( '/rest/:resource_name/:id', restAuthWrapper, restAction);

// ---------------- RPC --------------------------------------------------------

/**
 * Noauth required
*/
app.get('/rpc/describe/:model/:model_subdomain?', restAuthWrapper, function(req, res) {
    var model = req.params.model,
    model_subdomain = req.params.model_subdomain;
    res.contentType(app.defs.CONTENTTYPE_JSON);

    accountInfo = decorateAccountInfo(req.remoteUser),
    dao.describe(model, model_subdomain, restResponse(res), accountInfo);
});

function channelRender(ownerId, channelId, req, res, responseWrapper) {
    var filter = {
                owner_id: ownerId,
                id : channelId
            };

    dao.find('channel', filter, function(err, result) {
        if (err || !result) {
            console.log(err);
            res.send(404);
        } else {
            var channel = dao.modelFactory('channel', result),
                action = channel.getPodTokens(),
                pod = dao.pod(action.pod),
                schema = action.getSchema(),
                renderer = req.params.renderer;

            pod.rpc(
                action.action,
                renderer,
                req.query,
                req,
                (schema.renderers[renderer] && schema.renderers[renderer].type == 'stream') ? res : responseWrapper(res),
                channel
            );
        }
    });
}

/**
 * DomainAuth channel renderer
 */
app.all('/rpc/render/channel/:channel_id/:renderer', function(req, res) {
    var domain = helper.getDomain(req.headers.host, true);

    dao.domainAuth(domain, true, function(err, accountResult) {
        if (err || !accountResult) {
            console.log(err);
            res.send(403);
        } else {
            var filter = {
                owner_id: accountResult.id,
                id : req.params.channel_id
            };

            dao.find('channel', filter, function(err, result) {
                if (err || !result) {
                    console.log(err);
                    res.send(404);
                } else {
                    req.remoteUser = decorateAccountInfo(accountResult);
                    var channel = dao.modelFactory('channel', result),
                        action = channel.getPodTokens(),
                        pod = dao.pod(action.pod),
                        schema = action.getSchema(),
                        renderer = req.params.renderer;

                    pod.rpc(
                        action.action,
                        renderer,
                        req.query,
                        req,
                        (schema.renderers[renderer] && schema.renderers[renderer].type == 'stream') ? res : restResponse(res),
                        channel
                    );
                }
            });
        }
    });
});

/**
 * Account Auth RPC, sets up oAuth for the selected pod, if the pod supports oAuth
 */
app.all('/rpc/oauth/:pod/:auth_method', restAuthWrapper, function(req, res) {
    var podName = req.params.pod,
        pod = dao.pod(podName),
        method = req.params.auth_method;

    // check that authentication is supported/required by this pod
    if (pod) {
        if (!pod.oAuthRPC(podName, method, req, res)) {
            res.send(415);
        }
    } else {
        res.send(404);
    }
});

/**
 * Account Auth RPC, sets up oAuth for the selected pod, if the pod supports oAuth
 */
app.all('/rpc/issuer_token/:pod/:auth_method', restAuthWrapper, function(req, res) {
    var podName = req.params.pod,
        pod = dao.pod(podName),
        method = req.params.auth_method;

    // check that authentication is supported/required by this pod
    if (!pod.issuerTokenRPC(podName, method, req, res)) {
        res.send(415);
    }
});

/**
 * Pass through an RPC call to a channel pod
 *
 *
 */
app.all('/rpc/pod/:pod/:action/:method/:channel_id?', function(req, res) {
    var podName = req.params.pod,
        pod = dao.pod(podName),
        domain = helper.getDomain(req.headers.host, true),
        action = req.params.action,
        method = req.params.method,
        channelId = req.params.channel_id;

    if (pod && action && method) {
        dao.domainAuth(domain, true, function(err, accountResult) {
            if (err || !accountResult) {
                console.log(err);
                res.send(403);
            } else {
                req.remoteUser = decorateAccountInfo(accountResult);

                if (channelId) {
                    var filter = {
                        owner_id: accountResult.id,
                        id : channelId
                    };

                    dao.find('channel', filter, function(err, result) {
                        if (err || !result) {
                            console.log(err);
                            res.send(404);
                        } else {
                            var channel = dao.modelFactory('channel', result),                            
                            podTokens = channel.getPodTokens(),
                            pod = dao.pod(podTokens.pod);
                            pod.rpc(podTokens.action, method, req, restResponse(res), channel);
                        }
                    });
                } else {
                    pod.rpc(action, method, req, restResponse(res));
                }
            }
        });
    } else {
        res.send(404);
    }
});

/*
app.get('/t', function(req, res) {
    dao.triggerAll();
    res.send(200, {});
});
*/

// RPC Catchall
app.get('/rpc/:method_domain?/:method_name?/:resource_id?/:subresource_id?', restAuthWrapper, function(req, res) {

    res.contentType(app.defs.CONTENTTYPE_JSON);
    var response = {};
    var methodDomain = req.params.method_domain;
    var method = req.params.method_name;
    var resourceId = req.params.resource_id;
    var subResourceId = req.params.subresource_id;

    if (methodDomain == 'get_referer_hint') {
        referer = req.query.referer;
        if (undefined == referer) {
            referer = req.header('Referer');
        }

        if (undefined == referer) {
            response = 400;
        } else {
            result = helper.getDomainTokens(referer);
            response.hint = (result.url_tokens.auth ? result.url_tokens.auth + '_' : '') + result.domain;
            response.referer = referer;
            response.scheme = result.url_tokens.protocol.replace(':', '');
        }
        res.send(response);

    // attempts to create a bip from the referer using default settings.
    } else if (methodDomain == 'bip') {
        if (method == 'create_from_referer') {
            result = getReferer(req);

            if (undefined == result) {
                response = 400;
                res.send(response);
            } else {
                // inject the bip POST handler
                req.method = 'POST';
                req.params.resource_name = 'bip';
                req.body = {
                    'name' : (result.url_tokens.auth ? result.url_tokens.auth + '_' : '') + result.domain,
                    'note' : 'via ' + result.url_tokens.hostname
                }
                restAction(req, res);
            }
        } else if (method == 'get_transform_hint') {
            var from = req.query.from,
                to = req.query.to;

            if (from && to) {
                var accountInfo = decorateAccountInfo(req.remoteUser);
                dao.getTransformHint(accountInfo, from, to, restResponse(res));
            } else {
                response = 400;
                res.send(response);
            }
        } else if (method == 'share' && resourceId) {
            var accountInfo = decorateAccountInfo(req.remoteUser);

            if (resourceId === 'list') {
                var page_size = 10,
                page = 1,
                order_by = 'recent',
                filter = {};

                if (undefined != req.query.page_size) {
                    page_size = parseInt(req.query.page_size);
                }

                if (undefined != req.query.page) {
                    page = parseInt(req.query.page);
                }

                dao.list('bip_share', accountInfo, page_size, page, order_by, {}, restResponse(res));
            } else {
                if (subResourceId && 'test' === subResourceId) {
                    var filter = {
                        'owner_id' : accountInfo.user.id,
                        'bip_id' : resourceId
                    }
                    
                    dao.find('bip_share', filter, function(err, result) {
                        if (err || !result) {
                            res.send(404);                            
                        } else {
                            res.send(200);
                        }
                    });
                    
                } else {
                    var filter = {
                        'owner_id' : accountInfo.user.id,
                        'id' : resourceId
                    }

                    dao.find('bip', filter, function(err, result) {
                        if (err || !result) {
                            console.log(err);
                            res.send(404);
                        } else {
                            dao.shareBip(dao.modelFactory('bip', result, accountInfo, true), restResponse(res));
                        }
                    });
                }
            }
        } else if (method == 'unshare' && resourceId) {
            var accountInfo = decorateAccountInfo(req.remoteUser),
                filter = {
                    'owner_id' : accountInfo.user.id,
                    'id' : resourceId
                };

            dao.removeFilter('bip_share', filter, restResponse(res));

        // alias into account options.  Returns RESTful account_options resource
        } else if (method == 'set_default' && resourceId) {
            var accountInfo = decorateAccountInfo(req.remoteUser),
                filter = {
                    'owner_id' : accountInfo.user.id
                };
            
            dao.find('account_option', filter, function(err, result) {
                if (err || !result) {
                    console.log(err);
                    res.send(404);
                } else {
                    dao.setDefaultBip(resourceId, dao.modelFactory('account_option', result, accountInfo), accountInfo, restResponse(res));
                }
            });
            
        } else {
            res.send(400);
        }
    } else if (methodDomain == 'domain') {
        // confirms a domain has been properly configured.  If currently
        // set as !_available, then enables it.
        if (method == 'confirm') {
            var accountInfo = decorateAccountInfo(req.remoteUser);
            var filter = {
                'owner_id' : accountInfo.user.id,
                'id' : resourceId
            }

            dao.find('domain', filter, function(err, result) {
                if (err || !result) {
                    console.log(err);
                    res.send(404);
                } else {
                    var domain = dao.modelFactory('domain', result, accountInfo, true);
                    domain.verify(accountInfo, restResponse(res));
                }
            });

        } else {
            res.send(response);
        }
    } else {
        res.send(400);
    }
});

// ---------------- BIP RPC --------------------------------------------------------

function bipBasicFail(req, res) {
    express.basicAuth(function(username, password, cb){
        cb(false, false);
    })(req, res);
}

/*
 * Authenticate the bip before we pass it through.  If there's no bip found,
 * the bip has auth = token or the domain doesn't exist, then fall through
 * to an account level auth (although the account auth for nx domain
 * shouldn't ever succeed).
 *
 * We don't want to let people interrogate whether or not a HTTP exists based
 * on the auth response (or non-response).  Therefore, always prompt for
 * HTTP auth on this endpoint unless the bip is explicitly 'none'
 */
function bipAuthWrapper(req, res, cb) {
    var bipName = req.params.bip_name,
        domain = helper.getDomain(req.headers.host, true);

    dao.domainAuth(domain, true, function(err, accountResult) {
        if (err || !accountResult) {
            // reject always
            bipBasicFail(req, res);
        } else {
            var ownerId = accountResult.id,
                domainId = accountResult.activeDomainId,
                filter = {
                    'name' : bipName,
                    'type' : 'http',
                    'paused' : false,
                    'owner_id' : ownerId,
                    'domain_id' : domainId
                };

            dao.find('bip', filter, function(err, result) {
                var username,password;
                if (!err && result) {
                    if (result.config.auth == 'none') {
                        cb(false, true);
                    } else if (result.config.auth == 'token') {
                        // account token auth
                        express.basicAuth(function(user, pass, cb){
                            dao.checkAuth(user, pass, 'token', cb);
                        })(req, res, cb);
                    } else if (result.config.auth == 'basic') {
                        express.basicAuth(function(username, password, cb){
                            cb(
                                false,
                                (result.config.username && result.config.username == username
                                 &&
                                 result.config.password && result.config.password == password)
                            );
                        })(req, res, cb);
                    } else {
                        // reject always
                        bipBasicFail(req, res);
                    }
                } else {
                   // reject always
                   restResponse(res)(true, null, 404);
                   //error, modelName, results, code, options
                }
            });
        }
    });
}

/**
 * Pass through HTTP Bips
 */
app.all('/bip/http/:bip_name', bipAuthWrapper, function(req, res) {
    var container = {},
    txId = uuid.v4(),
    client,
    files = [],
    contentParts = {},
    contentType = utils.mime(req),
    encoding = req.encoding,
    exports = req.query,
    statusMap = {
        'success' : 200,
        'fail' : 404
    },
    bipName = req.params.bip_name,
    domain = helper.getDomain(req.headers.host, true);

    client = {
                    'id' : txId,
                    'host' : req.header('x-forwarded-for') || req.connection.remoteAddress,
                    'date' : Math.floor(new Date().getTime() / 1000),
                    'proto' : 'http',
                    'reply_to' : req.header('x-postback') || '',
                    'method' : req.method,
                    'content_type' : contentType,
                    'encoding' : encoding
                };

    if (req.files && Object.keys(req.files).length > 0) {
        // normalize file struct
        files = cdn.normedMeta('express', txId, req.files);
    }


    container._clientInfo = client;

    //function fireBip(files) {
        bastion.domainBipUnpack(
            bipName,
            domain,
            container,
            'http',
            function(status, message, bip) {
                var exports = {
                    'local' : {}
                };

                if (!message){
                    message = '';
                }

                if (bip && bip.config.exports && bip.config.exports.length > 0) {
                    var exportLen = bip.config.exports.length,
                        key;

                    for (var i = 0; i < exportLen; i++) {
                        key = bip.config.exports[i];
                        if (req.query[key]) {
                            exports.local[key] = req.query[key];
                        }
                    }
                } else {
                    exports.local = req.query;
                    exports.local._body = /xml/.test(utils.mime(req)) ? req.rawBody : req.body;
                }

                var restReponse = true;
                // forward to bastion
                if (status == statusMap.success) {
                    exports._client = client;
                    exports._bip = bip;

                    // Renderer Invoke, send a repsonse
                    if (bip.config.invoke_renderer) {
                        // get channel
                        channelRender(
                                        bip.owner_id,
                                        bip.config.invoke_renderer.channel_id,
                                        req,
                                        res,
                                        restResponse
                                    );
                        restReponse = false;
                    }

                    bastion.bipFire(bip, contentType, encoding, exports, client, contentParts, files);
                }

                if (restReponse) {
                    restResponse(res)( status == statusMap.fail, undefined, message, status);
                }
            },
            statusMap
        );
    //}(files);
});