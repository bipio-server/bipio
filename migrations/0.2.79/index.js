// migration for https://github.com/bipio-server/bipio/pull/14
var fs = require('fs'),
  Migration = {
    run : function(app, configPath, next) {
      var config = JSON.parse(fs.readFileSync(configPath)),
        rootPath = GLOBAL.SERVER_ROOT + '/../',
        delta = false;

      if (!config.modules) {
        config.modules = {};
        delta = true;
      }

      if (!config.modules.auth && config.auth) {
        config.modules.auth = {};
        config.modules.auth.strategy = config.auth.type;
        config.modules.auth.config = app._.clone(config.auth.config);
        delete config.auth;
        delta = true;
      }

      if (delta) {
        fs.writeFileSync(configPath , JSON.stringify(config, null, 2));
            console.info("\nConfig (for 0.2.79) syncronously written to : " + configPath + "\n");
            next();
      } else {
        next('Nothing To Do');
      }
    }
  }

module.exports = Migration;
