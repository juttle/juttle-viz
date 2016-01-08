/*jslint browser: true */

require('chai').should();
var viewTestUtils = require('./utils/view-test-utils');

var test_date = new Date();

describe('Pie Sink View', function () {
    var PieView = require('../../src/views/piechart');

    describe('invalid params', function() {
        it('unknown top level field', function() {
            viewTestUtils.verifyValidationError({
                viewConstructor : PieView,
                params : {
                    columnOrder : 'asdf'
                },
                errorPath : 'columnOrder',
                error : {
                    'code' : 'UNKNOWN',
                    'info' : {}
                }
            });
        });

        it('non-string sliceLabels.valueFormat', function() {
            viewTestUtils.verifyValidationError({
                viewConstructor : PieView,
                params : {
                    sliceLabels : {
                        valueFormat : 1
                    }
                },
                errorPath : 'sliceLabels.valueFormat',
                error : {
                    'code' : 'INVALID_TYPE',
                    'info' : {
                        'type' : 'STRING'
                    }
                }
            });
        });

        it('non-string valueField', function() {
            viewTestUtils.verifyValidationError({
                viewConstructor : PieView,
                params : {
                    valueField : []
                },
                errorPath : 'valueField',
                error : {
                    'code' : 'INVALID_TYPE',
                    'info' : {
                        'type' : 'STRING'
                    }
                }
            });
        });

        it('non-string categoryField', function() {
            viewTestUtils.verifyValidationError({
                viewConstructor : PieView,
                params : {
                    categoryField : {}
                },
                errorPath : 'categoryField',
                error : {
                    'code' : 'INVALID_TYPE',
                    'info' : {
                        'type' : 'STRING'
                    }
                }
            });
        });

        it('radiusInner too big', function() {
            viewTestUtils.verifyValidationError({
                viewConstructor : PieView,
                params : {
                    radiusInner : 150
                },
                errorPath : 'radiusInner',
                error : {
                    'code' : 'OUT_OF_RANGE',
                    'info' : {
                        'threshold' : 100,
                        'type' : 'LESS_THAN_OR_EQUAL'
                    }
                }
            });
        });

        it('radiusInner too small', function() {
            viewTestUtils.verifyValidationError({
                viewConstructor : PieView,
                params : {
                    radiusInner : -1
                },
                errorPath : 'radiusInner',
                error : {
                    'code' : 'OUT_OF_RANGE',
                    'info' : {
                        'threshold' : 0,
                        'type' : 'GREATER_THAN_OR_EQUAL'
                    }
                }
            });
        });
    });

    describe('Runtime Messages', function () {
        it('waiting for data', function() {
            var chart = new PieView({});
            chart.setDimensions(null, 100, 100);

            viewTestUtils.verifyRuntimeMessage(chart, 'WAITING_FOR_DATA');

            chart.consume([
                { time : test_date, value : 1, pop : 'pop1' }
            ]);

            viewTestUtils.verifyNoRuntimeMessages(chart);
        });

        it('all categories are 0', function() {
            var chart = new PieView({});
            chart.setDimensions(null, 100, 100);

            chart.consume([
                { time : test_date, value : 0, pop : 'pop1' }
            ]);

            viewTestUtils.verifyRuntimeMessage(chart, 'ALL_CATEGORIES_ARE_ZERO');

            chart.consume([
                { time : test_date, value : 1, pop : 'pop2' }
            ]);

            viewTestUtils.verifyNoRuntimeMessages(chart);

            chart.consume([
                { time : test_date, value : 0, pop : 'pop3' }
            ]);

            viewTestUtils.verifyNoRuntimeMessages(chart);
        });

        it('No Data Received', function() {
            var chart = new PieView({});
            chart.setDimensions(null, 100, 100);

            chart.consume_eof();
            viewTestUtils.verifyRuntimeMessage(chart, 'NO_DATA_RECEIVED');
        });

        it('Value field does not exist', function() {
            var chart = new PieView({
                params : {
                    valueField : 'v',
                    categoryField : 'host'
                }
            });
            chart.setDimensions(null, 100, 100);

            chart.consume([
                { time: test_date, host: 'host1', value: 1 },
                { time: test_date, host: 'host2', value: 1 },
                { time: test_date, host: 'host3', value: 1 },
                { time: test_date, host: 'host4', value: 1 },
                { time: test_date, host: 'host5', value: 1 }
            ]);

            viewTestUtils.verifyRuntimeMessage(chart, 'VALUE_FIELD_NON_NUMERIC', {
                valueField : 'v'
            });
        });
    });
});
