(function($) {
    $("body").XMPPConsole({
        before: function() {
            var that = this;
            $.extend(that.xmpp, {
                "base": "http://starafrica-dev.af83.com",
                "APICredentials": {
                    "eID": "crosscommunity",
                    "sId": "2f87f4fabf20db97506deb12b9cc34e2",
                }
            });

            $.extend(that.fn, {
                id2fulljid: function(id) {
                    return id + "@" + this.xmpp.domain + "/" + this.xmpp.resource;
                },

                abortConnection: function() {
                  console.log("API connexion failed or user not logged in");
                  this.abort = true;
                }
            });

            $.ajax({url: that.xmpp.base,
                type: "GET",
                data: $.extend(that.xmpp.APICredentials, {q: 'user/current'}),
                dataType: "xml",
                async: false,
                success: function(data, textStatus, xhr) {
                    // if the user is not logged in, abort
                    if ($(data.childNodes).find('status').attr('code') != "200") {
                      that.fn.abortConnection.call(that);
                      return;
                    }

                    that.xmpp.userPassword = $(data.childNodes).find('token').text();
                    var q = "user/" + that.xmpp.userPassword + "/as_id";

                    $.ajax({url: that.xmpp.base,
                        type: "GET",
                        data: $.extend(that.xmpp.APICredentials, {q: q}),
                        dataType: "xml",
                        async: false,
                        success: function(data, textStatus, xhr) {
                            that.xmpp.userID  = $(data.childNodes).find('id').text();
                            that.xmpp.userJID = that.fn.id2fulljid.call(that, that.xmpp.userID);
                        },
                        error: function(xhr, textstatus, error) {
                            that.fn.abortConnection.call(that);
                            return;
                        }
                    });
                },
                error: function(xhr, textStatus, error) {
                    that.fn.abortConnection.call(that);
                    return;
                }
            });
        }
    });
})(jQuery);

