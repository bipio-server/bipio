<a href="https://bip.io"><img align="left" width="200" src="https://bip.io/static/img/bipiologo_color.svg"/></a>
<br/>
=========

Welcome to the [bip.io](https://bip.io) API Server (Snow 0.4)

bip.io is Billion Instructions Per I/O - For People and Robots.

Imagine you can send a single standard payload and have a limitless host of API's orchestrate at your command.

That's what bip.io does.

[![NPM](https://nodei.co/npm/bipio.png?downloads=true)](https://nodei.co/npm/bipio/)

Follow <a href="https://twitter.com/bipioapp" class="twitter-follow-button" data-show-count="false">@bipioapp</a> on Twitter for regular news and updates.

----

bip.io is a nodejs based web automation framework that runs 'bips'. A Bip is a web automation agent.  A Bip can connect many different web services and perform useful work.  It can act on your behalf or perform at your command.

Bips can take actions in sequence or in parallel, and chain web services together as you like. They can be put to work via Web Hooks, Email or Trigger when something happens.

bip.io can be installed alongside your existing open source app or prototype for out-of-band message transformation, feed aggregation, queuing, social network fanout or whatever you like, even on your [Raspberry Pi](http://www.raspberrypi.org/).

This server software is a RESTful JSON API supporting account level namespacing and multiple domains ([fqdn](http://en.wikipedia.org/wiki/Fully_qualified_domain_name)) per account.  Clients authenticate over HTTP Basic.

bip.io is dynamic, flexible, fast, modular, opinionless and GPLv3 open source.

Find out more in [the wiki](https://github.com/bipio-server/bipio/wiki).

<div style="text-align:center"><img width="400px" src ="https://bip.io/static/img/docs/bip_example.png" /></div>


### Pods

Pods are the standalone service containers bip.io uses to encapsulate and standardize the world's API's.  [Supported Services](https://github.com/bipio-server/bipio/wiki/Pod-List) are growing fast, and open source.

This server ships with a few handy '[Pods](https://github.com/bipio-server/bipio/wiki/Pods)' which you can use right away - Email, Text/HTML/Markdown Templating, Flow Control, Syndication, Web Hooks and Time.

Extra Pods can be found in the [master repository](https://github.com/bipio-server).

To install a pod :

    npm install bip-pod-{pod-name}
    ./tools/pod-install.js -a {pod-name}

And follow the instructions.

Feel free to [craft your own](https://github.com/bipio-server/bipio/wiki/Pods#creating-pods).

## Requirements

  - [Node.js >= 0.10.15](http://nodejs.org) **API and graph resolver**
  - [MongoDB Server v2.6](http://www.mongodb.org) **data store**
  - [RabbitMQ](http://www.rabbitmq.com) **message broker**

SMTP Bips are available out of the box with a Haraka plugin.  Configs under [bipio-contrib/haraka](https://github.com/bipio-server/bipio-contrib).

  - [Haraka](https://github.com/baudehlo/Haraka)

## Installation

### docker (offical)

  [Find It Here](https://github.com/bipio-server/bipio-docker)

#### npm (global)

    sudo npm install -g bipio
    bipio

#### npm (local)

    sudo npm install bipio
    cd node_modules
    npm start

#### git

    git clone git@github.com:bipio-server/bipio.git
    cd bipio
    npm install
    node . (or `npm start`)

### Visual Tools

The bip.io server is a light weight headless API server and ships without a User Interface (UI).  The official UI can be found on the [bip.io](https://bip.io) hosted platform.  It's completely free, will run on all desktops and most tablets.

[![ScreenShot](https://bip.io/static/img/docs/vimeo_overlay.png)](https://vimeo.com/147186752)

To learn about the UI, the [community knowledgebase](https://bip.uservoice.com/knowledgebase) is the best place to start.

Although bip.io is a hosted cloud platform, you can still use it to manage your own bip.io server with a feature called ['Mounts'](https://bip.uservoice.com/knowledgebase/articles/764829-where-is-the-user-interface-for-my-open-source-bip)

Sign in to [bip.io](https://bip.io) to mount your local install from your browser under My Account > Mounts > Create Mount.

![Server Mount](https://bip.io/static/img/docs/server_mount.png)

#### Mounting Security Notes

Be sure to answer **yes** to the SSL question during setup to install a self signed SSL certificate.

`Enable SSL? This will let you mount this server from the https://bip.io dashboard :`

This will avoid any browser security restrictions when mounting your server via the hosted website.  You *must* visit your bipio server in a browser first and accept the self signed certificate, or the mount may not work eg : `https://localhost:5000/status`

The UI is a thin client which is loaded entirely into your browser.  Once loaded you can reach any bipio server your browser can connect to such as from behind any firewall, over VPN or IP tunnel etc.

## Technical Notes

When setting bip.io up for the first time, the install process will enter interactive mode, saving the generated config to `config/default.json`.

The location of the config file can be overrideen using the `NODE_CONFIG_DIR` environment variable.

    export NODE_CONFIG_DIR=<path_to_your_config_directory>

Be sure to have a MongoDB server and Rabbit broker ready and available before install.  Otherwise, follow the prompts during the install process to get a basically sane server running that you can play with.

For Ubuntu users, a sample upstart script is supplied in `config/upstart_bip.conf` which should be copied to
`/etc/init` and reconfigured to suit your environment.

If you have a more complex deployment environment and the packaged sparse config doesn't suit, don't worry!  Set the environment variable `BIPIO_SPARSE_CONFIG` to the path of your preferred config file, and it will use that instead.

For a non-interactive setup (ie: make install without any user interaction) - set environment variable `HEADLESS=true`

bip.io does not provide any load balancing beyond [node-cluster](http://nodejs.org/api/cluster.html).  It can provide SSL termination but this is unsuitable for a production environment.  If you need SSL termination this should be delegated to the forward proxy of your choice such as Nginx, Apache, HAProxy etc.

## Developing and Contributing

A healthy contributor community is great for everyone! Take a look at the [Contribution Document](https://github.com/bipio-server/bipio/blob/master/CONTRIBUTING.md) to see how to get your changes merged in.

## Support

Please log issues to the [repository issue tracker](https://github.com/bipio-server/bipio/issues) on GitHub.

## License

Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at

http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
