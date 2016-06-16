(function() {
  return {
    events: {
      // EVENTS
      'pane.activated':'onPaneActivated',
      'keyup input.user':'findUsers',
      'change select.type':'onTypeChanged',
      'click button.addFilter':'onAddFilterClicked',
      'click button.search':'onSearchClicked',
      'click a.prev_page':'onPrevClicked',
      'click a.next_page':'onNextClicked',
      // REQUEST CALLBACKS
      'search.done':'onSearchSuccess',
      'getUrl.done':'onSearchSuccess',
      'getCustomTicketFields.done':'setCustomFields'
    },

    requests: {
      /*
      searchIncremental: function(query, sort_by, sort_order, page) {
        return {
          url: helpers.fmt('/api/v2/search/incremental?query=%@&sort_by=%@&sort_order=%@&page=%@', query, sort_by, sort_order, page)
        };
      },
      */
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
        if (!url) { url = '/api/v2/ticket_fields.json'; }
        return {
          url: url
        };
      }
    },

    users: [],
    userIDs: [],
    customFields: [],

    onPaneActivated: function(data) {
      if (data.firstLoad) {
        this.switchTo('search');
        this.$('span.loading').hide();
        this.$('span.no_results').hide();
        this.ajax('getCustomTicketFields');
      }
    },

    setCustomFields: function(response) {
      this.customFields = this.customFields.concat(response.ticket_fields);

      if (response.next_page) {
        this.ajax('getCustomTicketFields', response.next_page);
        return;
      } else {
        this.customFields = _.filter(this.customFields, function(cf) {
          return !_.contains(['subject', 'description', 'status',
                              'tickettype', 'priority', 'group', 
                              'assignee'], cf.type) && cf.active;
        });

        var e = {"currentTarget": {"value":"ticket"}};
        this.onTypeChanged(e);
      }
    },

    onTypeChanged: function(e) {
      var type                     = e.currentTarget.value,
          search_options_template  = '',
          userFields               = ["assignee", "requester", "submitter","cc", "commenter"];

      switch (type) {
        case "ticket":
          search_options_template = this.renderTemplate("ticket_options", {
            customFields: this.customFields
          });
          break;
        case "topic":
          search_options_template = this.renderTemplate("topic_options");
          break;
        case "user":
          search_options_template = this.renderTemplate("user_options");
          break;
        case "organization":
          search_options_template = this.renderTemplate("organization_options");
          break;
        case "":
          search_options_template = "Choose a specific type to get access to additional filter options.";
          break;
      }

      this.$("div.type_options").html(search_options_template);

      // autocomplete the user fields
      _.each(userFields, function(field) {
        this.$('input.' + field).autocomplete({
          minLength: 0
        });
      }, this);
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

        this.$('input#' + e.currentTarget.id).autocomplete({
          source: users
        });
      });
    },

    onSearchClicked: function(e) {
      if (e) { e.preventDefault(); }

      var string              = this.$('input.string').val(),
          type                = this.$('form.main_search select.type').val(),
          status_operator    = this.$('form.ticket_filters select.status_operator').val(),
          priority_operator  = this.$('form.ticket_filters select.priority_operator').val(),
          date_operator      = this.$('form.ticket_filters select.date_operator').val(),
          filter_string       = '';

      this.$('div.results').html('');
      this.type = type;

      switch (type) {
        case "ticket":

          if (status_operator == 'greater') {
            status_operator = '>';
          } else if (status_operator == 'less') {
            status_operator = '<';
          } else if (status_operator == ':') {
            status_operator = ':';
          }

          if (priority_operator == 'greater') {
            priority_operator = '>';
          } else if (priority_operator == 'less') {
            priority_operator = '<';
          } else if (priority_operator == ':') {
            priority_operator = ':';
          }

          if (date_operator == 'greater') {
            date_operator = '>';
          } else if (date_operator == 'less') {
            date_operator = '<';
          } else if (date_operator == ':') {
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
            "tags": this.$('form.ticket_filters input.tags').val(),
            "via": this.$('form.ticket_filters select.via').val()
          };

          filter_string = this.renderTemplate('ticket_filter', {
            filters: ticket_filters
          });

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

            customFields: this.selectedCustomFields()
          };
        break;
      }

      this.results = [];
      var query = string + filter_string + ' type:' + type,
        sort_by = this.$('select.sort_by').val(),
        sort_order = this.$('select.sort_order').val(),
        page = '1';

      // remove linebreaks and spaces generated from the filter string template
      query = query.replace(/(\r\n|\n|\r)/gm,"").replace(/ /,"");

      if (query.length < 2) {
        services.notify("A search query must have at least two characters.", "error");
      } else {
        this.encodedQuery = encodeURIComponent(query);
        this.$("span.no_results").hide();
        this.$("span.loading").show();
        this.ajax('search', this.encodedQuery, sort_by, sort_order, page);
      }
    },

    selectedCustomFields: function() {
      var that            = this,
          customFields    = this.customFields,
          selectedFields  = this.$('.custom_field_options input').map(function () {
            if (that.$(this).prop('checked') ) {
              return that.$(this).attr('data-field-option-id');
            }
          });

      selectedFields = _.toArray(selectedFields);

      var columns = _.filter(customFields, function(cf) {
        return _.contains(selectedFields, cf.id.toString());
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

    onSearchSuccess: function(response) {
      var displayAllPages = this.$('.all_pages').prop('checked');
      this.results = this.results.concat(response.results);
      var next_page, prev_page;

      if (displayAllPages && response.next_page) {
        this.ajax('getUrl', response.next_page);
        return;
      } else {
        if (response.next_page) {
          next_page = response.next_page;
          this.next_page = response.next_page;
        }
        if (response.previous_page) {
          prev_page = response.previous_page;
          this.prev_page = response.previous_page;
        }
        this.numberOfResults = response.count;
      }

      if (this.results.length === 0) {
        this.$("span.loading").hide();
        this.$('span.no_results').show();
        return;
      }

      _.each(this.results, function(result, index) {
        var last;
        if (this.results.length == index + 1) { last = true; }
        else { last = false; }
        var users = _.union(result.collaborator_ids, [result.assignee_id, result.requester_id, result.submitter_id]);
        this.addUsers(users, last);
      }.bind(this));
    },

    addUsers: function(ids, last) {
      _.each(ids, function(id) {
        this.userIDs.push(id);
      }.bind(this));
      this.userIDs = _.filter(_.uniq(this.userIDs), Boolean);
      if (this.userIDs.length >= 100 || last) {
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
      this.encoded        = [];
      var customFields    = this.columns.customFields;
      var customFieldIds  = _.map(customFields, function(cf) {
        return cf.id;
      });

      _.each(results, function(result, index) {
        // filter the custom field result set down to the selected columns
        result.customFields = _.filter(result.customFields, function(cf) {
          return _.contains(customFieldIds, cf.id);
        });

        result.customFields = _.map(result.customFields, function(cf) {
          var field = _.find(customFields, function(f) { return f.id == cf.id; });

          // add flag to textarea fields (used in the template)
          if (field.type == 'textarea') {
            cf.textarea = true;
          }
          return cf;
        });

        if (result.description) {
          result.description = result.description.replace(/"/g, '\"\"');
        }

        result.created_at = new Date(result.created_at).toLocaleString();
        result.updated_at = new Date(result.updated_at).toLocaleString();

        // look up users from unique array
        var assignee      = _.find(this.users, function(user) { return user.id == result.assignee_id; }),
            requester     = _.find(this.users, function(user) { return user.id == result.requester_id; }),
            submitter     = _.find(this.users, function(user) { return user.id == result.submitter_id; }),
            collaborators = _.map(result.collaborator_ids, function(id) {
          return _.find(this.users, function(user) { return user.id == id; });
        }, this);

        // replace user ids with names
        if (assignee) { result.assignee = assignee.name; }
        else { result.assignee = result.assignee_id; }
        if (requester) { result.requester = requester.name; }
        else { result.requester = result.requester_id; }
        if (submitter) { result.submitter = submitter.name; }
        else { result.submitter = result.submitter_id; }
        if (collaborators) { result.collaborators = collaborators; }

        /*
        // encode results
        // TODO: ADD CONDITIONALITY and iterate this so they don't have to be called by name
        this.encoded[index] = {
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
          customFields: _.map(result.customFields, function(cf) {
            cf.value = encodeURIComponent(cf.value);
            return cf;
          })
        };
        */

        result.status_label = helpers.fmt('<span class="ticket_status_label %@">%@</span>', result.status, result.status);

      }.bind(this));

      var data = this.renderTemplate('_tickets_export', {
        tickets: results,
        columns: this.columns
      });
      var file = new File([data], 'tickets.csv');
      var url = URL.createObjectURL(file);

      var results_html = this.renderTemplate('results', {
        results: results,
        // encoded_results: this.encoded,
        count: this.numberOfResults,
        next_page: this.next_page,
        prev_page: this.prev_page,
        columns: this.columns,
        download: url
      });

      this.$("span.loading").hide();
      this.$('div.results').html(results_html);
    }
  };
}());
