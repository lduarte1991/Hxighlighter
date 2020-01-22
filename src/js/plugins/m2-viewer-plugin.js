(function($) {

    $.AnnotationTooltip = function(options) {
        window.jQuery.extend(this, {
            targetElement: null,
            annotations: [],
            windowId: "",
            eventEmitter: null
        }, options);
        $.Handlebars.registerHelper('convertTime', function (aDateTime) {
            if (jQuery && jQuery.timeago) {
                return jQuery.timeago(aDateTime);
            } else {
                return aDateTime;
            }
        });

        this.init();
    };

    $.AnnotationTooltip.prototype = {

        init: function() {
            this.editor = $[this.state.currentConfig.annotationBodyEditor.module];
            this.editorOptions = this.state.currentConfig.annotationBodyEditor.options;

            this.activeEditor = null;
            this.activeEditorTip = null;
            this.inEditOrCreateMode = false;
        },

        /**
         * @param params: {
         *   annotation: any -- annotation JSON
         *   onAnnotationCreated: (annotation) => void
         *   onCompleted: () => void
         *   onCancel: () => void
         * }
         */
        showEditor: function(params) {
            var _this = this;
            if (_this.activeEditor) { return; }

            var editorContainer = _this.editorTemplate({
                id : window.jQuery.isEmptyObject(params.annotation) ? "" : params.annotation['@id'],
                windowId : _this.windowId
            });
            var selector = '#annotation-editor-' + _this.windowId;

            _this.activeEditor = new _this.editor(
                window.jQuery.extend({}, _this.editorOptions, {
                    annotation: params.annotation,
                    windowId: _this.windowId
                }));
            _this.activeEditorTip = _this.targetElement.qtip({
                content: {
                    text: editorContainer
                },
                position: {
                    my: 'center',
                    at: 'center',
                    container: _this.targetElement,
                    viewport: _this.targetElement
                },
                style: {
                    classes: 'qtip-bootstrap qtip' + _this.windowId
                },
                show: {
                    event: false
                },
                hide: {
                    fixed: true,
                    delay: 300,
                    event: false
                },
                events: {
                    render: function(event, api) {
                        _this.eventEmitter.publish('disableTooltips.' + _this.windowId);

                        api.elements.tooltip.draggable();

                        window.jQuery(selector).on("submit", function(event) {
                            event.preventDefault();
                            window.jQuery(selector + ' a.save').click();
                        });

                        window.jQuery(selector + ' a.cancel').on("click", function(event) {
                            event.preventDefault();

                            var cancelCallback = function(){
                                api.destroy();
                            };

                            _this.eventEmitter.publish('onAnnotationCreatedCanceled.'+_this.windowId,[cancelCallback,!_this.activeEditor.isDirty()]);

                        });

                        window.jQuery(selector + ' a.save').on("click", function(event) {
                            event.preventDefault();
                            if(!params.onSaveClickCheck()){
                                return;
                            }
                            var annotation = _this.activeEditor.createAnnotation();
                            if (params.onAnnotationCreated) { params.onAnnotationCreated(annotation); }

                            api.destroy();
                            _this.activeEditor = null;
                            _this.activeEditorTip = null;
                        });

                        _this.activeEditor.show(selector);
                        _this.eventEmitter.publish('annotationEditorAvailable.' + _this.windowId);
                    }

                }
            });
            _this.activeEditorTip.qtip('show');
        },

        /**
         * @param params: {
         *   container: HTMLElement
         *   viewport: HTMLElement
         *   getAnnoFromRegion: (regionId: string) => any[]
         *   onTooltipShown: (event: QTipShowEvent, api: QTipAPI) => void
         *   onTooltipHidden: (event: QTipShowEvent, api: QTipAPI) => void
         *   onEnterEditMode: (api: QTipAPI, oaAnno: any) => void
         *   onExitEditMode: (api: QTipAPI, oaAnno: any) => void
         *   onAnnotationSaved: (annotation) => void
         * }
         */
        initializeViewerUpgradableToEditor: function(params) {
            var _this = this;
            _this.activeEditorTip = window.jQuery(_this.targetElement).qtip({
                overwrite: true,
                content: {
                    text: ''
                },
                position: {
                    target: 'mouse',
                    my: 'bottom left',
                    at: 'top right',
                    adjust: {
                        mouse: false,
                        method: 'shift'
                    },
                    container: params.container,
                    viewport: params.viewport
                },
                style: {
                    classes: 'qtip-bootstrap qtip-viewer',
                    tip: false
                },
                show: {
                    event: false
                },
                hide: {
                    fixed: true,
                    delay: 5000,
                    event: false
                },
                events: {
                    show: function(event, api) {
                        if (params.onTooltipShown) { params.onTooltipShown(event, api); }
                        api.cache.hidden = false;
                        window.jQuery(api.tooltip).closest('.qtip').draggable({'handle': '.annotation-viewer .annotation-viewer-nav-bar', 'containment': '.mirador-viewer'})
                    },
                    hidden: function(event, api) {
                        if (params.onTooltipHidden) { params.onTooltipHidden(event, api); }
                        _this.removeAllEvents(api, params);
                        api.cache.hidden = true;
                    },
                    hide: function(event, api) {
                        event.preventDefault();
                        setTimeout(function() {
                            if (params.onTooltipHidden) { params.onTooltipHidden(event, api); }
                            _this.removeAllEvents(api, params);
                            api.cache.hidden = true;
                            window.jQuery(api.tooltip).hide();
                        }, 500);
                    },
                    visible: function (event, api) {

                    },
                    move: function (event, api) {

                    }
                }
            });
            var api = window.jQuery(_this.targetElement).qtip('api');
            api.cache.annotations = [];
            api.cache.hidden = true;
            api.cache.params = params;
        },

        removeAllEvents: function(api, viewerParams) {
            var _this = this;
            var editorSelector = '#annotation-editor-' + _this.windowId;
            var viewerSelector = '#annotation-viewer-' + _this.windowId;
            window.jQuery(viewerSelector + ' a.delete').off("click");
            window.jQuery(viewerSelector + ' a.edit').off("click");
            window.jQuery(editorSelector + ' a.save').off("click");
            window.jQuery(editorSelector + ' a.cancel').off("click");
        },

        addViewerEvents: function(api, viewerParams) {
            var _this = this;
            var selector = '#annotation-viewer-' + _this.windowId;

            window.jQuery(selector + ' a.delete').on("click", function(event) {
                event.preventDefault();
                var elem = this;
                new $.DialogBuilder(viewerParams.container).dialog({
                    message: i18next.t('deleteAnnotation'),
                    closeButton: false,
                    buttons: {
                        'no': {
                            label: i18next.t('no'),
                            className: 'btn-default',
                            callback: function() {
                                return;
                            }
                        },
                        'yes': {
                            label: i18next.t('yes'),
                            className: 'btn-primary',
                            callback: function() {
                                var display = window.jQuery(elem).parents('.annotation-display');
                                var id = display.attr('data-anno-id');
                                var callback = function(){
                                    _this.removeAllEvents();
                                    api.hide();
                                    display.remove();
                                };

                                _this.eventEmitter.publish('onAnnotationDeleted.' + _this.windowId, [id,callback]);
                            }
                        }
                    }
                });
            });

            window.jQuery(selector + ' a.edit').on("click", function(event) {
                event.preventDefault();
                var display = window.jQuery(this).parents('.annotation-display');
                var id = display.attr('data-anno-id');
                var oaAnno = viewerParams.getAnnoFromRegion(id)[0];
                // Don't show built in editor if external is available
                if (!_this.state.getStateProperty('availableExternalCommentsPanel')) {
                     _this.freezeQtip(api, oaAnno, viewerParams);
                     _this.removeAllEvents(api, viewerParams);
                     _this.addEditorEvents(api, viewerParams);
                } else {
                    _this.eventEmitter.publish('annotationInEditMode.' + _this.windowId,[oaAnno]);
                    _this.removeAllEvents(viewerParams);
                    api.destroy();
                    window.jQuery(api.tooltip).remove();
                }

                _this.eventEmitter.publish('SET_ANNOTATION_EDITING.' + _this.windowId, {
                    "annotationId" : id,
                    "isEditable" : true,
                    "tooltip" : _this
                });
                _this.eventEmitter.publish('modeChange.' + _this.windowId, 'editingAnnotation');
            });
        },

        addEditorEvents: function(api, viewerParams) {
            var _this = this;
            var selector = '#annotation-editor-' + _this.windowId;

            window.jQuery(selector).on("submit", function(event) {
                event.preventDefault();
                window.jQuery(selector + ' a.save').click();
            });

            window.jQuery(selector + ' a.save').on("click", function(event) {
                event.preventDefault();
                var display = window.jQuery(this).parents('.annotation-editor');
                var id = display.attr('data-anno-id');
                var oaAnno = viewerParams.getAnnoFromRegion(id)[0];

                _this.activeEditor.updateAnnotation(oaAnno);
                _this.eventEmitter.publish('annotationEditSave.'+_this.windowId,[oaAnno]);
            });

            window.jQuery(selector + ' a.cancel').on("click", function(event) {
                event.preventDefault();
                var display = window.jQuery(this).parents('.annotation-editor');
                var id = display.attr('data-anno-id');
                var oaAnno = viewerParams.getAnnoFromRegion(id)[0];
                _this.removeAllEvents();
                _this.unFreezeQtip(api, oaAnno, viewerParams);
                _this.eventEmitter.publish('annotationEditCancel.' + _this.windowId,[id]);

            });
        },

        /**
         * Shows annotation tooltip initialized with
         * <code>initializeViewerUpgradableToEditor()</code>
         *
         * @param params: {
         *   annotations: any[]
         *   triggerEvent: MouseEvent
         *   shouldDisplayTooltip: (api: QTipAPI) => boolean
         * }
         */
        showViewer: function(params) {
            var _this = this;
            var api = window.jQuery(_this.targetElement).qtip('api');
            if (!api) { return; }
            if (params.shouldDisplayTooltip && !params.shouldDisplayTooltip(api)) {
                return;
            }
            if (params.annotations.length === 0) {
                if (!api.cache.hidden) {
                    api.disable(false);
                    api.hide(params.triggerEvent);
                    api.cache.annotations = [];
                    api.cache.hidden = true;
                    api.disable(true);
                }
            } else {
                var oldAnnotations = api.cache.annotations;
                var isTheSame = oldAnnotations.length == params.annotations.length;
                if (isTheSame) {
                    for (var i = 0; i < params.annotations.length; i++) {
                        if (oldAnnotations[i] != params.annotations[i]) {
                            isTheSame = false;
                            break;
                        }
                    }
                }
                if (api.cache.hidden || !isTheSame) {
                    api.disable(false);
                    // console.log(params.annotations);
                    _this.setTooltipContent(params.annotations);
                    api.cache.origin = params.triggerEvent;
                    api.reposition(params.triggerEvent, true);
                    api.show(params.triggerEvent);
                    api.cache.annotations = params.annotations;
                    api.cache.hidden = false;
                    _this.removeAllEvents();
                    _this.addViewerEvents(api,api.cache.params);
                }
            }
        },

        setTooltipContent: function(annotations) {
            var _this = this;
            var api = window.jQuery(this.targetElement).qtip('api');
            if (api) {
                api.set({'content.text': this.getViewerContent(annotations)});
                _this.eventEmitter.publish('tooltipViewerSet.' + this.windowId);
                var display = api.tooltip;
                if (display) {
                    Hxighlighter.publishEvent('displayShown', '', [display, annotations]);
                    Hxighlighter.publishEvent('tryLazyLoad', '', ['.all-annotations']);

                }

            }
        },

        getViewerContent: function(annotations_unsorted) {
            var self = this;
            var annoText,
                tags = [],
                htmlAnnotations = [],
                id;
            var annotations = annotations_unsorted.sort(function(ann1, ann2) {
                if (ann1 < ann2) {
                    return -1;
                } else if (ann1 > ann2) {
                    return 1;
                }

                return 0;
            })
            window.jQuery.each(annotations, function(index, annotation) {
                tags = [];
                if (window.jQuery.isArray(annotation.resource)) {
                    window.jQuery.each(annotation.resource, function(index, value) {
                        if (value['@type'] === "oa:Tag") {
                            tags.push(value.chars);
                        } else {
                            annoText = value.chars;
                        }
                    });
                } else {
                    annoText = annotation.resource.chars;
                }
                var username = "";
                if (annotation.annotatedBy && annotation.annotatedBy.name) {
                    username = annotation.annotatedBy.name;
                }

                var userId = "";
                if (annotation.annotatedBy && annotation.annotatedBy["@id"]) {
                    userId = annotation.annotatedBy["@id"];
                }

                var date = "";
                if (annotation.annotatedAt) {
                    date = annotation.annotatedAt;
                }

                //if it is a manifest annotation, don't allow editing or deletion
                //otherwise, check annotation in endpoint
                var showUpdate = false;
                if (annotation.endpoint !== 'manifest') {
                    showUpdate = annotation.endpoint.userAuthorize('update', annotation);
                }
                var showDelete = false;
                if (annotation.endpoint !== 'manifest') {
                    showDelete = annotation.endpoint.userAuthorize('delete', annotation);
                }

                var common_name = username;
                if (annotation.endnpoint !== 'manifest') {
                    common_name = annotation.endpoint.common_name;
                }

                var instructors = [];
                if (annotation.endpoint !== 'manifest') {
                    instructors = annotation.endpoint.instructors;
                    if (instructors.indexOf(userId) > -1) {
                        username = common_name + '&nbsp;<span class="fa fa-certificate fa-fw"></span>';
                    }
                }
                var catchAnn= annotation.endpoint.annotationsListCatch.find(function(x) {
                    return annotation['@id'] === x.id; 
                })

                var thumb = catchAnn.thumbnail;
                var svg = catchAnn.svg;

                htmlAnnotations.push({
                    annoText : $.sanitizeHtml(annoText),
                    tags : tags,
                    id : annotation['@id'],
                    username : username,
                    userId: userId,
                    date: date,
                    showUpdate : showUpdate,
                    showDelete : showDelete,
                    thumb: thumb,
                    svg: svg
                });
            });

            var template = this.viewerTemplate({
                annotations : htmlAnnotations,
                windowId : this.windowId
            });
            return template;
            //return combination of all of them
        },

        freezeQtip: function(api, oaAnno, viewerParams) {
            var _this = this;
            if (this.inEditOrCreateMode) { throw 'HxighlighterToolTip already in edit mode'; }
            this.inEditOrCreateMode = true;
            _this.eventEmitter.publish('disableRectTool.' + this.windowId);
            var editorContainer = this.editorTemplate({
                id: window.jQuery.isEmptyObject(oaAnno) ? "" : oaAnno['@id'],
                windowId: this.windowId
            });
            api.set({
                'content.text': editorContainer,
                'hide.event': false
            });
            //add rich text editor
            this.activeEditor = new this.editor(
                window.jQuery.extend({}, this.editorOptions, {
                    annotation: oaAnno,
                    windowId: this.windowId
                }));
            this.activeEditor.show('form#annotation-editor-'+this.windowId);
            _this.eventEmitter.publish('annotationEditorAvailable.' + this.windowId);
            window.jQuery(api.elements.tooltip).removeClass("qtip-viewer");
            api.elements.tooltip.draggable();
            if (viewerParams.onEnterEditMode) {
                viewerParams.onEnterEditMode(api, oaAnno);
            }
        },

        unFreezeQtip: function(api, oaAnno, viewerParams) {
            var _this = this;
            if (!this.inEditOrCreateMode) { throw 'HxighlighterToolTip not in edit mode'; }
            this.inEditOrCreateMode = false;
            _this.eventEmitter.publish('enableRectTool.' + this.windowId);
            api.set({
                'content.text': this.getViewerContent([oaAnno]),
                'hide.event': 'mouseleave'
            }).hide();
            window.jQuery(api.elements.tooltip).addClass("qtip-viewer");
            if (viewerParams.onExitEditMode) {
                viewerParams.onExitEditMode(api, oaAnno);
            }
        },

        //when this is being used to edit an existing annotation, insert them into the inputs
        editorTemplate: $.Handlebars.compile([
            '<form id="annotation-editor-{{windowId}}" class="annotation-editor annotation-tooltip" {{#if id}}data-anno-id="{{id}}"{{/if}}>',
            '<div>',
            // need to add a delete, if permissions allow
            '<div class="button-container">',
            '<a href="#cancel" class="cancel"><i class="fa fa-times-circle-o fa-fw"></i>{{t "cancel"}}</a>',
            '<a href="#save" class="save"><i class="fa fa-database fa-fw"></i>{{t "save"}}</a>',
            '</div>',
            '</div>',
            '</form>'
        ].join('')),

        viewerTemplate: $.Handlebars.compile([
            '<div class="annotation-viewer">',
            '<nav class="annotation-viewer-nav-bar"></nav>',
            '<div class="plugin-area-top"></div>',
            '<div class="all-annotations" id="annotation-viewer-{{windowId}}">',
            '{{#each annotations}}',
            '<div class="annotation-display annotation-tooltip ann-item item-{{id}}" data-anno-id="{{id}}">',
            '<div class="text-viewer">',
            '{{#if username}}<p class="user annotation-username">{{{username}}}</p>{{/if}}',
            '{{#if date}}<p class="annotation-date" title="{{date}}">{{convertTime date}}</p>{{/if}}',
            '<div class="button-container">',
                '{{#if showUpdate}}<a href="#edit" class="edit"><i class="fa fa-pencil-square-o fa-fw"></i>{{t "edit"}}</a>{{/if}}',
                '{{#if showDelete}}<a href="#delete" class="delete"><i class="fa fa-trash-o fa-fw"></i>{{t "delete"}}</a>{{/if}}',
            '</div>',
            '<div style="text-align: center;"><img style="display: none;" class="annotation-thumbnail" data-src="{{{thumb}}}" data-svg=".thumbnail-{{{id}}}" alt="Thumbnail Preview" />{{{svg}}}</div>',
            '<p>{{{annoText}}}</p>',
            '</div>',
            '<div id="tags-viewer-{{windowId}}" class="annotation-tags tags-viewer">',
            '{{#each tags}}',
            '<span class="annotation-tag tag">{{this}}</span>',
            
            '{{/each}}',
            '</div>',
            '<div class="plugin-area-bottom"></div>',
            '</div>',
            '{{/each}}',
            '</div>',
            '</div>'
        ].join(''))
    };

}(Mirador));