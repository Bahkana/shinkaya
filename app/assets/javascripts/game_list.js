var available_flags = ["kr", "jp", "cn"];


function defaultSettings(){
    var config = $("#user_config");
    var default_settings = { ruleset: "Japanese", rated:"true",
                             periods: "3",challengee: ""
                           }
    default_settings.size = config.attr("board-size");
    default_settings.time_settings = config.attr("game-time-settings");
    default_settings.time = config.attr("game-main-time");
    default_settings.bonus = config.attr("game-bonus");
    default_settings.byoyomi = config.attr("game-byoyomi");
    default_settings.title = config.attr("game-title");

    return default_settings;
}


function GameList(juggernaut){
    var that = this;

    // Juggernaut
    this.juggernaut = juggernaut;
    this.juggernaut.subscribe("FullGame_List", drawLists);

    // Buttons
    this.game_settings_button = $("#create-game");
    this.game_settings_button.click(showGameSettings);

    this.resume_game_button = $("#resume-game");

    this.close_game_button = $("#close-game");
    this.close_game_button.click(closeGame);

    this.open_sandbox_button = $("#create-sandbox");
    this.open_sandbox_button.click(openSandbox);

    // Lists buttons
    this.selected_list = "open";
    $("#game-list-play-button").click(function(){
        drawGameList(that.game_lists.open);
        $(this).siblings().removeClass("selected");
        $(this).addClass("selected");
        that.selected_list = "open";
    });
    $("#game-list-hot-button").click(function(){
        drawGameList(that.game_lists.hot);
        $(this).siblings().removeClass("selected");
        $(this).addClass("selected");
        that.selected_list = "hot";
    });
    $("#game-list-friend-button").click(function(){
        drawGameList(that.game_lists.friends_games);
        $(this).siblings().removeClass("selected");
        $(this).addClass("selected");
        that.selected_list = "friends-games";
    });

    $("#game-list-all-button").click(function(){
        drawGameList(that.game_lists.full, true);
        $(this).siblings().removeClass("selected");
        $(this).addClass("selected");
        that.selected_list = "full";
    });

    // Dialog
    this.dialog = $("<div id='game-list-dialog' title='"+$.i18n._("game_info")+"' style='display: none'></div>");

    // Setup game info
    this.game_info = new GameInfo();
    this.game_info.regular_callback = function(settings) {
        return openGame.call(this, settings);
    };
    this.game_info.correspondence_callback = function(settings) {
        return openCorrespondenceGame.call(this, settings);
    };
    this.game_info.draw_settings();

    // Game Lists
    this.game_lists = { open:[], hot:[], full:[]};

    this.friend_list = [];
    this.preview_boards ={};

    $.get("/users/friends", function(response){that.friend_list = JSON.parse(response)});
    // Functions
    var game_list = [];

    this.insert_action_panel = function() {
        var panel = $("<div id='action_panel'></div>").prependTo(that.html);
        panel.append(that.game_settings_button, that.close_game_button, /*that.switch_view_button,*/
                     that.resume_game_button, that.open_sandbox_button, that.dialog);
    }

    function drawOpenCloseButtons(games){
        var user_nick = that.juggernaut.meta.user_id;
        that.game_settings_button.hide();
        that.close_game_button.hide();
        that.resume_game_button.hide();

        for(var i = 0;i<games.full.length;i++){
            //ongoing game
            if(games.full[i].type == "Match" &&
              (games.full[i].black_player == user_nick || games.full[i].white_player == user_nick) &&
               is_game_ongoing(games.full[i])){
                that.resume_game_button.click(function(){
                    var game_url = games.full[i].link;
                    if (is_game_ongoing(games.full[i])){
                      var new_window = window.open(game_url,game_url,'')
                      if (window.focus) { new_window.focus() }
                      return false;
                    }
                })
                that.resume_game_button.show();
                return;
            }//game offer
            else if((games.full[i].type == "Match") &&
                   (games.full[i].owner == user_nick))
                   {

                that.close_game_button.show();
                return;
            }
        }
        //default
        that.game_settings_button.show();
    }

/*************************************** DRAWERS **************************************************/
    function drawLists(games){
        if(games.full){
            drawOpenCloseButtons(games);
            that.game_lists.full = games.full;
            that.game_lists.friends_games = [];
            for(var i=0; i<games.full.length;i++){
                if(that.friend_list.indexOf(games.full[i].owner) != -1 ||
                   that.friend_list.indexOf(games.full[i].black_player) != -1 ||
                   that.friend_list.indexOf(games.full[i].white_player) != -1){
                    that.game_lists.friends_games.push(games.full[i]);
                }

            }
            $("#game-list-friend-button").find("span").remove();
            if(that.game_lists.friends_games.length > 0){
                $("#game-list-friend-button").append("<span id='friend_activity_count' title='Friends activity count'>"+that.game_lists.friends_games.length+"</span>");
            }
        }
        if(games.hot){
            that.game_lists.hot = games.hot;
        }
        if(games.open){
            that.game_lists.open = games.open;
            var notification = 0;
            for(var i=0;i< games.open.length;i++){

                if(!KAYAGLOBAL.able_to_play(games.open[i])){
                    games.open[i].cant_play = true; //Skipping games the user cant play.

                }

                if(games.open[i].challengee == KAYAGLOBAL.username){
                    notification += 1;
                }else if(games.open[i].owner == KAYAGLOBAL.username){
                    notification +=1;
                }
            }
            $("#game-list-play-button").find("span").remove();
            if(notification > 0){
                $("#game-list-play-button").append("<span title='Challenges'>"+notification+"</span>");
            }
        }
        if(!games.hot && !games.open && !games.full){
            throw new Error("the game data must have hot/open/all categories!");
        }

        drawGameList(that.game_lists[that.selected_list], (that.selected_list == "full"));
    }

    function drawGameList(games, everything_tab) {
        console.assert(games != undefined, "Expected game list");
        if (games == undefined) {
            return false;
        }

        game_list = games;

        var gospeed_args = {
            //size: INI_SIZE,
            mode: "play_online",
            my_colour: "O",
            //div_id_board: "board",
            shower: "graphic",
            show_coords: false,
            draw_markers: false,
            draw_borders: false,
            draw_shadows: false,
            small_board_optimization: true,
            server_path_gospeed_root: "/gospeed/",
        };

        var match;
        var gl = $("#game-list-content ol");

        gl.find("div.Canvas").appendTo("#board_preview_holder");
        gl.find("li").remove();

        if (everything_tab) {
            var tab_header = $("#tpl-game-list-entries li.compact-header").clone()
            tab_header.find(".owner").hide();
            gl.append(tab_header);

            // Hide before draw: performance hack
            gl.hide();
        }

        var tmp;
        var group_name;
        var last_type = "";  // | For grouping in everything tab
        var last_state = ""; // |

        for (var i = 0, li = games.length; i < li; ++i) {
            // Skip correspondence games
            if (games[i].cant_play) {
                continue;
            }

            if (everything_tab) {
                if (last_type != games[i].type || (last_type == "Match" && last_state != games[i].state)) {
                    last_type = games[i].type;
                    if (last_type == "Match") {
                        last_state = games[i].state;
                        group_name = last_type + " (" + last_state + ")";
                    } else {
                        group_name = last_type;
                    }
                    tmp = $("#tpl-game-list-entries li.compact-title").clone();
                    tmp.find(".group").text(group_name);
                    gl.append(tmp);
                }
            }

            var game_item = gameToHTMLEntry(games[i], everything_tab);

            gl.append(game_item);

            if (game_item.find("div.board-preview").length) {
                game_item.find("div.board-preview").css({width:82, height:82});
                var ch = games[i].game_channel;
                if (that.preview_boards[ch]) {
                    game_item.find("div.board-preview").remove();
                    preview_board = $("#"+ch);
                    game_item.find("a.observe-game").append(preview_board);
                } else {
                    gospeed_args.size = games[i].size || 19;
                    gospeed_args.div_id_board = game_item.find("div.board-preview").attr("id");
                    that.preview_boards[ch] = new GoSpeed(gospeed_args);
                    juggernaut.subscribe(ch, function(data) {
                        that.preview_boards[data.game_channel].diff_update_game(data);
                    });
                }
            }

            if ((games[i].type == "Match") && !is_game_ongoing(games[i])) {
                // Trail button
                game_item.find("a.trail-game, a.compact-link").click(function(e) {
                    e.preventDefault();
                    var load_url = "game/loading/" + $(this).attr("match-id") + "/";
                    var new_window = window.open(load_url, load_url, '');
                });
                // Start button
                convertToStartAnchor(game_item.find("a.play-game"));
            } else {
                // Observe "button"
                game_item.find("a.status-bar, a.observe-game, a.compact-link").click(function(event) {
                    var game_url = $(event.target).attr("href") ||
                                   $(event.target).parents("a").attr("href"); //sometimes the click lands on the spans
                    var new_window = window.open(game_url, game_url, '')
                    if (window.focus) {
                        new_window.focus();
                    }
                    return false;
                });
            }
        }

        if (everything_tab) {
            // Show after draw: performance hack
            gl.show();
        }

        updateGameListContent();
    }

    function convertToStartAnchor(anchor) {
        anchor.click(function(eventObject) {
            var clicked_anchor = $(eventObject.currentTarget);
            var game_link = startGame($(eventObject.currentTarget).attr('href'));
            if (game_link) {
                clicked_anchor.attr('href', game_link);
                return true;
            }
            return false;
        });
    }

    function is_game_ongoing(game){
       return game.state == "playing";
    }

    this.open_challenge= function(challengee){
        //hardcoding the challenge
        $("#game-info-div-regular input[data-field='challengee']").val(challengee).change();
        showGameSettings()
    }

    function openGame(settings) {
        var should_open_tab = false;
        var game_link = "";
        $.ajax({
            url: "/game/open_game",
            data: settings,
            async: false,
            type: "POST",
            success: function(data) {
                if (data.indexOf("/game/loading") != -1) {
                    that.game_settings_button.hide();
                    that.close_game_button.show();
                    should_open_tab = true;
                    game_link = data;
                }
                if (data.indexOf("Match could not be created") != -1) {
                    that.game_info.draw_notice($.i18n._("could_not_be_created"));
                }
            },
            error: function(data) {
                that.game_info.draw_notice(data.responseText);
            }
        });
        if (should_open_tab) {
            var new_window = window.open(game_link, game_link, '');
            if (window.focus) {
                new_window.focus();
            }
            that.loading_window = new_window;
        }
        return should_open_tab;
    }

    function openCorrespondenceGame(settings) {
        $.ajax({
            url: "/game/correspondence/open_game",
            data: settings,
            async: true,
            type: "POST",
            success: function(data) {
                if (data.indexOf("/game/correspondence/") != -1) {
                    that.game_info.close_dialog();
                    $("#correspondence_button").click();
                }
                if (data.indexOf("Correspondence Match could not be created") != -1) {
                    that.game_info.draw_notice($.i18n._("could_not_be_created"));
                }
            },
            error: function(data) {
                that.game_info.draw_notice(data.responseText);
            }
        });
    }

    var already_posting = false;
    function openSandbox(){
        if(already_posting){ return;}
        already_posting = true;
        $.ajax({
            url: "/game/sandbox/create/",
            async: false,
            type: "POST",
            success: function(load_url) {
                var new_window = window.open(load_url, load_url, '')
                if (window.focus) {
                    new_window.focus();
                }
            },
            complete: function(data){
            already_posting = false;
            }
        });
    }

    function closeGame() {
        $.post("game/close_game");
        that.close_game_button.hide();
        that.game_settings_button.show();
        that.loading_window.close();
    }

    // Generates HTML from game info
    this.game_to_html_entry = gameToHTMLEntry;
    function gameToHTMLEntry(game, compact) {

        var entry; // Holds the result

        // Check compact mode
        if (compact) {
            entry = $("#tpl-game-list-entries li.compact").clone();
            entry.addClass(game.type.toLowerCase());
            var rank_tmp;
            switch (game.type) {
                case "Match":
                    if (game.state == "playing") {
                        rank_tmp = $("<b></b>").text("(" + game.white_rank + ")");
                        entry.children(".white").text(game.white_player).append(rank_tmp);
                        rank_tmp = $("<b></b>").text("(" + game.black_rank + ")");
                        entry.children(".black").text(game.black_player).append(rank_tmp);
                        entry.children(".owner").hide();
                        entry.children(".handicap").text((game.handicap > 1 ? game.handicap : "Even"));
                        entry.children("a.compact-link").attr("href", game.link);
                    } else if (game.state =="open") {
                        rank_tmp = $("<b></b>").text("(" + game.owner_rank + ")");
                        entry.children(".white").hide();
                        entry.children(".black").hide();
                        entry.children(".owner").text(game.owner).append(rank_tmp);
                        var stones = KAYAGLOBAL.calculate_game_handicap(game, KAYAGLOBAL.rank, game.owner_rank);
                        entry.children(".handicap").text((stones > 1 ? stones : "Even"));
                        entry.children("a.compact-link").attr("match-id", game.id);
                    }
                    entry.addClass(game.state);
                break;
                case "Replay":
                case "Broadcast":
                    entry.children(".white").text(game.white_player);
                    if (game.white_rank) {
                        entry.children(".white").append($("<b></b>").text("(" + game.white_rank + ")"));
                    }
                    entry.children(".black").text(game.black_player);
                    if (game.black_rank) {
                        entry.children(".black").append($("<b></b>").text("(" + game.black_rank + ")"));
                    }
                    entry.children(".owner").hide();
                    if (game.handicap) {
                        entry.children(".handicap").text((game.handicap > 1 ? game.handicap : "Even"));
                    } else {
                        entry.children(".handicap").text("-");
                    }
                    entry.children("a.compact-link").attr("href", game.link);
                break;
                case "Sandbox":
                    rank_tmp = $("<b></b>").text("(" + game.owner_rank + ")");
                    entry.children(".white").hide();
                    entry.children(".black").hide();
                    entry.children(".owner").text(game.owner).append(rank_tmp);
                    entry.children(".handicap").text("-");
                    entry.children("a.compact-link").attr("href", game.link);
                break;
            }
            entry.children(".size").text((game.size == undefined ? "-" : game.size));
            entry.children(".moves").text((game.move_number == undefined ? "-" : game.move_number));
            entry.children(".observers").text((game.observers == undefined ? "-" : game.observers));
        } else {
            // Generate the result depending on the game type
            console.assert(game.type != undefined, "Expected game.type");
            switch (game.type) {
                case "Match":
                    console.assert(game.state != undefined, "Expected game.state");
                    if (game.state == "playing") {
                        entry = $("#tpl-game-list-entries li.ongoing-game").clone();

                        // Player icons
                        console.assert(game.black_player != undefined, "Expected game.black_player");
                        console.assert(game.black_gravatar != undefined, "Expected game.black_gravatar");
                        console.assert(game.white_player != undefined, "Expected game.white_player");
                        console.assert(game.white_gravatar != undefined, "Expected game.white_gravatar");
                        var tmp = entry.find("a.black");
                        tmp.attr("data-user", game.black_player);
                        tmp.children("img").attr("src", 'https://www.gravatar.com/avatar/' + game.black_gravatar + '?default=mm&amp;rating=pg&amp;size=80');

                        tmp = entry.find("a.white");
                        tmp.attr("data-user", game.white_player);
                        tmp.children("img").attr("src", 'https://www.gravatar.com/avatar/' + game.white_gravatar + '?default=mm&amp;rating=pg&amp;size=80');

                        // Player names and ranks
                        console.assert(game.black_rank != undefined, "Expected game.black_rank");
                        console.assert(game.white_rank != undefined, "Expected game.white_rank");
                        tmp = entry.find("div.players a.black");
                        tmp.children("span").text(game.black_player)
                        if (game.black_rank) {
                            tmp.children("b").text('(' + game.black_rank + ')');
                        }

                        tmp = entry.find("div.players a.white");
                        tmp.children("span").text(game.white_player)
                        if (game.white_rank) {
                            tmp.children("b").text('(' + game.white_rank + ')');
                        }

                        // Guess move number
                        var move_number = "0";
                        if (game.move_number) {
                            move_number = game.move_number;
                        }

                        // Status bar
                        console.assert(game.observers != undefined, "Expected game.observers");
                        console.assert(game.time_settings.speed_class != undefined, "Expected game.time_settings.speed_class");

                        tmp = entry.children(".status-bar");
                        tmp.children("span.age").text("Move " + move_number);
                        tmp.children("span.speed").text(game.time_settings.speed_class);
                        tmp.children("span.observers").text('(' + (game.observers) + ')');

                        // Link
                        console.assert(game.link != undefined, "Expected game.link");
                        entry.children("a.observe-game").attr("href", game.link);
                        entry.find("div.board-preview").attr("id", game.game_channel);

                        entry.children("a.status-bar").attr("href", game.link);
                    } else if(game.state =="open"){
                        var challengee;

                        if (game.black_player == game.owner) {
                            challengee = game.white_player;
                        } else if (game.white_player == game.owner) {
                            challengee = game.black_player;
                        }

                        entry = $("#tpl-game-list-entries li.open-game").clone();

                        // Player icons
                        console.assert(game.owner != undefined, "Expected game.owner");
                        console.assert(game.owner_gravatar != undefined, "Expected game.owner_gravatar");
                        var tmp = entry.find("a.owner");
                        tmp.attr("data-user", game.owner);
                        tmp.children("img").attr("src", 'https://www.gravatar.com/avatar/' + game.owner_gravatar + '?default=mm&amp;rating=pg&amp;size=80');

                        // Player names and ranks
                        console.assert(game.owner_rank != undefined, "Expected game.owner_rank");
                        tmp = entry.find("div.players a.owner");
                        tmp.children("span").text(game.owner)
                        if (game.owner_rank) {
                            tmp.children("b").text('(' + game.owner_rank + ')');
                        }

                        // Challenge or Waiting text
                        var wait_text = entry.find("p.waiting span");
                        if (game.league == undefined && game.challengee && game.challenge_conditions) {
                            wait_text.text($.i18n._("challenges_user_conditions",
                                                    [game.challengee,
                                                    game.challenge_conditions.opponent_color]
                                                   )
                                          );
                        } else if (game.league == undefined && game.challengee) {
                            wait_text.text($.i18n._("challenges_user", [game.challengee]));
                        } else if (game.league == undefined){
                            wait_text.text($.i18n._("waiting_for_opponent"));
                        } else if(game.league && game.challengee){
                            wait_text.text($.i18n._("league_match_for_user", [game.league, game.challengee]));
                        } else if (game.league){
                            wait_text.text($.i18n._("league_open_game", [game.league]));
                        }

                        // Status bar
                        console.assert(game.rated != undefined, "Expected game.rated");
                        console.assert(game.size != undefined, "Expected game.size");
                        console.assert(game.time_settings.title != undefined, "Expected game.time_settings.title");
                        tmp = entry.children(".status-bar");
                        tmp.children("span.type").text(game.size + "x" + game.size + " (" + (game.rated ? "Rated" : "Free") + ")");
                        tmp.children("span.time").text(game.time_settings.title);

                        var stones = KAYAGLOBAL.calculate_game_handicap(game, KAYAGLOBAL.rank, game.owner_rank);
                        var komi_text = "";

                        if(game.challenge_conditions){
                            komi_text = "and "+game.challenge_conditions.komi +" Komi";
                        }
                        if (stones > 1) {
                            tmp.children("span.handicap").text(stones + " Stones " + komi_text);
                        } else {
                            tmp.children("span.handicap").text("Even " + komi_text);
                        }

                        // Link
                        console.assert(game.link != undefined, "Expected game.link");
                        console.assert(game.id != undefined, "Expected game.id");
                        entry.find("a.play-game").attr("href", game.link);
                        entry.find("a.trail-game").attr("match-id", game.id);
                    }
                break;
                case "Replay":
                    entry = $("#tpl-game-list-entries li.replay-game").clone();

                    // Player icons
                    console.assert(game.black_country != undefined, "Expected game.black_country");
                    console.assert(game.white_country != undefined, "Expected game.white_country");

                    var tmp = entry.find("div.black");
                    if (game.black_country == undefined || $.inArray(game.black_country, available_flags) == -1) {
                        tmp.children("img").hide();
                    } else {
                        tmp.children("img").attr('src', '/img/flags/' + game.black_country + '.png');
                    }

                    tmp = entry.find("div.white");
                    if (game.white_country == undefined || $.inArray(game.white_country, available_flags) == -1) {
                        tmp.children("img").hide();
                    } else {
                        tmp.children("img").attr('src', '/img/flags/' + game.white_country + '.png');
                    }

                    // Player names and ranks
                    console.assert(game.black_player != undefined, "Expected game.black_player");
                    console.assert(game.white_player != undefined, "Expected game.white_player");
                    tmp = entry.find("div.players div.black");
                    tmp.children("span").text(game.black_player)
                    if (game.black_rank) {
                        tmp.children("b").text('(' + game.black_rank + ')');
                    }

                    tmp = entry.find("div.players div.white");
                    tmp.children("span").text(game.white_player)
                    if (game.white_rank) {
                        tmp.children("b").text('(' + game.white_rank + ')');
                    }

                    // Status bar
                    console.assert(game.observers != undefined, "Expected game.observers");
                    //console.assert(game.speed != undefined, "Expected game.speed");
                    // TODO: Remove assign
                    if (game.speed == undefined) {
                        game.speed = 40;
                    }
                    if (game.observers == undefined) {
                        game.observers = 0;
                    }

                    tmp = entry.children(".status-bar");
                    tmp.children("span.speed").text("at " + (game.speed) + "s.");
                    tmp.children("span.observers").text('(' + (game.observers) + ')');

                    // Link
                    console.assert(game.link != undefined, "Expected game.link");
                    entry.children("a.observe-game").attr("href", game.link);
                    entry.find("div.board-preview").attr("id", game.game_channel);
                    entry.children("a.status-bar").attr("href", game.link);

                break;
                case "Sandbox":
                    entry = $("#tpl-game-list-entries li.sandbox-game").clone();

                    // Player icons
                    console.assert(game.owner != undefined, "Expected game.owner");
                    console.assert(game.owner_gravatar != undefined, "Expected game.owner_gravatar");
                    var tmp = entry.find("a.owner");
                    tmp.attr("data-user", game.owner);
                    tmp.children("img").attr("src", 'https://www.gravatar.com/avatar/' + game.owner_gravatar + '?default=mm&amp;rating=pg&amp;size=80');

                    // Player names and ranks
                    console.assert(game.owner_rank != undefined, "Expected game.owner_rank");
                    tmp = entry.find("div.players a.owner");
                    tmp.children("span").text(game.owner)
                    if (game.owner_rank) {
                        tmp.children("b").text('(' + game.owner_rank + ')');
                    }

                    // Karma text
                    console.assert(game.owner_karma != undefined, "Expected game.owner_karma");
                    // TODO: remove assign
                    if (game.owner_karma == undefined) {
                        game.owner_karma = 12;
                    }
                    tmp = entry.find("p.karma span").text(game.owner_karma + " Karma");

                    // Purpose
                    console.assert(game.purpose_text != undefined, "Expected game.purpose_text");
                    // TODO: remove assign
                    if (game.purpose_text == undefined) {
                        game.purpose_text = "De&shy;mon&shy;stra&shy;tion";
                    }
                    entry.find(".purpose-bar span").html(game.purpose_text);

                    // Status bar
                    console.assert(game.observers != undefined, "Expected game.observers");
                    console.assert(game.age != undefined, "Expected game.age");
                    // TODO: remove assign
                    if (game.observers == undefined) {
                        game.observers = 0;
                    }

                    tmp = entry.children(".status-bar");
                    tmp.children("span.age").text(game.age + " min(s)");
                    tmp.children("span.observers").text('(' + (game.observers) + ')');

                    // Link
                    console.assert(game.link != undefined, "Expected game.link");
                    entry.children("a.observe-game").attr("href", game.link);
                    entry.find("div.board-preview").attr("id", game.game_channel);

                    entry.children("a.status-bar").attr("href", game.link);

                break;
                case "Broadcast":
                    entry = $("#tpl-game-list-entries li.broadcast-game").clone();

                    // Player icons
                    console.assert(game.black_country != undefined, "Expected game.black_country");
                    console.assert(game.white_country != undefined, "Expected game.white_country");

                    var tmp = entry.find("div.black");
                    if (game.black_country == undefined || $.inArray(game.black_country, available_flags) == -1) {
                        tmp.children("img").hide();
                    } else {
                        tmp.children("img").attr('src', '/img/flags/' + game.black_country + '.png');
                    }

                    tmp = entry.find("div.white");
                    if (game.white_country == undefined || $.inArray(game.white_country, available_flags) == -1) {
                        tmp.children("img").hide();
                    } else {
                        tmp.children("img").attr('src', '/img/flags/' + game.white_country + '.png');
                    }

                    // Player names and ranks
                    console.assert(game.black_player != undefined, "Expected game.black_player");
                    console.assert(game.white_player != undefined, "Expected game.white_player");
                    tmp = entry.find("div.players div.black");
                    tmp.children("span").text(game.black_player)
                    if (game.black_rank) {
                        tmp.children("b").text('(' + game.black_rank + ')');
                    }

                    tmp = entry.find("div.players div.white");
                    tmp.children("span").text(game.white_player)
                    if (game.white_rank) {
                        tmp.children("b").text('(' + game.white_rank + ')');
                    }

                    // Broadcaster
                    console.assert(game.owner != undefined, "Expected game.owner");
                    console.assert(game.owner_gravatar != undefined, "Expected game.owner_gravatar");
                    var tmp = entry.find("a.owner");
                    tmp.attr("data-user", game.owner);
                    tmp.children("img").attr("src", 'https://www.gravatar.com/avatar/' + game.owner_gravatar + '?default=mm&amp;rating=pg&amp;size=80');

                    // Player names and ranks
                    console.assert(game.owner_rank != undefined, "Expected game.owner_rank");
                    // TODO: remove assign
                    if (game.owner_rank == undefined) {
                        game.owner_rank = "7d";
                    }

                    tmp = entry.find("a.broadcaster");
                    tmp.attr("data-user", game.owner);
                    tmp.children("span").text(game.owner)
                    if (game.owner_rank) {
                        tmp.children("b").text('(' + game.owner_rank + ')');
                    }

                    // Status bar
                    console.assert(game.observers != undefined, "Expected game.observers");
                    // TODO: remove assign
                    if (game.observers == undefined) {
                        game.observers = 0;
                    }

                    tmp = entry.children(".status-bar");
                    tmp.children("span.observers").text('(' + (game.observers) + ')');

                    // Link
                    console.assert(game.link != undefined, "Expected game.link");
                    entry.children("a.status-bar").attr("href", game.link);
                break;
            }
        }

        return entry;
    }


    function startGame(url) {
        var result;
        $.ajax({
            url: url + "start_game/",
            success: function(response){
                result = response;
            },
            error: function(response){
                result = false;
            },
            type: "POST",
            async: false,
        });
        return result;
    }

    function showGameSettings() {
        //this should load settings from user profile or such.
        //that.game_info.draw_settings();
        that.game_info.open_dialog();
    }

}


