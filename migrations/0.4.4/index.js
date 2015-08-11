// ENT-444
var fs = require('fs'),
  Q = require('q'),
  Migration = {
    run : function(app, configPath, next) {
      var dao = app.dao,
        modelName = 'account',
        adminDefer = Q.defer();
        userDefer = Q.defer(),
        promises = [ adminDefer.promise, userDefer.promise ];

      Q.all(promises).then(
        function() {
          next();
        },
        function(err) {
          next(err)
        }
      );

      // set is_admin to user level 'admin'
      dao.updateColumn(
        modelName,
        {
          is_admin : true
        },
        {
         account_level : 'admin'
        },
        function(err, results) {
          console.log(arguments);
          if (err) {
            adminDefer.reject(err);
          } else {
            adminDefer.resolve();
          }
        }
      );

      // set !is_admin to user level 'user'
      dao.updateColumn(
        modelName,
        {
          is_admin : false
        },
        {
         account_level : 'user'
        },
        function(err, results) {
          console.log(arguments);
          if (err) {
            userDefer.reject(err);
          } else {
            userDefer.resolve();
          }
        }
      );
    }
  }

module.exports = Migration;