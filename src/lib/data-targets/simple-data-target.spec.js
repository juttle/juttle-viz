require('chai').should();
var testutils = require('testutils');
testutils.mode.browser();

describe('Simple Data Target', function () {
    var DataTarget = require('./simple-data-target');

    describe('Pub/Sub', function () {
        describe('on', function () {
            beforeEach(function () {
                this.dt = new DataTarget(1);
                this.payDebt = function(d) {
                    console.log('paid');
                };
            });

            afterEach(function () {
                delete this.dt;
            });

            it('should have an on function', function () {
                this.dt.on.should.be.a.function;
            });

        });
        describe('off', function () {
            beforeEach(function () {
                this.dt = new DataTarget(1);
                this.payDebt = function(d) {
                    console.log('paid');
                };
                this.token = this.dt.on('debt', this.payDebt);
            });

            afterEach(function () {
                delete this.dt;
                delete this.token;
            });

            it('should have an off function', function () {
                this.dt.off.should.be.a.function;
            });
        });
        describe('trigger', function () {
            beforeEach(function () {
                this.dt = new DataTarget(1);
            });

            it('should have a trigger function', function () {
                this.dt.trigger.should.be.a.function;
            });
        });
    });
    describe('Data functions', function () {
        describe('update', function () {
            beforeEach(function () {
                this.dt = new DataTarget(1);
                this.dt._data = [1,2,3];
            });

            it('should have an update function', function () {
                this.dt.update.should.be.a.function;
            });

            it('should add the data passed to it to the data array', function () {
                this.dt.update([1,2]);
                this.dt._data.should.deep.equal([1,2,3,1,2]);
            });

            it('should trigger an update event with the new data and the length of the data appended', function (done) {
                this.dt.on('update', function(eventName, data) {
                    eventName.should.equal('update');
                    data.should.deep.equal({
                        data: [1,2,3,1,2],
                        newData: [1,2],
                        id: 1
                    });
                    done();
                });
                this.dt.update([1,2]);
            });
        });
        describe('setData', function () {
            beforeEach(function () {
                this.dt = new DataTarget(1);
            });

            it('should have a setData function', function() {
                this.dt.setData.should.be.a.function;
            });

            it('should set the data directly', function () {
                this.dt.setData([1,2,3]);
                this.dt._data.should.deep.equal([1,2,3]);

                this.dt._data = [4,5,6];
                this.dt.setData([1,2,3]);
                this.dt._data.should.deep.equal([1,2,3]);

            });

            it('should trigger a data event with the correct payload', function (done) {
                this.dt.on('data', function(eventName, data) {
                    eventName.should.equal('data');
                    data.should.deep.equal({
                        data: [1,2,3],
                        id: 1
                    });
                    done();
                });

                this.dt.setData([1,2,3]);
            });
        });

    });
});
