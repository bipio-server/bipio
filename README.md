bipio
=========

Welcome to the Bipio API Server. 

BipIO is Billion Instructions Per I/O - For People and Robots.  

Hosted/Commercial OEM solutions can be found at [https://bip.io](https://bip.io). Read the License section at the end of this readme for important info.

Bipio is a [graph](http://en.wikipedia.org/wiki/Directed_graph) <a href="http://en.wikipedia.org/wiki/Pipeline_(software)">pipelining</a>
API talking RESTful JSON, where each node in your graph is responsible for performing a discrete unit of work, such as integrating "cloud" API's or other web 
based [RPC's](http://en.wikipedia.org/wiki/Remote_procedure_call).

The graph structures (bips) allow you to transform content between adjacent nodes. They can be reconfigured dynamically without requiring changes 
to the connecting client, ideal for rapid prototyping, A/B testing, message escalation or any kind of interprotocol communication.

Bips are configured by defining a graph ([hub](https://bip.io/docs/resource/rest/bip#resource_rest_bip_hubs)) across nodes (channels).  Channels perform a discrete
unit of work and emit a predictable result, they can be arranged on a bip's hub in meaningful ways.  Channels are largely decoupled from the graph resolution platform
in self contained collections called Pods.  Feel free to roll your own favorite integration by getting started with [Pods and Channels](https://github.com/bipio-server/bipio/wiki/Pods-and-Channels),
then jump in and [Install Your First Pod](https://github.com/bipio-server/bipio/wiki/Getting-Started-:--Installing-Pods).

Bips can be given public facing endpoints over HTTP or SMTP which can trigger content for processing.  For example,
a Bip could collect simple logs, model an integrated workflow, or be a rules based email service pushing one message to all your connected
social networks and blogs, amongst others.  Certain types of channels, called 'emitters' can fire Bips periodically for polling content, synchronizing files,
notifying you of important events, automatically generating content or simply scheduling messages.

![concept](https://bip.io/static/img/docs/bip_concept.png)

The BipIO server software is the basic framework for processing bips and their delivery graphs.  For an authoritative list of officially
supported services, please see the bip-pod-* repos via [https://github.com/bipio-server](https://github.com/bipio-server) and please help make 
[the community](https://groups.google.com/forum/#!forum/bipio-api) a better place.

The server is currently distributed [headless](http://en.wikipedia.org/wiki/Headless_system).  Sign in to [bipio](https://bip.io)
to mount your local install from your browser.

Requirements
-

  - [Node.js >= 0.10.15](http://nodejs.org) **delivery agent**
  - [MongoDB Server](http://www.mongodb.org) **data store**
  - [RabbitMQ](http://www.rabbitmq.com) **message delivery**

SMTP Bips are available out of the box with a Haraka plugin.  Configs under [bipio-contrib/haraka](https://github.com/bipio-server/bipio-contrib).

  - [Haraka](https://github.com/baudehlo/Haraka)

Architecture
-
 The API server listens on (default) tcp:5000 where it runs a RESTful server.  Your
username, when appended to the server hostname, becomes the entry point through which public bips attached
to your account can be triggered and/or channels with data sources can be dynamically rendered.

(**Please bare with me while the Architecture section is clarified)

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
