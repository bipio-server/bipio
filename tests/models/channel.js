process.HEADLESS = true

var bootstrap = require(__dirname + '/../../src/bootstrap'),
    dao = bootstrap.app.dao,
    assert = require('assert'),
    should = require('should');

describe('channel transforms', function() {
    var foo = false;

    beforeEach(function() {
        setTimeout(function() {
            foo = true;
        }, 100);
    });

    var imports = {
        "source" : {
            "title" : "source title"
        },
        "_bip" : {
            "config" : {
                "auth" : "basic",
                "username" : "user",
                "password" : "pass"
            }
        },
        "374d9a1d-cc84-456d-9dad-e1e3065e8c4d" : {
            "arr" : [
                "Arr String Value",
                {
                    "name" : "Arr Object Value"
                },
                [
                    1, 2, 3, 4, 5
                ]
            ]
        }
    },
    transforms = {
        "simple_transform" : "[%source#title%]",
        "simple_compound_transform" : "Title is [%source#title%]",
        "simple_compound_repeating_transform" : "[%source#title%] is [%source#title%]",
        "obj_transform" : "[%_bip#config%]",
        "obj_compound_transform" : "Config is [%_bip#config%]",
        "jsonpath_transform" : "[%_bip#config.auth%]",
        "complex_jsonpath_transform" : "Auth type is [%_bip#config.auth%]",
        "complex_json_struct_1" : "[%374d9a1d-cc84-456d-9dad-e1e3065e8c4d#arr[0]%]",
        "complex_json_struct_2" : "[%374d9a1d-cc84-456d-9dad-e1e3065e8c4d#arr[1].name%]",
        "complex_json_struct_3" : "[%374d9a1d-cc84-456d-9dad-e1e3065e8c4d#arr[:2]%]"
    };

    var model = dao.modelFactory('channel', {});

    function getTransform(name) {
        var tx = {};
        tx[name] = transforms[name];
        return tx;
    }

    it('can perform complex JSON transform 1', function(done) {
        var transform = getTransform('complex_json_struct_1'),
            result = model._transform(imports, transform, imports);

        result.should.have.ownProperty('complex_json_struct_1');
        result.complex_json_struct_1.should.equal('Arr String Value');

        done();
    });

    it('can perform complex JSON transform 2', function(done) {
        var transform = getTransform('complex_json_struct_2'),
            result = model._transform(imports, transform, imports);

        result.should.have.ownProperty('complex_json_struct_2');
        result.complex_json_struct_2.should.equal('Arr Object Value');

        done();
    });

    it('can perform complex JSON transform 3', function(done) {
        var transform = getTransform('complex_json_struct_3'),
            result = model._transform(imports, transform, imports),
            ptr = imports['374d9a1d-cc84-456d-9dad-e1e3065e8c4d'];

        result.should.have.ownProperty('complex_json_struct_3');
        result.complex_json_struct_3[0].should.equal(ptr.arr[0]);

        done();
    });


    it('can perform a simple transform', function(done) {
        var transform = getTransform('simple_transform'),
            result = model._transform(imports, transform, imports);

        result.should.have.ownProperty('simple_transform');
        result.simple_transform.should.equal(imports.source.title);

        done();
    });

    it('can perform a simple compound transform', function(done) {
        var transform = getTransform('simple_compound_transform'),
            result = model._transform(imports, transform, imports);

        result.should.have.ownProperty('simple_compound_transform');
        result.simple_compound_transform.should.equal('Title is ' + imports.source.title);

        done();
    });

    it('can perform a simple compound repeating transform', function(done) {
        var transform = getTransform('simple_compound_repeating_transform'),
            result = model._transform(imports, transform, imports);

        result.should.have.ownProperty('simple_compound_repeating_transform');
        result.simple_compound_repeating_transform.should.equal(imports.source.title + ' is ' + imports.source.title);

        done();
    });


    it('can perform an object transform', function(done) {
        var transform = getTransform('obj_transform'),
            result = model._transform(imports, transform, imports);

        result.should.have.ownProperty('obj_transform');

        app.helper.isObject(result.obj_transform).should.be.ok;
        done();
    });


    it('can perform a compound object transform', function(done) {
        var transform = getTransform('obj_compound_transform'),
            result = model._transform(imports, transform, imports);

        result.should.have.ownProperty('obj_compound_transform');
        result.obj_compound_transform.should.equal('Config is ' + JSON.stringify(imports._bip.config));

        done();
    });


    it('can perform a jsonpath transform', function(done) {
        var transform = getTransform('jsonpath_transform'),
            result = model._transform(imports, transform, imports);

        result.should.have.ownProperty('jsonpath_transform');
        result.jsonpath_transform.should.equal('basic');

        done();
    });

    it('can perform a complex jsonpath transform', function(done) {
        var transform = getTransform('complex_jsonpath_transform'),
            result = model._transform(imports, transform, imports);

        result.should.have.ownProperty('complex_jsonpath_transform');
        result.complex_jsonpath_transform.should.equal('Auth type is basic');

        done();
    });

});

