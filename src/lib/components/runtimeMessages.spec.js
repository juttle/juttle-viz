/*jslint browser: true */

require('chai').should();
var testutils = require('testutils');
var Backbone = require('backbone');
var $ = require('jquery');
testutils.mode.browser();

describe('Runtime Messages', function() {
    var RuntimeMessages = require('./runtimeMessages');

    it('adding a message', function() {
        var messages = new RuntimeMessages();
        var $messageEl = $(messages.el);

        $messageEl.css('display').should.eql('none');

        messages.add(new Backbone.Model({
            code : 'SOME_CODE'
        }));

        $messageEl.css('display').should.not.eql('none');
        $messageEl.find('.message-contents').html().should.contain('SOME_CODE');
    });

    it('removing a message', function() {
        var messages = new RuntimeMessages();
        var $messageEl = $(messages.el);

        var msg = new Backbone.Model({
            code : 'SOME_CODE'
        });
        messages.add(msg);
        messages.remove(msg);

        $messageEl.css('display').should.eql('none');
        $messageEl.find('.message-contents').html().should.eql('');
    });

    it('multiple messages', function() {
        var messages = new RuntimeMessages();
        var $messageEl = $(messages.el);

        messages.add(new Backbone.Model({
            code : 'SOME_CODE'
        }));
        messages.add(new Backbone.Model({
            code : 'ANOTHER_CODE'
        }));

        $messageEl.css('display').should.not.eql('none');
        $messageEl.find('.message-contents').html().should.contain('SOME_CODE');
        $messageEl.find('.message-contents').html().should.contain('ANOTHER_CODE');
    });

    it('updating an existing message', function() {
        var messages = new RuntimeMessages();
        var $messageEl = $(messages.el);

        var msg = new Backbone.Model({
            code : 'SOME_CODE'
        });
        messages.add(msg);

        msg.set('code', 'ANOTHER_CODE');

        $messageEl.css('display').should.not.eql('none');
        $messageEl.find('.message-contents').html().should.contain('ANOTHER_CODE');
    });
});