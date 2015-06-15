var fs = require('fs'),
  Migration = {
    run : function(app, configPath, next) {
      var config = JSON.parse(fs.readFileSync(configPath)),
        rootPath = GLOBAL.SERVER_ROOT + '/../',
        dao = app.dao,
        modelName = 'bip_share',
        slugify = function(model) {
          hub = {}
          for (var i in model.hub) {
            if (i.indexOf("-") > -1) {
              hub[i.replace("-", ".") + "._0"] = model.hub[i];
            }
            else if (i === "source" and model.hub.source.hasOwnProperty("transforms")) {
              for (var j in model.hub.source.transforms) {
                if (j.indexOf("-") > -1) {
                  hub[j.replace("-", ".") + "._0"] = model.hub.source.transforms[j];
                }
              }
            }
            else {
              hub[i] = model.hub[i]
            }
          }
          model.hub = hub;
          return model;
        };

      dao.findFilter(modelName, {}, function(err, results) {
        if (err) next(err);
        else if (results && results.length) {
          var count = 0;
          for (var i = 0; i < results.length; i++) {
            (function(model, idx) {
              model = update(model);
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