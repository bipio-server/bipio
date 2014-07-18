BipIO
=========

Welcome to the [BipIO](https://bip.io) API Server.  

BipIO is Billion Instructions Per I/O - For People and Robots.  

[![NPM](https://nodei.co/npm/bipio.png?downloads=true)](https://nodei.co/npm/bipio/)

BipIO is a highly parallel nodejs based API integration framework (iPaas).  It uses [graph](http://en.wikipedia.org/wiki/Directed_graph) 
based <a href="http://en.wikipedia.org/wiki/Pipeline_(software)">pipelines</a> or 'Bips' to create ephemeral endpoints, complex automated workflows and message distribution hubs with 3rd party API's and
[RPC's](http://en.wikipedia.org/wiki/Remote_procedure_call).  Bips come in a variety of flavors for performing useful work - WebHooks/Sockets, Email, and Event Triggers.

It's a RESTful JSON API that supports account level namespacing and multiple domains ([fqdn](http://en.wikipedia.org/wiki/Fully_qualified_domain_name)) per account.  Clients authenticate over HTTP Basic.

BipIO can be installed alongside your existing open source app or prototype for out-of-band message transformation, feed aggregation, queuing, social network fanout or whatever you like, even on your Rasberry Pi.

Follow <a href="https://twitter.com/bipioapp" class="twitter-follow-button" data-show-count="false">@bipioapp</a> on Twitter for regular news and updates.  


### Concept

If you're familiar with Yahoo Pipes, IFTTT, Zapier, Mulesoft - the concept is a little similar.   BipIO is a message transformation hub for connecting API's and creating an internet of things that matter to you.  Over time and as more people use the system it builds a corpus of transformation data that serve as 'hints' for use by other community members in their own integrations.  Complete configurations can also be shared openly by different users and systems allowing for the instant installation of common workflows.

Bipio is dynamic, flexible, fast, modular, opinionless and gplv3 open source.

![concept](https://bip.io/static/img/docs/bip_concept.png)



#### Bips

[Bips](https://bip.io/docs/resource/rest/bip) are graph structures which transform messages between adjacent [Channels](https://bip.io/docs/resource/rest/channel) and chain outputs to inputs indefinitely across disparate 'cloud' services. The structures also contain metadata defining the flavor, lifespan and overall characteristics of the endpoint or trigger.

Some of their characteristics include :

 - dynamic or automatically derived naming
 - pausing or self-destructing after a certain time or impressions volume
 - binding to connecting clients with soft ACLs over the course of their 'life'
 - able to be reconfigured dynamically without changing a client implementation
 - infinitely extensible, from any channel to any other channel.
 - can serve (render) protected channel content while inheriting all of the above characteristics

It's a fairly large topic, find out more in [the wiki](https://github.com/bipio-server/bipio/wiki/Bips).

#### Channels

Channels are pointers to discrete actions provided by 3rd party API's and services. They are reusable entities which perform a discrete unit of work and emit a predictable result.

The collection of channels you create becomes something like a swatch from which you can orchestrate complex API messaging patterns.  When dropped onto a Bip's graph, a channels export becomes the next adjacent channels transformed import, which can be chained indefinitely.

Channels are instantiated from service containers called Pods.  Pods only concern is providing a set of possible actions, and doing that well.

Channels can store, track, serve or transform content and messages as part of a pipeline or in autonomous isolation.  

The server ships with a few handy '[Pods](https://github.com/bipio-server/bipio/wiki/Pods)' which you can use right away - Email, Text/HTML/Markdown Templating, Flow Control, Syndication, Web Hooks, Time.  Extra Pods can be found in the [GitHub Repository](https://github.com/bipio-server/bipio) - to install it's just :

    npm install bip-pod-{pod-name}
    ./tools/pod-install.js -a {pod-name}
  
And follow the instructions, or feel free to [craft your own](https://github.com/bipio-server/bipio/wiki/Creating-Pods).


##### Simple Integrations

Here's a quick example.  Lets say I have a private email address that I want to protect or obfuscate - I could use an SMTP Bip to
create a temporary relay which will forward emails for 1 day only.  

**Here's how :**

Create an SMTP Forwarder Channel to email me with any messages it receives :
```
POST /rest/channel
{
 action : "email.smtp_forward",
 name : "Helo FuBa"
 config : {
   rcpt_to : "foo@bar.net"
 }
}

RESPONSE
{
 id : "206fe27f-5c98-11e3-8ad3-c860002bd1a4"
}
```

... I can then build the relay with a SMTP Bip having a single edge pointing to the the generated Channel ID :

```
POST /rest/bip
{
 type : "smtp",
 hub : {
   "source" : {
      edges : [ "206fe27f-5c98-11e3-8ad3-c860002bd1a4" ],
      transforms : {
        "206fe27f-5c98-11e3-8ad3-c860002bd1a4" : {
          "subject" : "[%source#subject%]",
          "body_html" : "[%source#body_html%]",
          "body_text" : "[%source#body_text%]",
          "reply_to" : "[%source#reply_to%]",
        }
      },
     _note : "^^ Transforms aren't mandatory, but here for illustration - you only need an edge"
   }
 },
 end_life : {
   imp : 0,
   time : '+1d'
 },
 note : "No name, no problem.  Let the system generate something short and unique"
}

RESPONSE
{
 name : "lcasKQosWire22"
 _repr : "lcasKQosWire22@yourdomain.net"
}
```

And thats it. There's actually a little [chrome extension](http://goo.gl/ZVIkfr) which does just this for web based email forms.

For an extra credit example, I could store attachments arriving on that email address straight to dropbox by just adding an edge - check out
how in the [cookbook](https://github.com/bipio-server/bipio/wiki/Email-Repeater,-Dropbox-Attachment-Save)



## Requirements

  - [Node.js >= 0.10.15](http://nodejs.org) **API and graph resolver**
  - [MongoDB Server](http://www.mongodb.org) **data store**
  - [RabbitMQ](http://www.rabbitmq.com) **message broker**

SMTP Bips are available out of the box with a Haraka plugin.  Configs under [bipio-contrib/haraka](https://github.com/bipio-server/bipio-contrib).

  - [Haraka](https://github.com/baudehlo/Haraka)

## Installation

    npm install bipio
    node ./src/server.js

Be sure to have a MongoDB server and Rabbit broker ready and available before install.  Otherwise, follow the prompts
during the install process to get a basically sane server running that you can play with.

To reconfigure the server or start installing where you left of, `cd node_modules/bipio; make install`


For Ubuntu users, a sample upstart script is supplied in config/upstart_bip.conf which should be copied to 
/etc/init and reconfigured to suit your environment.  If you'd like it managed by Monit...

## Updating

Updating BipIO via `npm` will resolve any new dependencies for you, however if you're checking out from the repository 
directly with `git pull` you may need to manually run `npm install` to download any new dependencies (bundled pods, for example).

If you're going the `git pull` route and want to save this step, create a git 'post merge' hook by copying it from `./tools` like so :

    mkdir -p .git/hooks
    cp ./tools/post-merge .git/hooks
    chmod ug+x .git/hooks/post-merge

This will automatically install any missind dependencies every time you `git pull`

### Monit Config

/etc/monit/config.d/bipio.conf

    #!monit
    set logfile /var/log/monit.log

    check process node with pidfile "/var/run/bip.pid"
        start program = "/sbin/start bipio"
        stop program  = "/sbin/stop bipio"
        if failed port 5000 protocol HTTP
            request /
            with timeout 10 seconds
            then restart


### Crons

Periodic tasks will run from the server master instance automatically, you can find the config
in the `config/{environment}.json` file, keyed by 'cron'.  

* stats - network chord stats, every hour
* triggers - trigger channels, every 15 minutes
* expirer - bip expirer, every hour

To disable a cron, either remove it from config or set an empty string.

To have these crons handled by your system scheduler rather than the bipio server, disable the crons
in config as described.  Wrapper scripts can be found in ./tools for each of stats (`tools/generate-hub-stats.js`), 
triggers (`tools/bip-trigger.js`) and expirer (`tools/bip-expire.js`).

Here's some example wrappers.

#### Trigger Runner

Cron:
    */15 * * * * {username} /path/to/bipio/tools/trigger-runner.sh

trigger-runner.sh :

    #!/bin/bash
    # trigger-runner.sh
    export NODE_ENV=production
    export HOME="/path/to/bipio"
    cd $HOME (date && node ./tools/bip-trigger.js ) 2>&1 >> /path/to/bipio/logs/trigger.log

#### Expire Runner

Cron:
    0 * * * * {username} /path/to/bipio/tools/expire-runner.sh

expire-runner.sh :

    #!/bin/bash
    # expire-runner.sh
    export NODE_ENV=production
    export HOME="/path/to/bipio"
    cd $HOME (date && node ./tools/bip-expire.js ) 2>&1 >> /path/to/bipio/logs/cron_server.log

#### Stats Runner

Cron:
    */15 * * * * {username} /path/to/bipio/tools/stats-runner.sh

stats-runner.sh :

    #!/bin/bash
    # stats-runner.sh
    export NODE_ENV=production
    export HOME="/path/to/bipio"
    cd $HOME (date && node ./tools/generate-hub-stats.js ) 2>&1 >> /path/to/bipio/logs/stats.log

## Notes

The BipIO server software is the basic framework for processing bips and their delivery graphs and is currently distributed headless.
For visual tools, sign in to [bipio](https://bip.io) to mount your local install from your browser 
under My Account > Mounts > Create Mount.  

![Server Mount](https://bip.io/static/img/docs/server_mount.png)

The BipIO website is not a first class citizen or tightly coupled to one particular endpoint, so you can mount your local install(s) even if behind a firewall.

By itself, Bipio does not provide SSL termination or any load balancing beyond [node-cluster](http://nodejs.org/api/cluster.html).  If you need SSL termination this should be delegated to a forward proxy such as NginX, Apache, HAProxy etc.

## Developing and Contributing

A healthy contributor community is great for everyone! Take a look at the [Contribution Document](https://github.com/bipio-server/bipio/blob/master/CONTRIBUTING.md) to see how to get your changes merged in.

## Support

Please log issues to the [repository issue tracker](https://github.com/bipio-server/bipio/issues) on GitHub.  

## License

[GPLv3](http://www.gnu.org/copyleft/gpl.html)

Our open source license is the appropriate option if you are creating an open source application under a license compatible with the GNU GPLv3. 

If you'd like to integrate BipIO with your proprietary system, GPLv3 is likely incompatible.  To secure a Commercial OEM License for Bipio,
please [reach us](mailto:enquiries@cloudspark.com.au)

![Cloud Spark](http://www.cloudspark.com.au/cdn/static/img/cs_logo.png "Cloud Spark - Rapid Web Stacks Built Beautifully")
Copyright (c) 2010-2014  [CloudSpark pty ltd](http://www.cloudspark.com.au)
