/*jslint browser: true */

require('chai').should();
var viewTestUtils = require('./utils/view-test-utils');
var _ = require('underscore');

var test_date = new Date();

var juttleEnv = {
    now : new Date()
};

describe('Time Chart Sink View', function () {
    var TimeChartView = require('../../src/views/timechart');


    describe('Series Labels', function () {
        describe('keyField specified', function() {
            it('series label should be the value of the keyField', function() {
                var chart = new TimeChartView({
                    juttleEnv : juttleEnv,
                    params : {
                        keyField : 'host'
                    }
                });

                chart.consume([
                    { time : test_date, host : 'host1', pop : 'pop1', value : 1 },
                    { time : test_date, host : 'host1', pop : 'pop2', value : 2 },
                    { time : test_date, host : 'host2', pop : 'pop2', value : 3 }
                ]);

                chart.chart.series['0'].label.should.equal('host1');
                chart.chart.series['1'].label.should.equal('host2');
            });
        });

        describe('keyField not specified', function() {
            it('series label should update based on new points.', function() {
                var chart = new TimeChartView({
                    juttleEnv : juttleEnv
                });

                chart.consume([
                    { time : test_date, host : 'host1', pop : 'pop1', country : "Canada", value : 10 }
                ]);

                chart.chart.series['0'].label.should.equal('country: Canada');

                chart.consume([
                    { time : test_date, host : 'host1', pop : 'pop2', country : "Canada", value : 10 },
                    { time : test_date, host : 'host2', pop : 'pop2', country : "Canada", value : 10 }
                ]);

                chart.chart.series['0'].label.should.equal('host: host1, pop: pop1');
                chart.chart.series['1'].label.should.equal('host: host1, pop: pop2');
                chart.chart.series['2'].label.should.equal('host: host2, pop: pop2');

                chart.consume([
                    { time : test_date, host : 'host1', pop : 'pop2', country : "Portugal", value : 10 }
                ]);

                chart.chart.series['0'].label.should.equal('country: Canada, host: host1, pop: pop1');
                chart.chart.series['1'].label.should.equal('country: Canada, host: host1, pop: pop2');
                chart.chart.series['2'].label.should.equal('country: Canada, host: host2, pop: pop2');
                chart.chart.series['3'].label.should.equal('country: Portugal, host: host1, pop: pop2');
            });

            it('Stream of points of only time and value fields should have series label of value field', function() {
                var chart = new TimeChartView({
                    juttleEnv : juttleEnv
                });

                chart.consume([
                    { time : test_date, value : 10 },
                    { time : test_date, value : 10 },
                    { time : test_date, value : 10 }
                ]);

                chart.chart.series['0'].label.should.equal('value');
            });

            it('numeric fields should be ignored for determining series', function() {
                var chart = new TimeChartView({
                    juttleEnv : juttleEnv,
                    params : {
                        valueField : 'value'
                    }
                });

                chart.consume([
                    { time : test_date, value : 10, value2 : 20, host : "host1" },
                    { time : test_date, value : 11, value2 : 30, host : "host2" }
                ]);

                chart.chart.series['0'].label.should.equal('host: host1');
                chart.chart.series['1'].label.should.equal('host: host2');
            });
        });

        describe('missing fields', function() {
            it('not shown if there are other non-missing keyfields', function() {
                var chart = new TimeChartView({
                    juttleEnv : juttleEnv
                });

                chart.consume([
                    { time : test_date, value : 10, common: "test", not_common: "shown" },
                    { time : test_date, value : 10, common: "test1" }
                ]);

                chart.chart.series['0'].label.should.equal('common: test, not_common: shown');
                chart.chart.series['1'].label.should.equal('common: test1');
            });

            it('shown if there are no other non-missing keyfields', function() {
                var chart = new TimeChartView({
                    juttleEnv : juttleEnv
                });

                chart.consume([
                    { time : test_date, value : 10, common: "test", some_field: "shown" },
                    { time : test_date, value : 10, common: "test"}
                ]);

                chart.chart.series['0'].label.should.equal('some_field: shown');
                chart.chart.series['1'].label.should.equal('some_field: null');
            });
        });
    });

    describe('invalid params', function() {
        it('unknown top level field', function() {
            viewTestUtils.verifyValidationError({
                viewConstructor : TimeChartView,
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

        it('unknown display field', function() {
            viewTestUtils.verifyValidationError({
                viewConstructor : TimeChartView,
                params : {
                    display : {
                        columnOrder : 'asdf'
                    }
                },
                errorPath : 'display.columnOrder',
                error : {
                    'code' : 'UNKNOWN',
                    'info' : {}
                }
            });
        });

        it('non-string valueField', function() {
            viewTestUtils.verifyValidationError({
                viewConstructor : TimeChartView,
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

        it('invalid axis', function() {
            viewTestUtils.verifyValidationError({
                viewConstructor : TimeChartView,
                params : {
                    yScales : {
                        primary : {
                            displayOnAxis : 'diagonal'
                        }
                    }
                },
                errorPath : 'yScales.primary.displayOnAxis',
                error : {
                    'code' : 'ENUM',
                    'info' : {
                        'allowedValues' : 'top, bottom, left, right'
                    }
                }
            });
        });

        it('invalid scale', function() {
            viewTestUtils.verifyValidationError({
                viewConstructor : TimeChartView,
                params : {
                    yScales : {
                        secondary : {},
                        invalid : {}
                    }
                },
                errorPath : 'yScales',
                error : {
                    'code' : 'INVALID_SCALE',
                    'info' : {
                        'scale' : 'invalid'
                    }
                }
            });
        });

        it('min value greater than max value', function() {
            viewTestUtils.verifyValidationError({
                viewConstructor : TimeChartView,
                params : {
                    yScales : {
                        primary : {
                            minValue : 100,
                            maxValue : 50
                        }
                    }
                },
                errorPath : 'yScales.primary.minValue',
                error : {
                    'code' : 'MIN_VALUE_LESS_THAN_MAX_VALUE',
                    'info' : {}
                }
            });
        });

        it('min value greater than max value', function() {
            viewTestUtils.verifyValidationError({
                viewConstructor : TimeChartView,
                params : {
                    yScales : {
                        primary : {
                            minValue : 100,
                            maxValue : 50
                        }
                    }
                },
                errorPath : 'yScales.primary.minValue',
                error : {
                    'code' : 'MIN_VALUE_LESS_THAN_MAX_VALUE',
                    'info' : {}
                }
            });
        });

        it('series with in-existant scale', function() {
            viewTestUtils.verifyValidationError({
                viewConstructor : TimeChartView,
                params : {
                    series : [{
                        name : 'host1',
                        yScale : 'nonExistantScale'
                    }]
                },
                errorPath : 'series.0.yScale',
                error : {
                    'code' : 'SERIES_SCALE_NOT_FOUND',
                    'info' : {
                        'scale': 'nonExistantScale'
                    }
                }
            });
        });

        it('interval with non-duration value', function() {
            viewTestUtils.verifyValidationError({
                viewConstructor : TimeChartView,
                params : {
                    interval : "someString",
                },
                errorPath : 'interval',
                error : {
                    'code' : 'INVALID_TYPE',
                    'info' : {
                        'type' : 'DURATION'
                    }
                }
            });
        });
    });

    describe('Runtime Messages', function () {
        it('Waiting for Data', function() {
            var chart = new TimeChartView({
                juttleEnv : juttleEnv
            });
            chart.setDimensions(null, 100, 100);

            viewTestUtils.verifyRuntimeMessage(chart, 'WAITING_FOR_DATA');

            chart.consume([
                { time : test_date, host : 'host1', pop : 'pop1', value : 1 },
            ]);

            viewTestUtils.verifyNoRuntimeMessages(chart);
        });

        it('No Data Received', function() {
            var chart = new TimeChartView({
                juttleEnv : juttleEnv
            });
            chart.setDimensions(null, 100, 100);

            chart.consume_eof();
            viewTestUtils.verifyRuntimeMessage(chart, 'NO_DATA_RECEIVED');
        });

        it('Value field does not exist', function() {
            var chart = new TimeChartView({
                juttleEnv : juttleEnv,
                params : {
                    valueField : 'v',
                    keyField : 'host'
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

        it('null valueField does not trigger VALUE_FIELD_NON_NUMERIC', function() {
            var chart = new TimeChartView({
                juttleEnv : juttleEnv,
                params : {
                    valueField : 'value',
                    keyField : 'host'
                }
            });
            chart.setDimensions(null, 100, 100);

            chart.consume([
                { time: test_date, host: 'host1', value: null },
                { time: test_date, host: 'host2', value: null },
                { time: test_date, host: 'host3', value: null },
                { time: test_date, host: 'host4', value: null },
                { time: test_date, host: 'host5', value: null }
            ]);

            viewTestUtils.verifyNoRuntimeMessages(chart);
        });

        it('test COULD_NOT_DETERMINE_VALUE_FIELD', function() {
            var chart = new TimeChartView({
                juttleEnv : juttleEnv,
                params : {
                    keyField : 'host'
                }
            });
            chart.setDimensions(null, 100, 100);

            chart.consume([
                { time: test_date, host: 'host1', value: 'A' },
            ]);

            viewTestUtils.verifyRuntimeMessage(chart, 'COULD_NOT_DETERMINE_VALUE_FIELD');
        });

        it('Invalid time field', function() {
            var chart = new TimeChartView({
                juttleEnv : juttleEnv,
                params : {
                    timeField: 'host'
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

            viewTestUtils.verifyRuntimeMessage(chart, 'TIME_FIELD_ERROR');
        });

        it('Multiple points with the same timestamp and series', function() {
            var chart = new TimeChartView({
                juttleEnv : juttleEnv,
                params : {
                    keyField : 'host'
                }
            });
            chart.setDimensions(null, 100, 100);

            chart.consume([
                { time: test_date, host: 'host1', value: 1 },
                { time: test_date, host: 'host1', value: 2 },
                { time: test_date, host: 'host2', value: 3 },
                { time: test_date, host: 'host2', value: 4 }
            ]);

            viewTestUtils.verifyRuntimeMessage(chart, 'MULTIPLE_POINTS_SAME_TIME_SAME_SERIES');
        });

        it('Show downsampling warning', function() {
            var chart = new TimeChartView({
                juttleEnv : juttleEnv,
                params : {
                    keyField : 'host'
                }
            });
            chart.setDimensions(null, 800, 500);

            // push points in that will create 2 series
            chart.consume([
                { time: test_date, host: 'host1', value: 1 },
                { time: test_date, host: 'host2', value: 1 }
            ]);

            // simulate downsampling in one series
            _.values(chart.series)[0].series.target.trigger('downsample', 2);
            viewTestUtils.verifyRuntimeMessage(chart, 'DOWNSAMPLING_WARNING');

            // and turn it off
            _.values(chart.series)[0].series.target.trigger('downsample', 1);
            viewTestUtils.verifyNoRuntimeMessages(chart);

            // simulate downsampling in both series
            _.values(chart.series)[0].series.target.trigger('downsample', 2);
            _.values(chart.series)[1].series.target.trigger('downsample', 2);
            viewTestUtils.verifyRuntimeMessage(chart, 'DOWNSAMPLING_WARNING');

            // simulate downsampling turnoff in one of the series
            // and ensure the warning is still there
            _.values(chart.series)[0].series.target.trigger('downsample', 1);
            viewTestUtils.verifyRuntimeMessage(chart, 'DOWNSAMPLING_WARNING');

            // simulate downsampling turnoff in the remaining series
            // and ensure the warning is gone
            _.values(chart.series)[1].series.target.trigger('downsample', 1);
            viewTestUtils.verifyNoRuntimeMessages(chart);
        });

        it('default series limit reached', function() {
            var NUM_POINTS = 20;
            var chart = new TimeChartView({
                juttleEnv : juttleEnv,
                params : {
                    keyField : 'host'
                }
            });
            chart.setDimensions(null, 100, 100);

            var points = [];

            for (var i = 0; i < NUM_POINTS; i++) {
                points.push({ time: test_date, host: 'host' + i, value: i });
            }

            chart.consume(points);

            viewTestUtils.verifyNoRuntimeMessages(chart);

            chart.consume([
                { time: test_date, host: 'host' + NUM_POINTS + 1, value: NUM_POINTS + 1 }
            ]);

            viewTestUtils.verifyRuntimeMessage(chart, 'SERIES_LIMIT_REACHED', {
                seriesLimit: NUM_POINTS
            });
        });

        it('configured series limit reached', function() {
            var NUM_POINTS = 3;
            var chart = new TimeChartView({
                juttleEnv : juttleEnv,
                params : {
                    keyField : 'host',
                    seriesLimit: NUM_POINTS
                }
            });
            chart.setDimensions(null, 100, 100);

            var points = [];

            for (var i = 0; i < NUM_POINTS; i++) {
                points.push({ time: test_date, host: 'host' + i, value: i });
            }

            chart.consume(points);

            viewTestUtils.verifyNoRuntimeMessages(chart);

            chart.consume([
                { time: test_date, host: 'host' + NUM_POINTS + 1, value: NUM_POINTS + 1 }
            ]);

            viewTestUtils.verifyRuntimeMessage(chart, 'SERIES_LIMIT_REACHED', {
                seriesLimit: NUM_POINTS
            });
        });
    });
});
