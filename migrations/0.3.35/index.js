var fs = require('fs'),
  Migration = {
    run : function(app, configPath, next) {
      var config = JSON.parse(fs.readFileSync(configPath)),
        rootPath = GLOBAL.SERVER_ROOT + '/../',
        dao = app.dao,
        modelName = 'channel';

        dao.updateColumn(modelName, { action: /^(?!email\.smtp\_forward).*$/, _available: false }, { _available : true });
        next('Nothing To Do');
    }
  }

module.exports = Migration;