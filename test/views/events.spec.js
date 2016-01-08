/*jslint browser: true */

require('chai').should();
var viewTestUtils = require('./utils/view-test-utils');

describe('Table Sink View', function () {
    var EventsView = require('../../src/views/events');

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
});
