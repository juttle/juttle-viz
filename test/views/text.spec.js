/*jslint browser: true */

require('chai').should();
var assert = require('chai').assert;
var $ = require('jquery');
var _ = require('underscore');
var viewTestUtils = require('./utils/view-test-utils');

var POINT_1_FIELD = {
    a : 'AAA'
};

var POINT_3_FIELDS = {
    time : new Date(),
    number : 3,
    string : 'ABC'
};

var MARK = '--------------------------------------------------------------';
var TICK = '. . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . ';

/**
 * Compares the json string to the js data (object or array).
 * Uses JSON.stringify but converts dates found in the data
 * to their ISO string before comparing.
 * @param  {[type]} json [description]
 * @param  {[type]} data [description]
 * @return {[type]}      [description]
 */
function compareJSONtoJS(json, data) {
    function convertDatesToISOStrings(obj) {
        var newObj = _.clone(obj);
        _.each(newObj, function(val,key) {
            if (_.isDate(val)) {
                newObj[key] = val.toISOString();
            }
        });
        return newObj;
    }

    if (!_.isArray(data)) {
        json = '[' + json + ']';
        data = [data];
    }

    var jsonArray = JSON.parse(json);

    _.each(data, function(dataItem, i) {
        jsonArray[i].should.eql(convertDatesToISOStrings(dataItem));
    });
}

function verifyTextViewContents(textView, data, format) {
    var textAreaValue = $(textView.visuals['0']).find('textarea').val();
    var textAreaLines = textAreaValue.split('\n');

    switch(format) {
        case 'json':
            textAreaValue.should.equal(JSON.stringify(data,null,4));
            compareJSONtoJS(textAreaValue,data);
            break;
        case 'raw':
            textAreaLines.length.should.eql(data.length);
            data.forEach(function(dataPoint, i) {
                compareJSONtoJS(textAreaLines[i],dataPoint);
            });
            break;
        default:
            throw "verifyTextViewContents only supports json and raw formats";
    }
}

