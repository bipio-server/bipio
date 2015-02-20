// migration for https://github.com/bipio-server/bipio/pull/14
var fs = require('fs'),
  Migration = {
    run : function(app, configPath, next) {
      var config = JSON.parse(fs.readFileSync(configPath)),
        rootPath = GLOBAL.SERVER_ROOT + '/../',
        dao = app.dao,
        modelName = 'bip_share';

      // reindex shares
      dao.findFilter(modelName, {}, function(err, results) {
        var count = 0;
        if (err) {
          next(err);
        } else if (results && results.length) {
          for (var i = 0; i < results.length; i++) {
            (function(model, idx) {
              dao.update(modelName, model.id, model, function(err) {
                count++;
                if (err) {
                  next(err);
                } else {
                  if (count === results.length) {
                    next('Updated ' + count + ' Shares');
                  }

                }
              });
            })(results[i], i);
          }
        } else {
          next('Nothing To Do');
        }
      });
    }
  }

module.exports = Migration;
