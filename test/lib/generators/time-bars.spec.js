require('chai').should();

var TimeBars = require('../../../src/lib/generators/time-bars');
var d3 = require('d3');
var moment = require('moment');

describe('Time Bars generator', function() {
    var xScale = d3.time.scale.utc();
    var yScale = d3.scale.linear();
    xScale.domain([new Date(0), new Date(10000)]).range([0,100]);
    yScale.domain([0, 10]).range([100,0]);

    describe('drawing bars', function() {
        it('without -interval', function() {
            var el = document.createElement('svg');
            var timeBars = new TimeBars(el);
            timeBars.setScales(xScale, yScale);

            var data = [
                {
                    time: new Date(2000),
                    value: 1
                },
                {
                    time: new Date(3000),
                    value: 2
                }
            ];

            timeBars.update({data: data});
            var rects = timeBars.el.querySelectorAll('rect.time-bar');
            rects.length.should.equal(2);
            // first bar should span distance between start of x scale and point
            parseInt(rects[0].getAttribute('width'), 10).should.equal(20);
            // the rest of the bars should span the distance between
            // the previous point and the current point
            parseInt(rects[1].getAttribute('width'), 10).should.equal(10);
        });

        it('with -interval', function() {
            var el = document.createElement('svg');
            var timeBars = new TimeBars(el, {
                interval: moment.duration(2, 'seconds')
            });

            timeBars.setScales(xScale, yScale);

            var data = [
                {
                    time: new Date(3000),
                    value: 1
                },
                {
                    time: new Date(4000),
                    value: 2
                },
                {
                    time: new Date(7000),
                    value: 2
                }
            ];

            timeBars.update({data: data});
            var rects = timeBars.el.querySelectorAll('rect.time-bar');
            rects.length.should.equal(3);
            // first point is further than interval from the start of the domain
            // so its should span a width of interval
            parseInt(rects[0].getAttribute('width'), 10).should.equal(20);
            // the second point is within the interval of the previous point
            // so it should span the width between itself and the previous point
            parseInt(rects[1].getAttribute('width'), 10).should.equal(10);
            // the third point is more than interval from the previous point
            // so it should span a width of interval
            parseInt(rects[2].getAttribute('width'), 10).should.equal(20);
        });
    });
});
