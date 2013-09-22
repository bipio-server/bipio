var bootstrap = require(__dirname + '/../../src/bootstrap'),
dao = bootstrap.app.dao,
assert = require('assert'),
should = require('should'),
uuid = require('node-uuid'),
accountInfo;

var cid;
describe('bootstrap', function() {
    it('can compile an accountInfo object', function(done) {
        dao.checkAuth(
            GLOBAL.CFG.testing_user.username,
            GLOBAL.CFG.testing_user.password,
            'token',
            function(err, acct) {
                if (err) {
                    err.should.not.be.truthy;
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
                }
                done();
            }
            );
    });

    // Create temp channel
    var channelStruct = {
        action : 'flow.blackhole',
        name : 'Blackhole Channel ' + uuid.v4()
    };

    it('can save a channel', function(done) {
        var model = dao.modelFactory('channel', channelStruct, accountInfo, true);
        dao.create(model, function(err, modelName, channel) {
            err.should.not.be.ok;
            cid = channel.id;
            done();
        }, accountInfo);
    });


    it('can compile an accountInfo object', function(done) {
        dao.checkAuth(
            GLOBAL.CFG.testing_user.username,
            GLOBAL.CFG.testing_user.password,
            'token',
            function(err, acct) {
                if (err) {
                    err.should.not.be.truthy;
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
                }
                done();
            }
            );
    });
});


var bid;
describe('bip dao', function() {
    var bipStruct = {
        type : 'http',
        hub : {
            source : {
                 //edges : [ cid ]
                 edges : [ 'eac72329-b31f-48d6-9ecd-755a89bae526' ]

            }
        }
    };

    it('can save a bip', function(done) {
        this.timeout(0);
        var model = dao.modelFactory('bip', bipStruct, accountInfo, true);
        dao.create(model, function(err, modelName, bip) {

            modelName.should.equal('bip');
            bip.should.have.ownProperty('id');
            bip.should.have.ownProperty('owner_id');
            bip.should.have.ownProperty('hub');
            bip.should.have.ownProperty('name');
            bip.should.have.ownProperty('type');

            bip.owner_id.should.equal(accountInfo.user.id);

            bip.type.should.equal(bipStruct.type);
            bid = bip.id;
            done();
        }, accountInfo);
   });

    it('can retrieve a bip', function(done) {
        var model = dao.modelFactory('bip', {}, accountInfo);
        dao.get(model, bid, accountInfo, function(err, modelName, bip) {
            err.should.be.false;

            modelName.should.equal('bip');
            bip.should.have.ownProperty('id');
            bip.should.have.ownProperty('owner_id');
            bip.should.have.ownProperty('hub');
            bip.should.have.ownProperty('name');
            bip.should.have.ownProperty('type');

            bip.owner_id.should.equal(accountInfo.user.id);
            bip.type.should.equal(bipStruct.type);
            bip.name.should.be.ok;
            bip.domain_id.should.equal(accountInfo.user.defaultDomainId);

            done();
        });
    });

    it('can put a bip', function(done) {
        var newStruct = {
            note : 'Updated ' + bipStruct.name
        };

        dao.update(
            'bip',
            bid,
            newStruct,
            function(err, modelName, bip) {
                err.should.not.be.ok;

                modelName.should.equal('bip');
                bip.owner_id.should.equal(accountInfo.user.id);
                bip.name.should.be.ok;
                bip.note.should.equal(newStruct.note)

                done();
            },
            accountInfo
        );
    });
});


describe('bip validation', function() {

    // --- names
    it('accepts short name', function(done) {
        var model = dao.modelFactory('bip', {}, accountInfo),
            validators = model.getValidators('name');
        validators[0].validator('shortname', function(ok) {
            ok.should.be.true;
            done();
        });
    });

    it('denies long name', function(done) {
        var model = dao.modelFactory('bip', {}, accountInfo),
            validators = model.getValidators('name');
        validators[0].validator(app.helper.randCharStr(65), function(ok) {
            ok.should.be.false;
            done();
        });
    });

    // --domains
    it('accepts known domain', function(done) {
        var model = dao.modelFactory('bip', {}, accountInfo),
            validators = model.getValidators('domain_id');

        // lose scope on accountInfo, so attach it
        validators[0].getAccountInfo = function() {
            return model.getAccountInfo();
        }

        validators[0].validator(accountInfo.user.defaultDomainId, function(ok) {
            ok.should.be.true;
            done();
        });
    });

    it('deny unkown domain', function(done) {
        var model = dao.modelFactory('bip', {}, accountInfo),
            validators = model.getValidators('domain_id');

        // lose scope on accountInfo, so attach it
        validators[0].getAccountInfo = function() {
            return model.getAccountInfo();
        }

        validators[0].validator('testdomain', function(ok) {
            ok.should.be.false;
            done();
        });
    });

    it('accepts http types', function(done) {
        var model = dao.modelFactory('bip', {}, accountInfo),
            validators = model.getValidators('type');

        validators[0].validator('http', function(ok) {
            ok.should.be.true;
            done();
        });
    });

    it('accepts smtp types', function(done) {
        var model = dao.modelFactory('bip', {}, accountInfo),
            validators = model.getValidators('type');

        validators[0].validator('smtp', function(ok) {
            ok.should.be.true;
            done();
        });
    });

    it('accepts trigger types', function(done) {
        var model = dao.modelFactory('bip', {}, accountInfo),
            validators = model.getValidators('type');

        validators[0].validator('trigger', function(ok) {
            ok.should.be.true;
            done();
        });
    });

    it('denies unknown types', function(done) {
        var model = dao.modelFactory('bip', {}, accountInfo),
            validators = model.getValidators('type');
        validators[0].validator('https', function(ok) {
            ok.should.be.false;
            done();
        });
    });

    /* @todo - figure out scoping problems
    it('normalizes name based on type setter', function(done) {
        var model = dao.modelFactory('bip', {}, accountInfo),
            setter = model.getEntitySchema().type.set;

        var name = 'A normal text name';
        model.name = name;
        model.getEntitySchema().type.set('trigger');
        // untouched
        model.name.should.equal(name)
        setter('smtp');
        done();
    });
    */

    it('validates trigger config', function(done) {
        var model = dao.modelFactory('bip', {}, accountInfo),
            validators = model.getValidators('config'),
            config;

        validators[0].getAccountInfo = function() {
            return model.getAccountInfo();
        };

        validators[0].type = 'trigger';
        config = {
            channel_id : accountInfo.user.defaultDomainId
        };
        
        validators[0].validator(config, function(ok) {
            ok.should.be.true;
            done();
        });
    });
    
    /* @todo set up emitter channel
    it('failes to validate trigger config', function(done) {
        var model = dao.modelFactory('bip', {}, accountInfo),
            validators = model.getValidators('config'),
            config;

        validators[0].getAccountInfo = function() {
            return model.getAccountInfo();
        };

        validators[0].type = 'trigger';
        config = {
            channel_id : 'testing'
        };
        
        validators[0].validator(config, function(ok) {
            ok.should.be.false;
            done();
        });
    });
    */

    

    /*
    it('', function(done) {

    });

    it('', function(done) {

    });*/
});