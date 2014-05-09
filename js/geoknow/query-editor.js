window.geoknow || (window.geoknow = {
    // noop
});

_.templateSettings = {
   interpolate : /\{\{(.+?)\}\}/g
};

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
            timeout: 5e3, /* millis */
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
        
        metadata.errorMessage = jqxhr.responseText;

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
    
    limits: {
        resultSize: 100,
        timeout: 5,
    },
   
    service: { 
        defaults: {
            graphUri: 'urn:x-geoknow-eu:sparql:virtuoso:metadata:inspire',
            resultFormat: 'application/json',
        },
        url: 'api-proxy.php',
        configUrl: 'get-config.php',
    },

    config: null,

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
});

geoknow.QueryHistory = Backbone.Collection.extend({
    // Define prototype (instance) properties
    
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

        this.debug('Creating CodeMirror editor ...')
       
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

    _renderForm: function()
    {
        var cls = this.constructor
        var m = this.model
        
        var uri = m.get('graphUri');
        var query = m.get('query');
        var format = m.get('resultFormat');

        var graph_config = m.constructor.config.graphs[uri];
        
        // Populate basic inputs
        
        this.$el.find('#input-graph_uri').val(uri);
        this.$el.find('#input-query').val(query);
        
        this._populateSelect('input-example_query', _(graph_config.examples).map(function(v) {
            return { 
                value: 'examples/' + uri + '/' + v.file, 
                description: v.description 
            };
        }));

        this._populateSelect('input-result_format', _(cls.config.resultFormats).filter(function(v) {
            return !(graph_config.resultFormats.indexOf(v.value) < 0); 
        }));
      
        this.$el.find('#input-result_format').val(format);
        
        // Fill SPARQL code editor

        this.editor.setValue(query);

        // Decide if result can support a preview
        
        var spec = _(cls.config.resultFormats).findWhere({ value: format });
        if (_(spec).isUndefined()) {
            this.error('Unknown resultFormat: ' + format);
        }
        
        var $btn = this.$el.find('#input-submit-preview');
        $btn.attr('disabled', (spec.preview)? (null):('disabled'));         
        
        return;
    },

    _renderSpinner: function()
    {
        var m = this.model
        
        //this.debug('_renderSpinner(): state = '+ m.get('state') +' ...');
        
        var spinner = this.spinner;
        var timer = $(spinner).data('start-timer');
        if (m.get('state') == 'waiting') {
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
        var val = $(ev.target).val()
        
        // Todo: sanitize val
        
        this.model.set('query', val)

        return false;
    },
    
    updateResultFormat: function (ev) 
    {
        var val = $(ev.target).val()
          
        this.model.set('resultFormat', val)
        
        return false;
    },
    
    updateGraphUri: function (ev) 
    {
        var m = this.model;
        var uri = $(ev.target).val();

        var graph_config = m.constructor.config.graphs[uri];
        
        m.set({
            graphUri: uri,
            query: '',
            resultFormat: _(graph_config.resultFormats).first(),
        })
        
        return false;
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
        var $form = this.$el.find('form');

        $form.find('#input-op').val('download');
        
        $form.submit();

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
                view.model.set('query', data)
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
            { value: 'text/csv', description: 'CSV', preview: true }, 
            { value: 'application/vnd.ms-excel', description: 'Excel Spreadsheet', preview: false, }, 
            { value: 'application/xml', description: 'XML', preview: false, }, 
            { value: 'application/javascript', description: 'Javascript', preview: false, }, 
            { value: 'text/plain', description: 'NTriples', preview: false, }, 
            { value: 'application/rdf+xml', description: 'RDF/XML', preview: false, }, 
            { value: 'application/sparql-results+xml', description: 'SPARQL Results', preview: false, }, 
            { value: 'text/tab-separated-values', description: 'TSV', preview: true, }, 
        ],
    },     
});

geoknow.QueryResultView = Backbone.View.extend({
    // Define instance properties/methods
    
    debug: _.bind(window.console.debug, window.console, '[geoknow.QueryResultView] '),
  
    error: _.bind(window.console.error, window.console, '[geoknow.QueryResultView] '),

    editor: null, /* for creating (readonly) previews for code snippets */

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
        };    
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

        this.editor = null;
        
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
       
        this.debug('_preview(): state=' + m.get('state'));

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

        this.debug('Creating preview from JSON object ...')
        
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
           countTotal: size, /* Todo: provide the actual result size */
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
            readonly: true,
            lineNumbers: true,
        });
        
        return;
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
        resultSize: 10, /* how many results are displayed in previews ? */ 
    },
});


