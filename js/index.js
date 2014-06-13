window.workspace || (window.workspace = {});

workspace.BaseTabView = Backbone.View.extend({
    // Define instance properties/methods

    isActive: null,

    setActive: function(flag)
    {
        this.isActive = Boolean(flag)
        this.render()
    },

    events: function()
    {
        return {
        };    
    },

    initialize: function()
    {
        this.setActive(false)   
    },

    prepare: function()
    {
        // Derived classes should implement this method if rendering needs a
        // preparation step. In such a case, they should return a Promise
        // object.

        // The default is to return an allready resolved promise. So, any
        // done/then/always callbacks are immediately executed.
        
        var d = $.Deferred().resolve()
        return d.promise();
    },

    render: function()
    {
        if (this.isActive) {
            this.$el.fadeIn()
        } else {
            this.$el.hide() 
        }
    },

    }, {
        // Define class properties/methods
    }
);

workspace.PageTabView = workspace.BaseTabView.extend({
    
    name: null, 

    source: null,

    isLoaded: null,
    
    initialize: function(options)
    {
        workspace.BaseTabView.prototype.initialize.call(this)
        
        this.source = options.source
        this.isLoaded = !(options.source)
        this.name = options.name
    
        return
    },
    
    _promise: null,

    prepare: function()
    {
        var view = this
        
        if (!view.isLoaded) {
            var p = $.get(view.source)
            p.done(function (data) {
                if (view.model) {
                    markup = _.template(data)(view.model.toJSON())
                } else {
                    markup = data
                }
                var $content = $('<div>' + markup + '</div>').addClass('tab')
                view.$el.html($content)
                view.isLoaded = true
                view.$el.fadeIn()
                view.trigger('load')
                console.debug('Loaded content for tab: ' + view.name)
            })
            p.fail(function () {
                console.error('Failed to load content for tab: ' + view.name)
            })
            view._promise = p
            return p;
        } else {
            // this promise should be allready resolved!
            return view._promise
        }
    },
   
});

workspace.CodeTabView = workspace.PageTabView.extend({
    
    initialize: function(options)
    { 
        workspace.PageTabView.prototype.initialize.call(this, options)

        this.on('load', this.prettifyCode, this)

        return
    },

    prettifyCode: function() 
    {
        var view = this     
        
        _(['sparql', 'javascript']).each(function(mode) {
            view.$el.find('pre.code-' + mode).each(function(i, pre) {
                var $pre = $(pre)
                var code = $pre.text()
                var $div = $('<div>').addClass('code code-' + mode)
                var $editor = $('<div>').appendTo($div)
                var editor = new CodeMirror($editor.get(0), {
                    readOnly: true,
                    lineNumbers: true,
                    mode: mode,
                })
                $editor.data('editor', editor)
                $div.insertAfter($pre)
                $pre.remove()
                editor.setValue(code)
            })
        })
        return;
    }
});

workspace.QueryTabView = workspace.BaseTabView.extend({
    
    name: null,
    
    pane1: null,

    pane2: null,

    initialize: function(options)
    {
        workspace.BaseTabView.prototype.initialize.call(this)

        var query = this.model
        
        if (!(query instanceof geoknow.Query)) {
            console.error('Expected an instance of geoknow.Query')
            return
        } 
        
        this.pane1 = new geoknow.QueryFormView({
            model: query,
            el: this.$el.find('#query-pane'),
        });

        this.pane2 = new geoknow.QueryResultView({
            model: query,
            el: this.$el.find('#results-pane'),
        });
        
        this.name = options.name
        
        return
    },
      
});

