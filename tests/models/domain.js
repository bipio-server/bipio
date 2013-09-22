var bootstrap = require(__dirname + '/../../src/bootstrap'),
dao = bootstrap.app.dao,
assert = require('assert'),
should = require('should'),
uuid = require('node-uuid'),
accountInfo,
domainPublic = GLOBAL.CFG.domain_public.split(':').shift();

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

describe('domains', function() {
    /*
    it('can save a localhost domain', function(done) {
        var domainStruct = {
            name : uuid.v4() + '.localhost',
            type : 'custom'
        },
        model = dao.modelFactory('domain', domainStruct, accountInfo, true);
        dao.create(model, function(err, modelName, domain) {
            modelName.should.equal('domain');

            domain.should.have.ownProperty('id');
            domain.should.have.ownProperty('owner_id');
            domain.should.have.ownProperty('type');
            domain.should.have.ownProperty('name');
            domain.should.have.ownProperty('_available');

            domain.owner_id.should.equal(accountInfo.user.id);
            domain.name.should.equal(domainStruct.name);
            domain.type.should.equal('custom');

            domain._available.should.be.true;
            done();
        }, accountInfo);
    });*/

    it('can save a non-local domain as unverified', function(done) {
        var domainStruct = {
            name : uuid.v4() + '.localhost.net'
        },
        model = dao.modelFactory('domain', domainStruct, accountInfo, true);
        dao.create(model, function(err, modelName, domain) {
            modelName.should.equal('domain');

            domain.should.have.ownProperty('id');
            domain.should.have.ownProperty('owner_id');
            domain.should.have.ownProperty('type');
            domain.should.have.ownProperty('name');
            domain.should.have.ownProperty('_available');

            domain.owner_id.should.equal(accountInfo.user.id);
            domain.name.should.equal(domainStruct.name);
            domain.type.should.equal('custom');

            domain._available.should.be.false;

            done();
        }, accountInfo);
    });

    it('can not save *.local domains of type vanity', function(done) {
        var domainStruct = {
            name : uuid.v4() + '.' + domainPublic,
            type : 'vanity'
        },
        model = dao.modelFactory('domain', domainStruct, accountInfo, true);
        dao.create(model, function(err, modelName, result, status) {           
            result.should.have.property('status');
            result.should.have.property('message');
            result.status.should.equal(400);
            
            result.message.should.equal('ValidationError');
            result.errors.should.have.property('name');
            done();
        });
    });

    it('can detect local domains', function(done) {
        var domainStruct = {
            name : domainPublic + uuid.v4()
        }
        model = dao.modelFactory('domain', domainStruct, accountInfo, true);
        model.isLocal(domainStruct.name).should.equal(false);
        model.isLocal('testing.' + domainPublic).should.equal(true);
        done();
    });

    it('verfies localhost', function(done) {
        var domainStruct = {
            name : 'localhost'
        }
        model = dao.modelFactory('domain', domainStruct, accountInfo, true);
        model.verify(accountInfo, function(err) {
            err.should.be.false;
            model._available.should.be.true;

            done();
        });
    });


    it('verfies a correctly bound domain', function(done) {
        var domainStruct = {
            name : 'testing.bip.io'
        }
        model = dao.modelFactory('domain', domainStruct, accountInfo, true);
        model.verify(
        {
            user : accountInfo.user,
            getDefaultDomain : function() {
                return {
                    name : 'bip.io'
                }
            }
        },
        function(err) {
            err.should.be.false;
            model._available.should.be.true;

            done();
        }
        );
    });

    it('should fail verifying an unknown domain', function(done) {
        var domainStruct = {
            name : uuid.v4() + '.com.net.eu'
        }
        model = dao.modelFactory('domain', domainStruct, accountInfo, true);
        model.verify(
        {
            user : accountInfo.user,
            getDefaultDomain : function() {
                return {
                    name : domainPublic
                }
            }
        },
        function(err, model, result) {
            console.log(err);
            err.should.have.ownProperty('errno');
            err.errno.should.equal('ENODATA');
            result._available.should.be.false;
            done();
        }
        );
    });
});