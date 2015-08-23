var fs = require('fs'),
  Q = require('q'),
  Migration = {
    run : function(app, configPath, next) {
      var dao = app.dao,
        modelName = 'bip_share';

      dao.findFilter(
        modelName,
        {},
        function(err, results) {
          var UIDMap = {},r;

          if (err) {
            next(err);
          } else if (!results) {
            next('Nothing To Do');
          } else {
            for (var i = 0; i < results.length; i++) {
              r = results[i];

              if (!UIDMap[r.owner_id]) {
                UIDMap[r.owner_id] = [];
              }

              UIDMap[r.owner_id].push(r.id);
            }

            dao.findFilter(
              'account',
              {
                'id' : {
                  $in : Object.keys(UIDMap)
                }
              },
              function(err, results) {
                if (err) {
                  next(err);
                } else if (!results) {
                  next('Shares Do Not Map To Local Users')
                } else {
                  var owner;
                  for (var i = 0; i < results.length; i++) {
                    owner = results[i];
                    dao.updateColumn(
                      'bip_share',
                      {
                        id : {
                          '$in' : UIDMap[owner.id]
                        }
                      },
                      {
                        user_name : owner.username
                      },
                      function(err) {
                        if (err) {
                          next(err);
                        } else {
                          if (i >= results.length - 1) {
                            next();
                          }
                        }
                      }
                    );
                  }
                }
              }
            );
          }
        }
      );
    }
  }

module.exports = Migration;