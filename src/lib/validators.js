var _ = require('underscore'),
	validator = require('validator');

function Validator() {

}

Validator.prototype = {
	test : function(name, value, next) {
		this[name](value, next);
	}
}

module.exports = Validator;