(function() {

  return {
    events: {
      'app.activated':'loadSettings',
      'pane.activated':'onPaneActivated',

      'keyup input.user':'findUsers',

      // 'keyup input.string':'onTextEntered',
      // 'change select.dateType':'onDateTypeChanged',
      // 'change input.startDate':'onStartDateChanged',
      // 'change input.endDate':'onEndDateChanged',
      'change select.type':'onTypeChanged',
      // 'change select.group':'onGroupChanged',
      // 'change select.assignee':'onAssigneeChanged',

      'click button.addFilter':'onAddFilterClicked',
      'click button.search':'onSearchClicked',
      'click a.prev_page':'onPrevClicked',
      'click a.next_page':'onNextClicked',

      // request events
      'search.done':'onSearchComplete',
      // 'search.fail':'onSearchFail',

      'getUrl.done':'onSearchComplete',
      'getCustomTicketFields.done':'gotFields'

    },
    requests: {
      // searchIncremental: function(query, sort_by, sort_order, page) {
      //   return {
      //     url: helpers.fmt('/api/v2/search/incremental?query=%@&sort_by=%@&sort_order=%@&page=%@', query, sort_by, sort_order, page)
      //   };
      // },
      autocompleteUsers: function(name) {
        return {
          url: '/api/v2/users/autocomplete.json?name=' + name
        };
      },
      search: function(query, sort_by, sort_order, page) {
        return {
          url: helpers.fmt('/api/v2/search.json?query=%@&sort_by=%@&sort_order=%@&page=%@', query, sort_by, sort_order, page)
        };
      },
      getUrl: function(url) {
        return {
          url: url
        };
      },
      getAssignees: function(page) {
        return {
          url: helpers.fmt('/api/v2/users.json?role[]=agent&role[]=admin&page=%@', page)
        };
      },
      getUsersBatch: function(userBatch) {
        var ids = userBatch.toString();
        return {
          url: '/api/v2/users/show_many.json?ids=' + ids
        };
      },
      getCustomTicketFields: function(url) {
        if(!url) {url = '/api/v2/ticket_fields.json';}
        return {
          url: url
        };
      }
    },

    loadSettings: function() {
      
      

    },
    onPaneActivated: function(data) {
      if(data.firstLoad) {
        // render the default template
        this.switchTo('search');
        this.$('span.loading').hide();
        this.$('span.no_results').hide();
        this.userIDs = [];
        this.users = [];
        this.allCustomFields = [];
        this.columns = {};

        this.ajax('getCustomTicketFields');

      }
    },
    gotFields: function(response) {
      this.allCustomFields = this.allCustomFields.concat(response.ticket_fields);
      if(response.next_page) {
        this.ajax('getCustomTicketFields', response.next_page);
        return;
      } else {
        // pagination done
        this.allCustomFields = _.filter(this.allCustomFields, function(cf) {
          return !_.contains(['subject', 'description', 'status',
                                'tickettype', 'priority', 'group', 'assignee'], cf.type) && cf.active;
        });
        //shortcut
        var e = {"currentTarget": {"value":"ticket"}};
        this.onTypeChanged(e); // renders the options for the type
      }
    },

    // onTextEntered: function() {
    //   //for incremental search only
    //   var string = this.$('input.string').val();
    //   if (string.length >= 2) {
    //     // this is where we add filters before searching on /incremental
    //     var filters = '';
    //     var query = filters + string,
    //       sort_by = this.$('select.sort_by').val(),
    //       sort_order = this.$('select.sort_order').val(),
    //       page = '1';
    //     var encodedQuery = encodeURIComponent(query);
    //     this.ajax('searchIncremental',encodedQuery,sort_by,sort_order,page);
    //     this.$("span.no_results").hide();
    //   } else {
    //     // ?
    //   }
    // },
    // onDateTypeChanged: function() {
    //   this.dateType = '';

    // },
    // onStartDateChanged: function() {
    //   this.startDate = '';
    // },
    // onEndDateChanged: function() {
    //   this.endDate = '';
    // },
    onTypeChanged: function(e) {
      var type = e.currentTarget.value,
          options_html = '';
      switch (type) {
        case "ticket":
          options_html = this.renderTemplate("ticket_options", {
            customFields: this.allCustomFields
          });
        break;
        case "topic":
          options_html = this.renderTemplate("topic_options");
        break;
        case "user":
          options_html = this.renderTemplate("user_options");
        break;
        case "organization":
          options_html = this.renderTemplate("organization_options");
        break;
        case "":
          options_html = "Choose a specific type to get access to additional filter options.";
        break;
      }
      //inject additional options
      this.$("div.type_options").html(options_html);
      // autocomplete ticket options
      var userFields = ["assignee","requester","submitter","cc","commenter"];
      _.each(userFields, function(title) {
        this.$('input.' + title).autocomplete({
          minLength: 0
        });
      }, this);
    },

    onAddFilterClicked: function(e) {
      if (e) {e.preventDefault();}
      // render various filters
      //
    },
    onFilterSelected: function(e) {
      if (e) {e.preventDefault();}
      //grab the selection and render the additional filter UI
      //use a global variable to track the number of these filters rendered, and give them an ID to indicate?
    },

    findUsers: function(e) {
      var name = e.currentTarget.value;
      var encodedQuery = encodeURIComponent(name);
      this.ajax('autocompleteUsers', encodedQuery).done(function(response) {
        var users = _.map(response.users, function(user) {
          return {
            label: user.name + " | " + user.email,
            value: user.email || user.id
          };
        });
        console.log(users);
        this.$('input#' + e.currentTarget.id).autocomplete({
          source: users
        });
      });
    },
    findOrgs: function() {

    },
    foundOrgs: function(response) {
      var organizations = response.organizations;

      console.log("organizations");
      console.log(organizations);
    },

    onSearchClicked: function(e) {
      if (e) {e.preventDefault();}
      this.$('div.results').html('');
      var string = this.$('input.string').val(),
        type = this.$('form.main_search select.type').val();
      this.type = type;
      var filter_string = '';
      switch (type) {
        case "ticket"://if searching for tickets
          var status_operator = '';
          if(this.$('form.ticket_filters select.status_operator').val() == 'greater') {
            status_operator = '>';
          } else if (this.$('form.ticket_filters select.status_operator').val() == 'less') {
            status_operator = '<';
          } else if (this.$('form.ticket_filters select.status_operator').val() == ':') {
            status_operator = ':';
          }
          var priority_operator = '';
          if(this.$('form.ticket_filters select.priority_operator').val() == 'greater') {
            priority_operator = '>';
          } else if (this.$('form.ticket_filters select.priority_operator').val() == 'less') {
            priority_operator = '<';
          } else if (this.$('form.ticket_filters select.priority_operator').val() == ':') {
            priority_operator = ':';
          }
          var date_operator = '';
          if(this.$('form.ticket_filters select.date_operator').val() == 'greater') {
            date_operator = '>';
          } else if (this.$('form.ticket_filters select.date_operator').val() == 'less') {
            date_operator = '<';
          } else if (this.$('form.ticket_filters select.date_operator').val() == ':') {
            date_operator = ':';
          }
          var ticket_filters = {
            "status": status_operator + this.$('form.ticket_filters select.status_value').val(),
            "ticket_type": this.$('form.ticket_filters select.ticket_type').val(),
            "priority": priority_operator + this.$('form.ticket_filters select.priority_value').val(),
            "date": this.$('form.ticket_filters select.date_type').val() + date_operator + this.$('form.ticket_filters input.date_value').val(),
            "group": this.$('form.ticket_filters input.group').val(),
            "assignee": this.$('form.ticket_filters input.assignee').val(),
            "submitter": this.$('form.ticket_filters input.submitter').val(),
            "organization": this.$('form.ticket_filters input.organization').val(),
            "requester": this.$('form.ticket_filters input.requester').val(),
            "commenter": this.$('form.ticket_filters input.commenter').val(),
            "cc": this.$('form.ticket_filters input.cc').val(),
            "subject": this.$('form.ticket_filters input.subject').val(),
            "description": this.$('form.ticket_filters input.description').val(),
            "tags": this.$('form.ticket_filters input.tags').val(), //.split(/\W/)
            "via": this.$('form.ticket_filters select.via').val()
          };

          // render a template to build the filters string
          filter_string = this.renderTemplate('ticket_filter_string', {
            filters: ticket_filters
          });
          // console.log(ticket_filters);
          this.columns = {
            type: this.$('form.ticket_columns .type').prop('checked'),
            id: this.$('form.ticket_columns .id').prop('checked'),
            subject: this.$('form.ticket_columns .subject').prop('checked'),
            group: this.$('form.ticket_columns .group').prop('checked'),
            assignee: this.$('form.ticket_columns .assignee').prop('checked'),
            requester: this.$('form.ticket_columns .requester').prop('checked'),
            status: this.$('form.ticket_columns .status').prop('checked'),
            priority: this.$('form.ticket_columns .priority').prop('checked'),
            created_at: this.$('form.ticket_columns .created').prop('checked'),
            updated_at: this.$('form.ticket_columns .updated').prop('checked'),

            external_id: this.$('form.ticket_columns .external_id').prop('checked'),
            channel:  this.$('form.ticket_columns .channel').prop('checked'),
            description:  this.$('form.ticket_columns .description').prop('checked'),
            recipient: this.$('form.ticket_columns .recipient').prop('checked'),
            submitter: this.$('form.ticket_columns .submitter').prop('checked'),
            organization: this.$('form.ticket_columns .organization').prop('checked'),
            collaborators: this.$('form.ticket_columns .collaborators').prop('checked'),
            forum_topic: this.$('form.ticket_columns .forum_topic').prop('checked'),
            problem_id: this.$('form.ticket_columns .problem_id').prop('checked'),
            has_incidents: this.$('form.ticket_columns .has_incidents').prop('checked'),
            tags: this.$('form.ticket_columns .tags').prop('checked'),

            customFields: this.selectCustomFields()
          };
        break;
        //  TODO add cases for other objects
      } // end switch
      
      //no matter the type...
      this.results = [];
      var query = string + filter_string + ' type:' + type,
        sort_by = this.$('select.sort_by').val(),
        sort_order = this.$('select.sort_order').val(),
        page = '1';
      if(query.length < 2) {
        services.notify("A search query must have at least two characters.", "error");
      } else {
        var encodedQuery = encodeURIComponent(query);
        // store the query globally
        this.encodedQuery = encodedQuery;
        this.$("span.no_results").hide();
        this.$("span.loading").show();
        // make the request
        this.ajax('search', encodedQuery, sort_by, sort_order, page);
      }
    },
    selectCustomFields: function() {
      var that = this,
        allCustomFields = this.allCustomFields,
        selected = this.$('.custom_field_options input').map(function () {
        if( that.$(this).prop('checked') ) {return that.$(this).attr('data-field-option-id');}
      });
      selected = _.toArray(selected);
      var columns = _.filter(allCustomFields, function(cf) {
        return _.contains(selected, cf.id.toString());
      });
      return columns;
    },
    onPrevClicked: function(e) {
      e.preventDefault();
      this.results = [];
      this.ajax('getUrl', this.prev_page);
      this.$('div.results').html('');
      this.$("span.loading").show();
    },
    onNextClicked: function(e) {
      e.preventDefault();
      this.results = [];
      this.ajax('getUrl', this.next_page);
      this.$('div.results').html('');
      this.$("span.loading").show();
    },
    onSearchComplete: function(response) {
      var allPages = this.$('.all_pages').prop('checked');
      this.results = this.results.concat(response.results);
      var next_page,
          prev_page;
      if(allPages && response.next_page) {
        // get the next page by URL
        this.ajax('getUrl', response.next_page);
        return;
      } else {
        // TODO: add buttons # numbering
        if(response.next_page) {
          next_page = response.next_page;
          this.next_page = response.next_page;
        }
        if(response.previous_page) {
          prev_page = response.previous_page;
          this.prev_page = response.previous_page;
        }
        this.numberOfResults = response.count;
      }
      var results = this.results;
      if(results.length === 0) {
        this.$("span.loading").hide();
        this.$('span.no_results').show();
        return;
      }
      // TODO make conditional for results type - e.g. this.type == 'tickets'
      // massage the data...
      _.each(results, function(result, n) {
        // store user IDs
        var last;
        if(results.length == n+1) {last = true;}
        else {last = false;}
        var users = _.union(result.collaborator_ids, [result.assignee_id, result.requester_id, result.submitter_id]);
        this.addUsers(users, last);
      }.bind(this));
    },
    addUsers: function(ids, last) {
      _.each(ids, function(id) {
        this.userIDs.push(id);
      }.bind(this));
      this.userIDs = _.filter(_.uniq(this.userIDs), Boolean);
      if(this.userIDs.length >= 100 || last) {
        var userBatch = _.first(this.userIDs, 100);
        this.userIDs = _.rest(this.userIDs, 99);
        this.ajax('getUsersBatch', userBatch).done(function(response) {
          this.users = this.users.concat(response.users);
          _.defer(function(){
            this.encodeResults(this.results);
          }.bind(this));
        });
      }
    },
    encodeResults: function(results) {
      this.encoded = [];
      var custom_fields = this.columns.customFields;
      var cfIDs = _.map(custom_fields, function(cf) {
        return cf.id;
      });
      _.each(results, function(result, n) {
        // filter the custom field result set down to the selected columns
        result.custom_fields = _.filter(result.custom_fields, function(cf) {
          return _.contains(cfIDs, cf.id);
        });
        result.custom_fields = _.map(result.custom_fields, function(cf) {
          var field = _.find(custom_fields, function(f) { return f.id == cf.id; });
          // decode multiline fields
          if(field.type == 'textarea') {
            cf.value = decodeURIComponent(cf.value);
            // console.log(cf.value);
          }
          return cf;
        });
        // format dates
        result.created_at = new Date(result.created_at).toLocaleString();
        result.updated_at = new Date(result.updated_at).toLocaleString();
        // look up users from unique array
        var assignee = _.find(this.users, function(user) { return user.id == result.assignee_id; }),
          requester = _.find(this.users, function(user) { return user.id == result.requester_id; }),
          submitter = _.find(this.users, function(user) { return user.id == result.submitter_id; });

        var collaborators = _.map(result.collaborator_ids, function(id) {
          return _.find(this.users, function(user) { return user.id == id; });
        }, this);
        // replace user ids w/ names
        if(assignee) {result.assignee = assignee.name;}
        else {result.assignee = result.assignee_id;}
        if(requester) {result.requester = requester.name;}
        else {result.requester = result.requester_id;}
        if(submitter) {result.submitter = submitter.name;}
        else {result.submitter = result.submitter_id;}
        if(collaborators) {result.collaborators = collaborators;}


        // encode results  TODO: ADD CONDITIONALITY and iterate this so they don't have to be called by name
        this.encoded[n] = {
          type: encodeURIComponent(result.type),
          id: encodeURIComponent(result.id),
          subject: encodeURIComponent(result.subject),
          group_id: encodeURIComponent(result.group_id),
          assignee_id: encodeURIComponent(result.assignee),
          requester_id: encodeURIComponent(result.requester),
          status: encodeURIComponent(result.status),
          priority: encodeURIComponent(result.priority),
          created_at: encodeURIComponent(result.created_at),
          updated_at: encodeURIComponent(result.updated_at),

          external_id: encodeURIComponent(result.external_id),
          channel:  encodeURIComponent(result.via.channel),
          description:  encodeURIComponent(result.description),
          recipient:  encodeURIComponent(result.recipient),
          submitter: encodeURIComponent(result.submitter),
          organization_id:  encodeURIComponent(result.organization_id),
          forum_topic_id:  encodeURIComponent(result.forum_topic_id),
          problem_id:  encodeURIComponent(result.problem_id),
          has_incidents:  encodeURIComponent(result.has_incidents),
          tags:  encodeURIComponent(result.tags),

          collaborators: _.map(result.collaborators, function(cc) {
            return encodeURIComponent(cc.name);
          }),
          // encode custom field values (all of them) but NOT ids
          custom_fields: _.map(result.custom_fields, function(cf) {
            cf.value = encodeURIComponent(cf.value);
            return cf;
          })
        };
        //add status labels
        result.status_label = helpers.fmt('<span class="ticket_status_label %@">%@</span>', result.status, result.status);

      }.bind(this));
      // display results
      var results_html = this.renderTemplate('results', {
        results: results,
        encoded_results: this.encoded,
        count: this.numberOfResults,
        next_page: this.next_page,
        prev_page: this.prev_page,
        columns: this.columns
      });
      this.$("span.loading").hide();
      this.$('div.results').html(results_html);
    }
  };
}());
