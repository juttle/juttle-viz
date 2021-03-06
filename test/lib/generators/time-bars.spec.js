require('chai').should();

var TimeBars = require('../../../src/lib/generators/time-bars');
var d3 = require('d3');
var moment = require('moment');

describe('Time Bars generator', function() {
    var yScale = d3.scale.linear();

    describe('drawing bars', function() {
        it('without -interval', function() {
            var el = document.createElement('svg');
            var timeBars = new TimeBars(el);
            var xScale = d3.time.scale.utc();
            xScale.domain([new Date(0), new Date(10000)]).range([0,100]);
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

            // change the domain so the first point is right at the beginning
            xScale.domain([new Date(2000), new Date(12000)]);
            timeBars.redraw();
            rects = timeBars.el.querySelectorAll('rect.time-bar');
            // we strip any points that are at or before the start of xScale
            // so there should only be one left
            rects.length.should.equal(1);
            parseInt(rects[0].getAttribute('width'), 10).should.equal(10);

        });

        it('with -interval', function() {
            var el = document.createElement('svg');
            var timeBars = new TimeBars(el, {
                interval: moment.duration(2, 'seconds')
            });

            var xScale = d3.time.scale.utc();
            xScale.domain([new Date(0), new Date(10000)]).range([0,100]);

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

            // change the domain so the first point is right at the beginning
            xScale.domain([new Date(3000), new Date(13000)]);
            timeBars.redraw();

            rects = timeBars.el.querySelectorAll('rect.time-bar');
            // we strip any points that are at or before the start of xScale
            // so there should only be one left
            rects.length.should.equal(2);
            // the first point is within the interval of the previous point
            // so it should span the width between itself and the start of xScale
            parseInt(rects[0].getAttribute('width'), 10).should.equal(10);
            // the second point is more than interval from the previous point
            // so it should span a width of interval
            parseInt(rects[1].getAttribute('width'), 10).should.equal(20);
        });
    });

    describe('hovering', function() {
        it('does not throw error when hovering with no points present', function() {
            var el = document.createElement('svg');
            var timeBars = new TimeBars(el, {});
            var yScale = d3.scale.linear();
            var xScale = d3.time.scale.utc();
            xScale.domain([new Date(0), new Date(10000)]).range([0,100]);

            timeBars.setScales(xScale, yScale);

            (function() { timeBars.hover_find(new Date(1000)); }).should.not.throw();
        });
    });
});
