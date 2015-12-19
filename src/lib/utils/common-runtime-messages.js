var Backbone = require('backbone');

module.exports = {
    WAITING_FOR_DATA : new Backbone.Model({ code : 'WAITING_FOR_DATA'}),
    NO_DATA_RECEIVED : new Backbone.Model({ code : 'NO_DATA_RECEIVED'})
};