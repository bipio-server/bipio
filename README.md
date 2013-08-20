bipio
=========

Welcome to the Bipio API Server. 

BipIO is Billion Instructions Per I/O - For People and Robots.  

Hosted/Commercial OEM solutions can be found at [https://bip.io](https://bip.io). Read the License section at the end of this readme for important info.

Bipio is a content transformation API that marries [digraphs](http://en.wikipedia.org/wiki/Directed_graph)
to [AOP](http://en.wikipedia.org/wiki/Aspect-oriented_programming), where each node in a graph
is responsible for performing a discrete unit of work.  It is ideal for integrating "cloud" API's, in a robust and flexible way.

These graphs (called 'bips') can be given public facing endpoints over HTTP or SMTP which can trigger content for processing.  For example,
it could collect simple logs, or model an integrated workflow, or be a rules based email service pushing one message to all your connected
social networks and blogs.

Bips are configured by defining a graph pipeline ([hub](https://bip.io/docs/resource/rest/bip#resource_rest_bip_hubs)) across nodes (channels).  Channels perform a discrete
unit of work and emit a predictable result, they are 'concerns' in the AOP sense and can be arranged on a bip's hub in meaningful ways.
The graph structure of a bip allows the user opportunity to configure a transform between exports and imports across adjacent nodes.
Hubs can be reconfigured dynamically without requiring changes to the connecting client, ideal for rapid prototyping, A/B testing, message escalation... that sort of thing.

Bips can be triggered intermittently (via 'emitter' channels) or process/answer requests over HTTP/SMTP dynamically.

The BipIO server software is the basic framework for processing bips and their delivery graphs.  For an authoritative list of officially
supported services, please see the bip-pod-* repos via [https://github.com/bipio-server](https://github.com/bipio-server)

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

The server is currently distributed [headless](http://en.wikipedia.org/wiki/Headless_system).  Sign in to [bipio](https://bip.io)
to mount your local install from your browser.

(**Please bear with me while the Architecture section is clarified)

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