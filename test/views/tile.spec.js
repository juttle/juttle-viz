require('chai').should();
var viewTestUtils = require('./utils/view-test-utils');

var test_date = new Date();

describe('Tile Sink View', function () {
    var TileView = require('../../src/views/tile');

    describe('invalid params', function() {
        it('unknown top level field', function() {
            viewTestUtils.verifyValidationError({
                viewConstructor : TileView,
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

        it('non-string valueFormat', function() {
            viewTestUtils.verifyValidationError({
                viewConstructor : TileView,
                params : {
                    valueFormat : 1
                },
                errorPath : 'valueFormat',
                error : {
                    'code' : 'INVALID_TYPE',
                    'info' : {
                        'type' : 'STRING'
                    }
                }
            });
        });

        it('non-string timeField', function() {
            viewTestUtils.verifyValidationError({
                viewConstructor : TileView,
                params : {
                    timeField : []
                },
                errorPath : 'timeField',
                error : {
                    'code' : 'INVALID_TYPE',
                    'info' : {
                        'type' : 'STRING'
                    }
                }
            });
        });

        it('non-string levelField', function() {
            viewTestUtils.verifyValidationError({
                viewConstructor : TileView,
                params : {
                    levelField : 1
                },
                errorPath : 'levelField',
                error : {
                    'code' : 'INVALID_TYPE',
                    'info' : {
                        'type' : 'STRING'
                    }
                }
            });
        });
    });

    it('consume call with no points', function() {
        var chart = new TileView({});

        // just make sure it doesn't cause an exception
        chart.consume([]);
    });

    describe('Runtime Messages', function () {
        it('Waiting for Data', function() {
            var chart = new TileView({});

            viewTestUtils.verifyRuntimeMessage(chart, 'WAITING_FOR_DATA');

            chart.consume([
                { time : test_date, host : 'host1', pop : 'pop1', value : 2 }
            ]);

            viewTestUtils.verifyNoRuntimeMessages(chart);
        });

        it('No Data Received', function() {
            var chart = new TileView({});

            chart.consume_eof();
            viewTestUtils.verifyRuntimeMessage(chart, 'NO_DATA_RECEIVED');
        });

        it('Value field can be non numeric', function() {
            var chart = new TileView({
                params : {
                    valueField : 'v'
                }
            });

            chart.consume([
                { time: test_date, host: 'host1', v: 'a' }
            ]);

            viewTestUtils.verifyNoRuntimeMessages(chart);
        });

        it('doesn\'t complain about timeless points', function() {
            var chart = new TileView({});
            chart.setDimensions(null, 200, 200);

            chart.consume([
                {
                    category: 'A',
                    value: 1
                },
                {
                    category: 'B',
                    value: 1
                }
            ]);

            viewTestUtils.verifyNoRuntimeMessages(chart);
        });
    });
});
