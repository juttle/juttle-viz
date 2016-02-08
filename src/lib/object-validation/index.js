/*

This little library provides tools to validate objects using schemas.

It takes ideas from various existing libraries out there and supports the following:
 - custom validators
 - nested schema declaration
 - nested error response
 - some error types


 API

 `validate`

 `validate` is the entry point into the library. It accepts an object and a schema.
 The schema is equivalent to the `options` that the object validator supports.

 This includes:
  - allowedProperties: The list of property names that the object is allowed to have.
  - requiredProperties: The list of property names that the object is required to have values for.
  - properties: A map of property names to their validators.

  Example schema:

  {
    allowedProperties : ['height'],
    requiredProperties : ['height']
    properties : {
        'height' : [
            v.validators.integer,
            {
                validator : v.validators.greaterThan,
                options : {
                    threshold : 0
                }
            }
        ]
    }
  }

  This example says that the height property is the only allowed property and it is required. The property itself
  has two additional validators, one that says its needs to be an integer, and one that says it needs to be greater than 0.
  This example demonstrates two ways of specifyin validators. One is by simply passing the validator function
  (in this case v.validators.integer) if the validator does not require any extra arguments. The other option is to pass
  an object literal containing a `validator` property which specifies the validator function as well as an `options` hash
  with extra parameters.

  The response is a nested structure of PropertyValidationErrors and their ValueValidationErrors.

  Here is an example of a more complex schema for a nested object:

  {
    allowedProperties : ['title','id', 'display'],
    properties : {
        display : [
            {
                validator : v.validators.object,
                options : {
                    allowedProperties : ['height', 'style', 'prefix', 'times', 'ticks', 'marks'],
                    properties : {
                        height : [
                            v.validators.integer,
                            {
                                validator : v.validators.greaterThan,
                                options : {
                                    threshold : 0
                                }
                            }
                        ],
                        style : [
                            {
                                validator : v.validators.enum,
                                options : {
                                    allowedValues : ['raw', 'json', 'csv']
                                }
                            }
                        ]
                    }
                }
            }
        ],
        times : [ v.validators.boolean ]
    }
  }

  If this schema was used to validate this object:

  {
    display : {
        height : -1
    },
    someUnknownProperty : 'asdf'
  }

  The validate response would be

    [
      {
        "property": "someUnknownProperty",
        "errors": [
          {
            "code": "UNKNOWN_PROPERTY",
            "message": "is not allowed"
          }
        ]
      },
      {
        "property": "display",
        "errors": [
          {
            "property": "height",
            "errors": [
              {
                "code": "OUT_OF_RANGE",
                "message": "must be greater than 0"
              }
            ]
          }
        ]
      }
    ]


    WRITING YOUR OWN CUSTOM VALIDATOR

    The library comes with a set of validators but you can write your own too.
    Each validator should have the following signature

    function(value, options) {
        // value - the value of the property
        // options - any additional options passed to the validator (when using {validator, options} syntax)
    }

    If the validation passes, the validator function should return undefined. Otherwise, it should return a
    ValueValidationError if the property is a "leaf" property, or a PropertyValidationError if the property has sub objects
    (so that the nested structure can be conveyed in the validate()'s' response).

 */

var _ = require('underscore');
var moment = require('moment');
var BaseError = require('../base-error.js');

var ValueValidationError = BaseError.extend({});
var PropertyValidationError = BaseError.extend({});

var DurationConstructor = moment.duration().constructor;

var v;

