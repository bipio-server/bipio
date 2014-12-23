var fs = require('fs'),
  path = require('path'),
  Migration = {
    run : function(app, configPath, next) {

      // sample config migration :

      var config = JSON.parse(fs.readFileSync(configPath)),
        rootPath = GLOBAL.SERVER_ROOT + '/../',
        delta = false;

      config.cdn_public = config.cdn_public.replace(/\/img\/cdn/, '');

      if (typeof config.cdn === 'string') {
        config.cdn = {
          "strategy" : "fs",
          "config" : {
            "data_dir" : path.resolve((0 === config.datadir.indexOf('/') ? config.datadir : path.resolve(__dirname) + '/../' + config.datadir))
          }
        }
        delete config.datadir
        delete config.cdn
        console.log("**NOTICE** `cdn_public` URL has changed, please update any of your site cdn symlinks to point to : `" + config.cdn.config.data_dir + "`");
        delta = true;
      }

      var minTime = new Date()).getTime() - (30 * 24 * 60 * 60 * 1000);

      app.dao.findFilter('pod_syndication_track_subscribe', { created: { $gt: minTime } }, function(err, result) {
        if (err) next(err);

        var model = {},
          modelName = 'pod_syndication_dup';

        for (var i=0; i<result.length; i++) {

          model = dao.modelFactory(modelName, {
                 owner_id : result[i].owner_id,
                 channel_id : result[i].channel_id,
                 created: result[i].created,
                 value : result[i].guid,
                 bip_id : result[i].bip_id,
                 last_update : result[i].last_update
               });

          app.dao.create(model);
        }

      });

      app.dao.findFilter('pod_soundcloud_track_favorite', { created: { $gt: minTime } }, function(err, result) {
        if (err) next(err);

        var model = {},
          modelName = 'pod_soundcloud_dup';

        for (var i=0; i<result.length; i++) {

          model = dao.modelFactory(modelName, {
                 owner_id : result[i].owner_id,
                 channel_id : result[i].channel_id,
                 created: result[i].created,
                 value : result[i].track_id,
                 bip_id : result[i].bip_id,
                 last_update : result[i].last_update
               });

          app.dao.create(model);
        }
        
      });

      if (delta) {
        fs.writeFile(configPath , JSON.stringify(config, null, 2), function(err) {
          if (err) {
            next(err, 'error');
          } else {
            console.info("\nConfig written to : " + configPath + "\n");
            next();
          }
        });
      } else {
        next('Nothing To Do');
      }
    }
  }

module.exports = Migration;
