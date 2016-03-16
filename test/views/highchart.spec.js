let HighchartView = require('../../src/views/highchart');
let Highcharts = require('highcharts');
let sinon = require('sinon');
let expect = require('chai').expect;
let viewTestUtils = require('./utils/view-test-utils');

describe('Highchart View', () => {
    it('highchartOptions is passed through to highchart constructor', () => {
        var constructorSpy = sinon.spy(Highcharts, 'chart');
        new HighchartView({
            params: {
                highchartOptions: {
                    chart: {
                        xAxis: {
                            type: 'datetime'
                        }
                    }
                }
            }
        });

        sinon.assert.calledWith(constructorSpy, sinon.match({
            chart: {
                xAxis: {
                    type: 'datetime'
                }
            }
        }));

        constructorSpy.restore();
    });

    it('highchart is destroyed on call to destroy', () => {
        let highchartView = new HighchartView();
        let destroyStub = sinon.stub(highchartView.chart, 'destroy');

        highchartView.destroy();

        expect(destroyStub.calledOnce).to.be.true;

        destroyStub.restore();
    });

    it('series config is used when adding series to highchart', () => {

        let seriesId;
        let highchartView = new HighchartView({
            params: {
                series: {
                    'A': {
                        color: 'green'
                    }
                }
            }
        });

        let chartGetStub = sinon.stub(highchartView.chart, 'get', function(id) {
            if (seriesId === id) {
                return {
                    addPoint: function() {}
                };
            }
        });

        let addSeriesStub = sinon.stub(highchartView.chart, 'addSeries', function(options) {
            seriesId = options.id;
        });

        highchartView.consume([
            {
                time: new Date(1000),
                host: 'A',
                value: 1
            }
        ]);

        sinon.assert.calledWith(addSeriesStub, sinon.match({
            color: 'green'
        }));

        addSeriesStub.restore();
        chartGetStub.restore();
    });

    describe('valueField', () => {
        it('uses option', () => {
            let seriesId;

            var constructorStub = sinon.stub(Highcharts, 'chart', function() {
                return {
                    get: () => {},
                    addSeries: () => {}
                };
            });

            let highchartView = new HighchartView({
                params: {
                    valueField: 'value2'
                }
            });

            let chartGetStub = sinon.stub(highchartView.chart, 'get', function(id) {
                if (seriesId === id) {
                    return {
                        addPoint: function(point) {
                            expect(point).to.deep.equal([1000, 2]);
                        }
                    };
                }
            });

            let addSeriesStub = sinon.stub(highchartView.chart, 'addSeries', function(options) {
                seriesId = options.id;
            });

            highchartView.consume([
                {
                    time: new Date(1000),
                    value: 1,
                    value2: 2
                }
            ]);

            chartGetStub.restore();
            addSeriesStub.restore();
            constructorStub.restore();
        });


        it('defaults to a numeric field', () => {
            let seriesId;

            var constructorStub = sinon.stub(Highcharts, 'chart', function() {
                return {
                    get: () => {},
                    addSeries: () => {}
                };
            });

            let highchartView = new HighchartView();

            let chartGetStub = sinon.stub(highchartView.chart, 'get', function(id) {
                if (seriesId === id) {
                    return {
                        addPoint: function(point) {
                            expect(point).to.deep.equal([1000, 3]);
                        }
                    };
                }
            });

            let addSeriesStub = sinon.stub(highchartView.chart, 'addSeries', function(options) {
                seriesId = options.id;
            });

            highchartView.consume([
                {
                    time: new Date(1000),
                    value3: 3
                }
            ]);

            chartGetStub.restore();
            addSeriesStub.restore();
            constructorStub.restore();
        });

        it('warns when can\'t automatically determine a valueField', function() {
            var constructorStub = sinon.stub(Highcharts, 'chart', function() {
                return {
                    get: () => {},
                    addSeries: () => {}
                };
            });

            let highchartView = new HighchartView();

            highchartView.consume([
                { time: new Date(1000), host: 'host1', value: 'A' }
            ]);

            viewTestUtils.verifyRuntimeMessage(highchartView, 'COULD_NOT_DETERMINE_VALUE_FIELD');

            constructorStub.restore();
        });
    });

    it('xField', () => {
        let seriesId;

        var constructorStub = sinon.stub(Highcharts, 'chart', function() {
            return {
                get: () => {},
                addSeries: () => {}
            };
        });

        let highchartView = new HighchartView({
            params: {
                xField: 'value1'
            }
        });

        let chartGetStub = sinon.stub(highchartView.chart, 'get', function(id) {
            if (seriesId === id) {
                return {
                    addPoint: function(point) {
                        expect(point).to.deep.equal([10, 12]);
                    }
                };
            }
        });

        let addSeriesStub = sinon.stub(highchartView.chart, 'addSeries', function(options) {
            seriesId = options.id;
        });

        highchartView.consume([
            {
                time: new Date(1000),
                value1: 10,
                value2: 12
            }
        ]);

        chartGetStub.restore();
        addSeriesStub.restore();
        constructorStub.restore();
    });
});
