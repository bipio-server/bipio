/*
 * Validation
 */
var _ = require('underscore'),
	// https://github.com/chriso/validator.js#validators
	validator = require('validator'),
	usVals = [
		"isEqual",
		"isMatch",
		"isEmpty",
		"isElement",
		"isArray",
		"isObject",
		"isArguments",
		"isFunction",
		"isString",
		"isNumber",
		"isFinite",
		"isBoolean",
		"isDate",
		"isRegExp",
		"isNaN",
		"isNull",
		"isUndefined"
	];

function Validator() {
}

Validator.prototype = {
	test : function(name) {
		if (this[name]) {
			return this[name];

		} else if (usVals.indexOf(name)) {
			return _[name];

		} else if (validator[name]) {
			return validator[name];

		}
	},

	// local validators
	empty : function(value) {
		return !!value;
	},

  'bool_int' : function(val) {
  	var bInt = Number(val);
    return(bInt === 0 || bInt === 1);
  },

  isTruthy : function(val) {
		return (
			val === true ||
			1 === val ||
			(_.isString(val) && ['true', '1','yes','y'].indexOf(val.toLowerCase()) >= 0)
		);
  },

  isFalsy : function(val) {
		return (
			val === false ||
			0 === val ||
			(_.isString(val) && ['false', '0','no','n'].indexOf(val.toLowerCase()) >= 0)
		);
  }
}

module.exports = Validator;