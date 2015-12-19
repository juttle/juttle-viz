/*jslint browser: true */
require('chai').should();
var testutils = require('testutils');
testutils.mode.browser();

describe('Timestamp', function () {

    var TimestampGenerator = require('./timestamp');
    var d3Formatters = require('applib/components/jut-charts/utils/d3-formatters');
    var datefmt = d3Formatters.date;
    var timefmt = d3Formatters.time;
    var moment = require('moment');

    describe('drawing', function () {
        beforeEach(function (done) {
            this.el = document.createElement('div');
            this.timestamp = new TimestampGenerator(this.el);
            done();
        });

        afterEach(function (done) {
            delete this.el;
            delete this.timestamp;
            done();
        });

        it('should correctly draw timestamp with a single date', function (done) {

            var date = new Date();
            this.timestamp.update(date);

            var t = this.el.querySelector('div.timestamp');
            
            t.querySelector('span.time').textContent.should.equal( timefmt(date) );
            t.querySelector('span.date').textContent.should.equal( datefmt(date) + ' (UTC)' );

            done();
        });

        it('should correctly draw timestamp with date range of same day but different time', function (done) {
            var fromDate = new Date();
            var toDate = new Date(fromDate.setSeconds(fromDate.getSeconds()+10));
            this.timestamp.update(fromDate, toDate);

            var t = this.el.querySelector('div.timestamp');
            
            t.querySelector('span.window').textContent.should.equal( moment.duration(fromDate - toDate).humanize() );
            t.querySelectorAll('span.time')[0].textContent.should.equal( timefmt(fromDate) );
            t.querySelectorAll('span.time')[1].textContent.should.equal( timefmt(toDate) );
            t.querySelector('span.date').textContent.should.equal( datefmt(fromDate) + ' (UTC)' );

            done();
        });

        it('should correctly draw timestamp with date range with different days', function (done) {
            var fromDate = new Date();
            var toDate = new Date();
            toDate.setDate(toDate.getDate()+1);

            this.timestamp.update(fromDate, toDate);

            var t = this.el.querySelector('div.timestamp');
            
            t.querySelector('span.window').textContent.should.equal( moment.duration(fromDate - toDate).humanize() );
            t.querySelectorAll('span.time')[0].textContent.should.equal( timefmt(fromDate) );
            t.querySelectorAll('span.date')[0].textContent.should.equal( datefmt(fromDate) );
            t.querySelectorAll('span.time')[1].textContent.should.equal( timefmt(toDate) );
            t.querySelectorAll('span.date')[1].textContent.should.equal( datefmt(toDate) + ' (UTC)' );

            done();
        });

    });
});
