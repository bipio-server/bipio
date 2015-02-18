BipIO <a href="https://bip.io"><img align="right" width="48" src="https://2.gravatar.com/avatar/b4063abdf67036bdff26845fe2adcf69?d=https%3A%2F%2Fidenticons.github.com%2F7bad9441c4612b497d9d071c244f21cc.png&r=x&s=140" style="float:right"/></a>
=========

Welcome to the [BipIO](https://bip.io) API Server (Sansa 0.3)

BipIO is Billion Instructions Per I/O - For People and Robots.  

Imagine you can send a single standard payload and have a limitless host of API's orchestrate at your command.  

That's what BipIO does.

[![NPM](https://nodei.co/npm/bipio.png?downloads=true)](https://nodei.co/npm/bipio/)
[![Bitdeli Badge](https://d2weczhvl823v0.cloudfront.net/bipio-server/bipio/trend.png)](https://bitdeli.com/free "Bitdeli Badge")

Follow <a href="https://twitter.com/bipioapp" class="twitter-follow-button" data-show-count="false">@bipioapp</a> on Twitter for regular news and updates, or `/join #bipio` on [Freenode IRC](https://freenode.net)

----

BipIO is a nodejs based web automation framework which runs 'bips'. A Bip is a web automation agent.  A Bip can connect many different web services together for performing useful work and either act on your behalf or perform a workflow on command. 

Bips can take actions in sequence or in parallel, and chain web services together as you like. They can be put to work via Web Hooks, Email or some other kind of managed event.

BipIO can be installed alongside your existing open source app or prototype for out-of-band message transformation, feed aggregation, queuing, social network fanout or whatever you like, even on your Rasberry Pi.

It's a RESTful JSON API that supports account level namespacing and multiple domains ([fqdn](http://en.wikipedia.org/wiki/Fully_qualified_domain_name)) per account.  Clients authenticate over HTTP Basic.

BipIO is dynamic, flexible, fast, modular, opinionless and gplv3 open source.

Find out more in [the wiki](https://github.com/bipio-server/bipio/wiki).

![concept](https://bip.io/static/img/docs/bip_concept.png)

### Pods

Pods are the standalone service containers BipIO uses to encapsulate and standardize API's.  Our [list of supported pods](https://github.com/bipio-server/bipio/wiki/Pod-List) is growing all the time and completely open source.

The server ships with a few handy '[Pods](https://github.com/bipio-server/bipio/wiki/Pods)' which you can use right away - Email, Text/HTML/Markdown Templating, Flow Control, Syndication, Web Hooks, Time.  

Extra Pods can be found in the [GitHub Repository](https://github.com/bipio-server/bipio) - to install it's just :

    npm install bip-pod-{pod-name}
    ./tools/pod-install.js -a {pod-name}
  
And follow the instructions, or feel free to [craft your own](https://github.com/bipio-server/bipio/wiki/Pods#creating-pods).

### Visual Tools

The BipIO server is a small headless API server and ships without a UI.  Our official UI can be found on our hosted platform at [https://bip.io](https://bip.io)

[![ScreenShot](https://i.vimeocdn.com/video/507461873.webp?mw=1920&mh=960&q=70)](https://vimeo.com/119869509)

Sign in to [bipio](https://bip.io) to mount your local install from your browser under My Account > Mounts > Create Mount.  

![Server Mount](https://bip.io/static/img/docs/server_mount.png)

#### Mounting Security Notes

Be sure to answer 'yes' to the SSL question during setup to install a self signed SSL certificate.  This will avoid any browser security restrictions when mounting your server via the hosted website.  You *must* visit your bipio server in a browser first and accept the self signed certificate, or the mount may not work eg : `https://localhost:5000/status`

The UI is a thin client which is loaded entirely into your browser.  Once loaded you can reach any bipio server your browser can connect to such as from behind any firewall, over VPN or IP tunnel etc.

## Requirements

  - [Node.js >= 0.10.15](http://nodejs.org) **API and graph resolver**
  - [MongoDB Server](http://www.mongodb.org) **data store**
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

When setting BipIO up for the first time, the install process will enter interactive mode, saving to the path of NODE_CONFIG_DIR environment variable,if set (otherwise, just config/{environment.json}.

    export NODE_CONFIG_DIR=<path_to_your_config_directory>

Be sure to have a MongoDB server and Rabbit broker ready and available before install.  Otherwise, follow the prompts
during the install process to get a basically sane server running that you can play with.

For Ubuntu users, a sample upstart script is supplied in config/upstart_bip.conf which should be copied to 
/etc/init and reconfigured to suit your environment.

If you have a more complex deployment environment and the packaged sparse config doesn't suit, don't worry!  Set the environment variable BIPIO_SPARSE_CONFIG to the path of your preferred config file, and it will use that instead.

For a non-interactive setup (ie: make install without any user interaction) - set environment variable HEADLESS=true

BipIO does not provide any load balancing beyond [node-cluster](http://nodejs.org/api/cluster.html).  It can provide SSL termination but this is unsuitable for a production environment.  If you need SSL termination this should ideally be delegated to the forward proxy of your choice such as Nginx, Apache, HAProxy etc.

## Updating

Updating BipIO via `npm` will resolve any new dependencies for you, however if you're checking out from the repository 
directly with `git pull` you may need to manually run `npm install` to download any new dependencies (bundled pods, for example).

If you're going the `git pull` route and want to save this step, create a git 'post merge' hook by copying it from `./tools` like so :

    mkdir -p .git/hooks
    cp ./tools/post-merge .git/hooks
    chmod ug+x .git/hooks/post-merge

This will automatically install any missing dependencies every time you `git pull`

## Developing and Contributing

A healthy contributor community is great for everyone! Take a look at the [Contribution Document](https://github.com/bipio-server/bipio/blob/master/CONTRIBUTING.md) to see how to get your changes merged in.

## Support

Please log issues to the [repository issue tracker](https://github.com/bipio-server/bipio/issues) on GitHub.  

## License

[GPLv3](http://www.gnu.org/copyleft/gpl.html)

Our open source license is the appropriate option if you are creating an open source application under a license compatible with the GNU GPLv3. 

If you'd like to integrate BipIO with your proprietary system, GPLv3 is likely incompatible.  To secure a Commercial OEM License for Bipio,
please [reach us](mailto:hello@bip.io)
