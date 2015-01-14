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
            "data_dir" : config.datadir
          }
        }
        console.log("**NOTICE** `cdn_public` URL has changed, please update any of your site cdn symlinks to point to : `" + config.modules.cdn.config.data_dir + "`");
        delta = true;
      }

      if (config.hasOwnProperty("datadir")) {
        delete config.datadir;
        delta = true;
      }
      if (config.hasOwnProperty("cdn")) {
        delete config.cdn;
        delta = true;
      }

      // Handle database migration

      if (config.pods.hasOwnProperty("syndication")) {

        app.dao.list('pod_syndication_track_subscribe', null, 100, 1, 'recent', { created: { $gt: minTime } }, function(err, oldModelName, results) {
            
          if (err) syndicationMigration.reject(new Error(err));
          else if (results.num_pages === 0) {
            console.log("...Syndication Migration finished.");
            syndicationMigration.resolve();
          };
          else {
            console.log("Migrating Syndication subscription data from the last 30 days (if any)...");

            for (var i=1; i<=results.num_pages; i++) {
              (function(pageNum, syndicationMigration, isLastPage) {
                app.dao.list('pod_syndication_track_subscribe', null, 100, pageNum, 'recent', { created: { $gt: minTime } }, function(err, oldModelName, result) {
                  for (var i=0; i<result.data.length; i++) {
                    var model = app.dao.modelFactory('pod_syndication_dup', {
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
                        else if (isLastPage && isLast) {
                          console.log("...Syndication Migration finished.");
                          syndicationMigration.resolve();
                        }
                      });
                    })(model, syndicationMigration, i === result.data.length-1)
                  }
                }
              })(i, syndicationMigration, i === results.num_pages)
            }
          }
        });
      }

      if (config.pods.hasOwnProperty("soundcloud")) {
        app.dao.list('pod_soundcloud_track_favorite', null, 100, 1, 'recent', { created: { $gt: minTime } }, function(err, oldModelName, results) {
          if (err) soundcloudMigration.reject(new Error(err));
          else if (results.num_pages === 0) {
            console.log("...Soundcloud Migration finished.");
            soundcloudMigration.resolve();
          }
          else {
            console.log("Migrating Soundcloud favorites data from the last 30 days (if any)...");

            for (var i=1; i<=results.num_pages; i++) {
              
              (function(pageNum, soundcloudMigration, isLastPage) {
                app.dao.list('pod_soundcloud_track_favorite', null, 100, pageNum, 'recent', { created: { $gt: minTime } }, function(err, oldModelName, result) {
                  for (var i=0; i<result.data.length; i++) {
                    var model = app.dao.modelFactory('pod_soundcloud_dup', {
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
                        else if (isLastPage && isLast) {
                          console.log("...Soundcloud Migration finished.");
                          soundcloudMigration.resolve();
                        }
                      });
                    })(model, soundcloudMigration, i === result.data.length-1)
                  }
                }
              })(i, soundcloudMigration, i === results.num_pages)
            }
          }
        });
      }

      Q.all(promises).then(function(results) {
        if (delta) {
          fs.writeFile(configPath, JSON.stringify(config, null, 2), function(err) {
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
