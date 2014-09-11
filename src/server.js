#!/usr/bin/env node

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
 * REST API Server bootstrap
 */
var bootstrap = require(__dirname + '/bootstrap'),
  app = bootstrap.app,
  cluster = require('cluster'),
  express = require('express'),
  restapi = express();

  session = require('express-session'),
  cookieParser = require('cookie-parser'),
  bodyParser = require('body-parser'),
  jsonp = require('json-middleware'),
  methodOverride = require('method-override'),
  multer = require('multer'),
  helper  = require('./lib/helper'),
  passport = require('passport'),
  cron = require('cron'),
  MongoStore = require('connect-mongo')({ session : session});
  domain = require('domain');

// export app everywhere
module.exports.app = app;

/**
 * express bodyparser looks broken or too strict.
 */
function xmlBodyParser(req, res, next) {
  var enc = helper.getMime(req);
  if (req._body) return next();
  req.body = req.body || {};

  // ignore GET
  if ('GET' == req.method || 'HEAD' == req.method) return next();

  // check Content-Type
  if (!/xml/.test(enc)) {
    return next();
  }

  // flag as parsed
  req._body = true;

  // parse
  var buf = '';
  req.setEncoding('utf8');
  req.rawBody = '';

  req.on('data', function(chunk) {
    req.rawBody += chunk;
  });
  req.on('end', function(){
    next();
  });
}

function setCORS(req, res, next) {
  res.header('Access-Control-Allow-Origin', req.headers.origin);
  res.header('Access-Control-Allow-Headers', req.headers['access-control-request-headers'] || '*');
  res.header('Access-Control-Allow-Methods', req.headers['access-control-request-method'] || 'GET,POST,PUT,DELETE');
  res.header('Access-Control-Allow-Credentials', true);
  next();
}

// express preflight
restapi.use(multer({ dest : GLOBAL.DATA_DIR + '/tmp' }));
restapi.use(xmlBodyParser);
restapi.use(function(err, req, res, next) {
  if (err.status == 400) {
    restapi.logmessage(err, 'error');
    res.send(err.status, {
      message : 'Invalid JSON. ' + err
    });
  } else {
    next(err, req, res, next);
  }
});

restapi.use(bodyParser.urlencoded({ extended : true }));
restapi.use(bodyParser.json());
restapi.use(setCORS);
restapi.use(methodOverride());
restapi.use(cookieParser());

// required for some oauth provders

restapi.use(session({
  key : 'sid',
  resave : false,
  saveUninitialized : true,
  cookie: {
    maxAge: 60 * 60 * 1000,
    httpOnly : true
  },
  secret: GLOBAL.CFG.server.sessionSecret,
  store: new MongoStore({
    mongoose_connection : app.dao.getConnection()
  })
}));

restapi.use(passport.initialize());
restapi.use(passport.session());
restapi.set('jsonp callback', true );
restapi.disable('x-powered-by');

