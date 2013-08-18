bipio
=========

Welcome to the Bipio API Server. 

BipIO is Billion Instructions Per I/O - For People and Robots.  

Hosted/Commercial OEM solutions can be found at [https://bip.io](https://bip.io). Read the License section for important info.

Bipio is a content transformation API that marries [digraph](http://en.wikipedia.org/wiki/Directed_graph)
traversals with [AOP](http://en.wikipedia.org/wiki/Aspect-oriented_programming), giving the configured 
graphs public named endpoints which can drive an application or some type of basic "cloud-based" workflow (a 'bip').
These workflows, or 'bips', let you rapidly model workflows, from basic email anonymity, personal digital asset monetization 
or application prototyping.

Bips are configured by defining a graph pipeline (hub) across nodes (channels).  Channels perform a discrete
unit of work and emit a predictable result, they are 'concerns' in the AOP sense and can be arranged on a bip's Hub in meaningful ways.
The graph structure of a bip allows the user opportunity to configure a transform between exports and imports across adjacent nodes.
You can even change the hub implementation of a bip dynamically, independent of how you're talking to the bip (unless you're being purposefully difficult!)

Bips can be triggered intermittently (via 'emitter channels') or process/answer requests over HTTP/SMTP dynamically.

Requirements
-

  - [Node.js >= 0.10.15](http://nodejs.org)
  - [MongoDB Server](http://www.mongodb.org)
  - [RabbitMQ](http://www.rabbitmq.com)

SMTP Bips are available out of the box with a Haraka plugin.  Configs under bipio-contrib/haraka repo.

  - [Haraka](https://github.com/baudehlo/Haraka)

Architecture
-
 The bipio API server listens on a configured port, default tcp:5000 where it runs a RESTful server.  Your
username, when appended to the server hostname, becomes the entry point through which public bips attached
to your account can be triggered.

## Installation

    npm install bipio
    make install
    node ./src/server.js

A sample upstart script is supplied in config/upstart_bip.conf -- suggest using upstart with monit

## License

BipIO is free for non-commercial use.

[GPLv3](http://www.gnu.org/copyleft/gpl.html)

Our open source license is the appropriate option if you are creating an open source application under a license compatible with the GNU GPL license v3. 

Bipio may not be used for Commercial purposes by an entity who has not secured a Bipio Commercial OEM License.  To secure a Commercial OEM License for Bipio,
please [reach us](mailto:enquiries@cloudspark.com.au)

![Cloud Spark](http://www.cloudspark.com.au/cdn/static/img/cs_logo.png "Cloud Spark - Rapid Web Stacks Built Beautifully")
Copyright (c) 2010-2014  [CloudSpark pty ltd](http://www.cloudspark.com.au)