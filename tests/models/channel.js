var bootstrap = require(__dirname + '/../../src/bootstrap'),
dao = bootstrap.app.dao,
assert = require('assert'),
should = require('should'),
uuid = require('node-uuid'),
accountInfo;

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