describe('TextView Sink View', function () {
    var TextView = require('../../src/views/text');

    describe('format', function() {
        it('raw', function() {
            var textView = new TextView({});

            textView.consume([POINT_1_FIELD]);
            verifyTextViewContents(textView, [POINT_1_FIELD], 'raw');

            textView.consume([POINT_3_FIELDS]);
            verifyTextViewContents(textView, [POINT_1_FIELD,POINT_3_FIELDS], 'raw');
        });

        it('json', function() {
            var textView = new TextView({
                params : {
                    format: 'json'
                }
            });


            textView.consume([POINT_1_FIELD]);
            verifyTextViewContents(textView, [POINT_1_FIELD], 'json');

            textView.consume([POINT_3_FIELDS]);
            verifyTextViewContents(textView, [POINT_1_FIELD,POINT_3_FIELDS], 'json');
        });

        it('csv', function() {
            var textView = new TextView({
                params : {
                    format : 'csv'
                }
            });

            var textArea = $(textView.visuals['0']).find('textarea');

            textView.consume([POINT_3_FIELDS]);
            var textAreaLines = textArea.val().split('\n');
            var headerLine = textAreaLines[0];
            var pointVals = textAreaLines[1].split(',');

            headerLine.should.equal('"time","number","string"');
            pointVals[0].should.equal('"' + POINT_3_FIELDS.time.toISOString() + '"'); // dates should be expressed as ISO strings
            pointVals[1].should.equal(POINT_3_FIELDS.number + '');
            pointVals[2].should.equal('"' + POINT_3_FIELDS.string + '"'); // strings should be quoted with "
        });

        it('height', function() {
            var height = 3;
            var textView = new TextView({
                params : {
                    height : height,
                    format : 'json'
                }
            });

            var textArea = $(textView.visuals['0']).find('textarea');

            var pts = [POINT_1_FIELD,POINT_1_FIELD,POINT_1_FIELD,POINT_1_FIELD,POINT_1_FIELD,POINT_1_FIELD];

            textView.consume(pts);

            // ensure all the points are still there
            verifyTextViewContents(textView, pts, 'json');
            // ensure text area height is correct
            textArea.attr('rows',height);
        });
    });

    describe('marks', function() {
        describe('true', function() {
            it('times: true', function() {
                var textView = new TextView({
                    params : {
                        marks : true,
                        times : true
                    }
                });

                var textArea = $(textView.visuals['0']).find('textarea');

                var time = new Date();
                textView.consume_mark(time);
                textArea.val().should.equal(MARK + time.toISOString());
            });

            it('times: false', function() {
                var textView = new TextView({
                    params : {
                        marks : true,
                        times : false
                    }
                });

                var textArea = $(textView.visuals['0']).find('textarea');

                var time = new Date();
                textView.consume_mark(time);
                textArea.val().should.equal(MARK);
            });
        });

        it('false', function() {
            var textView = new TextView({
                params : {
                    marks : false
                }
            });

            var textArea = $(textView.visuals['0']).find('textarea');

            textView.consume_mark(new Date());
            textArea.val().should.equal('');
        });
    });

    describe('ticks', function() {
        describe('true', function() {
            it('times: true', function() {
                var textView = new TextView({
                    params : {
                        ticks : true,
                        times : true
                    }
                });

                var textArea = $(textView.visuals['0']).find('textarea');

                var time = new Date();
                textView.consume_tick(time);
                textArea.val().should.equal(TICK + time.toISOString());
            });

            it('times: false', function() {
                var textView = new TextView({
                    params : {
                        ticks : true,
                        times : false
                    }
                });

                var textArea = $(textView.visuals['0']).find('textarea');

                var time = new Date();
                textView.consume_tick(time);
                textArea.val().should.equal(TICK);
            });
        });

        it('false', function() {
            var textView = new TextView({
                params : {
                    ticks : false
                }
            });

            var textArea = $(textView.visuals['0']).find('textarea');

            textView.consume_tick(new Date());
            textArea.val().should.equal('');
        });
    });

    describe('invalid options', function() {
        describe('unknown options', function() {
            it('unknown option at the top level', function() {
                viewTestUtils.verifyValidationError({
                    viewConstructor : TextView,
                    params : {
                        invalidOption : 'some value'
                    },
                    errorPath : 'invalidOption',
                    error : {
                        'code' : 'UNKNOWN',
                        'info' : {}
                    }
                });
            });
        });

        describe('invalid values', function() {
            it('display.height as string', function() {
                viewTestUtils.verifyValidationError({
                    viewConstructor : TextView,
                    params : {
                        height : 'asdf'
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
            var chart = new TextView({});

            chart.runtimeMessages.getMessages().at(0).get('code').should.eql('WAITING_FOR_DATA');

            chart.consume([
                { time : new Date(), value : 1, pop : 'pop1' },
            ]);

            chart.runtimeMessages.getMessages().length.should.eql(0);
        });

        it('No Data Received', function() {
            var chart = new TextView({});

            chart.consume_eof();
            chart.runtimeMessages.getMessages().length.should.eql(0);
        });

        it('Too many items', function() {
            var chart = new TextView({
                params : {
                    limit : 2
                }
            });

            var pt1 = { time : new Date(), value : 1, pop : 'pop1' };
            var pt2 = _.extend({pop: 'pop2'}, pt1);
            var pt3 = _.extend({pop: 'pop3'}, pt1);

            chart.consume([pt1]);
            viewTestUtils.verifyNoRuntimeMessages(chart);
            chart.consume([pt2]);
            viewTestUtils.verifyNoRuntimeMessages(chart);
            chart.consume([pt3]);
            viewTestUtils.verifyRuntimeMessage(chart, 'LOGGER_DISPLAY_LIMIT_REACHED', {
                displayLimit : 2
            });

            verifyTextViewContents(chart, [pt1,pt2], 'raw');
        });
    });
});
