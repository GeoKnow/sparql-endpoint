window.Test05 || (window.Test05 = {})

jQuery((function ($,m) {
    m.Storage = function (prefix) {
        this.keyPrefix = prefix + ".";
    }
    m.Storage.prototype.put = function (key, val) {
        key = this.keyPrefix + key;
        return localStorage.setItem (key, JSON.stringify(val));
    }
    m.Storage.prototype.get = function (key) {
        key = this.keyPrefix + key;
        val = localStorage.getItem (key)
        return JSON.parse (val)
    }
    m.Storage.prototype.remove = function (key) { 
        key = this.keyPrefix + key;
        localStorage.removeItem (key)
        return;
    }
    m.Storage.prototype.keys = function () {
        var matching_keys = _.filter (_.keys(localStorage), function (k) {return k.indexOf(this.keyPrefix) == 0}, this);
        return _.map(matching_keys, function (k) {return k.substring (this.keyPrefix.length)}, this);
    }
    m.Storage.prototype.reset = function () {
        var matching_keys = _.filter (_.keys(localStorage), function (k) {return k.indexOf(this.keyPrefix) == 0}, this);
        _.each (matching_keys, function (key) {
            localStorage.removeItem (key)
        })
    }
})(jQuery, window.Test05))

jQuery((function ($,m) {
    var debug  = _.bind (window.console.debug, window.console, '[debug]')  
    var assert = function (test, errmsg) {if (!test) {throw Error (errmsg)}}
    
    _.templateSettings = {
        interpolate : /\{\{(.+?)\}\}/g
    };

    m.generate_uid = function () {
        /* generate a (hopefully) unique id for items on our storage */
        var n0  = Math.pow(36, 4)
        var now = new Date()
        return _.random (n0, n0*36 -1).toString(36) + '-' + now.getTime().toString(10)
    } 

    m.storage = new m.Storage ("test05-backbone.book");
    
    m.Book = Backbone.Model.extend({ 
        //
        // Extend instance (prototyped) properties/methods 
        //
        /** defaults to populate missing attributes */
        defaults: {
            title: null,
            price: .0,
            isbn: "-",
            inStock: false,
        },
        /** 
         * override Backbone.sync default behaviour (restful model api) 
         * i.e. define a persistence strategy */
        sync: function (method, book, options) {
            debug ('Sync-ing to backend: method=<'+method+'> book='+this.dumps())
            
            switch (method) {
            case 'create':
                {
                    var uid = m.generate_uid()
                    this.id = uid
                    m.storage.put (uid, this.toJSON())
                }
                break;
            case 'read':
                {
                    this.set(m.storage.get(this.id))
                }
                break;
            case 'update':
                {
                    m.storage.put (this.id, this.toJSON()) 
                }
                break;
            case 'delete':
                {
                    m.storage.remove (this.id)   
                }
                break;
            default: 
                break;
            }
            
            options.success (this)
            return;    
        }, 
        /** dump attributes as a JSON string */
        dumps: function () {
            return JSON.stringify(this.toJSON())    
        },
    }, {
        //
        // Extend class properties/methods 
        //
        loads: function (dump) {
            return new m.Book(JSON.parse(dump))
        }
    });
    
    m.BookStore = Backbone.Collection.extend({
        //
        // Extend instance properties 
        //
        model: m.Book,
        /** 
         * override Backbone.js default behaviour 
         * applicable only in reads i.e. read an entire collection from (persistant) storage layer */
        sync: function (method, bookstore, options) {
            
            switch (method) {
            case 'read':
                {
                    debug ('Reading entire bookstore from storage ...')
                    /* clear whatever existed */
                    bookstore.reset();
                    /* fetch (i.e read) available books */
                    _.each (m.storage.keys(), function (k) {
                        var book = new m.Book (m.storage.get(k))
                        book.id = k
                        bookstore.add (book)
                    })
                }    
                break;
            case 'delete':
                {
                    debug ('Removing (reset) entire bookstore from storage ...')
                    m.storage.reset();
                }
                break;
            default:
                assert (false, 'Unexpected sync action! ('+method+')')
            }
            return;
        },
    })
    
    m.BookView = Backbone.View.extend({
        tagName:  "tr",
        className: "book",

        /* cache the template function for a single item. */
        template: _.template($('#book-row-template').html()),
        
        /* the DOM events specific to an item. */
        events: {
            'click span.book-op-edit   > a': 'popupEditView',
            'click span.book-op-delete > a': 'popupDeleteDialog',
        },

        initialize: function() {
            this.model.on ('change', this.render, this);
            this.model.on ('destroy', this.remove, this);
        },

        /* re-render the table-row for this m.Book */
        render: function() {
            this.$el.html (this.template (this.model.toJSON()));
            return this;
        },

        popupEditView: function (ev) {
            var v = new m.BookEditView({
                model: this.model,
                id: 'book-edit',
                attributes: { title: 'Edit book' },
                isNew: false,
            })
            v.render();
            return false;
        },

        popupDeleteDialog: function (ev) {
            var v = new m.BookDeleteView({
                model: this.model,
                id: 'book-delete',
            })
            v.render();
            return false;
        },
    });
    
    m.BookDeleteView = Backbone.View.extend({
        tagName: "div",
        className: "book-delete-dialog dialog",
        attributes: { title: 'Confirm delete!' },
        
        template: _.template($('#book-delete-template').html()), 
        
        events: {
            'click  #book-delete' : 'submitForm', 
            'click  #cancel'      : 'cancel', 
        },
        
        initialize: function (options) { 
            this.$el.html (this.template (this.model.toJSON()));
            this.$el.find ('button#book-delete').button ({icons: {primary: 'ui-icon-close'}})
            this.$el.find ('button#cancel').button ({icons: {primary: 'ui-icon-cancel'}})
        },

        render: function() {
            this.$el.dialog({
                modal: true,
                width: '380px',
                close: _.bind(this.remove, this),
            })
            return this;
        },
        
        submitForm: function (ev) {
            m.bookstore_1.remove (this.model);
            /* close the dialog widget */
            this.$el.dialog('close')
            return false;
        },

        cancel: function (ev) { 
            /* close the dialog widget */
            this.$el.dialog('close')
            return false;
        },
    })

    m.BookEditView = Backbone.View.extend({
        tagName: "div",
        className: "book-edit-dialog dialog",
        
        template: _.template($('#book-edit-template').html()),
        
        events: {
            'change input'      : 'changedInput',
            'click  #book-save' : 'submitForm',
            'click  #reset'     : 'resetForm',
        },

        initialize: function (options) {
            this.options.isNew = !!options.isNew
            /* create now the DOM element, but dont activate dialog yet (render()) */  
            this.$el.html (this.template (this.model.toJSON()));
            this.$el.find ('button#book-save').button ({icons: {primary: 'ui-icon-check'}})
            this.$el.find ('button#reset').button ({icons: {primary: 'ui-icon-arrowreturnthick-1-e'}})
            return;
        },
        
        render: function() {
            /* open dialog (this also adds this node to the DOM tree) */
            this.$el.dialog({
                /* configure dialog's behaviour and position */
                modal: true,
                position : ['center', '170px'],
                width: '400px',
                /* when closed, destroy dialog and remove from DOM tree */
                close: _.bind(this.remove, this),
            })
            return this;
        },
        
        submitForm: function (ev) {
            var $btn = $(ev.target);
            /* update the underlying model (the book) */
            this.model.set({
                title: this.$el.find('input#edit_title').val(),
                price: this.$el.find('input#edit_price').val(),
                inStock: this.$el.find('input#edit_instock').is(":checked"),
            })
            /* create or update the targeted book item */
            if (this.options.isNew) { 
                /* add a book in bookstore */
                m.bookstore_1.add (this.model)
            } else {
                /* nop */
            }
            /* close the dialog widget */
            this.$el.dialog('close');
            /* done, prevent actual submit */
            return false;
        },
        
        resetForm: function (ev) {
            var $btn = $(ev.target);
            this.$el.find("input:text").val('');
            this.$el.find("input:checkbox").attr('checked', null)
            return false;
        },

        changedInput: function (ev) {
            var $input = $(ev.target);
            debug ('Got an input "change" event on !'+($input.attr('id')))
            return false;
        },
    });

    m.BookTableView = Backbone.View.extend({
        events: {
        },

        initialize: function () {
            this.model.on ('add', this.addedItem, this)
            this.model.on ('remove', this.removedItem, this)
            return
        },

        /* re-render the entire table */
        render: function() {
            /* not really used: refresh specific rows instead */
            this.$el.fadeIn();
            return this;
        },

        addedItem: function (book, bookstore, options) {
            debug ('Refreshing view: a book ('+book.get('title')+') is added')
            var $tbody = this.$el.find('tbody')
            var tr = new m.BookView({
                model:book, 
                id: 'book-'+book.cid
            }).render();
            $tbody.append (tr.$el)
            this.rows [tr.id] = tr
            return false;
        },

        removedItem: function (book, bookstore, options) {
            debug ('Refreshing view: a book ('+book.get('title')+') is removed')
            var tbody = this.$el.find('tbody')
            var tr_id = 'book-'+book.cid
            var tr = this.rows [tr_id];
            assert (tr, 'Cannot find m.BookView for a previously inserted book!')
            tr.remove()
            delete this.rows [tr_id]
            return false;
        },

        /* store all active table-row views (m.BookView instances) */
        rows: {},
    })  

    // Setup a BookStore instance

    m.bookstore_1 = new m.BookStore();

    m.bookstore_1
    .on('add', function (book, bookstore, options) {
        debug ('Added another book "'+book.get('title')+'" in bookstore at i='+options.index+' ...')
        return;
    })
    .on('remove', function (book, bookstore, options) {
        debug ('Removed book "'+book.get('title')+'" from bookstore at i='+options.index+' ...')
        return; 
    }) 

    // Setup bookstore_1's view

    m.bookstore_1_view = new m.BookTableView({
        model: m.bookstore_1,
        /* this is an allready existing DOM element, so provide 'el' attribute 
         * (instead of providing tagName/className/id attributes) */
        el: 'table.books',
    });
    
    // Fetch all items from storage backend 
    
    m.bookstore_1.fetch()
    
    // Display the table

    m.bookstore_1_view.render();

    return m;
})(jQuery, window.Test05))
