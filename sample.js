require('./log');

console.setFile('node.log', function() {
    console.notice('Hello world!')
});