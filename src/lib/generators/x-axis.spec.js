/*jslint browser: true */

//var should = require('chai').should();
var testutils = require('testutils');
var d3 = require('d3'); 
testutils.mode.browser();

var sampleScale = d3.scale.linear().domain([0,1]).range(0,800);

describe("X-Axis generator", function() {
    var xAxisGenerator = require('./x-axis');

    describe("initialisation", function() {

        beforeEach(function() {
            var el = document.createElement('svg');
            this.xAxis = new xAxisGenerator(el);
        });

        afterEach(function() {
            delete this.xAxis;
        });


        it('should create an axis generator object', function() {
            this.xAxis.should.be.a.function;
        });

        it('should have an element to operate upon', function() {
            this.xAxis.el.should.be.an.instanceof(HTMLElement);
        });

        it('should have sensible defaults', function() {
            var defaults = require('../utils/default-options')();
            var opts = this.xAxis.options;
            opts.width.should.equal(defaults.width);
            opts.height.should.equal(defaults.height);
            opts.margin.should.deep.equal(defaults.margin);
        });
        it('should have a draw function', function() {
            this.xAxis.draw.should.be.a.function;
        });
    });

    describe("simple drawing", function() {
        beforeEach(function() {
            this.el = document.createElement('svg');
            this.xAxis = new xAxisGenerator(this.el);
            this.xAxis.setScale(sampleScale);
        });

        afterEach(function() {
            delete this.el;
            delete this.xAxis;
        });

        it('should draw an axis for a simple array', function() {
            var data = [1,2,3,4];
            this.xAxis.draw('data', {data: data});
            var axes = this.xAxis.el.querySelectorAll('g.x.axis');
            axes.should.have.length(1);
            var axis = this.xAxis.el.querySelector('g.x.axis');
            var ticks = axis.querySelectorAll('g.tick');
            ticks.length.should.be.above(0);
        });
        it('should draw an axis for a time series', function() {
            this.xAxis = new xAxisGenerator(this.el, {
                xAccessor: function(d) {
                    return d.time;
                },
                yAccessor: function(d) {
                    return d.value;
                }
            });

            this.xAxis.setScale(sampleScale);

            var data = [
                {
                    time: new Date(2000, 1, 1),
                    value: 10
                },
                {
                    time: new Date(2000, 1, 2),
                    value: 20
                },
                {
                    time: new Date(2000, 1, 3),
                    value: 30
                },
                {
                    time: new Date(2000, 1, 4),
                    value: 40
                }
            ];

            this.xAxis.draw('data', {data: data});
            var axes = this.xAxis.el.querySelectorAll('g.x.axis');
            axes.should.have.length(1);
            var axis = this.xAxis.el.querySelector('g.x.axis');
            var ticks = axis.querySelectorAll('g.tick');
            ticks.length.should.be.above(0);
        });

    });

    describe("orientation", function() {
        beforeEach(function() {
            this.el = document.createElement('svg');
            this.xAxis = new xAxisGenerator(this.el);
            this.xAxis.setScale(sampleScale);
        });

        afterEach(function() {
            delete this.el;
            delete this.xAxis;
        });

        it('should draw on the bottom by default', function() {
            var data = [1,2,3,4];
            this.xAxis.draw('data', {data: data});
            var axes = this.xAxis.el.querySelectorAll('g.x.axis');
            axes.should.have.length(1);
        });
        it('should draw on the top correctly', function() {
            this.xAxis = new xAxisGenerator(this.el, {
                xAxisOrientation: 'top'
            });

            this.xAxis.setScale(sampleScale);

            var data = [1,2,3,4];
            this.xAxis.draw('data', {data: data});
            var axes = this.xAxis.el.querySelectorAll('g.x.axis');
            axes.should.have.length(1);
        });

    });
    
    /*
    describe("axis title", function() {
        it('should draw the title on the bottom', function() {
            var el = document.createElement('svg');
            var xAxis = new xAxisGenerator(el, {
                xAxisTitle: 'X Axis Title',
                margin : {
                    left: 0,
                    right: 0,
                    top: 10,
                    bottom: 10
                }
            });

            xAxis.setScale(sampleScale);

            var data = [1,2,3,4];

            xAxis.draw('data', {data: data});

            var title = xAxis.el.querySelector('g.x.axis text.title');
            title.textContent.should.equal('X Axis Title');
        });
        it('should draw the title on the top', function() {
            var el = document.createElement('svg');
            var xAxis = new xAxisGenerator(el, {
                xAxisTitle: 'X Axis Title',
                xAxisOrientation: 'top',
                margin : {
                    left: 0,
                    right: 0,
                    top: 10,
                    bottom: 10,
                }
            });

            xAxis.setScale(sampleScale);

            var data = [1,2,3,4];

            xAxis.draw('data', {data: data});

            var title = xAxis.el.querySelector('g.x.axis text.title');
            title.textContent.should.equal('X Axis Title');
        });
        it('should not draw a title if no title is provided', function() {
            var el = document.createElement('svg');
            var xAxis = new xAxisGenerator(el, {});
            xAxis.setScale(sampleScale);

            var data = [1,2,3,4];

            xAxis.draw('data', {data: data});

            // N.B. we do toString here because otherwise we get
            // cyclical structure serialisation errors.
            var title = xAxis.el.querySelector('g.x.axis text.title');
            should.not.exist(title);
        });
    });
    */
});
