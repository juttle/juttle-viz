/*eslint-disable no-console */
require('chai').should();

describe('Time Windowed Data Target', function () {
    var DataTarget = require('../../../src/lib/data-targets/time-windowed-data-target');

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
                this.dt = new DataTarget(1, {});
            });

            it('should have a trigger function', function () {
                this.dt.trigger.should.be.a.function;
            });
        });
    });
    describe('Data functions', function () {
        describe('push', function () {
            beforeEach(function () {
                this.dt = new DataTarget(1);

                var d = new Date();

                this.dt._data = [
                    {
                        value: 1,
                        time: new Date(d - 5000)
                    },
                    {
                        value: 2,
                        time: new Date(d - 4000)
                    },
                    {
                        value: 3,
                        time: new Date(d - 3000)
                    }
                ];
            });

            it('should have a push function', function () {
                this.dt.push.should.be.a.function;
            });

            it('should add the data passed to it to the data array', function (done) {
                var d = new Date();
                var data = [{
                    value: 1,
                    key: new Date(d - 1000)
                },
                    {
                        value: 1,
                        key: new Date(d)
                    }
                ];

                this.dt.on('update', function(eventName, d) {
                    d.data.length.should.equal(0);
                    done();
                });

                this.dt.push(data);
            });

            it('should trigger a data event when we dont have any data', function (done) {
                this.dt._data = [];
                this.dt.on('data', function(eventName, data) {
                    done();
                });
                this.dt.push([1,2]);
            });

            it('should trigger a data event when we dont have any data', function (done) {
                this.dt.on('update', function(eventName, data) {
                    done();
                });
                this.dt.push([1,2]);
            });
        });

        describe('batch_end', function () {
            beforeEach(function () {
                this.dt = new DataTarget(1);
            });

            it('should have a batch_end function', function() {
                this.dt.batch_end.should.be.a.function;
            });

        });

        describe('stream_end', function () {
            beforeEach(function () {
                this.dt = new DataTarget(1);
            });

            it('should have a stream_end function', function() {
                this.dt.stream_end.should.be.a.function;
            });
        });

    });
});
