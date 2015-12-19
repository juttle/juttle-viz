// a demo data generator
module.exports = function (datapoints, startDate, increment) {

    var returnable = [];
    if (typeof increment === 'undefined') {
        increment = 1000;
    }
    if (typeof startDate === 'undefined') {
        startDate = (new Date()).getTime() - (datapoints*increment);
    }
    var i;

    for (i = 0; i < datapoints; i++) {

        returnable.push({
            label: "Some Marker some thing",
            key: (new Date(startDate)).toISOString()
        });

        startDate += increment;

    }

    return returnable;
};
