require('chai').should();
var juttleViewUtils = require('../../../src/views/utils/juttle-view-utils');
var moment = require('moment');

describe('juttle-view-utils', function () {
    describe('getExtremeTimeBound', function() {
        describe('from', function() {
            it('from', function() {
                var now = new Date(3000);
                var timeBounds = [
                    {
                        from: new Date(1000)
                    },
                    {
                        from: new Date(2000)
                    }
                ];

                juttleViewUtils.getExtremeTimeBound(timeBounds, now, 'from').getTime().should.equal(1000);
            });

            it('last', function() {
                var now = new Date(3000);
                var timeBounds = [
                    {
                        last: moment.duration(2,'seconds')
                    },
                    {
                        from: new Date(2000)
                    }
                ];

                juttleViewUtils.getExtremeTimeBound(timeBounds, now, 'from').getTime().should.equal(1000);
            });
        });

        describe('to', function() {
            it('to', function() {
                var now = new Date(3000);
                var timeBounds = [
                    {
                        to: new Date(1000)
                    },
                    {
                        to: new Date(2000)
                    }
                ];

                juttleViewUtils.getExtremeTimeBound(timeBounds, now, 'to').getTime().should.equal(2000);
            });

            it('last', function() {
                var now = new Date(3000);
                var timeBounds = [
                    {
                        last: moment.duration(2,'seconds')
                    },
                    {
                        to: new Date(2000)
                    }
                ];

                juttleViewUtils.getExtremeTimeBound(timeBounds, now, 'to').getTime().should.equal(3000);
            });
        });
    });
});
