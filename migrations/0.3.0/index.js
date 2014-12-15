var fs = require('fs'),
  Migration = {
    run : function(app, configPath, next) {

      // pseudo

      /*

      ** rename config : "cdn_public": "http://localhost/static/img/cdn",
        to : "cdn_public": "http://localhost/static",

      add notice :
      **NOTICE*** `cdn_public` URL has changed, please update any of your site cdn symlinks to point to : {derived cdn path}



      ** add config :

      "cdn" : {
        "strategy" : "fs",
        "config" : {
          "data_dir" : "derived from datadir"
        }
      }


      ** remove configs :

      cdn
      datadir


      ** copy last 15 days of track_subscribe data into pod_syndication_subscibe_dups

      ** drop track_subscribes collection


      */



      next();
      return;


      var config = JSON.parse(fs.readFileSync(configPath)),
        rootPath = GLOBAL.SERVER_ROOT + '/../',
        delta = false;

      if (!config.modules) {
        config.modules = {};
        delta = true;
      }

      // example
      if (!config.modules.auth && config.auth) {
        config.modules.auth = {};
        config.modules.auth.strategy = config.auth.type;
        config.modules.auth.config = app._.clone(config.auth.config);
        delete config.auth;
        delta = true;
      }

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
