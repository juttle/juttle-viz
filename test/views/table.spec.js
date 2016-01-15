require('chai').should();
var viewTestUtils = require('./utils/view-test-utils');

describe('Table Sink View', function () {
    var TableView = require('../../src/views/table');

    describe('invalid params', function() {
        describe('columnOrder', function() {
            it('array with non-string value', function() {
                viewTestUtils.verifyValidationError({
                    viewConstructor : TableView,
                    params : {
                        columnOrder : ['asdf',1]
                    },
                    errorPath : 'columnOrder',
                    error : {
                        'code' : 'INVALID_TYPE',
                        'info' : {
                            'type' : 'STRING_ARRAY'
                        }
                    }
                });
            });
        });

        describe('update', function() {
            it('invalid value', function() {
                viewTestUtils.verifyValidationError({
                    viewConstructor : TableView,
                    params : {
                        update : 'explode'
                    },
                    errorPath : 'update',
                    error : {
                        'code' : 'ENUM',
                        'info' : {
                            'allowedValues' : 'replace, append'
                        }
                    }
                });
            });
        });

        describe('limit', function() {
            it('invalid type', function() {
                viewTestUtils.verifyValidationError({
                    viewConstructor : TableView,
                    params : {
                        limit : 'a'
                    },
                    errorPath : 'limit',
                    error : {
                        'code' : 'INVALID_TYPE',
                        'info' : {
                            'type' : 'INTEGER'
                        }
                    }
                });
            });
        });

        describe('height', function() {
            it('invalid type', function() {
                viewTestUtils.verifyValidationError({
                    viewConstructor : TableView,
                    params : {
                        height : 'a'
                    },
                    errorPath : 'height',
                    error : {
                        'code' : 'INVALID_TYPE',
                        'info' : {
                            'type' : 'INTEGER'
                        }
                    }
                });
            });
        });
    });

    describe('Runtime Messages', function () {
        it('waiting for data', function() {
            var chart = new TableView({});

            chart.runtimeMessages.getMessages().at(0).get('code').should.eql('WAITING_FOR_DATA');

            chart.consume([
                { time : new Date(), value : 1, pop : 'pop1' }
            ]);

            chart.runtimeMessages.getMessages().length.should.eql(0);
        });

        it('row limit reached', function() {
            var chart = new TableView({
                params : {
                    limit : 2
                }
            });

            chart.consume([
                { time : new Date(), value : 0, pop : 'pop1' },
                { time : new Date(), value : 0, pop : 'pop1' },
                { time : new Date(), value : 0, pop : 'pop1' }
            ]);

            chart.runtimeMessages.getMessages().at(0).get('code').should.eql('TABLE_ROW_LIMIT_REACHED');
        });

        it('No Data Received', function() {
            var chart = new TableView({});

            chart.consume_eof();
            chart.runtimeMessages.getMessages().at(0).get('code').should.eql('NO_DATA_RECEIVED');
            chart.runtimeMessages.getMessages().length.should.eql(1);
        });
    });
});