function GameInfo(regular_callback, correspondence_callback) {
    //  Definitions
        var that = this;
        this.html = $('div#game-info');
        this.tabs = this.html.children("div.tabs:first");

        this.regular_callback = regular_callback;
        this.correspondence_callback = correspondence_callback;

        var original_rated_values = [];

    //  Events
        //  Regular Tab
            $("#time-system-help-button").button({
                text: false,
                icons: {
                    primary: 'ui-icon-help',
                },
                label: "Time systems explained",
            }).click(function() {
                $("#time_systems_help_dialog").dialog({
                    position: "right",
                    resizable: false,
                });
                $("#leagues_help_dialog").dialog("close");
            });
        //  --- Regular tab

        //  League tab
            $("#league-help-button").button({
                text: false,
                icons: {
                    primary: 'ui-icon-help',
                },
                label: "Leagues explained",
            }).click(function() {
                $("#leagues_help_dialog").dialog({
                    position: "right",
                    resizable : "false"
                });
                $("#time_systems_help_dialog").dialog("close");
            });

            // League tab select
            var league_info_updated = false;
            var league_tab = this.html.find("#game-info-div-league");
            var league_combo = league_tab.find("#game-info-league");
            var league_challenge = league_tab.find("#league-challenge");
            var league_challenge_wait = league_tab.find("#league-challenge-wait");
            this.html.find("#game-info-tab-league").click(function() {
                league_info_updated = false;
                league_tab.children().hide();
                league_tab.find("div.league-info").show();
                league_tab.find("div.league-info span").text("Getting league info...");
                league_tab.find("div.league-info img").show();
                $.ajax({
                    url: "/my_leagues.json",
                    type: "GET",
                    dataType: "json",
                    success: function(data) {
                        if (data.length <= 0) {
                            league_tab.find("div.league-info span").text($.i18n._("You are not subscribed to any league."));
                            var linkLeague = $('<a href="javascript: void(0);">' + $.i18n._("Click here for info") + '</a>');
                            linkLeague.click(function() {
                                $("#leagues_help_dialog").dialog({
                                    position: "right",
                                    resizable : "false"
                                });
                                $("#time_systems_help_dialog").dialog("close");
                            });
                            league_tab.find("div.league-info span").append("<br /><br />").append(linkLeague);
                            league_tab.find("div.league-info img").hide();
                        } else {
                            league_combo.html("");
                            for (var i = 0, li = data.length; i < li; ++i) {
                                league_combo.append('<option value="' + data[i] + '">' + data[i] + '</option>');
                            }
                            league_tab.children().hide();
                            league_tab.children("table, div.button-panel").show();
                            league_info_updated = true;
                            league_combo.change();
                        }
                    },
                    error: function() {
                    }
                });
            });
            league_combo.change(function() {
                if (league_info_updated) {
                    league_challenge.attr("disabled", true);
                    league_challenge_wait.show();
                    $.ajax({
                        url: "/league/" + league_combo.val() + "/players",
                        type: "GET",
                        dataType: "json",
                        success: function(data) {
                            league_challenge.children(":not(:first)").remove();
                            for (var i = 0, li = data.length; i < li; ++i) {
                                if (data[i].nickname != KAYAGLOBAL.username) {
                                    league_challenge.append('<option value="' + data[i].nickname + '">' + data[i].nickname + ' (' + data[i].rank + ')' + '</option>');
                                }
                            }
                            league_challenge.attr("disabled", false);
                            league_challenge_wait.hide();
                        },
                        error: function(data) {
                        },
                    });
                }
            });
        //  --- League tab

        //  Global
            // Cancel buttons
            this.html.find("a.cancel").click(function() {
                that.close_dialog();
            });

            // Save and Start
                //  Regular
                this.html.find("div.tabs > div#game-info-div-regular > div.button-panel > a.save-and-start").click(function() {
                    var settings = {
                        settings: that.settings(),
                    };
                    if (settings.settings.challenge_conditions != undefined) {
                        settings.settings.challenge_conditions.komi += ".5"; // Hakish isn't it?
                    }
                    if (settings.settings.time_settings.time != undefined) {
                        settings.settings.time_settings.time *= 60;
                    }
                    that.call_to_open(settings, that.regular_callback);
                });

                //  Regular
                this.html.find("div.tabs > div#game-info-div-correspondence > div.button-panel > a.save-and-start").click(function() {
                    var settings = {
                        settings: that.settings(),
                    };
                    if (settings.settings.challenge_conditions != undefined) {
                        settings.settings.challenge_conditions.komi += ".5"; // Hakish isn't it?
                    }
                    var time_settings = settings.settings.time_settings;
                    if (time_settings.time != undefined) {
                        time_settings.time *= 86400;
                    }
                    if (time_settings.bonus != undefined) {
                        time_settings.bonus *= 3600;
                    }
                    if (time_settings.limit != undefined) {
                        time_settings.limit *= 86400;
                    }

                    that.call_to_open(settings, that.correspondence_callback);
                });
            //  ---

            // Start (league)
            this.html.find("div.tabs > div#game-info-div-league > div.button-panel > a.start").click(function() {
                var settings = that.settings();
                that.call_to_open(settings, that.regular_callback);
            });

            this.call_to_open = function(settings, callback) {
                var res = callback(settings);
                if (res) {
                    this.close_dialog();
                }
                return res;
            };

            // Time system change
            this.html.find(".game-info-time-system").change(function() {
                var elem = $(this);
                var panel = elem.parents(".game-info-panel");
                var time_system = elem.val();
                panel.find(".game-info-ot-fischer").hide();
                panel.find(".game-info-ot-byoyomi").hide();
                panel.find(".game-info-main-time").show();
                if (time_system == "fischer" || time_system == "correspondence_fischer") { panel.find(".game-info-ot-fischer").show(); }
                if (time_system == "byoyomi") { panel.find(".game-info-ot-byoyomi").show(); }
                if (time_system == "free") { panel.find(".game-info-main-time").hide(); }
            });

            // Size change
            this.html.find(".game-info-size").change(function(){
                var panel = $(this).parents(".game-info-panel");
                updateRated(panel);
            });

            // onOpen challenge conditions
            this.html.find(".game-info-challenge-conditions a").click(function() {
                var elem = $(this);
                if (!elem.parent().hasClass("disabled")) {
                    updateConditionsPanel(elem);
                }
            });

            // Challengee change
            this.html.find("input[data-field=challengee]").bind("keyup change", function() {
                var elem = $(this);
                var target = elem.parents(".game-info-panel").find(".game-info-challenge-conditions");
                if (elem.val() != "") {
                    target.removeClass("disabled");
                    // Disable handicap stone gap
                    elem.parents(".game-info-panel").find("select[data-field^=handicap_stones_gap]").attr("disabled", true);
                } else {
                    target.removeClass("displayed").addClass("disabled");
                    updateConditionsPanel(elem);
                    // Enable handicap stone gap
                    elem.parents(".game-info-panel").find("select[data-field^=handicap_stones_gap]").attr("disabled", false);
                }
            });

            // Rated change
            this.html.find(".game-info-rated").change(function() {
                var elem = $(this);
                var panel = elem.parents(".game-info-panel");
                if (panel.find(".game-info-size").val() == "19" && !panel.find(".game-info-challenge-conditions").hasClass("displayed")) {
                    original_rated_values[panel.attr("panel-type")] = elem.attr("checked");
                }
            });

            function updateConditionsPanel(button) {
                button = $(button);
                var par = button.parent();
                var panel = button.parents(".game-info-panel");
                var target = par.siblings(".game-info-conditions-panel");
                if (par.hasClass("disabled") || par.hasClass("displayed")) {
                    target.find("[data-field]").attr("disabled", "disabled");
                    target.slideUp(function() {
                        that.center_dialog();
                    });
                    par.removeClass("displayed");
                    updateRated(panel);
                } else {
                    target.find("[data-field]").removeAttr("disabled", "");
                    par.addClass("displayed");
                    target.slideDown(function() {
                        that.center_dialog();
                    });
                    updateRated(panel);
                }
            }

            function updateRated(panel) {
                if (panel.find(".game-info-size").val() == "19" && !panel.find(".game-info-challenge-conditions").hasClass("displayed") && original_rated_values[panel.attr("panel-type")]) {
                    panel.find(".game-info-rated").attr("checked", true);
                } else {
                    panel.find(".game-info-rated").attr("checked", false);
                }
            }

        //  --- Global
    //  --- Events

    //  Labels and styles
        this.tabs.tabs();
        this.html.find("#game-info-tab-regular").text($.i18n._("Regular"));
        this.html.find("#game-info-tab-league").text($.i18n._("League"));
        this.html.find("#game-info-tab-correspondence").text($.i18n._("Correspondence"));
        this.html.find("a.save-and-start").text($.i18n._("save_and_start")).button();
        this.html.find("a.start").text($.i18n._("Start")).button();
        this.html.find("a.cancel").text($.i18n._("Cancel")).button();
    //  ---

    //  Config Dialog
        this.html.dialog({
            autoOpen: false,
            resizable: false,
            draggable: false,
            modal: true,
            width: "auto",
            title: $.i18n._("game_settings"),
            open: function() {
                $(this).parent().addClass("popup-visible");
            },
            close: function() {
                that.draw_settings();
                that.tabs.tabs("select", "#game-info-div-regular");
                $(this).parent().removeClass("popup-visible");
                $("#time_systems_help_dialog").dialog("close");
                $("#leagues_help_dialog").dialog("close");
            },
        });
    //  ---

    //  Public methods
        this.close_dialog = function() {
            this.html.dialog("close");
        };

        this.open_dialog = function() {
            this.html.dialog("open");
        };

        this.center_dialog = function() {
            this.html.dialog("option", "position", ["center", "center"]);
        };

        this.draw_settings = function(settings) {
            settings = settings || defaultSettings();
            // Regular panel specific
            var regular_panel = this.html.find(".game-info-panel[panel-type=regular]");
            regular_panel.find(".game-info-challenge").val("");
            regular_panel.find(".game-info-title").val(settings.title);
            regular_panel.find(".game-info-size").val(settings.size);
            regular_panel.find(".game-info-rated").val(settings.rated);
            regular_panel.find(".game-info-ruleset").val(settings.ruleset);
            regular_panel.find(".game-info-time-system").val(settings.time_settings);
            regular_panel.find(".game-info-main-time input").val(settings.time / 60); // Seconds to minutes
            if (settings.bonus) {
                regular_panel.find(".game-info-ot-fischer input").val(settings.bonus);
            }
            if (settings.byoyomi) {
                regular_panel.find(".game-info-ot-byoyomi input[data-field=time_settings-byoyomi]").val(settings.byoyomi);
                regular_panel.find(".game-info-ot-byoyomi input[data-field=time_settings-periods]").val(settings.periods);
            }

            // Correspondence specific
            var correspondence_panel = this.html.find(".game-info-panel[panel-type=correspondence]");
            correspondence_panel.find(".game-info-challenge").val("");
            correspondence_panel.find(".game-info-size").val("19");
            correspondence_panel.find(".game-info-rated").val("true");
            correspondence_panel.find(".game-info-ruleset").val("Japanese");
            correspondence_panel.find(".game-info-time-system").val("correspondence_fischer");
            correspondence_panel.find(".game-info-main-time input").val(5);
            correspondence_panel.find(".game-info-ot-fischer input[data-field=time_settings-bonus]").val(24);
            correspondence_panel.find(".game-info-ot-fischer input[data-field=time_settings-limit]").val(7);

            // Global
            original_rated_values = {
                "regular": settings.rated,
                "correspondence": true,
            };
            this.html.find(".game-info-time-system").change();
            that.draw_notice("");
        };

        this.settings = function() {
            var settings = {};

            // Selects elements with attribute data-field from current selected tab
            this.tabs.find("div.ui-tabs-panel:not(.ui-tabs-hide) [data-field]").each(function(id, elem) {
                elem = $(elem);
                if (!elem.attr("disabled")) {
                    var field = elem.attr("data-field");
                    var group;
                    if (field.indexOf("-") > -1) {
                        group = field.substr(0, field.indexOf("-"));
                        if (settings[group] == undefined) {
                            settings[group] = {};
                        }
                        field = field.substr(field.indexOf("-") + 1);
                    }
                    var target;
                    if (group != undefined) {
                        target = settings[group];
                    } else {
                        target = settings;
                    }
                    if (elem.attr("type") == "checkbox") {
                        target[field] = !!elem.attr("checked");
                    } else {
                        target[field] = elem.val();
                    }
                }
            });

            return settings;
        };

        this.draw_notice = function(message) {
            this.tabs.find("div.ui-tabs-panel:not(.ui-tabs-hide) span.notice").text(message);
        };
    //  --- Public methods

    return this;
}

