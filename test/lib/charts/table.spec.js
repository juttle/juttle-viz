require('chai').should();
var _ = require('underscore');
var d3Formatters = require('../../../src/lib/utils/d3-formatters');
var timeFormatter = d3Formatters.timeUTC;

function verifyHeaders(tableEl, headers) {
    var ths = tableEl.querySelectorAll('thead th');
    ths.length.should.equal(headers.length);

    Array.prototype.forEach.call(ths, function(th, i) {
        th.innerHTML.should.equal(" " + headers[i] + " " + '<div>'
                                    + headers[i] + '</div>');
    });
}

function verifyData(tableEl, headers, data) {
    var trs = tableEl.querySelectorAll('tbody tr');
    trs.length.should.equal(data.length);

    var dp, tds;
    Array.prototype.forEach.call(trs, function(tr, i) {
        dp = data[i];
        tds = tr.querySelectorAll('td');
        Array.prototype.forEach.call(tds, function(td, j) {
            var dpVal = dp[headers[j]];

            if (dpVal === undefined) {
                td.innerHTML.should.equal("");
            }
            else if (_.isDate(dpVal) ) {
                td.innerHTML.should.equal(timeFormatter(dpVal));
            }
            else {
                td.innerHTML.should.equal("" + dpVal);
            }
            
        });
    });
}

function verifyTable(tableEl,headers,data) {
    verifyHeaders(tableEl,headers);
    verifyData(tableEl,headers,data);
}

describe('Table', function () {
    var Table = require('../../../src/lib/charts/table');

    beforeEach(function (done) {
        this.el = document.createElement('div');
        done();
    });

    afterEach(function (done) {
        delete this.el;
        delete this.table;
        done();
    });

    describe('Constructor', function () {
        beforeEach(function (done) {
            this.el = document.createElement('div');
            this.table = new Table(this.el, {
                display : {
                    limit : 1000
                }
            });
            done();
        });

        afterEach(function (done) {
            delete this.el;
            delete this.table;
            done();
        });

        it('should initialise all the scaffolding', function (done) {
            this.table.should.have.property.el;
            this.table.should.have.property.header;
            this.table.should.have.property.body;
            this.table.should.have.property.dataTarget;
            done();
        });
    });

    describe('Column Ordering', function() {


        describe('no columnOrder specified', function() {
            beforeEach(function () {
                this.table = new Table(this.el,{
                    display : {
                        limit : 1000
                    }
                });
            });

            describe('time, name, and value should show up at the beginning, rest should be alphanumeric', function() {

                it( 'time, name, and value are present in data', function() {
                    var data = [
                        {
                            someOtherField: "yada",
                            name: 'who',
                            time: new Date(),
                            andAnotherField: 'scoobster',
                            value: "Winter is coming"
                        }
                    ];

                    this.table.dataTarget.push(data);

                    verifyHeaders(this.el, ['time', 'name', 'value', 'andAnotherField', 'someOtherField']);

                    verifyTable(this.el,['time', 'name', 'value', 'andAnotherField', 'someOtherField'], data);
                });

                it( 'name is present in data', function() {
                    var data = [
                        {
                            someOtherField: "yada",
                            name: 'who',
                            andAnotherField: 'scoobster'
                        }
                    ];

                    this.table.dataTarget.push(data);

                    verifyHeaders(this.el, ['name', 'andAnotherField', 'someOtherField']);
                });

                it('fields not present at first should be added to the right in alpha order', function() {
                    this.table.dataTarget.push([
                        {
                            someOtherField: "yada",
                            name: 'who',
                            time: new Date(),
                            andAnotherField: 'scoobster',
                            value: "Winter is coming"
                        }
                    ]);

                    this.table.dataTarget.push([
                        {
                            callerField: 'doggy',
                            bestFieldEver: 'sparky'
                        }
                    ]);

                    verifyHeaders(this.el, ['time', 'name', 'value', 'andAnotherField', 'someOtherField', 'bestFieldEver', 'callerField']);
                });
            });
        });
    });

    describe('Batching', function() {
        describe('display.update', function() {

            describe('replace', function() {
                beforeEach(function () {
                    this.table = new Table(this.el,{
                        update : 'replace'
                    });
                });
                it('data is replaced', function() {
                    var data = [
                        {
                            field1: 'field 1 value',
                            field2: 'field 2 value'
                        }
                    ];

                    var data2 = [
                        {
                            field1: 'field 3 value',
                            field2: 'field 4 value'
                        }
                    ];

                    this.table.dataTarget.push(data);
                    this.table.dataTarget.batch_end();
                    this.table.dataTarget.push(data2);

                    verifyData(this.el, ['field1','field2'], data2);
                });

                it('old columns are maintained', function() {
                    var data = [
                        {
                            field1: 'field 1 value',
                            field2: 'field 2 value'
                        }
                    ];

                    var data2 = [
                        {
                            field2: 'field 3 value',
                            field3: 'field 4 value'
                        }
                    ];

                    this.table.dataTarget.push(data);
                    this.table.dataTarget.batch_end();
                    this.table.dataTarget.push(data2);

                    verifyData(this.el, ['field1','field2', 'field3'], data2);
                });
            });

            describe('append', function() {
                beforeEach(function () {
                    this.table = new Table(this.el,{
                        display : {
                            update : 'append'
                        }
                    });
                });

                it('data is appended', function() {
                    var data = [
                        {
                            field1: 'field 1 value',
                            field2: 'field 2 value'
                        }
                    ];

                    var data2 = [
                        {
                            field1: 'field 3 value',
                            field2: 'field 4 value'
                        }
                    ];

                    this.table.dataTarget.push(data);
                    this.table.dataTarget.batch_end();
                    this.table.dataTarget.push(data2);

                    verifyData(this.el, ['field1','field2'], data.concat(data2));
                });
            });
        });
    });

    it('should not clear data on stream end', function() {
        this.table = new Table(this.el,{
            display: {}
        });

        var data = [
            {
                field1: 'field 1 value',
                field2: 'field 2 value'
            }
        ];

        this.table.dataTarget.push(data);
        this.table.dataTarget.stream_end();
        this.table.dataTarget._data.length.should.equal(1);
        verifyData(this.el, ['field1','field2'], data);
    });
});
