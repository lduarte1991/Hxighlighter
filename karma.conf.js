module.exports = function(config) {
    config.set({
        frameworks: ['mocha', 'chai'],
        files: [
            'tests/acceptance/**/*.js'
        ],
        colors: true,
        logLevel: config.LOG_INFO,
        browsers: ['ChromeHeadless'],
        concurrency: Infinity,
    });
};