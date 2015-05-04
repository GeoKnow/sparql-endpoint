window.geoknow || (window.geoknow = {
    // noop
});

geoknow.Query = Backbone.Model.extend({
    // Define prototype (instance) properties
    
    debug: _.bind(window.console.debug, window.console, '[geoknow.Query] '),
  
    error: _.bind(window.console.error, window.console, '[geoknow.Query] '),

    defaults: function() 
    {
        var cls = this.constructor
        
        return {
            query: '',
            result: null,
            resultFormat: cls.service.defaults.resultFormat,
            resultMetadata: null,
            state: 'idle',
            graphUri: cls.service.defaults.graphUri,
            timeout: cls.limits.timeout,
            limit: cls.limits.resultSize,
            timeTaken: null, 
        }
    },

    initialize: function(attrs)
    {
        // Will be loaded from this.defaults()
        return;
    },
    
    validate: function(attrs)
    {
        if (!_(attrs.query).isString() || attrs.query.length == 0) {
            return 'empty query';
        }

        return 0;
    },
    
    sendQuery: function() 
    {
        var cls = this.constructor
        
        // Reset result-related attributes

        var t0 = new Date();

        this.set('result', null, { silent: true });
        this.set('resultMetadata', {
            request: {
                startedAt: t0,
                finishedAt: null,
                statusMessage: null,
            },
            errorMessage: null,
        }, { silent: true });
 
        // Perform query and attach callbacks

        var jqxhr = $.ajax({
            url: cls.service.url,
            type: 'POST',
            data: {
                'graph_uri': this.get('graphUri'),
                'result_format': this.get('resultFormat'),
                'query': this.get('query'),
            },
            timeout: cls.limits.timeout, /* millis */
        });
        
        jqxhr.done(_.bind(this.handleSuccess, this));

        jqxhr.fail(_.bind(this.handleFailure, this));

        jqxhr.always(_.bind(this.handleComplete, this));
        
        this.set('state', 'waiting');
        
        return jqxhr;
    },

    handleSuccess: function(data, statusText, jqxhr)
    { 
        this.debug('Successfully ran query: ' + statusText); 

        this.set('result', data);
    },

    handleFailure: function(jqxhr, statusText)
    {
        var metadata = this.get('resultMetadata');
        
        if (jqxhr.responseText) { 
            // Received a response
            metadata.errorMessage = jqxhr.responseText;
        } else {
            // No response, probably a timeout
            if (statusText == 'timeout') {
                var timeout_seconds = this.constructor.limits.timeout / 1e3
                metadata.errorMessage = 'Timeout was exceeded (' + 
                    (timeout_seconds).toFixed(0) + ' seconds)';
            } else {
                metadata.errorMessage = 'No response'; 
            }
        }

        this.error('Failed to run query: ' + statusText);
    },

    handleComplete: function(data, statusText)
    {
        var metadata = this.get('resultMetadata');

        metadata.request.finishedAt = new Date();
        metadata.request.statusMessage = statusText;
        
        this.set('state', 'idle');
    },

    dumps: function(indent) 
    {
        return JSON.stringify(this.toJSON(), null, parseInt(indent));
    },
}, {
    // Define class properties
    
    queryTypes: {
        'select': {
            value: 'SELECT',
            description: 'A SELECT query returns a set of rows',
            allowedFormats: [
                'application/json', 'text/html', 'text/csv', 'application/vnd.ms-excel',
                'application/xml', 'text/tab-separated-values',
            ],
        },
        'construct': {
            value: 'CONSTRUCT',
            description: 'A CONSTRUCT query returns a set of RDF triples',
            allowedFormats: [
                'application/n-triples', 'application/rdf+xml', 'application/sparql-results+xml'
            ],
        },
        'ask': {
            value: 'ASK',
            // Not supported //
        },
        'describe': {
            value: 'DESCRIBE',
            // Not supported //
        },
    },

    limits: {
        resultSize: 100,
        timeout: 20e3, /* millis */
    },
   
    service: { 
        defaults: {
            graphUri: 'urn:x-geoknow-eu:sparql:virtuoso:metadata:inspire',
            resultFormat: 'text/html',
        },
        url: 'api-proxy.php',
        configUrl: 'get-config.php',
    },

    config: null, /* loaded dynamically */

    initialize: function()
    {
        var promise = this.requestConfig();
        return promise;
    },
    
    requestConfig: function()
    {
        var cls = this
        var jqxhr = $.getJSON(cls.service.configUrl);
        
        jqxhr.done(function (data, statusText) {
            console.debug('Loading configuration from ' + cls.service.configUrl)
            cls.config = data
        })
        
        jqxhr.fail(function() {
            console.error('Failed to load configuration from ' + cls.service.configUrl);
        })

        return jqxhr;
    },

    getGraphConfig: function(uri)
    { 
        return this.config.graphs[uri];
    },
    
    findApplicableFormats: function(uri, query)
    {
        var cls = this
        
        // Find all applicable result formats for current (graph-uri, query)
         
        var query_type = cls.detectType(query);

        var applicable_formats = null;
       
        if (query_type) {
            applicable_formats = _.intersection(
                cls.config.graphs[uri].resultFormats,
                cls.queryTypes[query_type].allowedFormats    
            )
        } else {
            applicable_formats = cls.config.graphs[uri].resultFormats
        }

        return applicable_formats;
    },
    
    detectType: function(query)
    {
        var cls = this;

        // Map query to one of the basic types listed in cls.queryTypes.
        // Return undefined if unable to detect it or if no query is supplied (yet).
 
        if (!query) {
            return undefined;
        }

        var re_prefix = /PREFIX[\s]*[-a-z]+:[\s]*<[^\s]+>$/mig;
        
        //// Todo: parse the whole SELECT/CONSTRUCT clause 
        //var re_select_clause = /^SELECT[\s]+((DISTINCT|REDUCED)[\s]+)?([\?\$][a-z][_a-z0-9]*)\b/i 
        //var re_construct_clause = /^CONSTRUCT[\s]+\{[^\{]+\}/i 

        var q = query.replace(re_prefix, "").trim();

        if (q.match(/SELECT\b/i)) {
            return 'select';
        } else if (q.match(/CONSTRUCT\b/i)) {
            return 'construct';
        }

        return undefined;
    },

});

