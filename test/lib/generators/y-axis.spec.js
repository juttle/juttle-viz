/*jslint browser: true */

//var should = require('chai').should();
var d3 = require('d3');

var sampleScale = d3.scale.linear().domain([0,1]).range(0,800);

describe("Y-Axis generator", function() {
    var yAxisGenerator = require('../../../src/lib/generators/y-axis');

    describe("initialisation", function() {

        beforeEach(function() {
            var el = document.createElement('svg');
            this.yAxis = new yAxisGenerator(el);
        });

        afterEach(function() {
            delete this.yAxis;
        });


        it('should create an axis generator object', function() {
            this.yAxis.should.be.a.function;
        });

        it('should have an element to operate upon', function() {
            this.yAxis.el.should.be.an.instanceof(HTMLElement);
        });

        it('should have sensible defaults', function() {
            var defaults = require('../../../src/lib/generators/utils/default-options')();
            var opts = this.yAxis.options;
            opts.width.should.equal(defaults.width);
            opts.height.should.equal(defaults.height);
            opts.margin.should.deep.equal(defaults.margin);
        });
        it('should have a draw function', function() {
            this.yAxis.draw.should.be.a.function;
        });
    });

    describe("simple drawing", function() {
        beforeEach(function() {
            this.el = document.createElement('svg');
            this.yAxis = new yAxisGenerator(this.el, {
                width : 800
            });
            this.yAxis.setScale(sampleScale);
        });

        afterEach(function() {
            delete this.el;
            delete this.yAxis;
        });

        it('should draw an axis for a simple array', function() {
            this.yAxis.draw(false);
            var axes = this.yAxis.el.querySelectorAll('g.y.axis');
            axes.should.have.length(1);
            var axis = this.yAxis.el.querySelector('g.y.axis');
            var t = axis.getAttribute('transform');
            t.should.equal('translate(0)');
            var ticks = axis.querySelectorAll('g.tick');
            ticks.length.should.be.above(0);
        });
        it('should draw an axis for a time series', function() {
            this.yAxis = new yAxisGenerator(this.el, {
                xAccessor: function(d) {
                    return d.time;
                },
                yAccessor: function(d) {
                    return d.value;
                }
            });

            this.yAxis.setScale(sampleScale);

            this.yAxis.draw(false);
            var axes = this.yAxis.el.querySelectorAll('g.y.axis');
            axes.should.have.length(1);
            var axis = this.yAxis.el.querySelector('g.y.axis');
            var t = axis.getAttribute('transform');
            t.should.equal('translate(0)');
            var ticks = axis.querySelectorAll('g.tick');
            ticks.length.should.be.above(0);
        });

    });

    describe("orientation", function() {
        beforeEach(function() {
            this.el = document.createElement('svg');
            this.yAxis = new yAxisGenerator(this.el);
            this.yAxis.setScale(sampleScale);
        });

        afterEach(function() {
            delete this.el;
            delete this.yAxis;
        });

        it('should draw on the left by default', function() {
            this.yAxis.draw(false);
            var axes = this.yAxis.el.querySelectorAll('g.y.axis');
            axes.should.have.length(1);
            var axis = this.yAxis.el.querySelector('g.y.axis');
            var t = axis.getAttribute('transform');
            t.should.equal('translate(0)');
        });
        it('should draw on the right correctly', function() {
            this.yAxis = new yAxisGenerator(this.el, {
                yAxisOrientation: 'right'
            });

            this.yAxis.setScale(sampleScale);

            this.yAxis.draw(false);
            var axes = this.yAxis.el.querySelectorAll('g.y.axis');
            axes.should.have.length(1);
            var axis = this.yAxis.el.querySelector('g.y.axis');
            var t = axis.getAttribute('transform');
            t.should.equal('translate(800)');
        });
    });

    /*  
    describe("axis title", function() {
        it('should draw the title on the left', function() {
            var el = document.createElement('svg');
            var yAxis = new yAxisGenerator(el, {
                yAxisTitle: 'Y Axis Title',
                margin : {
                    left: 10,
                    right: 10,
                    top: 0,
                    bottom: 0
                }
            });
            yAxis.setScale(sampleScale);

            yAxis.draw(false);

            var title = yAxis.el.querySelector('g.y.axis text.title');
            title.textContent.should.equal('Y Axis Title');
        });
        it('should draw the title on the right', function() {
            var el = document.createElement('svg');
            var yAxis = new yAxisGenerator(el, {
                yAxisTitle: 'Y Axis Title',
                yAxisOrientation: 'right',
                margin : {
                    left: 10,
                    right: 10,
                    top: 0,
                    bottom: 0
                }
            });
            yAxis.setScale(sampleScale);

            yAxis.draw(false);

            var title = yAxis.el.querySelector('g.y.axis text.title');
            title.textContent.should.equal('Y Axis Title');
        });
        it('should not draw a title if no title is provided', function() {
            var el = document.createElement('svg');
            var yAxis = new yAxisGenerator(el, {});
            yAxis.setScale(sampleScale);

            yAxis.draw(false);

            // N.B. we do toString here because otherwise we get
            // cyclical structure serialisation errors.
            var title = yAxis.el.querySelector('g.y.axis text.title');
            should.not.exist(title);
        });
    });
    */

});