if (cluster.isMaster) {
  // when user hasn't explicitly configured a cluster size, use 1 process per cpu
  var forks = GLOBAL.CFG.server.forks ? GLOBAL.CFG.server.forks : require('os').cpus().length;
  app.logmessage('BIPIO:STARTED:' + new Date());
  app.logmessage('Node v' + process.versions.node);
  app.logmessage('Starting ' + forks + ' fork(s)');

  for (var i = 0; i < forks; i++) {
    cluster.fork();
  }

  app.dao.on('ready', function(dao) {
    var crons = GLOBAL.CFG.crons;

    // Network chords and stats summaries
    if (crons && crons.stat && '' !== crons.stat) {
      app.logmessage('DAO:Starting Stats Cron', 'info');
      var statsJob = new cron.CronJob(crons.stat, function() {
        dao.generateHubStats(function(err, msg) {
          if (err) {
            app.logmessage('STATS:THERE WERE ERRORS');
          } else {
            app.logmessage(msg);
            app.logmessage('STATS:DONE');
          }
        });
      }, null, true, GLOBAL.CFG.timezone);
    }

    // periodic triggers
    if (crons && crons.trigger && '' !== crons.trigger) {
      app.logmessage('DAO:Starting Trigger Cron', 'info');
      var triggerJob = new cron.CronJob(crons.trigger, function() {
        dao.triggerAll(function(err, msg) {
          if (err) {
            app.logmessage('TRIGGER:' + err + ' ' + msg);
          } else {
            app.logmessage(msg);
            app.logmessage('TRIGGER:DONE');
          }
        });
      }, null, true, GLOBAL.CFG.timezone);
    }

    // auto-expires
    if (crons && crons.expire && '' !== crons.expire) {
      app.logmessage('DAO:Starting Expiry Cron', 'info');
      var expireJob = new cron.CronJob(crons.expire, function() {
        dao.expireAll(function(err, msg) {
          if (err) {
            app.logmessage('EXPIRE:ERROR:' + err);
            app.logmessage(msg);
          } else {
            app.logmessage('EXPIRE:DONE');
          }
        });
      }, null, true, GLOBAL.CFG.timezone);
    }

    // oAuth refresh
    app.logmessage('DAO:Starting OAuth Refresh', 'info');
    var oauthRefreshJob = new cron.CronJob('0 */15 * * * *', function() {
      dao.refreshOAuth();
    }, null, true, GLOBAL.CFG.timezone);


    // transform recalcs

    //app.logmessage('DAO:Starting Corpus Recalc', 'info');
    //var oauthRefreshJob = new cron.CronJob('0 */15 * * * *', function() {
    //      dao.reCorp();
    //    }, null, true, GLOBAL.CFG.timezone);


  });

  cluster.on('disconnect', function(worker) {
    app.logmessage('Worker:' + worker.workerID + ':Disconnect');
    cluster.fork();
  });

} else {

  workerId = cluster.worker.workerID;
  app.logmessage('BIPIO:STARTED:' + new Date());
  helper.tldtools.init(
    function() {
      app.logmessage('TLD:UP');
    },
    function(body) {
      app.logmessage('TLD:Cache fail - ' + body, 'error')
    }
  );

  if (process.env.BIP_DUMP_HEAPS) {
    var heapdump = require('heapdump');
    setInterval(function() {
      var f = '/tmp/bipio_' + workerId + '_' + Date.now() + '.heapsnapshot';
      console.log('Writing ' + f);
      console.log(require.cache);
      heapdump.writeSnapshot(f);
    }, 60000);
  }

  app.dao.on('ready', function(dao) {
    var server;

    require('./router').init(restapi, dao);

    restapi.use(function(err, req, res, next) {

        var rDomain = domain.create();

        res.on('close', function () {
          rDomain.dispose();
        });

        res.on('finish', function () {
          rDomain.dispose();
        });

        if (err) {
          app.logmessage(err, 'error');
          res.status(500);
          res.send({ error: 'Internal Error' });

          // respawn  worker
          if (!cluster.isMaster) {
            var killtimer = setTimeout(function() {
              app.logmessage('Worker:' + cluster.worker.workerID + ':EXITED');
              process.exit(1);
            }, 5000);

            killtimer.unref();

            app.bastion.close();
            server.close();
            cluster.worker.disconnect();
          }

          rDomain.dispose();

        } else {
          rDomain.run(next);
        }
      });

    server = restapi.listen(GLOBAL.CFG.server.port, GLOBAL.CFG.server.host, function() {

      // drop readme's from memory
      var rCache = require.cache;
      for (var k in rCache) {
        if (rCache.hasOwnProperty(k) && rCache[k].exports && rCache[k].exports.readme) {
          delete rCache[k].exports.readme;
        }
      }

      app.logmessage('Listening on :' + GLOBAL.CFG.server.port + ' in "' + restapi.settings.env + '" mode...');
    });
  });
}
