#!/usr/bin/env node
/**
 *
 * The Bipio API Server
 *
 * @author Michael Pearson <michael@bip.io>
 * Copyright (c) 2010-2014 Michael Pearson https://github.com/mjpearson
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program.  If not, see <http://www.gnu.org/licenses/>.
 *
 * A Bipio Commercial OEM License may be obtained via hello@bip.io
 */
var bootstrap = require(__dirname + '/../src/bootstrap'),
  dao = bootstrap.app.dao,
  fs = require('fs');

function getDisposition(obj) {
  var dispotion;
  if (obj.required) {
    disposition = obj.required.slice(0);
  } else {
    disposition = [];
  }

  for (var k in obj.properties) {
    if (obj.properties.hasOwnProperty(k)) {
      if (-1 === disposition.indexOf(k)) {
        disposition.push(k);
      }
    }
  }

  return disposition;

}


dao.on('ready', function(dao) {
  dao.describe('pod', null, function(err, modelName, results) {
    var mPath,
      mBody,
      s, ds, keys,
      action,
      podActual,
      disposition,
      initOAuthConfigs = [ 'clientID', 'clientSecret', 'consumerKey', 'consumerSecret' ];

    // write manifest for each pod
    for (var podName in results) {
      if (results.hasOwnProperty(podName)) {
        mPath = GLOBAL.SERVER_ROOT + '/../node_modules/bip-pod-' + podName + '/bpm.json';

        s = results[podName];
        podActual = dao.pod(podName);

        // cleanup
        for (r in s.renderers) {
          if (s.renderers.hasOwnProperty(r)) {
            s.renderers[r].title = s.renderers[r].description

            delete s.renderers[r]._href;
            delete s.renderers[r].description;
          }
        }

        mBody = {
          name : s.name,
          title : s.title,
          description : s.description,
          url : '',
          trackDuplicates : podActual._trackDuplicates, // inspect pod
          config : app._.clone(podActual.getConfig()),
          auth : {
            strategy : s.auth.type
          },
          renderers : s.renderers,
          actions : s.actions
        };

        if (podActual._dataSources.length) {
          mBody.dataSources = {};
          for (var i = 0; i < podActual._dataSources.length; i++) {
            ds = podActual._dataSources[i];


            app._.each(ds.entitySchema, function(schema) {
              if (schema.type.Inflector) {
                schema.type = 'string';
              } else if (/Number/.test(schema.type)) {
                schema.type = 'number';

              } else if (/Mixed/.test(schema.type)) {
                schema.type = 'mixed';

              } else if (/Object/.test(schema.type)) {
                schema.type = 'object';

              } else if (/Array/.test(schema.type)) {
                schema.type = 'array';

              } else if (/Boolean/.test(schema.type)) {
                schema.type = 'boolean';

              } else {
                console.log(schema.type, schema.type instanceof String);
                process.exit(0);
              }
            });

            mBody.dataSources[ds.entityName.replace('pod_' + s.name + '_', '')] =
              {
                properties : ds.entitySchema,
                keys : ds.compoundKeyContraints ? Object.keys(ds.compoundKeyContraints) : [ ds.entityIndex ]
              };
          }

        }


//console.log(s);
//        console.log(podActual._dataSources);
//console.log(mBody.dataSources);
//process.exit(0);

        if ('oauth' === s.auth.type) {
          if (mBody.config.oauth) {
            for (var o in mBody.config.oauth) {
              if (-1 !== initOAuthConfigs.indexOf(o)) {
                mBody.config.oauth[o] = '';
              }
            }
          }

        } else if ('issuer_token' === s.auth.type) {
          mBody.auth.authMap = s.authMap
        }

        // cleanup actions
        delete mBody.auth.type;

        for (var a in s.actions) {
          if (s.actions.hasOwnProperty(a)) {
            action = s.actions[a];

            if (action.trigger) {
              action.trigger = action.socket ? 'realtime' : 'poll';
            }

            action.trigger = 'invoke';

            // config
            if (Object.keys(action.config.properties).length) {
              action.config.disposition = getDisposition(action.config);
            }
            delete action.config['$schema'];

            // imports
            if (Object.keys(action.imports.properties).length) {
              action.imports.disposition = getDisposition(action.imports);
            }
            delete action.imports['$schema'];

            // exports
            delete action.exports['$schema'];


            // deprecated attributes
            delete action.singleton;
            delete action.auto;
            delete action.defaults;
            delete action.socket;
            delete action.auth_required;

            if (!Object.keys(action.renderers).length) {
              delete action.renderers;
            }

          }
        }

        console.log('----------------');
        console.log('wrote ' + mPath);
//        console.log(mBody);
//        console.log(mBody.actions.send);

        fs.writeFileSync(mPath , JSON.stringify(mBody, null, 2));

      }
    }

    process.exit(0);
  });
});
