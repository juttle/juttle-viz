require('chai').should();
var testutils = require('testutils');
testutils.mode.browser();

describe('Base Data Target', function () {
    var DataTarget = require('./base-data-target');

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

            it('should return a token when we subscribe', function () {
                var lannisterToken = this.dt.on('debt', this.payDebt);
                lannisterToken.should.equal('0');
            });

            it('should add the listener to the events dictionary', function () {
                this.dt.on('debt', this.payDebt, this);
                this.dt.events.should.have.property('debt');
                this.dt.events.debt.should.deep.equal([{
                    token: "0",
                    callback: this.payDebt,
                    context: this
                }]);
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

            it('should return the token of the unsubscribed listener', function () {
                this.dt.off(this.token).should.equal(this.token);
            });

            it('should return false if the token could not be found', function () {
                this.dt.off("10").should.be.false;
            });
        });
        describe('trigger', function () {
            beforeEach(function () {
                this.dt = new DataTarget(1);
            });
            it('should have a trigger function', function () {
                this.dt.trigger.should.be.a.function;
            });

            it('should return false if the event is not present', function () {
                this.dt.trigger('Ned Stark').should.be.false;
            });

            it('should call the callback with the args passed', function (done) {
                this.dt.on('winter', function(eventName, args) {
                    args.should.equal('is coming');
                    done();
                });
                this.dt.trigger('winter', 'is coming');
            });

            it('should call the callback with a context if present', function (done) {
                var context = {
                    city: 'Winterfell',
                    house: 'Stark'
                };

                this.dt.on('attack', function(eventName, args) {
                    this.city.should.equal("Winterfell");
                    this.house.should.equal("Stark");
                    done();
                }, context);

                this.dt.trigger('attack', {});
            });
        });
    });
});
