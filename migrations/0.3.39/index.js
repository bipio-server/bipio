var fs = require('fs'),
  Migration = {
    run : function(app, configPath, next) {
      var config = JSON.parse(fs.readFileSync(configPath)),
        rootPath = GLOBAL.SERVER_ROOT + '/../';

      if (!config.oembed_host) {
        config.oembed_host = config.website_public;
        fs.writeFileSync(configPath , JSON.stringify(config, null, 2));
        console.info("\nConfig (for 0.3.39) written to : " + configPath + "\n");
        next();
      } else {
        next('Nothing To Do');
      }
    }
  }

module.exports = Migration;
