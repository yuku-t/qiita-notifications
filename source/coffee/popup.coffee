q = @qiita
q.LOG_LEVEL = q.logLevels.DEBUG

InfoView = Backbone.View.extend
  render: -> 
    content = chrome.i18n.getMessage(
      @model.action
      (user.display_name for user in @model.users).join(', ')
    )
    alt = @model.users[0].display_name
    src = @model.users[0].profile_image_url
    cls = unless @model.seen then 'unread' else ''
    """
    <li class='notification #{cls}'>
      <a href='#{@model.object}' target='_blank'>
        <div class='box'>
          <div class='left'>
            <div class='user-icon'>
              <img class='icon-m' src='#{src}' alt='#{alt}'>
            </div>
          </div>
          <div class='right'>
            <div class='content'>#{content}</div>
            <div class='status'>
              <span class='#{@model.action}'>#{@model.created_at}</span>
            </div>
          </div>
        </div>
      </a>
    </li>
    """

NotificationsView = Backbone.View.extend
  initialize: (options) ->
    $(@el).html('')
    for info in @collection
      view = new InfoView model: info
      $(@el).append view.render()

ItemView = Backbone.View.extend
  render: ->
    tags = ''
    for tag in @model.tags
      tags += "<img class='icon-s' src='https://qiita.com#{tag.iconUrl}'/>#{tag.name}"
    cls = unless @model.seen then 'unread' else ''
    """
    <li class='chunk #{cls}'>
      <a href='#{@model.url}' target='_blank'>
        <div class='box'>
          <div class='left'>
            <div class='user-icon'>
              <img class='icon-m' src='#{@model.user.profile_image_url}' alt='#{@model.user.display_name}'>
            </div>
          </div>
          <div class='right'>
            <div class='content'>
              <div class='tags'>#{tags}</div>
              <div class='title'>#{@model.title}</div>
            </div>
            <div class='status'>
              <span class='#{@model.action}'>#{@model.created_at}</span>
            </div>
          </div>
        </div>
      </a>
    </li>
    """

ItemsView = Backbone.View.extend
  initialize: (options) ->
    $(@el).html('')
    for item in @collection
      view = new ItemView model: item
      $(@el).append view.render()

$ ->
  for menu in ['notifications', 'following', 'all_posts']
    do (menu) ->
      $(".menu > .#{menu}")
        # i18n of menu
        .html(chrome.i18n.getMessage(menu))
        # add click event handler
        .click ->
          $('.menu > .active').removeClass('active')
          $(this).addClass 'active'
          $('#contents > .active').removeClass('active')
          $("#contents > .#{menu}").addClass('active')
          chrome.extension.sendRequest(
            {action: 'click', menu: menu}
            (collection) ->
              if menu is 'notifications'
                new NotificationsView
                  collection: collection
                  el: $('#contents > .notifications > ol')
              else
                new ItemsView
                  collection: collection
                  el: $("#contents > .#{menu} > ol")
          )
      chrome.extension.sendRequest(
        {action: 'getUnreadCount', menu: menu}
        (count) ->
          if count > 0
            $menu = $(".menu > .#{menu}")
            $menu.html("#{$menu.text()} (#{count})")
      )

  $('.menu > .notifications').trigger('click')
