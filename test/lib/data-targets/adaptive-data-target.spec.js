var expect = require('chai').expect;
var assert = require('chai').assert;
var SharedRange = require('../../../src/lib/data-targets/shared-range');

describe('Adaptive Data Target', function () {
    var DataTarget = require('../../../src/lib/data-targets/adaptive-data-target');
    var target, event, dsevent, next_value, next_time;
    // var next_value = 1;

    // var next_time = new Date('2014-09-10T20:00:00Z').getTime();
    
    function assertDatesAreEqual(date1,date2) {
        assert(date1.getTime() === date2.getTime(), 'Expected ' + date1 + ' to equal ' + date2);
    }
    
    function make_points(n) {
        var result = [];
        for (var i=0; i<n; i++) {
            result.push({
                time: new Date(next_time),
                value: next_value
            });
            next_time += 1000;
            next_value += 1;
        }
        return result;
    }

    function clearEventTargets() {
        event = null;
        dsevent = null;
    }

    // generate what an array of `n` values, downsampled by `factor`
    // should look like
    function downsampled(n, factor) {
        var result = [];
        var v = (factor+1) / 2;
        for (var i=0; i<n; i++) {
            result.push(v);
            v += factor;
        }
        return result;
    }

    function check_array(a, n, factor) {
        expect(a.length).equal(n);
        var expected = downsampled(n, factor);
        for (var i=0; i<n; i++) {
            expect(a[i].value).equal(expected[i]);
        }
    }

    beforeEach(function() {
        next_value = 1;
        next_time = new Date('2014-09-10T20:00:00Z').getTime();
        clearEventTargets();
        target = new DataTarget('tomato', { downsample_limit: 10 });
        target.on('update', function() { event = arguments; });
        target.on('downsample', function() { dsevent = arguments; });
    } );

    describe('Data events', function() {
        it('should generate an update event for initial data', function() {
            var data = make_points(2);
            target.push(data);

            expect(event[0]).equal('update');
            expect(event[1].data).deep.equal(data);
        } );

        it('should generate an update event for subsequent data', function() {
            var data;
            target.push(make_points(2));
            clearEventTargets();

            data = make_points(2);
            target.push(data);

            expect(event[0]).equal('update');
            expect(event[1].data.length).equal(4);
            expect(event[1].data.slice(2, 4)).deep.equal(data);
        } );   
    });

    describe('Downsampling', function() {
        it('should not downsample with 10 total points', function() {
            target.push(make_points(10));
            expect(dsevent).equal(null);
        });

        it('should downsample 2:1 on the 11th point', function() {
            target.push(make_points(10));
            clearEventTargets();
            target.push(make_points(1));

            expect(dsevent[0]).equal('downsample');
            expect(dsevent[1]).equal(2);

            check_array(event[1].data, 5, 2);
        } );

        it('should keep downsampling 2:1 with 9 more points', function() {
            target.push(make_points(11));
            clearEventTargets();
            target.push(make_points(9));
            
            expect(dsevent).equal(null);
            check_array(event[1].data, 10, 2);
        } );

        it('should downsample 4:1 with 20 more points', function() {
            target.push(make_points(20));
            clearEventTargets();
            target.push(make_points(20));

            expect(dsevent[0]).equal('downsample');
            expect(dsevent[1]).equal(4);

            check_array(event[1].data, 10, 4);
        } );

        it('should downsample 16:1 with 120 more points', function() {
            target.push(make_points(40));
            clearEventTargets();
            target.push(make_points(120));

            expect(dsevent[0]).equal('downsample');
            expect(dsevent[1]).equal(16);

            check_array(event[1].data, 10, 16);
        } );

        it('should continue downsampling after switching to windowed', function() {
            target.push(make_points(20));
            // set window to 40 seconds which will include all points
            target.range.set_window(40000);
            clearEventTargets();
            target.push(make_points(20));

            expect(dsevent[0]).equal('downsample');
            expect(dsevent[1]).equal(4);

            check_array(event[1].data, 10, 4);
        } );
    } );

    describe('Data management', function() {
        it('should remove data that is outside of the window', function() {
            target.range.set_window(4000);
            var data = make_points(7);
            target.push(data.slice(0,3));
            target.push(data.slice(3));

            expect(event[1].data).deep.equal(data.slice(2));
        } );

        it('should store data in _allData when not live', function() {
            var myTarget = new DataTarget(1, {
                range : new SharedRange({
                    live : false
                })
            });

            myTarget.push([{time : new Date(), value : 1}]);
            expect(myTarget._allData.length).equal(1);
        } );

        it('should not store data in _allData when live', function() {
            var myTarget = new DataTarget(1, {
                range : new SharedRange({
                    live : true
                })
            });

            myTarget.push([{time : new Date(), value : 1}]);
            expect(myTarget._allData.length).equal(0);
        } );

    } );

    describe('Window', function() {
        describe('specified', function() {
            it('Points within window', function() {
                var windowMillis = 15000;
                var range = new SharedRange( { window : windowMillis} );
                var target = new DataTarget('tomato', { range : range});
                var pts = make_points(2);
                target.push(pts);
                expect(range.range[0]).to.equal(pts[0].time);
                expect(range.range[1].getTime()).to.equal(pts[0].time.getTime() + windowMillis);
            });

            it('Points span more than window', function() {
                var windowMillis = 15000;
                var range = new SharedRange( { window : windowMillis} );
                var target = new DataTarget('tomato', { range : range});
                var pts = make_points(20);
                target.push(pts);
                expect(range.range[0].getTime()).to.equal(pts[19].time.getTime() - windowMillis);
                expect(range.range[1]).to.equal(pts[19].time);
            });
        });
        
        describe('not specified', function() {
            it('accordion while density not reached', function() {
                var numPoints = 16;
                var range = new SharedRange();
                var target = new DataTarget('tomato', { downsample_limit : 30, range : range});
                // kind of relying on "impl details" to force live mode
                target.gettingLiveData = true; 
                var pts = make_points(numPoints);
                target.push(pts.slice(0,1));
                target.push(pts.slice(1,numPoints-1));
                target.push(pts.slice(numPoints-1));
                // range should be from the first point to the last point
                assertDatesAreEqual(range.range[0],pts[0].time);
                assertDatesAreEqual(range.range[1],pts[numPoints-1].time);
            });
        });
    });
});
