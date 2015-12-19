/*jslint browser: true */

require('chai').should();
var testutils = require('testutils');
testutils.mode.browser();

describe('Heatmap Chart', function () {
    var HeatmapChart = require('./heatmap-chart');
    var demoData = require('../utils/heat-demo-data');
    describe('Constructor', function () {
        beforeEach(function (done) {
            this.el = document.createElement('div');
            this.chart = new HeatmapChart(this.el, {});
            done();
        });

        afterEach(function (done) {
            delete this.el;
            delete this.chart;
            done();
        });

        it('should initialise the chart correctly', function (done) {
            this.chart.should.have.property.options;
            this.chart.should.have.property.svg;
            this.chart.should.have.property.el;
            this.chart.should.have.property.axesArea;
            this.chart.should.have.property.heatArea;
            this.chart.should.have.property.dataTarget;
            this.chart.should.have.property.heat;
            this.chart.should.have.property.xAxis;
            this.chart.should.have.property.yAxis;
            done();
        });
    });


    describe('Drawing', function() {
        beforeEach(function (done) {
            this.el = document.createElement('div');
            this.chart = new HeatmapChart(this.el, {
                xAccessor: function(d) {
                return new Date(d.date);
                },
                yAccessor: function(d) {
                    return d.value;
                },
                colorAccessor: function(d) {
                    return d.color;
                },
            });
            done();
        });
        afterEach(function (done) {
            delete this.el;
            delete this.chart;
            done();
        });
        it('should draw a series', function (done) {
            var data = demoData(5, 5);
            this.chart.dataTarget.push(data);

            var path = this.el.querySelector('path');
            path.should.be.truthy;
            done();
        });
    });

    describe('Updating scales', function () {
        beforeEach(function (done) {
            this.el = document.createElement('div');
            this.chart = new HeatmapChart(this.el, {
                xAccessor: function(d) {
                return new Date(d.date);
                },
                yAccessor: function(d) {
                    return d.value;
                },
                colorAccessor: function(d) {
                    return d.color;
                },
            });
            var data = demoData(5, 5);
            this.chart.dataTarget.push(data);
            done();
        });

        afterEach(function (done) {
            delete this.el;
            delete this.chart;
            done();
        });

        it('should update the scales on the corresponding areas', function (done) {
            this.chart.xScale.should.be.a.function;
            this.chart.yScale.should.be.a.function;
            this.chart.colorScale.should.be.a.function;

            done();
        });
    });

});
