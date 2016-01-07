/*jslint browser: true */
require('chai').should();

describe('Legend', function () {

    var LegendGenerator = require('../../../src/lib/generators/legend');

    describe('drawing', function () {
        beforeEach(function (done) {
            this.el = document.createElement('div');
            this.legend = new LegendGenerator(this.el);
            done();
        });

        afterEach(function (done) {
            delete this.el;
            delete this.legend;
            done();
        });

        it('should draw the legend correctly', function (done) {
            var series = [
                {
                    color: 'rgb(0, 255, 0)',
                    label: 'Baratheon'
                },
                {
                    color: 'rgb(255, 0, 0)',
                    label: 'Lannister'
                },
                {
                    color: 'rgb(0, 0, 255)',
                    label: 'Stark'
                },
                // test null label
                {
                    color: 'rgb(249, 66, 58)',
                    label: null
                }
            ];

            this.legend.draw(series.slice());

            var items = this.el.querySelector('span.legend-body').querySelectorAll('div.legend-item');
            items.length.should.equal(4);
            for (var i = 0; i < items.length; i++) {
                items[i].querySelector('span.color-chip').style.backgroundColor.should.equal(series[i].color);
                if (series[i].label === null) {
                    items[i].querySelector('span.series-label').textContent.should.equal('null');
                }
                else {
                    items[i].querySelector('span.series-label').textContent.should.equal(series[i].label);
                }
            }
            done();
        });

    });
});
