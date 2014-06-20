var _ = require('lodash');
var es = require('event-stream');
var Gpio = require('onoff').Gpio;

// Create a raw event stream from the Gpio
var padEventStream = es.through();

var pad = new Gpio(17, 'in', 'both');
pad.watch(function(err, value) {
	if (err) {
		console.error(err);
		return;
	}
	padEventStream.write(value);
});

// Deduplication filter
var dedupFilter = function() {
	var prev = null;

	return function(data) {
		if (data !== prev) {
			this.emit('data', data);
			prev = data;
		}
	}
};

// Implement a low-pass filter
var lowPassFilter = function(wait) {
	var emit = _.debounce(function(data) {
		this.emit('data', data);
	}, wait, {leading: true});

	return function(data) {
		emit.call(this, data);
	}
};

// Implement a threshold filter
var thresholdFilter = function(threshold) {
	return function(data) {
		if (data > threshold) {
			this.emit('data', data);
		}
	}
};

// Helper that captures the picture
var spawn = require('child_process').spawn;
var ps = spawn('gphoto2', ['--shell']);

var captureImage = function() {
	ps.stdin.write('capture-image\n');
	console.log('Picture captured!');
};

es.pipeline(
	padEventStream,
	es.through(dedupFilter()),
	es.through(lowPassFilter(3000)),
	es.through(thresholdFilter(0.5)),
	es.mapSync(captureImage)
);
