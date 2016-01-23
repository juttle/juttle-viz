require('chai').should();
var JuttleView = require('../../src/views/juttle-view');
var ObjectValidator = require('../../src/lib/object-validation');

describe('juttle-view', function() {
    describe('getFlattenedParamValidationErrors', function() {
        it('top-level param', function() {
            var obj = {
                propertyB: 5
            };

            var errs = ObjectValidator.validate(obj, {
                allowedProperties: ["propertyA"]
            });

            var flattenedErrors = JuttleView.getFlattenedParamValidationErrors(errs);

            Object.keys(flattenedErrors).length.should.equal(1);

            flattenedErrors.propertyB[0].message.should.equal('"propertyB" is not a valid parameter.');
        });

        it('nested param', function() {
            var obj = {
                nested: {
                    propertyD: 2
                }
            };

            var errs = ObjectValidator.validate(obj, {
                allowedProperties: ["nested"],
                properties: {
                    nested: [
                        {
                            validator: ObjectValidator.validators.object,
                            options: {
                                allowedProperties: ["propertyA"]
                            }
                        }
                    ]
                }
            });

            var flattenedErrors = JuttleView.getFlattenedParamValidationErrors(errs);
            flattenedErrors["nested.propertyD"][0].message.should.equal('"nested.propertyD" is not a valid parameter.');
        });

        it('multiple errors on one param', function() {

            var obj = {
                propertyB: 5
            };

            var errs = ObjectValidator.validate(obj, {
                allowedProperties: ["propertyB"],
                properties: {
                    propertyB: [
                        {
                            validator: ObjectValidator.validators.greaterThan,
                            options: {
                                threshold: 10
                            }
                        },
                        {
                            validator: ObjectValidator.validators.greaterThan,
                            options: {
                                threshold: 20
                            }
                        }
                    ]
                }
            });

            var flattenedErrors = JuttleView.getFlattenedParamValidationErrors(errs);

            var messageStrings = [flattenedErrors.propertyB[0].message, flattenedErrors.propertyB[1].message];

            messageStrings.should.include('The value of "propertyB" must be greater than 10.');
            messageStrings.should.include('The value of "propertyB" must be greater than 20.');
        });
    });
});
