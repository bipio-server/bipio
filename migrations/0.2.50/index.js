// Adds JWT Signing key
var fs = require('fs'),
  crypto = require('crypto'),
  Migration = {
    run : function(app, configPath, next) {
      var config = JSON.parse(fs.readFileSync(configPath));

      crypto.randomBytes(48, function(ex, buf) {
        config.jwtKey = buf.toString('hex');
        fs.writeFile(configPath , JSON.stringify(config, null, 2), function(err) {
          if (err) {
            next(err, 'error');
          } else {
            console.info("\nConfig written to : " + configPath + "\n");
            next();
          }
        });
      });
    }
  }

module.exports = Migration;