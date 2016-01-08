/*jslint browser: true */

require('chai').should();
var viewTestUtils = require('./utils/view-test-utils');

var test_date = new Date();

describe('Bar Chart Sink View', function () {
    var BarChartView = require('../../src/views/barchart');

    describe('invalid params', function() {
        it('unknown top level field', function() {
            viewTestUtils.verifyValidationError({
                viewConstructor : BarChartView,
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

        it('non-numeric resetCategories', function() {
            viewTestUtils.verifyValidationError({
                viewConstructor : BarChartView,
                params : {
                    resetCategories : 'asdf'
                },
                errorPath : 'resetCategories',
                error : {
                    'code' : 'INVALID_TYPE',
                    'info' : {
                        'type' : 'INTEGER'
                    }
                }
            });
        });

        it('non-string categoryField', function() {
            viewTestUtils.verifyValidationError({
                viewConstructor : BarChartView,
                params : {
                    categoryField : 2
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

        it('non-string valueField', function() {
            viewTestUtils.verifyValidationError({
                viewConstructor : BarChartView,
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

        it('invalid orientation', function() {
            viewTestUtils.verifyValidationError({
                viewConstructor : BarChartView,
                params : {
                    orientation : 'diagonal'
                },
                errorPath : 'orientation',
                error : {
                    'code' : 'ENUM',
                    'info' : {
                        'allowedValues' : 'vertical, horizontal'
                    }
                }
            });
        });

        it('non-string categoryField', function() {
            viewTestUtils.verifyValidationError({
                viewConstructor : BarChartView,
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

        it('invalid axis', function() {
            viewTestUtils.verifyValidationError({
                viewConstructor : BarChartView,
                params : {
                    yScales : {
                        primary : {
                            displayOnAxis : 'yAxes.top'
                        }
                    }
                },
                errorPath : 'yScales.primary.displayOnAxis',
                error : {
                    'code' : 'ENUM',
                    'info' : {
                        'allowedValues' : 'left, right'
                    }
                }
            });
        });

        it('min value greater than max value', function() {
            viewTestUtils.verifyValidationError({
                viewConstructor : BarChartView,
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

        it('non-string tooltip.nameField', function() {
            viewTestUtils.verifyValidationError({
                viewConstructor : BarChartView,
                params : {
                    tooltip : {
                        nameField : []
                    }
                },
                errorPath : 'tooltip.nameField',
                error : {
                    'code' : 'INVALID_TYPE',
                    'info' : {
                        'type' : 'STRING'
                    }
                }
            });
        });

        it('non-string tooltip.valueField', function() {
            viewTestUtils.verifyValidationError({
                viewConstructor : BarChartView,
                params : {
                    tooltip : {
                        valueField : []
                    }
                },
                errorPath : 'tooltip.valueField',
                error : {
                    'code' : 'INVALID_TYPE',
                    'info' : {
                        'type' : 'STRING'
                    }
                }
            });
        });

        it('non-string tooltip.valueFormat', function() {
            viewTestUtils.verifyValidationError({
                viewConstructor : BarChartView,
                params : {
                    tooltip : {
                        valueFormat : []
                    }
                },
                errorPath : 'tooltip.valueFormat',
                error : {
                    'code' : 'INVALID_TYPE',
                    'info' : {
                        'type' : 'STRING'
                    }
                }
            });
        });

        it('min value greater than max value', function() {
            viewTestUtils.verifyValidationError({
                viewConstructor : BarChartView,
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
    });

    describe('Runtime Messages', function () {
        it('waiting for data', function() {
            var chart = new BarChartView({});
            chart.setDimensions(null, 200, 200);

            viewTestUtils.verifyRuntimeMessage(chart, 'WAITING_FOR_DATA');

            chart.consume([
                { time : test_date, value : 1, pop : 'pop1' }
            ]);

            viewTestUtils.verifyNoRuntimeMessages(chart);
        });

        it('bar count limit reached', function() {
            var chart = new BarChartView({});
            chart.setDimensions(null, 200, 200);

            var lotsOfData = [];

            // we have a 200 bar limit
            for (var i = 0; i <= 200; i++) {
                lotsOfData.push({
                    time : test_date,
                    category : 'category-' + i,
                    value : i
                });
            }

            chart.consume(lotsOfData);

            viewTestUtils.verifyRuntimeMessage(chart, 'BAR_COUNT_LIMIT_REACHED', {
                barCountLimit : 200
            });
        });

        it('No Data Received', function() {
            var chart = new BarChartView({});
            chart.setDimensions(null, 200, 200);

            chart.consume_eof();
            viewTestUtils.verifyRuntimeMessage(chart, 'NO_DATA_RECEIVED');
        });

        it('Value field does not exist', function() {
            var chart = new BarChartView({
                params : {
                    valueField : 'v',
                    categoryField : 'host'
                }
            });
            chart.setDimensions(null, 200, 200);

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
