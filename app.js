(function() {

  return {
    events: {
      'app.activated':'loadSettings',
      'pane.activated':'onPaneActivated',

      'keyup input.string':'onTextEntered',
      // 'change select.dateType':'onDateTypeChanged',
      // 'change input.startDate':'onStartDateChanged',
      // 'change input.endDate':'onEndDateChanged',
      'change select.type':'onTypeChanged',
      // 'change select.group':'onGroupChanged',
      // 'change select.assignee':'onAssigneeChanged',

      'click button.addFilter':'onAddFilterClicked',
      'click button.search':'onSearchClicked'

    },
    requests: {
      searchIncremental: function(query, sort_by, sort_order, page) {
        return {
          url: helpers.fmt('/api/v2/search/incremental?query=%@&sort_by=%@&sort_order=%@&page=%@', query, sort_by, sort_order, page)
        };
      },
      search: function(query, sort_by, sort_order, page) {
        return {
          url: helpers.fmt('/api/v2/search.json?query=%@&sort_by=%@&sort_order=%@&page=%@', query, sort_by, sort_order, page)
        };
      },
      
      getAssignees: function(page) {
        return {
          url: helpers.fmt('/api/v2/users.json?role[]=agent&role[]=admin&page=%@', page)
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
      }
    },

    onTextEntered: function() {
      //for incremental search only
      var string = this.$('input.string').val();
      if (string.length >= 2) {
        // this is where we add filters before searching on /incremental
        var filters = '';
        var query = filters + string,
          sort_by = this.$('select.sort_by').val(),
          sort_order = this.$('select.sort_order').val(),
          page = '1';
        var encodedQuery = encodeURIComponent(query);
        this.ajax('searchIncremental',encodedQuery,sort_by,sort_order,page);
        this.$("span.no_results").hide();
      } else {
        // ?
      }
    },
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
      console.log(e);
      var type = e.currentTarget.value;
      console.log(type);
        var options_html = '';
      switch (type) {
        case "tickets":
          options_html = this.renderTemplate("ticket_options");
          
        break;
        case "topics":
          options_html = this.renderTemplate("topic_options");
        break;
        case "users":
          options_html = this.renderTemplate("user_options");
        break;
        case "organizations":
          options_html = this.renderTemplate("organization_options");
        break;
        case "":
          options_html = "Choose a specific type to get access to additional filter options.";
        break;
      }
      //inject additional options
      this.$("form.type_options").html(options_html);

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
      var string = this.$('input.string').val();
      if (string.length >= 2) {
        // this is where we add filters before searching on /incremental
        var status_operator = '';
        if(this.$('select.status_operator').val() == 'greater') {
          status_operator = '>';
        } else if (this.$('select.status_operator').val() == 'less') {
          status_operator = '<';
        }
        var priority_operator = '';
        if(this.$('select.priority_operator').val() == 'greater') {
          priority_operator = '>';
        } else if (this.$('select.priority_operator').val() == 'less') {
          priority_operator = '<';
        }
        var date_operator = '';
        if(this.$('select.date_operator').val() == 'greater') {
          date_operator = '>';
        } else if (this.$('select.date_operator').val() == 'less') {
          date_operator = '<';
        }
        var filters = {
          "status": status_operator + this.$('select.status_value').val(),
          "type": this.$('select.ticket_type').val(),
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
        console.log(filters);
        var filter_string = this.renderTemplate('filter_string', {
          filters: filters
        });
        console.log('Filter string: ' + filter_string);
          // render a template to build the filters string?? that way you can use conditionals
        var type = this.$('select.type').val();
        var query = string + filter_string,
          sort_by = this.$('select.sort_by').val(),
          sort_order = this.$('select.sort_order').val(),
          page = '1';
        // console.log("sort by: " + sort_by);
        // console.log("sort order: " + sort_order);
        console.log(query);
        var encodedQuery = encodeURIComponent(query);
        
        this.$("span.no_results").hide();
        this.ajax('search', encodedQuery, sort_by, sort_order, page).done( function(response) {
          var results = response.results;



          var results_html = this.renderTemplate('results', {
            results: results
          });
          this.$('div.results').html(results_html);
        }
        );
      } else {
        // pop an alert that a search must have at least two characters

      }
    }
  };

}());
