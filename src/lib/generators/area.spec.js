/*jslint browser: true */

require('chai').should();
var testutils = require('testutils');
testutils.mode.browser();

describe('Area generator', function() {
    var Area = require('./area');
    var d3 = require('d3');

    describe('initialisation', function() {
        beforeEach(function () {
            var el = document.createElement('svg');
            this.area = new Area(el);
            this.area.xScale = d3.scale.linear();
            this.area.yScale = d3.scale.linear();
        });

        afterEach(function() {
            delete this.area;
        });

        it('should create an area object', function() {
            this.area.should.exist;
        });

        it('should have an element to operate on', function() {
            this.area.should.have.property.el;
            this.area.el.should.be.an.instanceof(HTMLElement);
        });

        it('should have an options object', function() {
            this.area.should.have.property.options;
            this.area.options.should.be.an.object;
        });

        it('should have a draw function', function() {
            this.area.draw.should.be.a.function;
        });

        it('should have an update function', function() {
            this.area.update.should.be.a.function;
        });

    });

    describe('setting scales', function () {
        it('should set scales and accessor functions', function() {
            this.el = document.createElement('svg');
            this.area = new Area(this.el, {});
            var xScale = d3.scale.linear();
            var yScale = d3.scale.linear();
            this.area.setScales(xScale, yScale);

            this.area.x.should.be.a.function;
            this.area.y.should.be.a.function;
            this.area.xScale.should.be.a.function;
            this.area.yScale.should.be.a.function;
        });
    });

    describe("drawing", function() {
        beforeEach(function() {
            this.el = document.createElement('svg');
            this.area = new Area(this.el, {
                duration: 0
            });
            var xScale = d3.scale.linear();
            var yScale = d3.scale.linear();
            this.area.setScales(xScale, yScale);
        });

        afterEach(function () {
            delete this.el;
            delete this.area;
        });

        it('should create a `path` element inside a group', function() {
            var data = [1,2,3,4,5];
            this.area.xScale.domain([0, 3]).range([0, 800]);
            this.area.yScale.domain([0, 4]).range([400, 0]);
            this.area.draw({data: data});
            var path = this.area.el.querySelector('path');
            path.should.be.truthy;
        });

        it('should create an area correctly from a simple array', function() {
            var data = [1,2,3,4];
            this.area.xScale.domain([0, 3]).range([0, 800]);
            this.area.yScale.domain([0, 4]).range([400, 0]);
            this.area.draw({data: data});
            var path = this.area.el.querySelector('path');
            var d = path.getAttribute('d');
            d.should.not.match(/NaN/);
        });

        it('should create an area correctly from a time series', function() {
            this.area = new Area(this.el, {
                xAccessor: function(d) {
                    return d.time;
                },
                yAccessor: function(d) {
                    return d.value;
                },
                duration: 0
            });

            var xScale = d3.time.scale();
            var yScale = d3.scale.linear();

            this.area.setScales(xScale, yScale);

            var data = [
                    {
                        time: new Date(2000, 1, 1),
                        value: 200
                    },
                    {
                        time: new Date(2000, 1, 2),
                        value: 300
                    },
                    {
                        time: new Date(2000, 1, 3),
                        value: 150
                    },
                    {
                        time: new Date(2000, 1, 4),
                        value: 350
                    }
            ];

            var xExtent = d3.extent(data, function(d) { return d.time; });
            this.area.xScale.domain(xExtent).range([0, 800]);

            this.area.yScale.domain([0, 350]).range([400, 0]);

            this.area.draw({data: data});

            var path = this.area.el.querySelector('path');
            path.attributes.should.have.property('d');
            var d = path.getAttribute('d');
            d.should.not.match(/NaN/);
        });

    });

});
