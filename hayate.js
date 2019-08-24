const Discord = require("discord.js");
const client = new Discord.Client();
const config = require("./config.json");
const twitchConfig = __dirname + "/twitchConfig.json"
const textExplanation = __dirname + "/textExplanationFirstTime.json"
const incomingMessagesFile = config.incomingMessagesDir + "/incomingMessages"
const fs = require("fs");
const http = require("http");
const https = require("https");
const _ = require('underscore');
const timeout = 2 * 60 * 100;
const interval = 45 * 1000; // The interval between polling twitch

const twilioAccountSid = 'ACfae78cc76df706fc48fbf9187f155f52';
const twilioAuthToken = 'e834adf31f439a12996c6f6da81ef978';
const twilioClient = require('twilio')(twilioAccountSid, twilioAuthToken);

var servers = [];
var authKeys = {
  "177972371284557825": "7F438F01",//Carlo
  "184488644831084564": "58A207B6",//Estella
  "76050438364856320": "2CCD8B54",//Senegos
  "76132735151779840": "DBECC52D",//Cap'n Skraggs
  "188824710010765312": "B7B876F2",//Timdore
  "249093742558969858": "6759EEC4",//Mr. Frog
  "143993628207874048": "7FCCBBD3",//Eldon
  "143129909282340864": "137CB233"//Vindir
}

var msgAlias = {
  "trevor": "FroggyP",
  "katy": "inktho",
  "jon":"Horsejoke",
  "liang":"Liang",
  "dkim":"dkim",
  "colin":"Intelligent Malfestio"
}

client.login(config.token).then((token)=>{
    if(token){
      var data = "[]"
      fs.writeFile(textExplanation, data, { flag: 'wx' }, function (err) {
        if (err) {}
      });
        // printLog("Logged in with token " + token);
        printLog("Reading Twitch config file file " + twitchConfig);
        // var file = fs.readFileSync(channelPath, {encoding:"utf-8"});
        // servers = JSON.parse(file);
        var twitchConfigFile = fs.readFileSync(twitchConfig, {encoding:"utf-8"});
        servers = JSON.parse(twitchConfigFile);

        printLog(servers)

        // tick once on startup
        checkTwitchChannelsTick();
        setInterval(checkTwitchChannelsTick, interval);
    }else{
        printLog("An error occured while loging in:", err);
        process.exit(1);
    }
});;

/*
  Twitch
*/
function callApi(server, twitchChannel, callback, getStreamInfo){
    var opt;
    try {
        var apiPath;
        // if(getStreamInfo){
        //   //api.twitch.tv/helix/streams?user_login=pandaxgaming
        //     apiPath = "/helix/streams?user_login=" + twitchChannel.name.trim();
        // }else{
        //     apiPath = "/helix/users?login=" + twitchChannel.name.trim();
        // }
        if(getStreamInfo){
            apiPath = "/kraken/streams/" + twitchChannel.id;
        }else{
            apiPath = "/kraken/channels/" + twitchChannel.id;
        }
        opt = {
            host: "api.twitch.tv",
            path: apiPath,
            headers: {
                "Client-ID": config.twitchClientID,
                Accept: "application/vnd.twitchtv.v5+json"

            }
        };
    }
    catch(err){
        printLog(err);
        return;
    }

    https.get(opt, (res)=>{
        var body = "";

        res.on("data", (chunk)=>{
            body += chunk;
        });

        res.on("end", ()=>{
            var json;
            try {
                json = JSON.parse(body);
            }
            catch(err){
                printLog(err);
                return;
            }
            if(json.status == 404){
                callback(server, undefined, undefined);
            }else{
                callback(server, twitchChannel, json);
            }
        });

    }).on("error", (err)=>{
        printLog(err);
    });
}


