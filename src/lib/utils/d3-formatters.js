var d3 = require('d3');

module.exports = {
    timeUTC : d3.time.format.utc('%a %b %e %H:%M:%S %Y UTC'),
    
    // updated formats used by chart timestamps
    time : d3.time.format.utc('%H:%M:%S'),
    date : d3.time.format.utc('%a %b %e %Y')
    
};
