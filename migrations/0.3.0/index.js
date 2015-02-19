var fs = require('fs'),
  path = require('path'),
  Q = require('q'),
  minTime = new Date().getTime() - (30 * 24 * 60 * 60 * 1000),
  syndicationMigration = Q.defer(),
  soundcloudMigration = Q.defer(),
  promises = [ syndicationMigration.promise, soundcloudMigration.promise ],

  Migration = {
    run : function(app, configPath, next) {

      var config = JSON.parse(fs.readFileSync(configPath));
//      var config = jf.readFileSync(configPath);


	var rootPath = GLOBAL.SERVER_ROOT + '/../';
      var delta = false;


      config.cdn_public = config.cdn_public.replace(/\/img\/cdn/, '');

      if (!config.modules.hasOwnProperty("cdn")) {
        config.modules.cdn = {
          "strategy" : "fs",
          "config" : {
            "data_dir" : config.datadir
          }
        };
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

          if (err) {
            syndicationMigration.reject(new Error(err));
          }
          else if (results.num_pages === 0) {
            console.log("...Syndication Migration finished.");
            syndicationMigration.resolve();
          }
          else {
            var syndPromises = [];
            console.log("Migrating Syndication subscription data from the last 30 days (if any)...");

            for (var index=1; index<=results.num_pages; index++) {

              (function(pageNum, syndicationMigration, isLastPage) {
                app.dao.list('pod_syndication_track_subscribe', null, 100, pageNum, 'recent', { created: { $gt: minTime } }, function(err, oldModelName, result) {
                  for (var i=0; i<result.data.length; i++) {

                    var syndicationItem = Q.defer();
                    syndPromises.push(syndicationItem.promise);

                    (function(ind, item, deferred, promises, migration, isLast) {
                      var model = app.dao.modelFactory('pod_syndication_dup', {
                             owner_id : item.owner_id,
                             channel_id : item.channel_id,
                             created: item.created,
                             value : item.guid,
                             bip_id : item.bip_id,
                             last_update : item.last_update
                           });

                      app.dao.create(model, function(err) {
                        if (err) {
                          deferred.reject(new Error(err));
                        }
                        else {
                          deferred.resolve(true);
                        }
                      });

                      if (promises.length === result.total) {
                        Q.all(promises).then(function(results) {
                          console.log("Syndication migration finished. Total copied: " + results.length);
                          migration.resolve();
                        });
                      }

                    })(i, result.data[i], syndicationItem, syndPromises, syndicationMigration, i === result.data.length-1);
                  }
                });
              })(index, syndicationMigration, index === results.num_pages);
            }
          }
        });
      }

      if (config.pods.hasOwnProperty("soundcloud")) {

        app.dao.list('pod_soundcloud_track_favorite', null, 100, 1, 'recent', { created: { $gt: minTime } }, function(err, oldModelName, results) {

          if (err) {
            soundcloudMigration.reject(new Error(err));
          }
          else if (results.num_pages === 0) {
            console.log("...Soundcloud Migration finished. Nothing to copy.");
            soundcloudMigration.resolve();
          }
          else {
            var scPromises = [];
            console.log("Migrating Soundcloud subscription data from the last 30 days (if any)...");

            for (var index=1; index<=results.num_pages; index++) {

              (function(pageNum, soundcloudMigration, isLastPage) {
                app.dao.list('pod_soundcloud_track_favorite', null, 100, pageNum, 'recent', { created: { $gt: minTime } }, function(err, oldModelName, result) {
                  for (var i=0; i<result.data.length; i++) {

                    var soundcloudItem = Q.defer();
                    scPromises.push(soundcloudItem.promise);

                    (function(ind, item, deferred, promises, migration, isLast) {
                      var model = app.dao.modelFactory('pod_soundcloud_dup', {
                           owner_id : item.owner_id,
                           channel_id : item.channel_id,
                           created: item.created,
                           value : item.track_id,
                           bip_id : item.bip_id,
                           last_update : item.last_update
                         });

                      app.dao.create(model, function(err) {
                        if (err) {
                          deferred.reject(new Error(err));
                        }
                        else {
                          deferred.resolve(true);
                        }
                      });
                      if (promises.length === result.total) {
                        Q.all(scPromises).then(function(results) {
                          console.log("Soundcloud migration finished. Total copied: " + results.length);
                          migration.resolve();
                        });
                      }
                    })(i, result.data[i], soundcloudItem, scPromises, soundcloudMigration, i === result.data.length-1);
                  }
                });
              })(index, soundcloudMigration, index === results.num_pages);
            }
          }
        });
      }

	var writtenResults = Q("");

	if (delta) {
		fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
		console.info("\nConfig (for 0.3.0) written to : " + configPath + "\n");
		next();
	}
	else {
		next('nothing to do');
	}

/*
      Q.all(promises).then(function(results) {
        if (delta) {
          fs.writeFileSync(configPath, JSON.stringify(config, null, 2), function(err) {
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
*/
    }
  }

module.exports = Migration;
