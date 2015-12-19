// to make it nicer looking
var SimplexNoise = require('./simplex-noise');

var noise = new SimplexNoise();

// a demo data generator
module.exports = function (numberofX, numberofY, startDate) {

    var returnable = [];
    var xIncrement = 1000;
    var yIncrement = 10;

    if (typeof startDate === 'undefined') {
        startDate = (new Date()).getTime() - (numberofX*xIncrement);
    }
    var i, j;

    for (i = 0; i < numberofX; i++) {
        for (j = 0; j < numberofY; j++) {
            returnable.push({
                color: noise.noise(startDate+i, j),
                value: yIncrement * j,
                date: (new Date(startDate)).toISOString()
            });
        }
        startDate += xIncrement;

    }

    return returnable;
};
