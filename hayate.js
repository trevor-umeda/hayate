const Discord = require("discord.js");
const client = new Discord.Client();
const config = require("./config.json");
const fs = require("fs");
const http = require("http");
const _ = require('underscore');
client.login(config.token);

client.on("ready", () => {
  console.log("I am ready!");
  reloadTags();
});

// Global state.
let tags = null

// Read configuration from the environment.
const tagUrl = "http://vast-castle-1062.herokuapp.com/tags"
const imgUrl = "http://vast-castle-1062.herokuapp.com/image?tag="

var reloadTags = function() {
  http.get(tagUrl, res => {
    res.setEncoding("utf8");
    let body = "";
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

  if(message.content.startsWith("reload tags")) {
      console.log("Reloading tags")
      let role = message.guild.roles.find("name", "Contributor");
      message.member.addRole(role).catch(console.error);
      reloadTags();
      message.channel.send("Tags reloaded!");
  }


  if (message.content.startsWith("!logInfo")) {
    console.log(tags)
  }

  let parsedSentence = message.content.trim().split(/\s+/)
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
            let body = "";
            res.on("data", data => {
              body += data;
            });
            res.on("end", () => {
              if(!body.startsWith("<")) {
                console.log(body)
                message.channel.send(body)
              }
            });
          });
        }
      }
      else if (parsedSentence.length > 1) {
        //For ever tag, see if it is in the sentence
        for(var i = 0; i < tags.length; i++) {
          let tag = tags[i];
          sentenceString = message.content.trim()
          if(sentenceString.indexOf(tag) >= 0){
            if(sentenceString.indexOf(tag + " ") == 0 || sentenceString.indexOf(" " + tag) == (sentenceString.length - tag.length - 1) || sentenceString.indexOf(" " + tag + " ") > 0) {
              //Do a ghetto uri encoding of the tag
              formattedTag = tag.replace(/%20/g, "%20")
              http.get(imgUrl + formattedTag, res => {
                res.setEncoding("utf8");
                let body = "";
                res.on("data", data => {
                  body += data;
                });
                res.on("end", () => {
                  if(!body.startsWith("<")) {
                    console.log(body)
                    message.channel.send(body)
                  }              
                });
              });
              break;
              //Get a random image from server and post it!
              // robot.http(imgUrl + tag)
              // .get() (err, res, body) ->
              //   if res.statusCode is 200
              //     console.log("#{tag} - #{body}")
              //     msg.send "#{body}"
              //   else
              //     tags = []
              // break
            }
          }

          }
        }
      }
  }

});
