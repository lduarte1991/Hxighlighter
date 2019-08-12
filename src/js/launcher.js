(function($) {
    $.Launcher = function() {
        this.object_url = document.querySelector('#text_url').innerHTML;
        var tags = document.querySelector('#tags').innerHTML.split(',');
        var self = this;
        this.tagDict = {};
            tags.forEach(function(tagval) {
                var pair = tagval.split(':');
                self.tagDict[pair[0]] = pair[1]
            });
        this.annotations = document.querySelector('#annotations-url').innerHTML;
        this.mediatype = document.querySelector('#media-type').innerHTML;
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
                    'method': 'url',
                    'object_source': self.object_url,
                    'target_selector': '.container1',
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
                        readonly: self.annotations !== ""
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
                        }
                    }
                }]
            };
            Hxighlighter(hxighlighter_object);
        // }
    };

}(Hxighlighter ?  Hxighlighter : require('./hxighlighter.js')));
window.hxighlighter_launcher = new Hxighlighter.Launcher();