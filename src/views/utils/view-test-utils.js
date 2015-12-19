/*jslint browser: true */

var assert = require('chai').assert;
var v = require('../../lib/object-validation');
var _ = require('underscore');

function verifyValueValidationError(err, obj) {
    err.code.should.be.eql(obj.code);
    err.info.should.be.eql(obj.info);
}

var juttleEnv = {
    now : new Date()
};

module.exports = {
    verifyValidationError : function(options) {
        try {
            new options.viewConstructor({
                juttleEnv : juttleEnv,
                params : options.params
            });
            assert(false);
        }
        catch(e) {
            var flatErrors = v.flattenErrors(e.info.errors);
            verifyValueValidationError(flatErrors[options.errorPath][0],options.error);
        }
    },
    verifyRuntimeMessage : function(chart,code, info) {
        chart.runtimeMessages.getMessages().at(0).get('code').should.eql(code);

        var messageInfo = chart.runtimeMessages.getMessages().at(0).get('info');
        if (info) {
            chart.runtimeMessages.getMessages().at(0).get('info').should.eql(info);
        }
        else {
            (messageInfo === undefined || _.isEqual(info, messageInfo)).should.be.true;
        }

        chart.runtimeMessages.getMessages().length.should.eql(1);
    },
    verifyNoRuntimeMessages : function(chart) {
        chart.runtimeMessages.getMessages().length.should.eql(0);
    }
};
