module.exports = process.platform === 'win32'
    ? require('./processes.windows')
    : require('./processes.linux');
