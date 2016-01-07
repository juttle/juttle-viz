/*jslint browser: true */

require('chai').should();

describe('Bar Chart', function () {
    var BarChart = require('../../../src/lib/charts/bar-chart');

    describe('Constructor', function () {
        beforeEach(function (done) {
            this.el = document.createElement('div');
            this.chart = new BarChart(this.el,{
                yScales : {
                    primary : {
                        scaling : 'linear'
                    }
                },
                xScale : {
                },
                display : {
                    orientation : 'vertical'
                }
            });
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
            this.chart.should.have.property.barsArea;
            this.chart.should.have.property.dataTarget;
            this.chart.should.have.property.bars;
            this.chart.should.have.property.xAxis;
            this.chart.should.have.property.yAxis;
            done();
        });
    });

    describe('Drawing', function() {
        beforeEach(function (done) {
            this.el = document.createElement('div');
            this.chart = new BarChart(this.el, {
                categoryField : 'category',
                valueField : 'value',
                yScales : {
                    primary : {
                        scaling : 'linear'
                    }
                },
                xScale : {
                },
                display : {
                    orientation : 'vertical'
                }
            });
            this.chart.resize(100,100).then(function() {
                done();
            });
        });
        afterEach(function (done) {
            delete this.el;
            delete this.chart;
            done();
        });
        it('should draw a series', function (done) {
            var data = [ { category: 'north', value: 1 },
                         { category: 'south', value: 2 },
                         { category: 'east', value: 3 },
                         { category: 'west', value: 4 },
                         { category: 'up', value: 5 },
                         { category: 'down', value: 6 } ];
            var self = this;
            this.chart.dataTarget.push(data).then(function() {
                var rects = self.el.querySelectorAll('rect.bar');
                rects.should.be.truthy;
                rects.length.should.equal(6);
                done();
            });
        });
    });
});
