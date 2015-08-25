var fs = require('fs'),
  Q = require('q'),
  Migration = {
    run : function(app, configPath, next) {
      var dao = app.dao;

      dao.updateProperties(
        'bip_share',
        {},
        {
          installs : 0
        },
        function(err) {
          next(err || 'Done')
        }
      );
    }
  }

module.exports = Migration;