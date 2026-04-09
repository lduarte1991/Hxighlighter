(function($) {
    $.Launcher = function() {
        var textContainerEl = document.querySelector('#text-container') || document.querySelector('#text_url');
        this.object_url = textContainerEl ? textContainerEl.innerHTML : '';
        var tags = document.querySelector('#tags').innerHTML.split(',');
        var self = this;
        this.tagDict = {};
            tags.forEach(function(tagval) {
                var pair = tagval.split(':');
                self.tagDict[pair[0]] = pair[1]
            });
        this.mediatype = document.querySelector('#media-type').innerHTML;
        this.commonname = document.querySelector('#common-inst-display-name').innerHTML;
        this.method = document.querySelector('#method')?.innerHTML ?? 'url';
        this.target_selector = document.querySelector('#target-selector')?.innerHTML ?? '.container1';
        this.inst_id = $.getUniqueId();

        // Resolve annotation mode: prefer #annotation-mode, fall back to #annotations-url
        this.resolveAnnotationMode();

        this.extraoptions = this.parseExtraOptions();
        this.applyExtraOptions();
        this.initListeners();
        this.init();
    };

    $.Launcher.prototype.resolveAnnotationMode = function() {
        var modeEl = document.querySelector('#annotation-mode');
        var urlEl = document.querySelector('#annotations-url');
        var mode = modeEl ? modeEl.innerHTML.trim() : '';
        var annotations = urlEl ? urlEl.innerHTML.trim() : '';

        if (mode === 'learner') {
            // Learner mode: read-only, annotations injected inline via data-annotations
            this.isReadonly = true;
            this.isAuthoring = false;
            this.inlineMode = true;
            this.annotations = '';
        } else if (mode === 'author') {
            // Author mode: full editing, no pre-loaded annotations
            this.isReadonly = false;
            this.isAuthoring = true;
            this.inlineMode = false;
            this.annotations = '';
        } else {
            // No annotation-mode set — fall back to annotations-url behavior
            this.annotations = annotations;
            this.inlineMode = annotations === 'inline';
            this.isReadonly = annotations !== '' || this.inlineMode;
            this.isAuthoring = annotations === '' && !this.inlineMode;
        }
    };

    $.Launcher.prototype.parseExtraOptions = function() {
        var el = document.querySelector('#extra_options');
        if (!el) return {};
        var raw = el.innerHTML.trim();
        if (!raw) return {};
        var opts = {};
        raw.split(',').forEach(function(pair) {
            var parts = pair.split(':');
            if (parts.length === 2) {
                opts[parts[0].trim()] = parts[1].trim();
            }
        });
        return opts;
    };

    $.Launcher.prototype.applyExtraOptions = function() {
        var self = this;
        if (self.extraoptions.height) {
            var section = document.querySelector('.annotations-section');
            if (section) {
                section.style.maxHeight = self.extraoptions.height;
                section.style.overflowY = 'auto';
            }
        }
    };
    $.Launcher.prototype.initListeners = function() {
        var self = this;
        $.subscribeEvent('targetLoaded', self.inst_id, function(_, slot) {
            jQuery('#hxat_lite_loading').hide();
        });
    };

    $.Launcher.prototype.init = function() {
        var self = this;
        // if (!self.annotations || self.annotations == "") {
            var hxighlighter_object = {
                'inst_id': self.inst_id,
                'commonInfo': {
                    'mediaType': self.mediatype,
                    'context_id': $.getUniqueId(),
                    'collection_id': $.getUniqueId(),
                    'object_id': $.getUniqueId(),
                    'username': self.commonname,
                    'user_id': self.commonname,
                    'instructors': [self.commonname],
                    'common_instructor_name': self.commonname
                },
                'targets': [{
                    'mediaType': 'text',
                    'method': self.method,
                    'object_source': self.object_url,
                    'target_selector': self.target_selector,
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
                        readonly: self.isReadonly
                    },
                    AdminButton: {},
                    LiteVersionChanges: {
                        authoring_mode: self.isAuthoring
                    },
                    storageOptions: {
                        external_url: {
                            json_url: self.inlineMode ? '' : self.annotations,
                            inline_mode: self.inlineMode,
                        },
                        token: '',
                        pagination: 100, 
                        database_params: {
                            resource_link_id: '',
                            utm_source: '',
                            version: ''
                        }
                    }
                }]
            };
            Hxighlighter(hxighlighter_object);
        // }
    };

}(Hxighlighter ?  Hxighlighter : require('./hxighlighter.js')));
window.hxighlighter_launcher = new Hxighlighter.Launcher();