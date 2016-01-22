module.exports = function(howMany) {

    var data = [];
    for (var i = 0; i < howMany; i++) {
        data.push({
            key: names[i % names.length],
            value: Math.random() * 1000
        });
    }

    return data;
};



var names = [
    'ATL',
    'SFO',
    'LHR',
    'JFK',
    'MAD',
    'BCN',
    'OVD',
    'PDX',
    'SAN',
    'SEA',
    'CDG',
    'TXL',
    'DUB',
    'EDI',
    'LAX'
];
