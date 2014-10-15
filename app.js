(function() {

  return {
    events: {
      'app.activated':'loadSettings',
      'pane.activated':'onPaneActivated',

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
      'getUrl.done':'onSearchComplete'
    },
    requests: {
      // searchIncremental: function(query, sort_by, sort_order, page) {
      //   return {
      //     url: helpers.fmt('/api/v2/search/incremental?query=%@&sort_by=%@&sort_order=%@&page=%@', query, sort_by, sort_order, page)
      //   };
      // },
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
      getUser: function(id) {
        return {
          url: helpers.fmt('/api/v2/users/%@.json', id)
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

        //shortcut
        var e = {
          "currentTarget": {
            "value":"ticket"
          }
        };
        this.onTypeChanged(e);
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
          options_html = this.renderTemplate("ticket_options");
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

    },
    // onGroupChanged: function() {
    //   this.group = '';
    // },
    // onAssigneeChanged: function() {
    //   this.assignee = '';
    // },

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
    onSearchClicked: function(e) {
      if (e) {e.preventDefault();}
      this.$('div.results').html('');
      var string = this.$('input.string').val();
      // this is where we add filters before searching on /incremental
      var type = this.$('select.type').val();
      this.type = type;
      var filter_string = '';
      switch (type) {
        case "ticket":

          var status_operator = '';
          if(this.$('select.status_operator').val() == 'greater') {
            status_operator = '>';
          } else if (this.$('select.status_operator').val() == 'less') {
            status_operator = '<';
          } else if (this.$('select.status_operator').val() == ':') {
            status_operator = ':';
          }
          var priority_operator = '';
          if(this.$('select.priority_operator').val() == 'greater') {
            priority_operator = '>';
          } else if (this.$('select.priority_operator').val() == 'less') {
            priority_operator = '<';
          } else if (this.$('select.priority_operator').val() == ':') {
            priority_operator = ':';
          }
          var date_operator = '';
          if(this.$('select.date_operator').val() == 'greater') {
            date_operator = '>';
          } else if (this.$('select.date_operator').val() == 'less') {
            date_operator = '<';
          } else if (this.$('select.date_operator').val() == ':') {
            date_operator = ':';
          }
          var ticket_filters = {
            "status": status_operator + this.$('select.status_value').val(),
            "ticket_type": this.$('select.ticket_type').val(),
            "priority": priority_operator + this.$('select.priority_value').val(),
            "date": this.$('select.date_type').val() + date_operator + this.$('input.date_value').val(),
            "group": this.$('input.group').val(),
            "assignee": this.$('input.assignee').val(),
            "submitter": this.$('input.submitter').val(),
            "organization": this.$('input.organization').val(),
            "requester": this.$('input.requester').val(),
            "commenter": this.$('input.commenter').val(),
            "cc": this.$('input.cc').val(),
            "subject": this.$('input.subject').val(),
            "description": this.$('input.description').val(),
            "tags": this.$('input.tags').val(), //.split(/\W/)
            "via": this.$('select.via').val()
          };

          // render a template to build the filters string
          filter_string = this.renderTemplate('ticket_filter_string', {
            filters: ticket_filters
          });

          this.columns = {
            type: true,
            id: true,
            subject: true,
            group_id: true,
            assignee_id: true,
            requester_id: true,
            status: true,
            priority: true,
            created_at: true,
            updated_at: true,

            external_id: false,
            channel:  false,
            description:  false,
            recipient: false,
            submitter_id: false,
            organization_id: false,
            collaborator_ids: false,
            forum_topic_id: false,
            problem_id: false,
            has_incidents: false,
            tags: false
          };
        break;
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
          prev_page,
          numberOfResults;
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
        numberOfResults = response.count;
      }


      
      if(this.results.length === 0) {
        this.$("span.loading").hide();
        this.$('span.no_results').show();
        return;
      }
        //add support for assignee name
        var assignee_array = [];
        var assignee_lookup = [];
        var assignee_map = [];
         _.each(this.results, function(result){
          assignee_array.push(result.assignee_id);
         });
         assignee_array = _.uniq(assignee_array);
         _.each(assignee_array, function(id){
          var promise = this.ajax('getUser', id)
          .done(function(data){
            var userobj = {};
            userobj.id = data.user.id;
            userobj.name = data.user.name;
            assignee_map.push(userobj);
          });
          assignee_lookup.push(promise);
         }.bind(this));
         this.when.apply(this, assignee_lookup).then(function(){
          _.each(this.results, function(result){
            var assignee = _.filter(assignee_map, function(user){
              return user.id === result.assignee_id;
            });
            result.assignee_name = assignee[0].name;
          });
          this.encodeComponents(this.results);

          // display results
          var results_html = this.renderTemplate('results', {
            results: this.results,
            encoded_results: this.encoded,
            count: numberOfResults,
            next_page: next_page,
            prev_page: prev_page
          });
          this.$("span.loading").hide();
          this.$('div.results').html(results_html);
      }.bind(this));




    },

    encodeComponents: function(results) {
      // TODO make conditional for results type - e.g. this.type == 'tickets'
      // massage the data...
        this.encoded = [];
        _.each(results, function(result, n) {
          // format date
          result.created_at = new Date(result.created_at);
          result.created_at = result.created_at.toLocaleString();

          result.updated_at = new Date(result.updated_at);
          result.updated_at = result.updated_at.toLocaleString();
          
          // encode results  TODO: ADD CONDITIONALITY and iterate this so they don't have to be called by name
          this.encoded[n] = {
            type: encodeURIComponent(result.type),
            id: encodeURIComponent(result.id),
            subject: encodeURIComponent(result.subject),
            group_id: encodeURIComponent(result.group_id),
            assignee_id: encodeURIComponent(result.assignee_id),
            assignee_name: encodeURIComponent(result.assignee_name),
            requester_id: encodeURIComponent(result.requester_id),
            status: encodeURIComponent(result.status),
            priority: encodeURIComponent(result.priority),
            created_at: encodeURIComponent(result.created_at.replace(',','')), //comma encoding issue w/CSV ISO date strings. This makes it better by plucking teh commas
            updated_at: encodeURIComponent(result.updated_at.replace(',','')),

            external_id: encodeURIComponent(result.external_id),
            channel:  encodeURIComponent(result.via.channel),
            description:  encodeURIComponent(result.description),
            recipient:  encodeURIComponent(result.recipient),
            submitter_id: encodeURIComponent(result.submitter_id),
            organization_id:  encodeURIComponent(result.organization_id),
            collaborator_ids:  encodeURIComponent(result.collaborator_ids),
            forum_topic_id:  encodeURIComponent(result.forum_topic_id),
            problem_id:  encodeURIComponent(result.problem_id),
            has_incidents:  encodeURIComponent(result.has_incidents),
            tags:  encodeURIComponent(result.tags)

            // TODO: + custom fields
          };

          //add status labels
          result.status_label = helpers.fmt('<span class="ticket_status_label %@">%@</span>', result.status, result.status);
        }.bind(this));
    }
  };

}());