function apiCallback(server, twitchChannel, res){
    // if(res && !twitchChannel.online && res.data.length > 0 &&
    if(res && !twitchChannel.online && res.stream &&
       twitchChannel.timestamp + timeout <= Date.now()){
        try {
            var channels = [], defaultChannel;
            var guild = client.guilds.find("name", server.name);

            if(server.discordChannels.length === 0){
                defaultChannel = guild.channels.find("type", "text");
            }else{
                for(var i = 0; i < server.discordChannels.length; i++){
                    channels.push(guild.channels.find("name", server.discordChannels[i]));
                }
            }
            // var stream = res.data[0]
            // var embed = new Discord.RichEmbed()
            //             .setColor("#9689b9")
            //             .setTitle(stream.title.replace(/_/g, "\\_"))
            //             .setURL(res.stream.channel.url)
            //             .setDescription("**" + res.stream.channel.status +
            //                             "**\n" + res.stream.game)
            //             .setImage(res.stream.preview.large)
            //             .setThumbnail(res.stream.channel.logo)
            //             .addField("Viewers", stream.viewer_count, true)

            var embed = new Discord.RichEmbed()
                          .setColor("#9689b9")
                          .setTitle(res.stream.channel.display_name.replace(/_/g, "\\_"))
                          .setURL(res.stream.channel.url)
                          .setDescription("**" + res.stream.channel.status +
                                          "**\n" + res.stream.game)
                          .setImage(res.stream.preview.large)
                          .setThumbnail(res.stream.channel.logo)
                          .addField("Viewers", res.stream.viewers, true)
                          .addField("Followers", res.stream.channel.followers, true);
            if(channels.length !== 0){
                for(var i = 0; i < channels.length; i++){
                    channels[i].send(embed).then(
                        printLog("Sent embed to channel '" + channels[i].name +
                              "'."));
                }
                twitchChannel.online = true;
                twitchChannel.timestamp = Date.now();
            }else if(defaultChannel){
                defaultChannel.send(embed).then(
                    printLog("Sent embed to channel '" + defaultChannel.name +
                          "'.")
                );
                twitchChannel.online = true;
                twitchChannel.timestamp = Date.now();
            }
        }
        catch(err){
            printLog(err);
        }
    }else if(res.stream === null){
        twitchChannel.online = false;
    }
}
function checkTwitchChannelsTick(){
    for(var i = 0; i < servers.length; i++){
        for(var j = 0; j < servers[i].twitchChannels.length; j++){
            if(servers[i].twitchChannels[j]){
                callApi(servers[i], servers[i].twitchChannels[j], apiCallback, true);
            }
        }
    }
}

client.on("ready", () => {
  console.log("I am ready!");
  reloadTags();
});


// Global state.
var tags = null

/*
  Reaction images
*/

// Read configuration from the environment.
const tagUrl = "http://vast-castle-1062.herokuapp.com/tags"
const imgUrl = "http://vast-castle-1062.herokuapp.com/image?tag="

var reloadTags = function() {
  http.get(tagUrl, res => {
    res.setEncoding("utf8");
    var body = "";
    res.on("data", data => {
      body += data;
    });
    res.on("end", () => {
      body = JSON.parse(body);
      tags = body
      console.log("Tags loaded")
    });
  });
}