geoknow.QueryHistory = Backbone.Collection.extend({
    // Define prototype (instance) properties
    
    // Todo

    model: geoknow.Query,
}, {
    // Define class properties
});

geoknow.QueryFormView = Backbone.View.extend({
    // Define instance properties/methods

    debug: _.bind(window.console.debug, window.console, '[geoknow.QueryFormView] '),
  
    error: _.bind(window.console.error, window.console, '[geoknow.QueryFormView] '),
    
    spinner: null,

    editor: null,

    events: function()
    {
        this.debug('Finished setup of delegated events')
        
        return {
            "change  #input-query"                   : this.updateQuery,
            "change  #input-graph_uri"               : this.updateGraphUri,
            "change  #input-result_format"           : this.updateResultFormat,
            "click   #input-submit-preview"          : this.handlePreview,
            "click   #input-submit-download"         : this.handleDownload,
            "click   #input-reset"                   : this.handleReset,
            "click   #input-load_example_query"      : this.handleLoadExample,
            "click   a#example_query-control-toggle" : this.handleToggleExample,
        };    
    },
    
    initialize: function() 
    {
        var m = this.model
        
        this._buildForm();

        // Subscribe to events
        
        this.listenTo(m, "change:query change:resultFormat change:graphUri", this._renderForm);
        this.listenTo(m, "change:state", this._renderSpinner);

        // Render

        this.render();
     
        this.debug('Initialized')
        
        return;
    },
   
    _populateSelect: function(id, options)
    {
        var $select = this.$el.find('select#' + id);
        $select.empty();
        _.each(options, function (opt) {
            var $opt = $('<option>').attr('value', opt.value);
            $opt.text(opt.description);
            $opt.appendTo($select);
        });
    },
    
    _populateGroupedSelect: function(id, options)
    {
        var $select = this.$el.find('select#' + id);
        $select.empty();
        _.each(_(options).groupBy('group'), function(grp, grp_name) {
            var $optgroup = $('<optgroup>').attr('label', grp_name);
            _.each(grp, function(opt) {
                var $opt = $('<option>').attr('value', opt.value);
                $opt.text(opt.description);
                $opt.appendTo($optgroup);
            })
            $optgroup.appendTo($select);
        })
    },

    _createSpinner: function()
    {
        this.spinner = new Spinner({
            lines: 10,          // The number of lines to draw
            length: 20,         // The length of each line
            width: 8,           // The line thickness
            radius: 30,         // The radius of the inner circle
            corners: 1,         // Corner roundness (0..1)
            rotate: 0,          // The rotation offset
            direction: 1,       // 1: clockwise, -1: counterclockwise
            color: '#000',      // #rgb or #rrggbb or array of colors
            speed: 1,           // Rounds per second
            trail: 60,          // Afterglow percentage
            shadow: false,      // Whether to render a shadow
            hwaccel: false,     // Whether to use hardware acceleration
            className: 'spinner', // The CSS class to assign to the spinner
            zIndex: 2e+9,       // The z-index (defaults to 2000000000)
            top: '40%',         // Top position relative to parent in px
            left: '50%'         // Left position relative to parent in px
        });
    },
    
    _toggleExample: function ()
    {  
        var $btn = this.$el.find('a#example_query-control-toggle') 
        var $control = this.$el.find('#example_query-form-group')
        var state = $btn.data('state')
        
        if (state == null || state == 'open') {
            $control.hide((state == null)? (0):(400))
            $btn.text('Open examples')
            state = 'closed'
        } else {
            $control.show(400)
            $btn.text('Close examples')
            state = 'open'
        }
        $btn.data('state', state)
        
        return;
    },

    _createEditor: function()
    {
        var view = this; 
        var $editor = this.$el.find('#query-editor');
       
        // Todo: maybe use CodeMirror.fromTextArea ?

        this.editor = new CodeMirror($editor.get(0), {
            value: "",
            mode:  "sparql",
            styleActiveLine: true,
            lineNumbers: true,
            placeholder: 'Paste your SPARQL query here ...',
        });
        
        this.editor.on('blur', function (editor) {
            var $input = view.$el.find('#input-query');
            $input.val(editor.getValue());
            $input.trigger('change');
        });

        return;
    },

    _buildForm: function ()
    {
        var config = this.constructor.config
        var m = this.model
        var graphs_config = m.constructor.config.graphs;
        var target_uris = null;

        this.$el.find('form')
            .attr('action', m.constructor.service.url) 
            .attr('method', 'POST')
        
        target_uris = _(graphs_config).map(function (v, k) {
            return { value: k, description: v.name, group: v.groupName };
        });

        this._populateGroupedSelect('input-graph_uri', target_uris);
        
        this._createEditor();
        
        this._populateSelect('input-example_query', []);

        this._populateSelect('input-result_format', config.resultFormats);
       
        this._createSpinner();
        
        this._toggleExample();

        return;
    },

    render: function() 
    {
        this._renderForm();

        this._renderSpinner();

        this.$el.fadeIn();

        return;
    },

    _renderForm: function(ev)
    {
        var F = this.constructor
        var Q = this.model.constructor 

        var uri = this.model.get('graphUri');
        var query = this.model.get('query');
        var format = this.model.get('resultFormat');
        var graph_config = Q.getGraphConfig(uri);
        var applicable_formats = Q.findApplicableFormats(uri, query)

        // Assign input values
               
        this.$el.find('#input-graph_uri').val(uri);
        this.$el.find('#input-query').val(query);
        
        this._populateSelect('input-result_format', _(F.config.resultFormats).filter(function(v) {
            return !(applicable_formats.indexOf(v.value) < 0)  
        }));
        this.$el.find('#input-result_format').val(format);

        // Fill SPARQL code editor

        this.editor.setValue(query);

        // Decide if format can support a preview/download
        
        var $btn_download = this.$el.find('#input-submit-download');
        var $btn_preview = this.$el.find('#input-submit-preview');
        
        if (_(format).isUndefined()) {
            // This is because no applicable formats exist
            $btn_download.attr('disabled', 'disabled')
            $btn_preview.attr('disabled', 'disabled')
            this.error("There is no format applicable to your query!") 
        } else {
            var spec = _(F.config.resultFormats).findWhere({ value: format });
            if (_(spec).isUndefined()) {
                this.error('Encountered an unknown result-format: ' + format);
            } else {
                $btn_download.attr('disabled', null)
                $btn_preview.attr('disabled', (spec.preview)? (null):('disabled'));            
            }
        }
   
        // Populate examples (at 1st time or when graph-uri has changed) 
        
        if (_(ev).isUndefined() || ('graphUri' in (this.model.changedAttributes() || {}))) {
            this._populateSelect('input-example_query', _(graph_config.examples).map(function(v) {
                return { 
                    value: 'examples/' + uri + '/' + v.file, 
                    description: v.description 
                };
            }));
        }

        return;
    },

    _renderSpinner: function()
    {
        var spinner = this.spinner;
        var timer = $(spinner).data('start-timer');
        if (this.model.get('state') == 'waiting') {
            // Create a spinner only if there is not a pending one
            if (_.isUndefined(timer)) {
                timer = window.setTimeout(function() { 
                    $(spinner).removeData('start-timer');
                    spinner.spin($('body').get(0));
                }, 400);
                $(spinner).data('start-timer', timer)
            }
        } else {
            // Stop spinner, cancel task if there is a pending one
            if (_.isNumber(timer)) {
                window.clearTimeout(timer);
                $(spinner).removeData('start-timer');
            }
            spinner.stop();
        }

        return;
    },

    updateQuery: function (ev) 
    {
        var uri = this.model.get('graphUri')
        var query = $(ev.target).val()
        var format = this.model.get('resultFormat')
        
        this.debug('The input query was updated by the user')

        // Find applicable result formats, sanitize format if needed
        // Note: The current format may not be applicable to the combination (graph-uri, query).
        // In this case, we should also update the format.

        var applicable_formats = this.model.constructor.findApplicableFormats(uri, query)
        
        if (applicable_formats.indexOf(format) < 0) {
            format = _(applicable_formats).first();
            this.model.set({
                query: query,
                resultFormat: format,
            })
        } else {
            this.model.set('query', query)
        }  

        return true;
    },
    
    updateResultFormat: function (ev) 
    {
        var val = $(ev.target).val()
          
        this.model.set('resultFormat', val)
        
        return true;
    },
    
    updateGraphUri: function (ev) 
    {
        var uri = $(ev.target).val();

        var graph_config = this.model.constructor.getGraphConfig(uri);
        
        this.model.set({
            graphUri: uri,
            query: '',
            resultFormat: _(graph_config.resultFormats).first(),
        })
        
        return true;
    },

    handlePreview: function(ev)
    {  
        if (this.model.isValid()) {
            this.model.sendQuery()
        } else {
            alert ('The query is invalid (' + this.model.validationError + ')');
        }

        return false;
    },

    handleDownload: function(ev)
    {  
        if (this.model.isValid()) {
            this.model.set('result', null); /* as of issue #3 */
            var $form = this.$el.find('form');
            $form.find('#input-op').val('download');
            $form.submit();
        } else {
            alert ('The query is invalid (' + this.model.validationError + ')');
        }

        return false;
    },
    
    handleReset: function(ev)
    {  
        this.model.set(this.model.defaults());
        
        return false;
    },
    
    handleLoadExample: function(ev)
    {  
        var view = this
        var resource_url = this.$el.find("#input-example_query").val()
        
        $.get(resource_url)
            .done(function (data) {
                view.debug('Loading query textarea (' + data.length + ' chars)')
                view.$el.find('#input-query').val(data).trigger('change') 
            })
            .fail(function() {
                view.error('Failed to load resource: ' + resource_url);
            })

        return false;
    },
    
    handleToggleExample: function(ev)
    {
        this._toggleExample();
        return false;
    },

}, {
    // Define class properties/methods
    
    config: {
        resultFormats: [
            { value: 'application/json', description: 'JSON', preview: true, }, 
            { value: 'text/html', description: 'HTML', preview: true, }, 
            { value: 'text/csv', description: 'CSV', preview: false }, /* Todo: must be previewable */ 
            { value: 'application/vnd.ms-excel', description: 'Excel Spreadsheet', preview: false, }, 
            { value: 'application/xml', description: 'XML', preview: false, }, 
            { value: 'application/n-triples', description: 'NTriples', preview: false, }, 
            { value: 'application/rdf+xml', description: 'RDF/XML', preview: false, }, 
            { value: 'application/sparql-results+xml', description: 'SPARQL Results (XML)', preview: false, }, 
            { value: 'text/tab-separated-values', description: 'TSV', preview: false, }, /* Todo: same as CSV */ 
        ],
    },     
});

