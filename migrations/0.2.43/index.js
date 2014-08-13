// migration for https://github.com/bipio-server/bipio/pull/14
var fs = require('fs'),
  Migration = {
    run : function(app, configPath, next) {
      var config = JSON.parse(fs.readFileSync(configPath)),
        repl = new RegExp('^/'),
        rootPath = GLOBAL.SERVER_ROOT + '/../',
        delta = false;

      if (0 === config.cdn.indexOf('/') && fs.existsSync(rootPath + config.cdn)) {
        console.info('Re-writing CDN config path');
        config.cdn = config.cdn.replace(repl, '');
        delta = true;
      }
      
      if (0 === config.datadir.indexOf('/') && fs.existsSync(rootPath + config.datadir)) {
        console.info('Re-writing Data Directory config path');
        config.datadir = config.datadir.replace(repl, '');
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