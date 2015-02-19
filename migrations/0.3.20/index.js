// migration for https://github.com/bipio-server/bipio/pull/14
var fs = require('fs'),
  Migration = {
    run : function(app, configPath, next) {
      var config = JSON.parse(fs.readFileSync(configPath)),
        rootPath = GLOBAL.SERVER_ROOT + '/../';

      if (!config.crons.transforms_compact) {
        config.crons.transforms_compact = "0 0 */8 * * *";
        fs.writeFileSync(configPath , JSON.stringify(config, null, 2));
        console.info("\nConfig (for 0.3.19) written to : " + configPath + "\n");
        next();
      } else {
        next('Nothing To Do');
      }
    }
  }

module.exports = Migration;
