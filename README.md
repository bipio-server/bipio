bipio
=========

Welcome to the Bipio API Server. 

BipIO is Billion Instructions Per I/O - For People and Robots.  

Bipio is a [graph](http://en.wikipedia.org/wiki/Directed_graph) <a href="http://en.wikipedia.org/wiki/Pipeline_(software)">pipelining</a>
API for creating ephemeral endpoints with RESTful JSON, where each node in your graph is responsible for performing a discrete unit of work, 
such as integrating "cloud" based [RPC's](http://en.wikipedia.org/wiki/Remote_procedure_call), producing or consuming digital content.  If you're familiar with Yahoo Pipes, IFTTT or Zapier, the concept
is similar.  The server has a small footprint which lets you create and automate an internet of things that matter to you and
those you want to connect with.  It could be installed alongside your existing open source app or prototype for out-of-band message transformation, queuing or social network fanout, even on your Rasberry Pi.

The graph structures ([bips](https://bip.io/docs/resource/rest/bip)) allow you to transform content between adjacent nodes.  Bips can even create other bips.
They can be reconfigured dynamically without requiring changes to the connecting client, ideal for rapid prototyping, A/B testing,
message normalization, digital asset monetization, sharing secret or (n)-use messages, or really any kind of web based interprotocol communication.
It can handle your email (like this [Chrome Extension](http://goo.gl/ZVIkfr) does), automate tasks, or be a personal message hub etc.

There are three flavors of Bip - public facing HTTP or SMTP endpoints, and periodic Triggers.  Some of their characteristics include

 - dynamic or automatically derived naming
 - pausing or self-destructing after a certain time or impressions volume
 - binding to connecting clients with soft ACLs over the course of their 'life'
 - able to be reconfigured dynamically without changing a client implementation
 - infinitely extensible, from any channel to any other channel.
 - can serve (render) protected channel content while inheriting all of the above characteristics

Bipio is dynamic, flexible, fast, modular, opinionless and gplv3 open source.

![concept](https://bip.io/static/img/docs/bip_concept.png)

Bips are configured by defining a graph ([hub](https://bip.io/docs/resource/rest/bip#resource_rest_bip_hubs)) across nodes ([channels](https://bip.io/docs/resource/rest/channel)).
Channels perform a discrete unit of work and emit a predictable result, where one channels export becomes the next adjacent channels transformed import.
Parallel delivery is handled by an [AMQP](http://en.wikipedia.org/wiki/Advanced_Message_Queuing_Protocol) transport to [RabbitMQ](http://www.rabbitmq.com/), and each atomic message can be independently processed by any subscribing node in the cluster.

Channels are largely decoupled from the graph resolution platform in self contained collections called Pods.  'Self Contained' meaning they are free
from other system concerns and can operate independently.  Channels can store, track, serve or transform content and messages as part of a pipeline.  Feel free to roll your 
own favorite integration by getting started with [Pods and Channels](https://github.com/bipio-server/bipio/wiki/Pods-and-Channels),
then jump in and [Install Your First Pod](https://github.com/bipio-server/bipio/wiki/Getting-Started-:--Installing-Pods).

The API has two 1st-class resources - bips and channels.  For example, to create a basic email repeater infront of your actual
inbox :

###### Create a Channel
```
POST /rest/channel
{
 action : 'email.smtp_forward',
 config : {
   'rcpt_to' : 'foo@bar.net'
 }
}

RESPONSE
{
 id : '{email channel id}'
}
```

###### And then with that email channel,  place it onto an 'smtp' bip.
```
POST /rest/bip
{
 type : 'smtp',
 hub : {
   'source' : {
      edges : [ '{email channel id}' ]
   }
 }
}

RESPONSE
{
 name : 'lcasKQosWire22'
 _repr : 'lcasKQosWire22@yourdomain.net'
}

```

And thats it.

The BipIO server software is the basic framework for processing bips and their delivery graphs.  For an authoritative list of officially
supported services, please see the bip-pod-* repos via [https://github.com/bipio-server](https://github.com/bipio-server) and please help make 
[the community](https://groups.google.com/forum/#!forum/bipio-api) a better place.

The server is currently distributed headless.  Sign in to [bipio](https://bip.io)
to mount your local install from your browser under My Account > Mounts > Create Mount.  The BipIO website is not a first class citizen or tightly coupled to one particular endpoint, so you can mount your local install(s) even if behind a firewall.

Hosted/Commercial OEM solutions can be found at [https://bip.io](https://bip.io). Read the License section at the end of this readme for important info.

## Requirements
-

  - [Node.js >= 0.10.15](http://nodejs.org) **API and graph resolver**
  - [MongoDB Server](http://www.mongodb.org) **data store**
  - [RabbitMQ](http://www.rabbitmq.com) **message broker**

SMTP Bips are available out of the box with a Haraka plugin.  Configs under [bipio-contrib/haraka](https://github.com/bipio-server/bipio-contrib).

  - [Haraka](https://github.com/baudehlo/Haraka)

## Installation

    npm install bipio
    make install
    node ./src/server.js

Be sure to have a MongoDB server and Rabbit broker ready and available before install.  Otherwise, follow the prompts
during the `make install` script to get a basically sane server running that you can play with.

For Ubuntu users, a sample upstart script is supplied in config/upstart_bip.conf which should be copied to 
/etc/init and reconfigured to suit your environment.  If you'd like it managed by Monit...

### Monit Config (/etc/monit/config.d/bipio.conf)

    #!monit
    set logfile /var/log/monit.log

    check process node with pidfile "/var/run/bip.pid"
        start program = "/sbin/start bipio"
        stop program  = "/sbin/stop bipio"
        if failed port 5000 protocol HTTP
            request /
            with timeout 10 seconds
            then restart

To automatically expire Bips and Fire their triggers, create cron's like so

### Expire Runner


    0 * * * * {username} /path/to/bipio/tools/expire-runner.sh

The server comes with the 'bip-expire.js' hook but not the shell script at this stage.  You'll need to create the
cron to match your environment (shell, install path, logging path).  Here's a sample

    #!/bin/bash
    # expire-runner.sh
    export NODE_ENV=production
    export HOME="/path/to/bipio"
    cd $HOME (date && node ./tools/bip-expire.js ) 2>&1 >> /path/to/bipio/logs/cron_server.log

### Trigger Runner

    */15 * * * * {username} /path/to/bipio/tools/trigger-runner.sh

Similarly for bip-trigger.js

    #!/bin/bash
    # trigger-runner.sh
    export NODE_ENV=production
    export HOME="/path/to//bipio"
    cd $HOME (date && node ./tools/bip-trigger.js ) 2>&1 >> /path/to/bipio/logs/trigger.log

## Documentation

General API spec and tutorials can be found at https://bip.io.  For server setup and configuration guides,
keep an eye on the [Wiki](https://github.com/bipio-server/bipio/wiki), it will be continuously updated.

## License

[GPLv3](http://www.gnu.org/copyleft/gpl.html)

Our open source license is the appropriate option if you are creating an open source application under a license compatible with the GNU GPL license v3. 

If you'd like to integrate BipIO with your proprietary system, GPLv3 is likely incompatible.  To secure a Commercial OEM License for Bipio,
please [reach us](mailto:enquiries@cloudspark.com.au)

![Cloud Spark](http://www.cloudspark.com.au/cdn/static/img/cs_logo.png "Cloud Spark - Rapid Web Stacks Built Beautifully")
Copyright (c) 2010-2014  [CloudSpark pty ltd](http://www.cloudspark.com.au)
