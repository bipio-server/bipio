var fs = require('fs'),
  path = require('path'),
  Q = require('q'),
  minTime = new Date().getTime() - (30 * 24 * 60 * 60 * 1000),
  syndicationMigration = Q.defer(),
  soundcloudMigration = Q.defer(),
  promises = [ syndicationMigration.promise, soundcloudMigration.promise ],

  Migration = {
    run : function(app, configPath, next) {

      var config = JSON.parse(fs.readFileSync(configPath)),
        rootPath = GLOBAL.SERVER_ROOT + '/../',
        delta = false;

      config.cdn_public = config.cdn_public.replace(/\/img\/cdn/, '');

      if (!config.modules.hasOwnProperty("cdn")) {
        config.modules.cdn = {
          "strategy" : "fs",
          "config" : {
            "data_dir" : path.resolve((0 === config.datadir.indexOf('/') ? config.datadir : path.resolve(__dirname) + '/../' + config.datadir))
          }
        }
        console.log("**NOTICE** `cdn_public` URL has changed, please update any of your site cdn symlinks to point to : `" + config.cdn.config.data_dir + "`");
        delta = true;
      }

      if (config.hasOwnProperty("datadir")) delete config.datadir
      if (config.hasOwnProperty("cdn")) delete config.cdn;

      // Handle database migration

      app.dao.list('pod_syndication_track_subscribe', null, 0, 1, 'recent', { created: { $gt: minTime } }, function(err, result) {
        if (err) syndicationMigration.reject(new Error(err));
        else {
          var model = {},
            modelName = 'pod_syndication_dup';

          for (var i=0; i<result.data.length; i++) {
            model = app.dao.modelFactory(modelName, {
                   owner_id : result.data[i].owner_id,
                   channel_id : result.data[i].channel_id,
                   created: result.data[i].created,
                   value : result.data[i].guid,
                   bip_id : result.data[i].bip_id,
                   last_update : result.data[i].last_update
                 });

            (function(model, syndicationMigration, isLast) {
                app.dao.create(model, function(err) {
                  if (err) syndicationMigration.reject(new Error(err));
                  else if (isLast) {
                    syndicationMigration.resolve();
                  }
                })
              });)(model, syndicationMigration, i === result.length-1)
          }
        }
      });

      app.dao.findFilter('pod_soundcloud_track_favorite', null, 0, 1, 'recent', { created: { $gt: minTime } }, function(err, result) {
        if (err) soundcloudMigration.reject(new Error(err));
        else {
          var model = {},
            modelName = 'pod_soundcloud_dup';

          for (var i=0; i<result.data.length; i++) {
            model = app.dao.modelFactory(modelName, {
                   owner_id : result.data[i].owner_id,
                   channel_id : result.data[i].channel_id,
                   created: result.data[i].created,
                   value : result.data[i].track_id,
                   bip_id : result.data[i].bip_id,
                   last_update : result.data[i].last_update
                 });

            (function(model, soundcloudMigration, isLast) {
                app.dao.create(model, function(err) {
                  if (err) soundcloudMigration.reject(new Error(err));
                  else if (isLast) {
                    soundcloudMigration.resolve();
                  }
                })
              });)(model, soundcloudMigration, i === result.length-1)
          }
        }
      });

      Q.all(promises).then(function(results) {
        if (delta) {
          fs.writeFile(configPath , JSON.stringify(config, null, 2), function(err) {
            if (err) {
              next(err, 'error');
            } else {
              console.info("\nConfig written to : " + configPath + "\n");
              next();
            }
          });
        } 
        else {
          next('Nothing To Do');
        }
      }, function(err) {
        next(err);
      });
    }
  }

module.exports = Migration;
