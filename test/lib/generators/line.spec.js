require('chai').should();

describe('Line generator', function() {
    var Line = require('../../../src/lib/generators/line');
    var d3 = require('d3');

    describe('initialisation', function() {
        beforeEach(function () {
            // create a new svg element
            var el = document.createElement('svg');
            this.line = new Line(el, {});
            this.line.xScale = d3.scale.linear();
            this.line.yScale = d3.scale.linear();
        });

        afterEach(function() {
            delete this.line;
        });

        it('should create a line object', function() {
            this.line.should.exist;
        });

        it('should have an element to operate on', function() {
            this.line.el.should.exist;
            this.line.el.should.be.an.instanceof(HTMLElement);
        });


        it('should have a draw function', function() {
            this.line.should.have.property('draw');
            this.line.draw.should.be.a.function;
        });

        it('should have an update function', function() {
            this.line.should.have.property('update');
            this.line.update.should.be.a.function;
        });

    });

    describe('setting scales', function() {
        it('should set scales and accessor functions', function() {
            this.el = document.createElement('svg');
            this.line = new Line(this.el, {});
            var xScale = d3.scale.linear();
            var yScale = d3.scale.linear();
            this.line.setScales(xScale, yScale);

            this.line.xScale.should.be.a.function;
            this.line.yScale.should.be.a.function;
        });
    });

    describe('simple drawing', function() {
        beforeEach(function() {
            this.el = document.createElement('svg');
            this.line = new Line(this.el, {
                duration: 0
            });
            var xScale = d3.scale.linear();
            var yScale = d3.scale.linear();
            this.line.setScales(xScale, yScale);
        });

        afterEach(function() {
            delete this.line;
        });

        it('should create a `path` element inside a group', function() {
            var data = [1,2,3,4];
            this.line.xScale.domain([0, 3]).range([0, 800]);
            this.line.yScale.domain([0, 4]).range([400, 0]);
            this.line.update({
                data : data
            });
            var path = this.line.el.querySelector('path');
            path.should.be.truthy;
        });
        it('should create a line correctly from a time series', function() {
            this.line = new Line(this.el, {
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

            this.line.setScales(xScale, yScale);

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
            this.line.xScale.domain(xExtent).range([0, 800]);

            this.line.yScale.domain([0, 350]).range([400, 0]);

            this.line.update({
                data : data
            });

            var path = this.line.el.querySelector('path');
            path.attributes.should.have.property('d');
            var d = path.getAttribute('d');
            d.should.not.match(/NaN/);
        });

    });

});