/*
describe('bootstrap', function() {
    it('can compile an accountInfo object', function(done) {
        dao.checkAuth(
            GLOBAL.CFG.testing_user.username,
            GLOBAL.CFG.testing_user.password,
            'token',
            function(err, acct) {
                if (err) {
                    done(err);
                } else {
                    acct.should.be.ok;
                    acct.user.username.should.equal(GLOBAL.CFG.testing_user.username);

                    // assert expected object structure and interface
                    acct.should.have.ownProperty('user');
                    acct.user.should.have.ownProperty('id');
                    acct.user.settings.should.be.a('object');

                    acct.user.domains.should.be.a('object');
                    acct.user.domains.set.should.be.a('function');
                    acct.user.domains.get.should.be.a('function');
                    acct.user.domains.test.should.be.a('function');

                    acct.user.channels.should.be.a('object');
                    acct.user.channels.set.should.be.a('function');
                    acct.user.channels.get.should.be.a('function');
                    acct.user.channels.test.should.be.a('function');

                    Object.keys(acct.user.domains).should.not.be.empty;

                    accountInfo = acct;
                    done();
                }
            }
            );
    });
});

var cid;
describe('channel dao', function() {
    var channelStruct = {
        action : 'flow.blackhole',
        name : 'Blackhole Channel ' + uuid.v4()
    };

    it('can save a channel', function(done) {
        var model = dao.modelFactory('channel', channelStruct, accountInfo, true);
        dao.create(model, function(err, modelName, channel) {
            modelName.should.equal('channel');

            channel.should.have.ownProperty('id');
            channel.should.have.ownProperty('owner_id');
            channel.should.have.ownProperty('action');
            channel.should.have.ownProperty('name');

            channel.owner_id.should.equal(accountInfo.user.id);
            channel.action.should.equal(channelStruct.action);
            channel.name.should.equal(channelStruct.name);

            cid = channel.id;
            //            accountInfo.user.channels.channels[cid] = channel;
            done();
        }, accountInfo);
    });

    it('can retrieve a channel', function(done) {
        var model = dao.modelFactory('channel', {}, accountInfo);
        dao.get(model, cid, accountInfo, function(err, modelName, channel) {
            err.should.be.false;

            modelName.should.equal('channel');
            channel.should.have.ownProperty('id');
            channel.should.have.ownProperty('owner_id');
            channel.should.have.ownProperty('action');
            channel.should.have.ownProperty('name');

            channel.owner_id.should.equal(accountInfo.user.id);
            channel.action.should.equal(channelStruct.action)
            channel.name.should.equal(channelStruct.name)

            done();
        });
    });

    it('can put a channel', function(done) {
        var newStruct = {
            name : 'Updated ' + channelStruct.name
        };

        dao.update(
            'channel',
            cid,
            newStruct,
            function(err, modelName, channel) {
                err.should.not.be.ok;

                modelName.should.equal('channel');
                channel.owner_id.should.equal(accountInfo.user.id);
                channel.action.should.equal(channelStruct.action)
                channel.name.should.equal(newStruct.name)

                done();
            },
            accountInfo
        );
    });
});

describe('channel transforms', function() {

});
*/