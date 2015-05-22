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

    var exampleChannel = {
		"id" : "374d9a1d-cc84-456d-9dad-e1e3065e8c4d",
		"owner_id" : "5b8461ff-36e8-4540-b421-54d47b85b580",
		"note" : "some text",
		"created" : 1430315993000,
		"icon" : "",
		"action" : "math.random",
		"app_id" : "",
		"name" : "Do Nothing",
		"__v" : 0
	};    

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
        },
		"math" : {
			"random" : {
				0 : {
					"random_int": 1
				},
                1 : {
                    "other_arr": [ 2, 3, 4]
                }
			}
		}
    };

    var transforms = {
        "simple_transform" : "[%source#title%]",
        "simple_compound_transform" : "Title is [%source#title%]",
        "simple_compound_repeating_transform" : "[%source#title%] is [%source#title%]",
        "obj_transform" : "[%_bip#config%]",
        "obj_compound_transform" : "Config is [%_bip#config%]",
        "jsonpath_transform" : "[%_bip#config.auth%]",
        "jsonpath_pod_action_transform" : "[%math.random[0].random_int%]",
        "jsonpath_pod_action_compound_transform" : "[%math.random[0].random_int%] and [%374d9a1d-cc84-456d-9dad-e1e3065e8c4d#arr[0]%]",
        "jsonpath_pod_action_repeating_transform" : "[%math.random[1].other_arr[2]%] and [%math.random[1].other_arr[2]%]",
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


    it('can replace a pod.action[idx].key structured jsonpath transform', function(done) {
        var channel = dao.modelFactory('channel', exampleChannel);
        var transform = getTransform('jsonpath_pod_action_transform'),
            result = model._transform(imports, transform, imports);
        result.should.have.ownProperty('jsonpath_pod_action_transform');
        result.jsonpath_pod_action_transform.should.equal('1');
        done();
    });


    it('can replace pod.action[idx].key  AND uuid#action structured jsonpath transforms', function(done) {
        var channel = dao.modelFactory('channel', exampleChannel);
        var transform = getTransform('jsonpath_pod_action_compound_transform'),
            result = model._transform(imports, transform, imports);
        result.should.have.ownProperty('jsonpath_pod_action_compound_transform');
        result.jsonpath_pod_action_compound_transform.should.equal('1 and Arr String Value');
        done();
    });


    it('can replace repeating pod.action[idx].key  structured jsonpath transforms', function(done) {
        var channel = dao.modelFactory('channel', exampleChannel);
        var transform = getTransform('jsonpath_pod_action_repeating_transform'),
            result = model._transform(imports, transform, imports);
        result.should.have.ownProperty('jsonpath_pod_action_repeating_transform');
        result.jsonpath_pod_action_repeating_transform.should.equal('4 and 4');
        done();
    });



});

