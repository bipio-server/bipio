bipio
=========

Welcome to the Bipio API Server. 

BipIO is Billion Instructions Per I/O - For People and Robots.  

Bipio is a [graph](http://en.wikipedia.org/wiki/Directed_graph) <a href="http://en.wikipedia.org/wiki/Pipeline_(software)">pipelining</a>
API for creating ephemeral endpoints with RESTful JSON, where each node in your graph is responsible for performing a discrete unit of work, 
such as integrating "cloud" based [RPC's](http://en.wikipedia.org/wiki/Remote_procedure_call) or serving digital content.  If you're familiar with Yahoo Pipes, IFTTT or Zapier, the concept
is similar.  The server has a small footprint which lets you create and automate an internet of things that matter to you, you
can install it alongside your existing open source app or prototype, or your Rasberry Pi for example.

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
Parallel delivery is handled by an [AMQP](http://en.wikipedia.org/wiki/Advanced_Message_Queuing_Protocol) transport to the blazingly 
fast [RabbitMQ](http://www.rabbitmq.com/) broker, where each atomic message can be independently processed by any subscribing node in the cluster.

Channels are largely decoupled from the graph resolution platform in self contained collections called Pods.  'Self Contained' meaning they are free
from other system concerns and can operate independently.  Channels can store, track, serve or transform content and messages as part of a pipeline.  Feel free to roll your 
own favorite integration by getting started with [Pods and Channels](https://github.com/bipio-server/bipio/wiki/Pods-and-Channels),
then jump in and [Install Your First Pod](https://github.com/bipio-server/bipio/wiki/Getting-Started-:--Installing-Pods).

The API is expressive and straight forward, there are only 2 1st-class resources - bips and channels.  For example, to create a basic email forwarder sitting infront of your actual
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
to mount your local install from your browser under My Account > Mounts > Create Mount.

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

A sample upstart script is supplied in config/upstart_bip.conf -- suggest using upstart with monit

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
