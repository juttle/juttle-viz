require('chai').should();

describe('Pie Chart', function () {
    var PieChart = require('../../../src/lib/charts/pie-chart');

    it('can draw a pie with 4 equal slices', function (done) {
        var el = document.createElement('div');
        var chart = new PieChart(el, {
            categoryField : 'category',
            valueField : 'value',
            display : {
                orientation : 'vertical'
            },
            duration: 0
        });

        chart.resize(100, 100);

        var data = [{ category: 'north', value: 1 },
                    { category: 'south', value: 1 },
                    { category: 'east', value: 1 },
                    { category: 'west', value: 1 } ];
        chart.dataTarget.push(data)
        .then(function() {
            var slices = el.querySelectorAll('path.slice');
            slices.should.be.truthy;
            slices.length.should.equal(4);
            done();
        });
    });

    it('can draw a pie with no slices', function (done) {
        var el = document.createElement('div');
        var chart = new PieChart(el, {
            categoryField : 'category',
            valueField : 'value',
            display : {
                orientation : 'vertical'
            },
            duration: 0
        });

        chart.resize(100, 100);
        var data = [];
        chart.dataTarget.push(data)
        .then(function() {
            var slices = el.querySelectorAll('path.slice');
            slices.should.be.truthy;
            slices.length.should.equal(0);
            done();
        });
    });

});
