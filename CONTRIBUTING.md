# How to contribute

Third-party patches are essential to keeping BipIO fit and healthy.  With tens of thousands of API's on the web ripe for integration, there's plenty of challenges and opportunity for you to be a valued community partner and for BipIO to make it worth your while.  We want to keep it as easy as possible to contribute changes that
get things working in your environment. There are a few guidelines that we
need contributors to follow so that we can have a chance of keeping on
top of things.  It's not personal, just important that we're all speaking the same language.


## Getting Started

* Make sure you have a [GitHub account](https://github.com/signup/free)
* Submit a ticket for your issue, assuming one does not already exist on the [repo issue tracker](https://github.com/bipio-server/bipio/issues).
  * Clearly describe the issue including steps to reproduce when it is a bug.
  * Make sure you fill in the earliest version that you know has the issue.
* Fork the repository on GitHub

## Making Changes

* Create a topic branch from where you want to base your work.
  * This is usually the master branch.
  * Only target release branches if you are certain your fix must be on that
    branch.
  * To quickly create a topic branch based on master; `git checkout -b
    fix/master/my_contribution master`. Please avoid working directly on the
    `master` branch.
* Make commits of logical units.
* Check for unnecessary whitespace with `git diff --check` before committing.
* Make sure your commit messages are in the proper format.

````
    fixes #1 

     Make the example in CONTRIBUTING imperative and concrete

    Without this patch applied the example commit message in the CONTRIBUTING
    document is not a concrete example.  This is a problem because the
    contributor is left to imagine what the commit message should look like
    based on a description rather than an example.  This patch fixes the
    problem by making the example concrete and imperative.

    The first line is a real life imperative statement with a ticket number
    from our issue tracker.  The body describes the behavior without the patch,
    why this is a problem, and how the patch fixes the problem when applied.
````

## Submitting Changes

* Push your changes to a topic branch in your fork of the repository.
* Submit a pull request to the bipio repository in the bipio-server organization.
* Update your Github issue to mark that you have submitted code and are ready for it to be reviewed, be sure to reference the issue number in your forked commit message (Status: Ready for Merge).

## Migrations

[Migrations](http://en.wikipedia.org/wiki/Software_modernization) is the mechanism BipIO uses to upgrade itself when its software version changes.  To create a migration, create the file `migrations/<% pkg.version%>/index.js`.

[Example Migration](https://github.com/bipio-server/bipio/blob/master/migrations/0.2.50/index.js)
 
## Submitting Changes to Pods

Changes to Pods (ie: bip-pod-? repositories in the Github bipio-server organization) should follow the same steps as above, however issues should be logged and tracked for each individual pod repository.

## Submitting New Pods for endorsement

 * Create a Pod under your own GitHub account named `bip-pod-{pod name}`
 * Submit a new issue in the [repo issue tracker](https://github.com/bipio-server/bipio/issues), detailing the new pod, some potential use cases (for testing), and a link to your repository
 * Your Pod repo will be installed and peer reviewed for scalability and security, and rolled into the [Official Pods List](https://github.com/bipio-server/bipio/wiki/Pod-List).  If its generally useful, it may even ship with the server itself.



