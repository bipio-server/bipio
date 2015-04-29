var fs = require('fs'),
  Migration = {
    run : function(app, configPath, next) {
      var config = JSON.parse(fs.readFileSync(configPath)),
        rootPath = GLOBAL.SERVER_ROOT + '/../',
        dao = app.dao,
        modelName = 'bip_share',
        slugify = function(name) {
          return name.toLowerCase().replace(/[^\w ]+/g,'').replace(/ +/g,'-');
        };

      dao.findFilter(modelName, {}, function(err, results) {
        if (err) next(err);
        else if (results && results.length) {
          var count = 0;
          for (var i = 0; i < results.length; i++) {
            (function(model, idx) {
              model.slug = slugify(model.name);
              dao.update(modelName, model.id, model, function(err) {
                count++;
                if (err) {
                  next(err);
                  return;
                }
                if (count >= results.length) {
                  next('Updated ' + count + ' Shares');
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