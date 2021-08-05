(function($) {
    $.Launcher = function() {
        this.mediatype = document.querySelector('#media-type').textContent;
        if (this.mediatype === "text") {
            this.object_url = document.querySelector('#text_url').textContent;
            this.method_type = "url";
        } else {
            this.object_url = document.querySelector('#manifest-url').textContent;
            this.method_type = "manifest";
        }
        
        var tags = document.querySelector('#tags').textContent.split(',');
        var self = this;
        this.tagDict = {};
            tags.forEach(function(tagval) {
                var pair = tagval.split(':');
                self.tagDict[pair[0]] = pair[1]
            });
        this.annotations = document.querySelector('#annotations-url').textContent;
        this.commonname = document.querySelector('#common-inst-display-name').innerHTML;
        this.inst_id = $.getUniqueId();
        this.extraoptions = {};
        this.initListeners();
        this.init();
    };
    $.Launcher.prototype.initListeners = function() {
        var self = this;
        $.subscribeEvent('targetLoaded', self.inst_id, function(_, slot) {
            jQuery('#hxat_lite_loading').hide();
            if (self.annotations.trim().length == 0) {
                toastr.info("You did not add a url for the annotations. You are in authoring mode.")
            } else {
                setTimeout(function() {
                    document.querySelector('.mirador-osd-annotation-controls').style.display = 'none';
                    document.querySelector('.mirador-osd-context-controls.hud-container').style.width = '36px';
                }, 500);
            }
        });
        $.subscribeEvent('displayShown', self.inst_id, function(_, display, annotations) {
            if (self.annotations.trim().length > 0) {
                jQuery(display).find('.annotation-display .text-viewer .button-container').hide();
            }
        });
        
    };

    $.Launcher.prototype.init = function() {
        var self = this;
        toastr.options = {
            progressBar: true,
            preventDuplicates: true,
            'showDuration': '300',
            'hideDuration': '5000',
            timeOut: '5000',
            'positionClass': 'toast-top-right',
        }


        if (self.mediatype.toLowerCase() == 'text') {
            self.loadApp()
        } else if (self.mediatype.toLowerCase() == 'image') {
            if (self.object_url.trim().length == 0) {
                toastr.warning("You did not add a url for the item you want to annotate.")
                self.loadManifestCreator();
                jQuery('#viewer').hide();
            } else {
                self.loadApp();
            }
        }
    };

    $.Launcher.prototype.loadManifestCreator = function() {
        var self = this;
        var _URL = window.URL || window.webkitURL;
        jQuery('#hxat_lite_loading').hide();
        var html = "<h2>Create Manifest</h2><p>Upload your image (jpg only) to Files and Upload and get the <strong>Web URL</strong>. As you fill out this section, remember <strong>students will see all you input here</strong>.</p>"
        html += "Title of Image: <input id='imageTitle' class='form-control' type='text' placeholder='e.g. &quot;Prosperous Suzhou Scroll&quot;'/>";
        html += "<br>Short Description of Image: <input id='imageDesc' class='form-control' type='text' placeholder='e.g. &quot;30-foot scroll depicting a collection of scenes.&quot;'/>";
        html += "<br>Attribution of Image: <input id='imageAttr' class='form-control' type='text' placeholder='e.g. &quot;Provided by Harvard University&quot;'/>";
        html += "<br>Image URL: <input id='imageloader' class='form-control' type='text' placeholder='Web URL Files and Uploads Link'/><br><button id='uploadImageButton' class='btn btn-default'>Download Image Manifest</button><div class='uploadResult'><img width='150' src='' style='display:none;' id='uploadedImage' /> <span id='uploadedWidth'></span><span id='uploadedHeight'></span></div>";
        // html += "<br><br><textarea id='manifestOutput' style='display: none;'></textarea>"
        jQuery('.hxighlighter-container .container1 .annotations-section').append(html);

        jQuery('#uploadImageButton').on('click', function(e) {
            img = new Image();
            self.imageUrl = jQuery('#imageloader').val();
            self.manifestUrl = self.imageUrl.replace(/\.jpe*g/g, '_manifest.json')
            self.parseManifestName();
            img.onload = function () {
                self.imageWidth = this.width
                self.imageHeight = this.height;
                jQuery('#uploadedImage').attr('src', self.imageUrl);
                jQuery('#uploadedImage').show();
                jQuery('#uploadedWidth').html('Width: ' + self.imageWidth + 'px');
                jQuery('#uploadedHeight').html('&nbsp;&nbsp;Height: ' + self.imageHeight + 'px');
                self.imageTitle = jQuery('#imageTitle').val();
                self.imageDesc = jQuery('#imageDesc').val();
                self.imageAttr = jQuery('#imageAttr').val();
                self.download(self.manifestName, self.createManifest());
                var successHTML = "<div style='color:#fff!important; background-color: #28a745!important; padding: 15px; margin: 20px'>You have <strong>successfully</strong> downloaded the manifest. Make sure its name matches '"+ self.manifestName +"' <strong>exactly</strong>. Upload to 'Files and Uploads' and copy WebURL to the appropriately-named html component. Example: <pre>&lt;div id='manifest-url' style='display:none;'&gt;" + self.manifestUrl + "&lt;/div&gt;</pre></div>"
                jQuery('.hxighlighter-container .container1 .annotations-section').append(successHTML);
            };
            img.onerror = function() {
                toastr.error('There was an error retrieving your image. Check that you are using the Web URL or as the Tech Team.');
            }
            img.src = self.imageUrl;
            
        });
    };

    $.Launcher.prototype.loadApp = function() {
        var self = this;
        
        var new_obj_id = $.getUniqueId();
        if (self.mediatype == "image") {
            new_obj_id = self.object_url + '/canvas/canvas.json'
        }
        // if (!self.annotations || self.annotations == "") {
            var hxighlighter_object = {
                'inst_id': self.inst_id,
                'commonInfo': {
                    'mediaType': self.mediatype,
                    'context_id': $.getUniqueId(),
                    'collection_id': $.getUniqueId(),
                    'object_id': new_obj_id,
                    'username': self.commonname,
                    'user_id': self.commonname,
                    'instructors': [self.commonname],
                    'common_instructor_name': self.commonname,
                },
                'targets': [{
                    'mediaType': self.mediatype,
                    'method': self.method_type,
                    'object_source': self.object_url,
                    'target_selector': '.container1',
                    'manifest_url': self.object_url,
                    'template_urls': '',
                    'DropdownTags': {
                        'tags': Object.keys(self.tagDict),
                        'folksonomy': false,
                    },
                    "ColorTags": self.tagDict,
                    "SidebarTagTokens": {
                        'tagList': Object.keys(self.tagDict)
                    },
                    "HxPermissions": {
                        has_staff_permissions: false
                    },
                    viewerOptions: {
                        filterTabCount: 1,
                        defaultTab: 'mine',
                        tabsAvailable: ['mine'],
                        sidebarversion: 'sidemenu',
                        pagination: 100,
                        readonly: self.annotations !== "",
                        litemode: true
                    },
                    AdminButton: {},
                    LiteVersionChanges: {
                        authoring_mode: self.annotations == ""
                    },
                    storageOptions: {
                        external_url: {
                            json_url: self.annotations,
                        },
                        token: '',
                        pagination: 100, 
                        database_params: {
                            resource_link_id: '',
                            utm_source: '',
                            version: ''
                        },
                        'litemode': true
                    }
                }]
            };
            Hxighlighter(hxighlighter_object);
        // }
    };

    $.Launcher.prototype.createManifest = function() {
        var self = this;
        var manifest = '{\n\
            "description": "SAMPLE_DESC",\n\
            "sequences":\n\
            [\n\
                {\n\
                    "viewingHint": "individuals",\n\
                    "@type": "sc:Sequence",\n\
                    "canvases":\n\
                    [\n\
                        {\n\
                            "width": SAMPLE_WIDTH,\n\
                            "height": SAMPLE_HEIGHT,\n\
                            "label": "SAMPLE_TITLE",\n\
                            "@id": "SAMPLE_MANIFEST/canvas/canvas.json",\n\
                            "@type": "sc:Canvas",\n\
                            "images":\n\
                            [\n\
                                {\n\
                                    "@type": "oa:Annotation",\n\
                                    "resource":\n\
                                    {\n\
                                        "width": SAMPLE_WIDTH,\n\
                                        "format": "image/jpeg",\n\
                                        "height": 1080,\n\
                                        "@id": "SAMPLE_URL",\n\
                                        "@type": "dcterms:Image",\n\
                                        "service":\n\
                                        {\n\
                                            "@id": "SAMPLE_URL"\n\
                                        }\n\
                                    },\n\
                                    "motivation": "sc:painting",\n\
                                    "on": "SAMPLE_MANIFEST/canvas/canvas.json",\n\
                                    "@id": "SAMPLE_MANIFEST/annotation/anno-sample_image.json"\n\
                                }\n\
                            ]\n\
                        }\n\
                    ],\n\
                    "@id": "SAMPLE_MANIFEST/sequence/normal.json"\n\
                }\n\
            ],\n\
            "label": "SAMPLE_TITLE",\n\
            "@id": "SAMPLE_MANIFEST",\n\
            "@context": "http://iiif.io/api/presentation/2/context.json",\n\
            "@type": "sc:Manifest",\n\
            "logo": "https://images.harvardx.harvard.edu/iiif/harvard_logo.jpg/full/full/0/default.jpg",\n\
            "attribution": "SAMPLE_ATTR"\n\
        }';
        return manifest.replace(/SAMPLE_TITLE/g, self.imageTitle).replace(/SAMPLE_DESC/g, self.imageDesc).replace(/SAMPLE_ATTR/g, self.imageAttr).replace(/SAMPLE_URL/g, self.imageUrl).replace(/SAMPLE_MANIFEST/g, self.manifestUrl).replace(/SAMPLE_WIDTH/g, self.imageWidth).replace(/SAMPLE_HEIGHT/g, self.imageHeight);
    };

    $.Launcher.prototype.parseManifestName = function() {
        var self = this;
        var split_url = self.manifestUrl.split('/');
        var last = split_url[split_url.length-1];
        if (last.indexOf('@') > -1) {
            split_line = last.split('@');
            last = split_line[split_line.length-1];
        }
        self.manifestName = last;
    };

    $.Launcher.prototype.download = function(filename, text) {
        var element = document.createElement('a');
        element.setAttribute('href', 'data:text/plain;charset=utf-8,' + encodeURIComponent(text));
        element.setAttribute('download', filename);
        element.style.display = 'none';
        document.body.appendChild(element);
        element.click();
        document.body.removeChild(element);
    };

}(Hxighlighter ?  Hxighlighter : require('./hxighlighter.js')));
window.hxighlighter_launcher = new Hxighlighter.Launcher();