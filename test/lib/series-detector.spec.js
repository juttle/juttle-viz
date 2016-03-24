let SeriesDetector = require('../../src/lib/series-detector');
let expect = require('chai').expect;

describe('Series Detector', () => {
    describe('point bucketing', () => {
        it('two points in the same series', () => {
            let seriesDetector = new SeriesDetector();

            let series1 = seriesDetector.getSeriesForPoint({
                host: 'A'
            });

            let series2 = seriesDetector.getSeriesForPoint({
                host: 'A'
            });

            expect(series1).to.equal(series2);
        });

        it('two points in different series', () => {
            let seriesDetector = new SeriesDetector();

            let series1 = seriesDetector.getSeriesForPoint({
                host: 'A'
            });

            let series2 = seriesDetector.getSeriesForPoint({
                host: 'B'
            });

            expect(series1).to.not.equal(series2);
        });

    });

    describe('keys', () => {
        it('honor keyField keys', () => {
            let seriesDetector = new SeriesDetector({
                keyField: 'host'
            });

            let series1 = seriesDetector.getSeriesForPoint({
                host: 'A',
                cpu: 'one'
            });

            let series2 = seriesDetector.getSeriesForPoint({
                host: 'A',
                cpu: 'two'
            });

            expect(series1.keys).to.deep.equal({ host: 'A' });
            expect(series2.keys).to.deep.equal({ host: 'A' });

            expect(series1).to.equal(series2);
        });

        it('ignore fieldsToIgnore', () => {
            let seriesDetector = new SeriesDetector({
                keyField: 'host',
                fieldsToIgnore: [ 'ignoredField' ]
            });

            let series1 = seriesDetector.getSeriesForPoint({
                host: 'A',
                ignoredField: 'one'
            });

            let series2 = seriesDetector.getSeriesForPoint({
                host: 'A',
                ignoredField: 'two'
            });

            expect(series1.keys).to.deep.equal({ host: 'A' });
            expect(series2.keys).to.deep.equal({ host: 'A' });

            expect(series1).to.equal(series2);
        });

        it('null fields are ignored', () => {
            let seriesDetector = new SeriesDetector();

            let series1 = seriesDetector.getSeriesForPoint({
                host: 'A',
                cpu: null
            });

            expect(series1.keys).to.deep.equal({ host: 'A' });
        });

        it('numeric fields are ignored', () => {
            let seriesDetector = new SeriesDetector();

            let series1 = seriesDetector.getSeriesForPoint({
                host: 'A',
                value: 1
            });

            expect(series1.keys).to.deep.equal({ host: 'A' });
        });
    });

    describe('labels', () => {
        it('one key', () => {
            let seriesDetector = new SeriesDetector();

            let series1 = seriesDetector.getSeriesForPoint({
                host: 'A'
            });

            let label = seriesDetector.getSeriesLabel(series1.id);

            expect(label).to.equal('host: A');
        });

        it('two keys', () => {
            let seriesDetector = new SeriesDetector();

            let series1 = seriesDetector.getSeriesForPoint({
                host1: 'A',
                host2: 'B'
            });

            let label = seriesDetector.getSeriesLabel(series1.id);

            // should be in alphabetical order
            expect(label).to.equal('host1: A, host2: B');
        });
    });
});
