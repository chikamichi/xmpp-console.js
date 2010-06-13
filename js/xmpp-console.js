/*
 *                     XMPP-Console(.js)
 *
 * An XMPP console using Strophe.js and Sammy.js, based on Peek.
 * Allows you to monitor XMPP trafic and debug Strophe.js apps live!
 *
 **/
(function($) {
    $.fn.XMPPConsole = function(options) {
        var container = $(this);
        // run param is expected to be a string matching a default route;
        // here it's being made up to store options (basically, callbacks).
        var initCallbacks = options || {};

        var app = $.sammy(function() {
            // conf, plugins
            this.element_selector = container;
            this.use(Sammy.Mustache);
            this.use(Sammy.Session);
            //this.use(Sammy.Haml);
            this.xmpp = {
                "bosh":           "http://starafrica-dev.af83.com/xmpp",
                "domain":         "starafrica-dev.af83.com",
                "resource":       "af83chat",
                "userJID":        null,
                "userPassword":   null,
            };

            // flags
            this.abort = false;

            // user-defined helpers
            this.fn = {};

            // would-be middlewares (à-la Sammy)
            this.before(function() {
                //var that = this;
                // ensure connection
                // todo: reconnect upon hard disconnect
            });

            // routes
            this.get('#/', function() {
                that = this;
                
                //that.app.swap('');
                that.log('Fetching XMPP-Console index');
            });

            this.get('#/disconnect', function() {
                this.trigger('disconnect');
            });

            this.get('#/reconnect', function() {
                var that = this;

                that.app.trigger('disconnect');
                that.trigger('connect', initCallbacks);
            });

            this.post('#/send', function() {
                var that = this;
                var input = $('#console-inputarea', container).val();
                var error = false;

                $('#console-results .content', container).find('.new').removeClass('new');

                if (input.length > 0) {
                    if (input[0] === '<') {
                        var xml = Peek.text_to_xml(input);
                        if (xml) {
                            that.app.xmpp.conn.send(xml);
                            //$('#input').val('');
                        } else {
                            error = true;
                        }
                    } else if (input[0] === '$') {
                        try {
                            var builder = eval(input);
                            that.app.xmpp.conn.send(builder);
                            //$('#input').val('');
                        } catch (e) {
                            console.log(e);
                            error = true;
                        }
                    } else {
                        error = true;
                    }
                }

                if (error) {
                    $('#console-inputarea', container).animate({backgroundColor: "#EB2A3B", color: "#FFFFFF"}, 200);
                }
            });

            // bind XMPP and Peek callbacks
            this.bind('connected', function () {
                  var that = this;

                  that.app.log("connected!");
                  $('.button', container).removeAttr('disabled');
                  $('#console-inputarea', container).removeClass('disabled').removeAttr('disabled');
            });

            this.bind('disconnected', function () {
                  var that = this;

                  that.app.log("disconnected!");
                  $('.button', container).attr('disabled', 'disabled');
                  $('#console-inputarea', container).addClass('disabled').attr('disabled', 'disabled');
            });

            this.bind('disconnect', function() {
                  var that = this;

                  if (that.app.conn != undefined) {
                      that.app.conn.disconnect();
                      that.app.trigger('disconnected');
                  }
            });

            this.bind('initBehaviors', function() {
                var that = this;

                //var docHeight = $(document).height();
                //$('#xmpp-console').css("height", docHeight);

                var panelWidth = Math.floor($(document).width() / 5);
                $('#console-infos').panel({
                    collapseType: 'slide-left',
                    width: panelWidth + "px"
                });

                $('#console-shortcuts').panel({
                    collapseType: 'slide-right',
                    width: panelWidth + "px"
                });

                $('#console-inputarea', container).keypress(function () {
                    $(this).css({backgroundColor: '#F9F9F9', color: "#000000"});
                });
            });

            this.bind('stropheConnect', function(ev, data) {
                var that = this;
                
                that.app.log("STROPHE connection...")
                data.conn.connect(data.jid, data.password, function(status) {
                    that.app.log("STROPHE connection response received:");
                    that.app.log(status);

                    if (status === Strophe.Status.CONNECTED) {
                        that.app.trigger('connected');
                    } else if (status === Strophe.Status.DISCONNECTED) {
                        that.app.trigger('disconnected');
                    }
                });

                that.app.xmpp.conn = data.conn;
            });

            this.bind('connect', function(ev, params) {
                var that = this.app;
                that.log("connecting...");

                if (typeof(params.before) == "function") {
                    that.log("before connection");
                    params.before.call(that);
                    if (that.abort) {
                        container.fadeOut(1000, function() { $(this).empty().html("Auth. failed.").show(); });
                        throw {
                            type: 'XMPPConsoleError',
                            message: 'Error before connection. Aborting.'
                        };
                    }
                }

                var conn = new Strophe.Connection(
                    that.xmpp.bosh);

                if (typeof(params.after) == "function") {
                    that.log("after connection");
                    params.after.call(that);
                    if (that.abort) {
                        container.fadeOut(1000, function() { $(this).empty().html("Auth. failed.").show(); });
                        throw {
                            type: 'XMPPConsoleError',
                            message: 'Error after connection. Aborting.'
                        };
                    }
                }

                conn.xmlInput = function(body) {
                    Peek.show_traffic(body, 'incoming');
                };

                conn.xmlOutput = function(body) {
                    Peek.show_traffic(body, 'outgoing');
                };

                if ((that.xmpp.userJID == null) || (that.xmpp.userPassword == null)) {
                    var code = "<div id='login_dialog' class='hidden'>";
                    code    += "<label>JID: </label><br /><input type='text' id='jid'>";
                    code    += "<label>Password: </label><br /><input type='password' id='password'>";
                    code    += "</div>";
                    $(code).appendTo('body');

                    $('#login_dialog').dialog({
                        autoOpen: true,
                        draggable: false,
                        modal: true,
                        title: 'Connect to some XMPP server',
                        buttons: {
                            "Connect": function () {
                                var jid = $('#jid', this).val();
                                that.xmpp.userJID =      jid.split("@")[0],
                                that.xmpp.domain  =      jid.split("@")[1],
                                that.xmpp.userPassword = $('#password', this).val()
                                $('#password', this).val('');
                                $(this).dialog('close');

                                that.trigger('stropheConnect', {
                                    conn: conn,
                                    jid: that.xmpp.userJID,
                                    password: that.xmpp.userPassword
                                });
                            }
                        }
                    });
                } else {
                    if (that.xmpp.userJID && that.xmpp.userPassword) {
                        that.trigger('stropheConnect', {
                            conn: conn,
                            jid: that.xmpp.userJID,
                            password: that.xmpp.userPassword
                        });
                    } else {
                        console.log("Error with credentials... no jid and/or password supplied or fetched!");
                    }
                }
            });

            // init XMPP connection on startup
            this.bind('run', function() {
                var that = this;

                that.app.log("running!");

                that.app.trigger('initBehaviors');
                that.app.trigger('connect', initCallbacks);
            });

        });

        $(function() {
            // todo: really make this a template
            // must debug Sammy.Haml :(
            var code = '<div id="xmpp-console">';
            
            code    += '<div class="header">';
            code    += '<h2>XMPP Console</h2>';
            code    += '<div class="controls">';
            code    += '<a href="#/connect" id="console-controls-connect">connect</a>';
            code    += '<a href="#/reconnect" id="console-controls-reconnect">reconnect</a>';
            code    += '<a href="#/disconnect" id="console-controls-disconnect">disconnect</a>';
            code    += '</div>';
            code    += '</div>';
            
            code    += '<div class="column-left">';
            code    += '<div id="console-infos">';
            code    += '<h3>infos</h3>'
            code    += '<div>les infos...</div>'
            code    += '</div>';
            code    += '</div>';

            code    += '<div class="column-right">';
            code    += '<div id="console-shortcuts">';
            code    += '<h3>shortcuts</h3>'
            code    += '<div>les raccourcis...</div>'
            code    += '</div>';
            code    += '</div>';
            
            code    += '<div class="middle">';
            code    += '<div id="console-results">';
            code    += '<div class="content">';
            code    += '</div>';
            code    += '</div>';
            code    += '<div id="console-input">';
            code    += '<div class="content">';
            code    += '<form action="#/send" method="post">';
            code    += '<textarea id="console-inputarea" class="disabled" disabled="disabled"></textarea>';
            code    += '<input id="console-send" type="submit" value="Send stanza" disabled="disabled" class="button">';
            code    += '</form>';
            code    += '</div>';
            code    += '</div>';
            code    += '</div>'

            code    += '</div>';
            
            $(code).appendTo(container);

            app.run();
            return container;
        });
    };
})(jQuery);

