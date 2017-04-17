var _ = require('underscore');
var expect = require('chai').expect;
require('chai').should();

describe('Bar Chart', function () {
    var BarChart = require('../../../src/lib/charts/bar-chart');

    it('can draw a series with linear y scale scaling', function (done) {
        var el = document.createElement('div');
        var chart = new BarChart(el, {
            categoryField : 'category',
            valueField : 'value',
            yScales : {
                primary : {
                    scaling : 'linear'
                }
            },
            xScale : {
            },
            duration: 0
        });

        chart.resize(100,100);

        var data = [
            { category: 'north', value: 1 },
            { category: 'south', value: 2 },
            { category: 'east', value: 3 },
            { category: 'west', value: 4 },
            { category: 'up', value: 5 },
            { category: 'down', value: 6 }
        ];

        chart.dataTarget.push(data)
        .then(function() {
            var rects = el.querySelectorAll('rect.bar');
            rects.should.be.truthy;
            rects.length.should.equal(6);
            done();
        });
    });

    it('can draw a series with log y scale scaling', function (done) {
        var el = document.createElement('div');
        var chart = new BarChart(el, {
            categoryField : 'category',
            valueField : 'value',
            yScales : {
                primary : {
                    scaling : 'log'
                }
            },
            xScale : {
            },
            duration: 0
        });

        chart.resize(100,100);

        var data = [
            { category: 'north', value: 1 },
            { category: 'south', value: 2 },
            { category: 'east', value: 3 },
            { category: 'west', value: 4 },
            { category: 'up', value: 5 },
            { category: 'down', value: 6 }
        ];

        chart.dataTarget.push(data)
        .then(function() {
            var rects = el.querySelectorAll('rect.bar');
            rects.should.be.truthy;
            rects.length.should.equal(6);
            done();
        });
    });

    it('fails when given an invalid yScales.primary.scaling value', function () {
        expect(function() {
            var el = document.createElement('div');
            new new BarChart(el, {
                yScales : {
                    primary : {
                        scaling : 'bogus'
                    }
                }
            });
        }).to.throw(/Unsupported scale type: bogus/);
    });
});
