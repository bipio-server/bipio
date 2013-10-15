bipio
=========

Welcome to the Bipio API Server. 

BipIO is Billion Instructions Per I/O - For People and Robots.  

Bipio is a [graph](http://en.wikipedia.org/wiki/Directed_graph) <a href="http://en.wikipedia.org/wiki/Pipeline_(software)">pipelining</a>
API talking RESTful JSON, where each node in your graph is responsible for performing a discrete unit of work, such as integrating "cloud" API's or other web 
based [RPC's](http://en.wikipedia.org/wiki/Remote_procedure_call).  If you're familiar with Yahoo Pipes, IFTTT or Zapier, the concept
is similar.  Bipio is a server with a small footprint that lets you create and automate an internet of things that matter to you, you
can install it alongside your existing open source app or prototype, or even your Rasberry Pi.  

The graph structures ([bips](https://bip.io/docs/resource/rest/bip)) allow you to transform content between adjacent nodes.  Bips can even create other bips.
They can be reconfigured dynamically without requiring changes to the connecting client, ideal for rapid prototyping, A/B testing,
message normalization, digital asset monetization, sharing secret or (n)-use messages, or really any kind of web based interprotocol communication.
It can handle your email (like this [Chrome Extension](http://goo.gl/ZVIkfr) does), or automate tasks, be a personal message hub etc.

Bipio is dynamic, flexible, fast, modular, impartial and open source.

Bips are configured by defining a graph ([hub](https://bip.io/docs/resource/rest/bip#resource_rest_bip_hubs)) across nodes ([channels](https://bip.io/docs/resource/rest/channel)).
Channels perform a discrete unit of work and emit a predictable result, its a true parallel pipeline where one channels export becomes the next adjacent channels import.  

Channels are largely decoupled from the graph resolution platform in self contained collections called Pods.  Feel free to roll your 
own favorite integration by getting started with [Pods and Channels](https://github.com/bipio-server/bipio/wiki/Pods-and-Channels),
then jump in and [Install Your First Pod](https://github.com/bipio-server/bipio/wiki/Getting-Started-:--Installing-Pods).

Bips can be given public facing endpoints over HTTP or SMTP which can trigger content for processing.  For example,
a Bip could collect simple logs, model an integrated workflow, or be a rules based email service pushing one message to all your connected
social networks and blogs, amongst others.  Certain types of channels, called 'emitters' can fire Bips periodically for syncing content/files,
notifying you of important events, or simply scheduling messages.

![concept](https://bip.io/static/img/docs/bip_concept.png)

The BipIO server software is the basic framework for processing bips and their delivery graphs.  For an authoritative list of officially
supported services, please see the bip-pod-* repos via [https://github.com/bipio-server](https://github.com/bipio-server) and please help make 
[the community](https://groups.google.com/forum/#!forum/bipio-api) a better place.

The server is currently distributed [headless](http://en.wikipedia.org/wiki/Headless_system).  Sign in to [bipio](https://bip.io)
to mount your local install from your browser under My Account > Mounts > Create Mount.

Hosted/Commercial OEM solutions can be found at [https://bip.io](https://bip.io). Read the License section at the end of this readme for important info.

Requirements
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

## License

BipIO is free for non-commercial use.

[GPLv3](http://www.gnu.org/copyleft/gpl.html)

Our open source license is the appropriate option if you are creating an open source application under a license compatible with the GNU GPL license v3. 

Bipio may not be used for Commercial purposes by an entity who has not secured a Bipio Commercial OEM License.  To secure a Commercial OEM License for Bipio,
please [reach us](mailto:enquiries@cloudspark.com.au)

![Cloud Spark](http://www.cloudspark.com.au/cdn/static/img/cs_logo.png "Cloud Spark - Rapid Web Stacks Built Beautifully")
Copyright (c) 2010-2014  [CloudSpark pty ltd](http://www.cloudspark.com.au)
