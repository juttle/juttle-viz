require('chai').should();
var v = require('../../../src/lib/object-validation');


describe('Object Validation', function () {
    describe('validate', function() {
        it('empty object, no rules', function() {
            var errs = v.validate({},{});
            (errs === undefined).should.be.true;
        });

        it('empty object, one required property', function() {
            var errs = v.validate({},{
                requiredProperties : ['requiredField']
            });

            errs[0].should.be.instanceof(v.PropertyValidationError);
            errs[0].info.errors[0].should.be.instanceof(v.ValueValidationError);
            errs[0].info.errors[0].code.should.be.eql('REQUIRED');
        });

        it('one unknown property', function() {
            var errs = v.validate({
                someProperty : 'someValue'
            },{
                allowedProperties : []
            });

            errs[0].should.be.instanceof(v.PropertyValidationError);
            errs[0].info.errors[0].should.be.instanceof(v.ValueValidationError);
            errs[0].info.errors[0].code.should.be.eql('UNKNOWN');
        });

        describe('custom validator', function() {
            it('custom validator that fails', function() {
                var errs = v.validate({
                    myProperty : 1
                }, {
                    properties : {
                        myProperty : [
                            function(value, options) {
                                value.should.be.eql(1);
                                return new v.ValueValidationError( 'some error some error some errors', 'TEST_TEST_TEST');
                            }
                        ] 
                    }

                });

                errs[0].should.be.instanceof(v.PropertyValidationError);
                errs[0].info.errors[0].should.be.instanceof(v.ValueValidationError);
                errs[0].info.errors[0].code.should.be.eql('TEST_TEST_TEST');
                errs[0].info.errors[0].message.should.be.eql('some error some error some errors');


                errs = v.validate({
                    myProperty : 1
                }, {
                    properties : {
                        myProperty : [
                            {
                                validator : function(value, options) {
                                    value.should.be.eql(1);
                                    options.should.be.eql({ myOption : 'OPTION!'});
                                    return new v.ValueValidationError('some error some error some errors', 'TEST_TEST_TEST');
                                },
                                options : {
                                    myOption : 'OPTION!'
                                }
                            }
                        ] 
                    }

                });

                errs[0].should.be.instanceof(v.PropertyValidationError);
                errs[0].info.errors[0].should.be.instanceof(v.ValueValidationError);
                errs[0].info.errors[0].code.should.be.eql('TEST_TEST_TEST');
                errs[0].info.errors[0].message.should.be.eql('some error some error some errors');
            });

            it('custom validator that passes', function() {
                var errs = v.validate({
                    myProperty : 1
                }, {
                    properties : {
                        myProperty : [
                            function(value, options) {
                                value.should.be.eql(1);
                                return undefined;
                            }
                        ] 
                    }
                });

                (errs === undefined).should.be.equal(true);
            });
        });

        describe('multiple validators for one property', function() {
            it('one fails', function() {
                var errs = v.validate({
                    someProperty : 'someValue'
                },{
                    properties : {
                        someProperty : [
                            function() { return new v.ValueValidationError(null, 'ERROR_1');},
                            function() { return undefined;}
                        ]
                    }
                });

                errs[0].should.be.instanceof(v.PropertyValidationError);
                errs[0].info.errors[0].should.be.instanceof(v.ValueValidationError);
                errs[0].info.errors.length.should.be.eql(1);
                errs[0].info.errors[0].code.should.be.eql('ERROR_1');
                
            });

            it('both fail', function() {
                var errs = v.validate({
                    someProperty : 'someValue'
                },{
                    properties : {
                        someProperty : [
                            function() { return new v.ValueValidationError(null, 'ERROR_1');},
                            function() { return new v.ValueValidationError(null, 'ERROR_2');}
                        ]
                    }
                });

                errs[0].should.be.instanceof(v.PropertyValidationError);
                errs[0].info.errors[0].should.be.instanceof(v.ValueValidationError);
                errs[0].info.errors.length.should.be.eql(2);
                errs[0].info.errors[0].code.should.be.eql('ERROR_1');
                errs[0].info.errors[1].code.should.be.eql('ERROR_2');
            });
        });
    });

    describe('flattenErrors', function() {
        it('no errors', function() {
            var errs = v.flattenErrors([]);
            errs.should.be.eql({});
        });

        it('top level error', function() {
            var err = new v.ValueValidationError('error test', 'ERROR_1');
            var PropertyValidationError = new v.PropertyValidationError(null, null, {property : 'myProperty', errors : [err]});
            var errs = v.flattenErrors([PropertyValidationError]);
            errs.should.be.eql({
                'myProperty' : [err]
            });
        });

        it('nested error', function() {
            var err = new v.ValueValidationError('error test', 'ERROR_1');
            var subPropertyValidationError = new v.PropertyValidationError(null, null, {property : 'mySubProperty', errors : [err]});
            var PropertyValidationError = new v.PropertyValidationError(null, null, {property : 'myProperty', errors : [subPropertyValidationError]});
            var errs = v.flattenErrors([PropertyValidationError]);
            errs.should.be.eql({
                'myProperty.mySubProperty' : [err]
            });
        });
    });
});
