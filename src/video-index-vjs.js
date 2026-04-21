import './css/hxighlighter-styling.css';
import '@fortawesome/fontawesome-free/css/fontawesome.min.css';
import '@fortawesome/fontawesome-free/css/solid.min.css';
import 'toastr/build/toastr.min.css';
import 'videojs-transcript-ac/css/videojs-transcript3.css';
import './css/video.css';
import './css/common.css';
require('!style-loader!css-loader!video.js/dist/video-js.css');

// vendors
require('./js/vendors/jquery4-compat.js');
require('handlebars');
require('./js/vendors/micro-template.js');
require('./js/vendors/jquery-tiny-pubsub.js');

// common Hxighlighter object
require('./js/hxighlighter.js');
require('./js/plugins/hx-badges.js');
require('./js/hxelper-functions.js');
require('./js/videoVJStargetcontroller.js');
require('./js/core.js');