module.exports = v = {

    ValueValidationError : ValueValidationError,
    PropertyValidationError : PropertyValidationError,

    /**
     * Validates an object against a schema.
     * @param  {[type]} obj    The object!
     * @param  {[type]} schema The options for the object validator
     * @return {[type]}        An array of errors (or undefined if there are none)
     */
    validate : function(obj,schema) {
        return v.validators.object.call(obj, obj, schema);
    },

    /**
     * Takes the nested PropertyValidationError/ValidationError structure returned by validate()
     * and returns a flattened version that maps the dot-separated path to the PropertyValidationError
     * to its ValueValidationError(s). For example, if there was a validation error with the height property in this object,
     * { display : { height:  20.5 } }, the returned map would contain 'display.height' : [ValidationErrors]
     * @param  {[type]} errs [description]
     * @return {[type]}      [description]
     */
    flattenErrors : function(errs) {
        var flattenedErrors = {};

        // the prefix is used to recursively build the dot-separated
        // to path to validation error/property (e.g. 'display.height')
        function findErrors(errs, prefix) {
            errs.forEach(function(err) {
                if (err instanceof ValueValidationError) {
                    flattenedErrors[prefix] = flattenedErrors[prefix] || [];
                    flattenedErrors[prefix].push(err);
                }
                else if (err instanceof PropertyValidationError) {
                    findErrors(err.info.errors, prefix === '' ? err.info.property : prefix + '.' + err.info.property);
                }
                else {
                    throw new Error('Unknown type of error: ' + err);
                }
            });
        }

        findErrors(errs, '');

        return flattenedErrors;
    },

    validators : {

        /**
         * [object description]
         * @param  {[type]} value   [description]
         * @param  {[type]} options allowedProperties, requiredProperties, and properties
         * @return {[type]}         [description]
         */
        object : function(value, options) {
            var allErrors = [];

            if (value.constructor !== Object) {
                return new ValueValidationError(null, 'INVALID_TYPE', { type : 'OBJECT' });
            }

            if (options === undefined) {
                return undefined;
            }

            if (options.allowedProperties) {
                var unAllowedProperties = _.difference(_.keys(value), options.allowedProperties);

                allErrors = allErrors.concat(unAllowedProperties.map(function(prop) {
                    return new PropertyValidationError(
                        null, null,
                        { property : prop, errors : [ new ValueValidationError(null, 'UNKNOWN') ] }
                    );
                }));
            }

            if (options.requiredProperties) {

                options.requiredProperties.forEach(function(prop) {
                    if (value[prop] === undefined) {
                        allErrors.push(new PropertyValidationError(null, null,
                            { property : prop, errors : [ new ValueValidationError(null, 'REQUIRED') ] }
                        ));
                    }
                });
            }

            _.each(options.properties, function(validators, key) {
                var propErrors = [];
                _.each(validators, function(validator) {
                    var validatorErrors = [];

                    // nothing to validate if theres no value...
                    if (value[key] === undefined) {
                        return;
                    }

                    if (_.isFunction(validator) ) {
                        validatorErrors = validator.call(this, value[key]);
                    }
                    else if (_.isFunction(validator.validator)) {
                        validatorErrors = validator.validator.call(this, value[key], validator.options);
                    }
                    else {
                        throw new Error('Validator must be an function or an object containing a validator property that is a function: ' + validator);
                    }

                    if (validatorErrors !== undefined) {
                        propErrors = propErrors.concat(validatorErrors);
                    }

                }, this);

                if (propErrors.length > 0) {
                    allErrors.push(new PropertyValidationError(null, null,
                        { property : key, errors : propErrors }
                    ));
                }
            }, this);

            if (Object.keys(allErrors).length > 0) {
                return allErrors;
            }

            return undefined;
        },

        string : function(value, options) {
            return ! _.isString(value) ? new ValueValidationError(null, 'INVALID_TYPE', {type : 'STRING'}) : undefined;
        },

        number : function(value, options) {
            return ! _.isNumber(value) ? new ValueValidationError(null, 'INVALID_TYPE', {type : 'NUMBER'}) : undefined;
        },

        integer : function(value, options) {
            return value !== parseInt(value, 10) ? new ValueValidationError(null, 'INVALID_TYPE',{type : 'INTEGER'}) : undefined;
        },

        boolean : function(value, options) {
            return ! _.isBoolean(value) ? new ValueValidationError(null, 'INVALID_TYPE', {type : 'BOOLEAN'}) : undefined;
        },

        array : function(value, options) {
            return ! _.isArray(value) ? new ValueValidationError(null, 'INVALID_TYPE', {type : 'ARRAY'}) : undefined;
        },

        duration: function(value, key, obj, options) {
            // TODO: need better way of checking if a value passed in is a duration...
            if (value.constructor !== DurationConstructor) {
                return new ValueValidationError(null, 'INVALID_TYPE', {type : 'DURATION'});
            }
        },

        date: function(value, key, obj, options) {
            return ! _.isDate(value) ? new ValueValidationError(null, 'INVALID_TYPE', {type : 'DATE'}) : undefined;
        },

        /**
         * Checks whether the valus is greater than options.threshold.
         * @param  {[type]} value   [description]
         * @param  {[type]} options threshold
         * @return {[type]}         [description]
         */
        greaterThan : function(value, options) {
            return value <= options.threshold ? new ValueValidationError(null, 'OUT_OF_RANGE', { type : 'GREATER_THAN', threshold : options.threshold }) : undefined;
        },

        /**
         * Checks whether the valus is less than options.threshold.
         * @param  {[type]} value   [description]
         * @param  {[type]} options [description]
         * @return {[type]}         [description]
         */
        lessThan : function(value, options) {
            return value >= options.threshold ? new ValueValidationError(null, 'OUT_OF_RANGE', { type : 'LESS_THAN', threshold :  options.threshold }) : undefined;
        },

        /**
         * Checks whether the valus is greater or equal to than options.threshold.
         * @param  {[type]} value   [description]
         * @param  {[type]} options threshold
         * @return {[type]}         [description]
         */
        greaterThanOrEqual : function(value, options) {
            return value < options.threshold ? new ValueValidationError(null, 'OUT_OF_RANGE', { type : 'GREATER_THAN_OR_EQUAL', threshold : options.threshold }) : undefined;
        },

        /**
         * Checks whether the valus is less than or equal to options.threshold.
         * @param  {[type]} value   [description]
         * @param  {[type]} options [description]
         * @return {[type]}         [description]
         */
        lessThanOrEqual : function(value, options) {
            return value > options.threshold ? new ValueValidationError(null, 'OUT_OF_RANGE', { type : 'LESS_THAN_OR_EQUAL', threshold :  options.threshold }) : undefined;
        },

        /**
         * Checks whether the value is one of options.allowedValues
         * @param  {[type]} value   [description]
         * @param  {[type]} options allowedValues
         * @return {[type]}         [description]
         */
        enum : function(value, options) {
            return ! _.contains(options.allowedValues, value ) ? new ValueValidationError(null, 'ENUM', { allowedValues :  options.allowedValues.join(', ') }) : undefined;
        }
    }
};