geoknow.QueryResultView = Backbone.View.extend({
    // Define instance properties/methods
    
    debug: _.bind(window.console.debug, window.console, '[geoknow.QueryResultView] '),
  
    error: _.bind(window.console.error, window.console, '[geoknow.QueryResultView] '),

    editor: null, /* for creating (readonly) previews for code snippets */

    // OpenLayers Map
    map: null,
    mapInited: false,
    
    geoContext: null,
    
    geoLayer: null,
    
    geoStyle: null,
    
    wktFormatter: null,
    
    projections: {
        WGS84: new OpenLayers.Projection("EPSG:4326")
        //Greek Proj
    },
    
    templates: {
        caption: null,
        heading: null,
        emptyBody: null,
        errorCaption: null,
        errorHeading: null,
    },

    events: function()
    {
        this.debug('Finished setup of delegated events')
        
        return {
            "click   #results-nav-bar-table" : this.previewOnTable,
            "click   #results-nav-bar-map" : this.previewOnMap,
        };    
    },
    
    previewOnTable: function()
    {
        this.$el.find('#results-nav-bar-table').addClass('active');
        this.$el.find('#results-nav-bar-map').removeClass('active');
        this.$el.find('#results-body').show();
        this.$el.find('#results-map').hide();
        return false;
    },
    
    previewOnMap: function()
    {
        this.$el.find('#results-map').show();
        this.$el.find('#results-body').hide();
        
        if ( !this.isMapInitialized() ) {        
            this.initializeMap();
        }
        this.$el.find('#results-nav-bar-map').addClass('active');
        this.$el.find('#results-nav-bar-table').removeClass('active');
        return false;
    },
    
    isMapInitialized: function() {
        return this.mapInited;
    },
    
    // Initialize map
    initializeMap: function() {
        this.map = new OpenLayers.Map('results-map', {maxResolution: 1000});
        var wms = new OpenLayers.Layer.WMS("OpenLayers WMS",
                "http://vmap0.tiles.osgeo.org/wms/vmap0", {zoom: 100, layers: 'basic'});
                var OSMLayer = new OpenLayers.Layer.OSM("OSM");
                OSMLayer.sphericalMercator = true;
        this.map.addLayer(OSMLayer);
        
        //this.map.addLayer(wms);
        this.map.zoomToMaxExtent();

        this.geoContext = {
            getGeom: function (feature) {
                return feature.attributes.geom;
            }
        };
        
        this.geoStyle = new OpenLayers.Style({
            strokeColor: "blue",
            strokeWidth: 1,
            pointRadius: 1,
            cursor: "pointer",
            fillColor: "blue",
            fillOpacity: 0.5,
            title: "${getGeom}"
        }, {context: this.geoContext
        });
        
        alert('reached 2');
        this.geoLayer = new OpenLayers.Layer.Vector(
            'Preview Layer', { 
                isBaseLayer: false,
                styleMap: new OpenLayers.StyleMap(this.geoStyle)
            });        
            
        this.map.addLayer(this.geoLayer);
        
        this.wktFormatter = new OpenLayers.Format.WKT();
        
        /* DEBUG geom
        var polygonFeatureW = this.wktFormatter.read("POLYGON((20.000001 37.000001, 20.000001 39.000001, 22.000001 39.000001, 22.000001 37.000001, 20.000001 37.000001))");
        polygonFeatureW.attributes = {'geom': 'tomaras'};
        polygonFeatureW.geometry.transform(this.projections.WGS84, this.map.getProjectionObject());
        this.geoLayer.addFeatures([polygonFeatureW]);
        */
       
        this.editor = null;
        
        this.mapInited = true;
    },
    
    initialize: function()
    {        
        // Initialize templates
        
        this.templates.heading = _.template($('#results-success-heading-template').html());
        
        this.templates.caption = _.template($('#results-success-caption-template').html());
        
        this.templates.emptyBody = _.template('<p><em>Nothing yet</em></p>');
        
        this.templates.errorHeading = _.template($('#results-error-heading-template').html());
        
        this.templates.errorCaption = _.template($('#results-error-caption-template').html());

        this._empty(null);

        // Hide map DIV
        
        this.$el.find('#results-map').hide();
        
        // Subscribe to events

        this.listenTo(this.model, "change:state change:result", this.render);        
        
        this.debug('Initialized')
    },

    _empty: function(errmsg)
    {
        if (_.isNull(errmsg)) {
            // empty result, but not an error
            this.$el.find('#results-pane-heading .summary').text('');
            this.$el.find('#results-caption').html(this.templates.emptyBody());
        } else {
            // empty result caused by a previous error
            this.$el.find('#results-pane-heading .summary').html(this.templates.errorHeading());
            this.$el.find('#results-caption').html(this.templates.errorCaption({
                message: errmsg,
            }));
        }

        this.$el.find('#results-body').empty();
        
        return;
    },

    render: function()
    {         
        var m = this.model;
        
        // Proceed only if model has entered idle state
        
        if (m.get('state') != 'idle') {
            
            return;
        }
       
        // Check if result is empty, display errors (if any)

        var r = m.get('result');
        if (_.isUndefined(r) || _.isNull(r) || _.isEmpty(r)) {
            var metadata = m.get('resultMetadata');
            this._empty(_.isNull(metadata)? (null):(metadata.errorMessage));
            return;
        }

        // Generate a preview on model's current result

        this._empty(null);
        
        this._preview();
        
        this.debug('Redrawn');

        return;
    },
 
    _preview: function()
    {
        var m = this.model
       
        //this.debug('_preview(): state=' + m.get('state'));

        // Delegate to the proper previewer    
        
        switch (m.get('resultFormat')) {
        case 'application/json':
            this._previewFromObject();
            break;
        case 'text/html':
            this._previewFromHtmlMarkup();
            break;
        case 'text/xml':
        case 'application/xml':
            this._previewFromXmlMarkup();
            break;
        case 'text/csv':
            this._previewFromCsv();
            break;
        case 'text/tab-separated-values':
            this._previewFromTsv();
            break;
        default:
            alert ('No available preview for ' + m.get('resultFormat') + ' results.')
            break;
        }

        return;
    },

    _previewFromObject: function()
    {
        var cls = this.constructor
        var m = this.model
        
        var result = m.get('result')
        var format = m.get('resultFormat')
        var metadata = m.get('resultMetadata')
        
        // Validate result's structure

        if (!_.isObject(result.results) || !_.isArray(result.results.bindings)) {
            this.error('The result is malformed: object has unexpected structure');
            alert ('The result is malformed and cannot be previewed.')
            return;
        }
        
        // Render 

        var size = result.results.bindings.length
        var size_displayed = Math.min(size, cls.limits.resultSize);
        var time_taken = Math.abs(metadata.request.finishedAt - metadata.request.startedAt);

        this.$el.find('#results-pane-heading .summary').html(this.templates.heading({
           count: size_displayed, 
           countTotal: size, /* Todo: provide the actual result size? (if known) */
        }));
        
        this.$el.find('#results-caption').html(this.templates.caption({
            count: size_displayed,
            format: format,
            timeTaken: Number(time_taken / 1e3).toPrecision(1),
        }));
        
        var r = result.results.bindings.slice(0, size_displayed);
        var json_dump = JSON.stringify(r, null, 4);
        
        var $editor = $("<div>").attr('id', 'results-editor');
        this.$el.find("#results-body").append($editor);
        this.editor = new CodeMirror($editor.get(0), {
            value: json_dump,
            mode: 'javascript',
            readOnly: true,
            lineNumbers: true,
        });
        
        return;
    },

    supportedWKTs: ["POLYGON","POINT","LINESTRING",
                     "MULTIPOLYGON","MULTIPOINT","MULTILINESTRING",
                     "GEOMETRYCOLLECTION", "BOX2D"],
                
    // Checks value of a cell for supported geometric types
    _containsGeometryType: function(value) {
        for (var i = 0; i < this.supportedWKTs.length; i++) {
            if ( value.search(this.supportedWKTs[i]) > -1 ) {
                alert(value);
                return true;
            }
        }
        return false;
    },
    
    _previewGeometryOnMap: function(geom) {
        if ( !this.isMapInitialized() ) {        
            this.initializeMap();
        }
    },
    
    _previewFromHtmlMarkup: function()
    {
        var cls = this.constructor
        var m = this.model
        
        var result = m.get('result')
        var format = m.get('resultFormat')
        var metadata = m.get('resultMetadata')

        this.debug('Creating preview from HTML ...')
        
        // Validate result's structure
        
        if (!_.isString(result)) {
            this.error('The result is malformed: expected a plain string');
            alert ('The result is malformed and cannot be previewed.')
            return;
        }
         
        var $table = $(result);
        if (!($table.length == 1) || !($table.is('table'))) {
            this.error('The result is malformed: cannot parse an HTML table'); 
            alert ('The result is malformed and cannot be previewed.')
            return;
        }
        var rows = $table.find("tr");
        var parentRef = this;
        var geometryIndexes = [];
        if ( rows.length > 1) {
            $cells = $(rows[1].cells);
            $cells.each(function (i, td) {
                var $td = $(td);
                var value = $td.html();
                if ( parentRef._containsGeometryType(value) ) {
                    geometryIndexes[geometryIndexes.length] = i;
                }
            });
            alert(geometryIndexes);
            var $geometryIndexes = $(geometryIndexes);
            for (var index = 1; index < rows.length; index++) {
                var cells = rows[index].cells;
                $geometryIndexes.each(function (i, cellIndex) {
                    var $td = $(cells[cellIndex]);
                    var value = $td.html();
                    alert("Cell "+index+" "+value);
                });                
            }
        }
        
        // Render 
        
        var size = $table.find("tr td:first-child").length;
        var size_displayed = Math.min(size, cls.limits.resultSize);
        var time_taken = Math.abs(metadata.request.finishedAt - metadata.request.startedAt);

        this.$el.find('#results-pane-heading .summary').html(this.templates.heading({
           count: size_displayed, 
           countTotal: size,
        }));
        
        this.$el.find('#results-caption').html(this.templates.caption({
            count: size_displayed,
            format: format,
            timeTaken: Number(time_taken / 1e3).toPrecision(1),
        }));
 
        $table.addClass('table table-bordered');
        $table.attr('border', null);

        $table.find('a').each(function (i,a) { 
            var $a = $(a);
            $a.attr('href', $a.text()); 
        });

        $table.find('td:first-child').parent('tr').slice(size_displayed)
            .remove()
        
        this.$el.find("#results-body").append($table);

        return;
    },
    
    _previewFromXmlMarkup: function()
    {
        var m = this.model
        var result = m.get('result')
        
        this.debug('Creating preview from XML ...')
        
        // Todo
        alert ('This preview is not implemented yet')

        return;
    },
    
    _previewFromCsv: function()
    {
        var m = this.model
        var result = m.get('result')
        
        this.debug('Creating preview from CSV ...')
        
        // Todo
        alert ('This preview is not implemented yet')

        return;
    },
    
    _previewFromTsv: function()
    {
        var m = this.model
        var result = m.get('result')
        
        this.debug('Creating preview from TSV ...')
        
        // Todo
        alert ('This preview is not implemented yet')
        
        return;
    },

}, {
    // Define class properties/methods
    
    limits: {
        resultSize: 12, /* how many results are displayed in previews ? */ 
    },
});


