var bootstrap = require(__dirname + '/../../src/bootstrap'),
dao = bootstrap.app.dao,
assert = require('assert'),
should = require('should'),
uuid = require('node-uuid'),
accountInfo;

describe('bootstrap', function() {
    it('can bootstrap', function(done) {
        this.timeout(0);
        dao.on('ready', function() {
            done();
        });
    });

    it('has queues', function(done) {
        this.timeout(0);
        bootstrap.app.bastion.on('readyQueue', function(queueName) {
            if ('queue_jobs' === queueName) {
                done();
            }
        });
    });

    it('can compile a token authenticated accountInfo object', function(done) {
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
    
    it('can compile a domain accountInfo object', function(done) {
        dao.domainAuth('admin.localhost', true,
            function(err, acct) {
                if (err) {
                    err.should.not.be.ok;
                    done();
                } else {
                    
                    console.log(acct);
                    
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
    
    /*
    it('can compile a domain/authenticated accountInfo object', function(done) {
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
    */
});


/*
describe('bips', function() {
    it('can save a bip', function(done) {
        this.timeout(0);

        var bip = {
            type : 'http',
            hub : {
                source : {
                    // edges : [ cid ]
                    edges : [ '88013839-3932-4083-ae67-fb02f3f32b92' ]

                }
            }
        },
        model = dao.modelFactory('bip', bip, accountInfo, true);
        dao.create(model, function(err, result) {
            console.log(err);
            console.log(result);
            done(!err && result);
        }, accountInfo);
   });
});
*/
describe('retrieve a pod', function() {
    it('contains expected attributes', function(done) {
        dao.pod('facebook').should.have.ownProperty('_description');
        dao.pod('facebook').should.have.ownProperty('_description');
        done();
    });
});