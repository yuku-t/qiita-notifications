(function ($, CrO3) {

  'use strict';

  var background = new CrO3.Background({
    notify_notifications : true,
    notify_following     : true,
    notify_public        : false,
    notify_time          : 5,
    crawling_interval    : 180,
    token                : null,
    url_name             : null,
    following_tags       : [],
    following_users      : []
  });

  // Data which fetched from server but not have been showed on popup.html yet.
  var pool = { following: [], 'public': [], notifications: [] };


  // crawling once a two minutes
  var origin = 'http://qiita.com';
  var last = 0; //Math.floor(Date.now() / 1000);
  var prev_count = NaN;  // previous notification count
  var crawl = function (init) {
    // following
    // ---------
    $.getJSON(origin + '/api/following?after=' + last, function (data) {
      // Unshift fetched data to pool
      Array.prototype.unshift.apply(pool.following, data);

      if (!init && background.get('notify_following').msg) {
        var time = background.get('notify_time').msg;
        data.forEach(function (datum, index) {
          var actors = datum.actors;
          var target = datum.target_content;
          var iconUrl = actors[0].profile_image_url;
          var title, body;
          switch (datum.action_type) {
          case 'stock':
            title = actors.map(function (actor) {
              return actor.url_name;
            }).join(', ') + 'がストックしました';
            body = target.title;
            break;
          case 'comment':
            title = actors[0].url_name + 'がコメントしました';
            body = target.title;
            break;
          case 'follow_tag':
            title = actors[0].url_name + 'が' +
                    target.name + 'タグをフォローしました';
            body = '';
            break;
          case 'follow_user':
            title = actors[0].url_name + 'が' +
                    target.url_name +  'をフォローしました';
            body = '';
            break;
          case 'following_user_post':
            title = actors[0].url_name + 'が投稿しました';
            body = target.title;
            break;
          case 'following_tag_post':
            iconUrl = actors[0].icon_url;
            title = actors[0].name + 'に新しい投稿がありました';
            body = target.title;
            break;
          default:
            // ignore other action types such as own_post
            return;
          }
          var notification =
              window.webkitNotifications.createNotification(iconUrl, title, body);
          notification.show();
          if (time > 0) {
            setTimeout(function () {
              notification.cancel();
            }, (index + 1) * time * 1000);
          }
        });
      }
    });

    // public
    // ------
    $.getJSON(origin + '/api/public?after=' + last, function (data) {
      // Unshift fetched data to pool
      Array.prototype.unshift.apply(pool['public'], data);

      if (!init && background.get('notify_public').msg) {
        var time = background.get('notify_time').msg;
        data.forEach(function (datum, index) {
          var user = datum.user;
          var iconUrl = user.profile_image_url;
          var title = user.url_name + 'が投稿しました';
          var body = datum.title;
          var notification =
              window.webkitNotifications.createNotification(iconUrl, title, body);
          notification.show();
          if (time > 0) {
            setTimeout(function () {
              notification.cancel();
            }, (index + 1) * time * 1000);
          }
        });
      }
    });

    // notifications
    // -------------
    $.ajax({ url: origin + '/api/notifications/count', dataType: 'json' })
      .fail(function () {
        prev_count = NaN;
        updateBadge(null);
      })
      .done(function (data) {
        if (init) {
          updateBadge(data.count);
        } else if (data.count === prev_count) {
          return;
        } else if (data.count < prev_count) {
          prev_count = data.count;
          updateBadge(data.count);
          return;
        } else {
          updateBadge(data.count);
        }

        var diff = isNaN(prev_count) ? data.count : data.count - prev_count;
        prev_count = data.count;
        if (init || diff > 0) {
          $.getJSON(origin + '/api/notifications', function (data) {
            pool.notifications = data;

            if (background.get('notify_notifications').msg) {
              var time = background.get('notify_time').msg;
              data.slice(0, diff).forEach(function (datum, index) {
                var users = datum.users.map(function (user) {
                  return user.url_name;
                }).join(', ');
                var iconUrl, title, body;
                iconUrl = datum.users[0].profile_image_url;
                switch (datum.action) {
                case 'stock':
                  title = users + 'があなたの投稿をストックしました';
                  body = datum.short_title;
                  break;
                case 'follow_user':
                  title = users + 'があなたをフォローしました';
                  body = '';
                  break;
                case 'update_posted_chunk':
                  title = users + 'があなたのコメントした投稿にコメントしました';
                  body = datum.short_title;
                  break;
                case 'lgtm':
                  title = users + 'があなたの投稿にLGTMしました';
                  body = datum.short_title;
                  break;
                case 'item_mention':
                  title = users + 'があなたにメンションしました';
                  body = datum.short_title;
                  break;
                case 'comment_mention':
                  title = users + 'があなたにコメントでメンションしました';
                  body = datum.short_title;
                  break;
                case 'receive_patch':
                  title = users + 'があなたの投稿へ編集リクエストを送りました';
                  body = datum.short_title;
                  break;
                case 'accept_patch':
                  title = users + 'があなたの編集リクエストを採用しました';
                  body = datum.short_title;
                  break;
                case 'reply':
                  title = users + 'があなたの投稿にコメントしました';
                  body = datum.short_title;
                  break;
                case 'tweet':
                  title = 'あなたの投稿が「ツイート」されました';
                  body = datum.short_title;
                  break;
                case 'like':
                  title = 'あなたの投稿が「いいね」されました';
                  body = datum.short_title;
                  break;
                case 'new_comment_for_stocker':
                  title = users + 'があなたがストックした投稿にコメントしました';
                  body = datum.short_title;
                  break;
                case 'stocked_item_update':
                  title = users + 'があなたがストックした投稿を更新しました';
                  body = datum.short_title;
                  break;
                default:
                  return;
                }
                var notification =
                    window.webkitNotifications.createNotification(iconUrl, title, body);
                notification.show();
                if (time > 0) {
                  setTimeout(function () {
                    notification.cancel();
                  }, (index + 1) * time * 1000);
                }
              });
            }
          });
        }
      });

    last = Math.floor(Date.now() / 1000);
    setTimeout(crawl, background.get('crawling_interval').msg * 1000);
  };


  // start crawling
  crawl(true);

  chrome.extension.onRequest.addListener(function (req, sender, res) {
    switch (req.action) {
    case 'get.notifications':
      $.get(origin + '/api/notifications/read');
      updateBadge(isNaN(prev_count) ? null : 0);
      res(pool.notifications);
      break;
    case 'get.public':
      res(pool['public']);
      break;
    case 'get.following':
      res(pool.following);
      break;
    }
  });

  // Utility functions
  // -----------------

  var updateBadge = function (count) {
    if (count == null) {
      chrome.browserAction.setBadgeText({ text: '?' });
      chrome.browserAction.setBadgeBackgroundColor({ color: [100, 100, 100, 100]});
    } else {
      chrome.browserAction.setBadgeText({ text: count.toString() });
      var color = count === 0 ? [100, 100, 100, 255] : [204, 60, 41, 255];
      chrome.browserAction.setBadgeBackgroundColor({ color: color });
    }
  };
  updateBadge(null); // init

})(jQuery, CrO3);
