/*jslint browser: true */

require('chai').should();
var testutils = require('testutils');
testutils.mode.browser();

describe("Heatmap generator", function() {
    var Heatmap = require('./heatmap');
    var d3 = require('d3');
    var demoData = require('../utils/heat-demo-data');

    describe("initialisation", function() {
        beforeEach(function () {
            // create a new svg element
            var el = document.createElement('svg');
            this.heatmap = new Heatmap(el, {});
            this.heatmap.xScale = d3.scale.ordinal();
            this.heatmap.yScale = d3.scale.ordinal();
            this.heatmap.colorScale = d3.scale.linear();
        });

        afterEach(function() {
            delete this.heatmap;
        });

        it('should create a heatmap object', function() {
            this.heatmap.should.exist;
        });

        it('should have an element to operate on', function() {
            this.heatmap.el.should.exist;
            this.heatmap.el.should.be.an.instanceof(HTMLElement);
        });

        it('should have a draw function', function() {
            this.heatmap.should.have.property('draw');
            this.heatmap.draw.should.be.a.function;
        });

    });

    describe('setting scales', function() {
        it('should set scales and accessor functions', function() {
            this.el = document.createElement('svg');
            this.heatmap = new Heatmap(this.el, {});
            var xScale = d3.scale.ordinal();
            var yScale = d3.scale.ordinal();
            var color = d3.scale.linear();
            this.heatmap.setScales(xScale, yScale, color);

            this.heatmap.x.should.be.a.function;
            this.heatmap.y.should.be.a.function;
            this.heatmap.color.should.be.a.function;
            this.heatmap.xScale.should.be.a.function;
            this.heatmap.yScale.should.be.a.function;
            this.heatmap.colorScale.should.be.a.function;
        });
    });

    describe("simple drawing", function() { 
        beforeEach(function() {
            this.el = document.createElement('svg');
            this.heatmap = new Heatmap(this.el);
            var xScale = d3.scale.ordinal();
            var yScale = d3.scale.ordinal();
            var color = d3.scale.linear();

            this.heatmap.setScales(xScale, yScale, color);
        });

        afterEach(function() {
            delete this.heatmap;
        });

        it('should draw rects correctly', function() {
            var data = demoData(4, 4);
            this.heatmap.draw({data: data});
            var rects = this.heatmap.el.querySelectorAll('rect');
            rects.should.be.truthy;
            rects.length.should.equal(4*4);
        });

    });

});