client.on("message", (message) => {

  if (message.author.bot) return;

  if (message.content.startsWith("ping")) {
    message.channel.send("pong!");
  }

  if(message.content.startsWith("!text")) {
    var textMessage = message.content.substr(6);
    sendTextMessage(textMessage)
  }

  if(message.content.indexOf("@FroggyP#0268") >= 0) {
    var textMessage = message.content;
    sendTextMessage(textMessage)
  }

  if(message.content.startsWith("!authKey")) {
    console.log(message.author.id)
    message.channel.send(authKeys[message.author.id]);
  }

  if(message.content.startsWith("reload tags")) {
      console.log("Reloading tags")
      var role = message.guild.roles.find("name", "Contributor");
      message.member.addRole(role).catch(console.error);
      reloadTags();
      message.channel.send("Tags reloaded!");
  }

  if (message.content.startsWith("!logInfo")) {
    console.log(tags)
  }

  var parsedSentence = message.content.trim().split(/\s+/)
  if(tags) {
    if(parsedSentence.length <= 5){
      //If the sentence is one word, our job is easy
      if (parsedSentence.length == 1) {
        //Find the intersection: find what tags were in the sentence
        foundTags = _.intersection(parsedSentence, tags);
        if (foundTags.length > 0){
          //Get a random image to post and then post it
          http.get(imgUrl + foundTags[0], res => {
            res.setEncoding("utf8");
            var body = "";
            res.on("data", data => {
              body += data;
            });
            res.on("end", () => {
              console.log(body)
              message.channel.send(body)
            });
          });
        }
      }
      else if (parsedSentence.length > 1) {
        //For ever tag, see if it is in the sentence
        for(var i = 0; i < tags.length; i++) {
          var tag = tags[i];
          sentenceString = message.content.trim()
          if(sentenceString.indexOf(tag) >= 0){
            if(sentenceString.indexOf(tag + " ") == 0 || sentenceString.indexOf(" " + tag) == (sentenceString.length - tag.length - 1) || sentenceString.indexOf(" " + tag + " ") > 0) {
              //Do a ghetto uri encoding of the tag
              formattedTag = tag.replace(/%20/g, "%20")
              http.get(imgUrl + formattedTag, res => {
                res.setEncoding("utf8");
                var body = "";
                res.on("data", data => {
                  body += data;
                });
                res.on("end", () => {
                  console.log(body)
                  message.channel.send(body)
                });
              });
              break;
            }
          }
        }
      }
    }
  }
});

client.setInterval(function(){
  var array = fs.readFileSync(incomingMessagesFile).toString().split("\n");
  for(i in array) {
    if(array[i]){
      var message = array[i];
      console.log(message);
      var username = determineMessageRecipient(message);
      let user = client.users.find(user => user.username == username);
      console.log(user)

      if(firstTimeTexting(username)) {
        client.fetchUser(user.id)
        .then(user => user.send("Receiving a text from Trevor! To reply back just type !text <and your message>"));
      }
      message = message.replace(/^\s+|\s+$/g, '');
      var finalMessage = 'Trevor: "' + message.substr(username.length) + '"'
      client.fetchUser(user.id)
      .then(user => user.send(finalMessage));
    }
  }
  fs.writeFile(incomingMessagesFile, '', function(){})
}, 3000)

function firstTimeTexting(username) {
    var textExplanationJson = fs.readFileSync(textExplanation, {encoding:"utf-8"});
    textExplanationCache = JSON.parse(textExplanationJson);
    console.log(textExplanationCache)
    console.log(textExplanationCache.indexOf(username) >= 0)
    console.log(username)
    if(textExplanationCache.indexOf(username) >= 0) {
      return false;
    } else {

      textExplanationCache.push(username)
      fs.writeFileSync(textExplanation, JSON.stringify(textExplanationCache));
      return true;
    }
}

function determineMessageRecipient(message) {
    var recipient = message.split(" ")[0];
    console.log(recipient);
    if(msgAlias[recipient.toLowerCase()]) {
      return msgAlias[recipient.toLowerCase()];
    } else {
      return recipient;
    }
}

/*
  Utility
*/
function leadingZero(d){
    if(d < 10){
        return "0" + d;
    }else{
        return d;
    }
}
// adds a timestamp before msg/err
function printLog(msg, err){
    var date = new Date();
    var h = leadingZero(date.getHours());
    var m = leadingZero(date.getMinutes());
    var s = leadingZero(date.getSeconds());

    console.log("[" + h + ":" + m + ":" + s + "]", msg);
    if(err){
        console.log(err);
    }
}

function sendTextMessage(textMessage) {
  twilioClient.messages
    .create({
       body: textMessage,
       from: '+16267142725',
       to: '+16264970300'
     })
    .then(message => console.log(message.sid));
}

function indexOfObjectByName(array, value){
    for(var i = 0; i < array.length; i++){
        if(array[i].name.toLowerCase().trim() === value.toLowerCase().trim()){
            return i;
        }
    }
    return -1;
}
