require('chai').should();
var viewTestUtils = require('./utils/view-test-utils');

var EventsView = require('../../src/views/events');
var TimeChartView = require('../../src/views/timechart');

describe('Table Sink View', function () {

    describe('invalid params', function() {
        it('unknown top level field', function() {
            viewTestUtils.verifyValidationError({
                viewConstructor : EventsView,
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

        it('inexistent sink overlay', function() {
            viewTestUtils.verifyValidationError({
                viewConstructor : EventsView,
                params : {
                    on : 'someSink'
                },
                errorPath : 'on',
                error : {
                    'code' : 'OVERLAY_SINK_NOT_FOUND',
                    'info' : {
                        'overlayId' : 'someSink'
                    }
                }
            });
        });
    });

    describe('Runtime Messages', function () {
        it('doesn\'t complain about timeless points when not in overlay', function() {
            var chart = new EventsView({});
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

        it('complains on timechart about timeless points when overlaying', function() {
            var timeChart = new TimeChartView({
                juttleEnv: {
                    now: new Date()
                },
                params: {
                    id: 1
                }
            });

            timeChart.setDimensions(null, 200, 200);

            timeChart.consume([
                {
                    time: new Date(),
                    value: 1
                }
            ]);

            var chart = new EventsView({
                params: {
                    on: 1
                }
            }, [timeChart]);

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

            viewTestUtils.verifyRuntimeMessage(timeChart, 'TIME_FIELD_ERROR');
        });
    });
});
