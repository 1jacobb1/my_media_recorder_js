var mediaRecorder = (function() {

	var elm = null;
	
	// - obj
	var obj = {};

	// - all configs here
	obj.config = {};
	obj.config.video_container = '';
	obj.config.captured_image_container = '';

	// - set constraints
	obj.constraints = {
		audio: true,
		video: true
	};

	// - get user media
	obj.getUserMedia = function() {
		elm = this;
		var d = new $.Deferred();
		navigator.mediaDevices.getUserMedia(elm.constraints)
		.then(function(stream) {
			d.resolve(stream);
		})
		.catch(function(e) {
			d.reject(e);
		});
		return d.promise();
	};

	// - initializing user media
	obj.initUserMedia = function() {
		elm = this;
		// - check for video container
		if (typeof(elm.config.video_container) !== 'object') {
			console.log('set_video_container');
			return;
		}
		// - initialize user media
		elm.getUserMedia()
		.then(function(stream) {
			elm.config.video_container.src = URL.createObjectURL(stream);
		})
		.catch(function(e){
			console.log('[user_media_initialization_failed]');
			console.log(e);
		});
	};

	/*********************************/
	// - for recording properties
	/*********************************/
	obj.mediaRecorder;
	obj.recordedBlobs;

	/*********************************/
	// - functions for recording
	/*********************************/
	
	// - video audio recording
	obj.videoAudioRecording = function() {
		elm = this;
		elm.constraints = {
			audio: true,
			video: true
		};
		elm.startRecording();
	};

	// - audio recording only
	obj.audioRecording = function() {
		elm = this;
		elm.constraints = {
			audio: true,
			video: false
		};
		elm.startRecording();
	};

	// - start recording video and audio
	obj.startRecording = function() {
		elm = this;
		// - check user media
		elm.getUserMedia()
		.then(function(stream) {
			// - set recording options
			var options = elm.getRecordingOptions();

			// - empty recorded blobs
			elm.recordedBlobs = [];

			// - set media recorder
			elm.mediaRecorder = new MediaRecorder(stream, options);

			console.log('Created MediaRecorder', elm.mediaRecorder, 'with options', options);

			// - onstop listener
			elm.mediaRecorder.onstop = function(event) {
				console.log('recorder_stopped: ', event);
			};

			// - on data available listener
			elm.mediaRecorder.ondataavailable = function(event) {
				if (event.data && event.data.size > 0) {
					elm.recordedBlobs.push(event.data);
				}
			};

			elm.mediaRecorder.start(10); // collect 10ms of data
			console.log('MediaRecorder started', elm.mediaRecorder);
		})
		.catch(function(e) {
			console.log('start_recording_failed');
		});
	};

	// - stops the recording
	obj.stopRecording = function() {
		elm = this;
		if (typeof(elm.mediaRecorder) === 'object' && typeof(elm.mediaRecorder.stop) === 'function') {
			elm.mediaRecorder.stop();

			// - default mime
			var mime = 'video/mp4';

			// - audio only
			if (elm.constraints.audio && !elm.constraints.video) {
				mime = 'audio/mp4';
			}

			// - blob
			var blob = new Blob(elm.recordedBlobs, {type: mime});
			var bufferUrl = window.URL.createObjectURL(blob);

			// - do uploading
			elm.uploadRecording();

			// - buffer url
			console.log('buffer_url: ', bufferUrl);

			// - empty media recorder
			elm.mediaRecorder = '';
		} else {
			console.log('media_recorder_not_set');
		}
	};

	// - get recording options
	obj.getRecordingOptions = function() {
		elm = this;

		// - default mime
		var mime = 'video/mp4';
		if (elm.constraints.audio && !elm.constraints.video) {
			// - audio only
			mime = 'audio/mp4';
		}

		// - set option
		var options = {mimeType: mime + ';codecs=vp9'};
		if (!MediaRecorder.isTypeSupported(options.mimeType)) {
			console.log(options.mimeType + ' is not Supported');
			options = {mimeType: mime + ';codecs=vp8'};
			if (!MediaRecorder.isTypeSupported(options.mimeType)) {
				console.log(options.mimeType + ' is not Supported');
				options = {mimeType: mime};
				if (!MediaRecorder.isTypeSupported(options.mimeType)) {
					console.log(options.mimeType + ' is not Supported');
					options = {mimeType: ''};
				}
			}
		}
		return options;
	}

	// - upload the recording
	obj.uploadRecording = function() {
		elm = this;

		// - check if has blobs
		if (elm.recordedBlobs.length == 0) {
			console.log('no_recording_found');
			return;
		}

		// - set fileName
		var fileName = makeid(10) + '.mp4';

		// - set the file
		var file = new File(elm.recordedBlobs, fileName, {type: 'video/mp4'});
		console.log('file: ', file);

		// - set form data
		var fd = new FormData();
		fd.append('file', file);
		fd.append('login_token', loginToken);
		fd.append('source_user_type', 1);
		fd.append('target_user_id', 1);
		fd.append('file_type', 3);

		// - ajax recording upload
		$.ajax({
			url: "",
			data: fd,
			type: 'POST',
			dataType: 'json',
			cache: false,
			contentType: false,
			processData: false,
			success: function(res){
			},
			error: function(e){
			}
		});
	};
	/************ end ****************/

	
	/*********************************/
	// taking picture
	/*********************************/
	obj.takePicture = function() {
		// - check for video container
		if (typeof(elm.config.video_container) !== 'object') {
			console.log('set_video_container');
			return;
		}

		// - check for captured image container
		if (typeof(elm.config.captured_image_container) !== 'object') {
			console.log('set_captured_image_container');
			return;
		}

		// - set captured picture
		var picture = elm.config.video_container;
		
		// - create and set canvas
		var canvas = document.createElement("canvas");
		canvas.width = picture.videoWidth;
		canvas.height = picture.videoHeight;
		canvas.getContext('2d').drawImage(picture, 0, 0);

		// - show captured image
		elm.config.captured_image_container.src = canvas.toDataURL('image/jpeg');
	};
	/*********************************/
	// end taking picture
	/*********************************/


	// XHR2/FormData
	function xhr(url, data, callback) {
		var request = new XMLHttpRequest();
		request.onreadystatechange = function() {
			if (request.readyState == 4 && request.status == 200) {
				callback(request.responseText);
			}
		};

		request.upload.onprogress = function(event) {
			console.log('Upload Progress ' + Math.round(event.loaded / event.total * 100) + "%");
		};

		request.open('POST', url);
		var formData = new FormData();
		formData.append('file', data);
		formData.append('login_token', loginToken);
		formData.append('source_user_type', 1);
		formData.append('target_user_id', 1);
		formData.append('file_type', 3);
		request.send(formData);
	}

	function makeid(length) {
		var length = length || 10;
		var text = "";
		var possible = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
		for (var i = 0; i < length; i++) {
			text += possible.charAt(Math.floor(Math.random() * possible.length));			
		}
		var finalText = $.now() + '_' + text;
		return finalText;
	}

	return obj;
})();