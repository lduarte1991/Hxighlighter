import 'bootstrap/dist/css/bootstrap.min.css';
import 'bootstrap/dist/css/bootstrap-theme.min.css';
import '@fortawesome/fontawesome-free/css/all.min.css';
import 'toastr/build/toastr.min.css';
import 'videojs-transcript-ac/css/videojs-transcript3.css';
import './css/video.css';
require('!style-loader!css-loader!video.js/dist/video-js.css');

// vendors
require('handlebars');
require('bootstrap/dist/js/bootstrap.min.js');
require('jquery-tiny-pubsub/dist/ba-tiny-pubsub.min.js');

// common Hxighlighter object
require('./js/hxighlighter.js');
require('./js/plugins/hx-badges.js');
require('./js/hxelper-functions.js');
require('./js/videoVJStargetcontroller.js');
require('./js/core.js');
