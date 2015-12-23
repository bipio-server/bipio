/*
 * Validation.
 */
var _ = require('underscore'),

	validator = require('validator'),

	// local validators
	vPtrs = {
		empty : function(value) {
			return !!value;
		},

	  'bool_int' : function(val) {
	  	var bInt = Number(val);
	    return (bInt !== 0 && bInt !== 1);
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
	  },

	  'notempty' : function(val) {
	    return !!val;
	  },

	  'len_64' : function(val) {
	    return (val && val.length > 64);
	  },

	  'len_32' : function(val) {
	    return (val && val.length > 32);
	  },

	  'max_32' : function(val) {
	    return (val && val.length > 32);
	  },

	  'max_64' : function(val) {
console.log(arguments);
	    return (val && val.length > 64);
	  },

	  'max_text_1k' : function(val) {
	    return (val && val.length > 1024);
	  },


	  'boolish' : function(val) {
	    var bools = [
		    1,
		    0,
		    '1',
		    '0',
		    true,
		    false,
		    'true',
		    'false'
	    ];
	    return (-1 !== bools.indexOf(val));
	  },
	  //
	  'accountModelDomain' : function(val) {
	    var filter = {
	      id : this.domain_id,
	      owner_id : this.owner_id
	    };

	    this.getDao().find('domain', filter, function(err, result) {
	      next(!err);
	    });
	  },

	  // validates email format and whether the domian looks to be valid
	  'email' : function(val) {
	    var validFormat = /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,6}$/i.test(val);
	    var domainTokens = tldtools.extract('mailto:' + val);
	    next(validFormat && domainTokens.inspect.useful() );
	  }
	},

	// underscore Pointers
	// http://underscorejs.org/#objects
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
		"isRegExp",
		"isNaN",
		"isNull",
		"isUndefined"
	],

	// Validator pointers
	// https://github.com/chriso/validator.js#validators
	validatorVals = [
		"contains",
		"equals",
		"isAfter",
		"isAlpha",
		"isAlphanumeric",
		"isAscii",
		"isBase64",
		"isBefore",
		"isBoolean",
		"isByteLength",
		"isCreditCard",
		"isCurrency",
		"isDate",
		"isDecimal",
		"isDivisibleBy",
		"isEmail",
		"isFQDN",
		"isFloat",
		"isFullWidth",
		"isHalfWidth",
		"isHexColor",
		"isHexadecimal",
		"isIP",
		"isISBN",
		"isISIN",
		"isISO8601",
		"isIn",
		"isInt",
		"isJSON",
		"isLength",
		"isLowercase",
		"isMACAddress",
		"isMobilePhone",
		"isMongoId",
		"isMultibyte",
		"isNull",
		"isNumeric",
		"isSurrogatePair",
		"isURL",
		"isUUID",
		"isUppercase",
		"isVariableWidth",
		"isWhitelisted",
		"matches"
	];

// bind underscore
for (var i = 0; i < usVals.length; i++) {
	vPtrs[[usVals[i]]] = _[usVals[i]];
}

// bind validator lib
for (var i = 0; i < validatorVals.length; i++) {
	vPtrs[[validatorVals[i]]] = _[validatorVals[i]];
}

function Validator(name) {
	return vPtrs[name];
}

module.exports = Validator;