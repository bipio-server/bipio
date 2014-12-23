var fs = require('fs'),
  Migration = {
    run : function(app, configPath, next) {

      // sample config migration :

      var config = JSON.parse(fs.readFileSync(configPath)),
        rootPath = GLOBAL.SERVER_ROOT + '/../',
        delta = false;

      config.cdn_public = config.cdn_public.replace(/\/img\/cdn/, '');

      console.log("**NOTICE** `cdn_public` URL has changed, please update any of your site cdn symlinks to point to : `" + config.cdn_public + "`");

      if (typeof config.cdn === 'string') {
        config.cdn = {
          "strategy" : "fs",
          "config" : {
            "data_dir" : config.datadir
          }
        }
        delete config.datadir
        delete config.cdn
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
