# lostofs [![Build Status](https://travis-ci.org/mwri/lostofs.svg?branch=master)](https://travis-ci.org/mwri/lostofs) [![Coverage Status](https://coveralls.io/repos/github/mwri/lostofs/badge.svg?branch=master)](https://coveralls.io/github/mwri/lostofs?branch=master)

LOSTOFS (LOcal STOrage FileSystem) is a filesystem created entirely within
'local storage'.

This is sometimes convenient for [web applications](#web-applications) that
want to provide a filesystem interface, but not manage the file storage server
side. [LOSTOFS FILEMANAGER](https://github.com/mwri/jquery.lostofsfileman)
may be of interest in this case (presents a LOSTOFS filesystem as a jQuery
plugin, rendering it in a traditional looking file manager fashion).


The storage is actually done using [PouchDB](https://pouchdb.com/), so future
versions of lostofs will provide a trivial backup facility by simply replicating
to a CouchDB instance.

The filesystem does not include block level data storage, just a simple way
to store a hierachical structure of files and directories with a pretty simple
API.

## Synopsis

```js
let lostofs    = require('lostofs');        // import module
let lostofs_fs = lostofs.fs;

let fs = new lostofs_fs();                  // create FS
fs.format();                                // format FS

fs.ready().then(function () {               // wait for the FS to come online

    fs.get('/').then(function (root_dir) {  // fetch the root directory

        return root_dir.mkdir('pets');      // create a 'pets' directory in the root

    }).then(function (pets_dir) {

        console.log('Created the /pets directory)');

        return pets_dir.mkfile('nemo.txt', 'name: Nemo');  // create 'nemo.txt' file

    }).then(function (nemo_file) {

        console.log('Created the /pets/nemo.txt file');

    }).catch(function (err) {

        console.log(err);
        throw err;

    });

});
```

## Contents

1. [Getting started](#getting-started)
   1. [Create a filesystem](#create-a-filesystem)
   2. [Format the filesystem](#format-the-filesystem)
   3. [Wait for filesystem readiness](#filesystem-readiness)
      1. [Readiness by event](#readiness-by-event)
      2. [Readiness by promise](#readiness-by-promise)
2. [Accessing the filesystem](#accessing-the-filesystem)
   1. [Root directory contents](#root-directory-contents)
   2. [Create a directory](#create-a-directory)
   3. [Create a file](#create-a-file)
3. [Object types](#object-types)
4. [API reference](#api-reference)
   1. [Module exports](#module-exports)
   2. [Filesystem API reference](#filesystem-api-reference)
      1. [new](#new)
      2. [destroy](#destroy)
      3. [format](#format)
      4. [get](#get)
      5. [ready](#ready)
   3. [Entity API reference](#entity-api-reference)
      1. [inode](#inode)
      2. [type](#type)
      3. [mod_time](#mod_time)
      4. [refresh](#refresh)
   4. [Directory API reference](#directory-api-reference)
      1. [ls](#ls)
      2. [ls_names](#ls_names)
      3. [get](#get)
      4. [path](#path)
      5. [move](#move)
      6. [remove](#remove)
      7. [mkdir](#mkdir)
      8. [mkfile](#mkfile)
   5. [File API reference](#file-api-reference)
      1. [size](#size)
      2. [encoding](#encoding)
      3. [mime_type](#mime_type)
      4. [data](#data)
5. [Events](#events)
6. [Logging](#logging)
7. [Implementation notes](#implementation-notes)
8. [Development](#development)
   1. [Build](#build)
   2. [Web applications](#web-applications)

## Getting started

Access the module exports like this (or using import). All the exports are
shown here though you probably only need `fs`:

```js
let lostofs      = require('lostofs');

let lostofs_fs   = lostofs.fs;
let lostofs_ent  = lostofs.ent;
let lostofs_dir  = lostofs.dir;
let lostofs_file = lostofs.file;
```

Before you can actually do anything useful, you must create a
filesystem, format it, and, wait for it to become ready. Only then can
you create your first files and directories, the following few paragraphs
tell you everything you need to know about this:

1. [Create a filesystem](#create-a-filesystem).
2. [Format the filesystem](#format-the-filesystem).
3. [Wait for filesystem readiness](#filesystem-readiness).

After you've covered this, move on to
[accessing the filesystem](#accessing-the-filesystem). All these sections
and subsections are ordered so as to provide you with what you need to
know, in the order you need to know it, to get started as quickly as
possible. The verbosity level is targetted to provide a reasonable
understanding at the same time however, so if you find it a bit windy
just skip to all the **bold** highlights which say **do this** or
**like this** before sections of code, paste the code out, and hopefully
it won't be too inobvious what the code does and a little common sense
editing will produce something runnable.

Note that there will be various features not demonstrated through these
sections, but it will cover all basic facilities. For the deep dark
dirty details see the [API reference](#api-reference).

### Create a filesystem

If, now and forever, you only care about one filesystem, you can
**do this**:

```js
let fs = new lostofs_fs();
```

If you want multiple filesystems, then you can provide an optional name:

```js
let foobar_fs = new lostofs_fs({db_name:'foobar'});
```

Remember that your filesystem object is one thing, and the backend storage
is another, so if you do this:

```js
let foobar_fs_1 = new lostofs_fs({db_name:'foobar'});
let foobar_fs_2 = new lostofs_fs({db_name:'foobar'});
let foobar_fs_3 = new lostofs_fs({db_name:'foobar'});
```

...you will create three different filesystem instances, but they will
point to the same back end, i.e. create a file in one of them, and it
will 'appear' in the other two! It is important for them to be different
objects however because the filesystem is an event emitter (see
[events](#events) for a full list of events emitted), and if they
were the same, events would become very confusing!

### Format the filesystem

Once created, a filesystem must be formatted, **like this**:

```js
fs.format();
```

You can in fact also specify that the filesystem should be formatted
when you create it, like this:

```js
let fs = new lostofs_fs({unformatted:'format'});
```

This will cause `fs.format()` to be done, if and only if the local
storage which is designated to be used to store the filesystem data
is completely empty/uninitialised. If local storage exists however, but
appears not to be a filesystem (because certain data is missing or invalid)
but there is SOME data present, then from a filesystem perspective it will
be deemed corrupt and automatic formatting will not take place in case the
data is important!

### Filesystem readiness

When you format a filesystem, the operations performed are asynchronous.
This means you can't call `fs.format()` and blunder on regardless, you
must wait to be notified that the format has been completed and the
filesystem is ready.

There are two ways to do this, first you can wait for a 'ready' event
(see [events](#events) later for full details), or you can call ready()
which returns a promise that resolves when the filesystem is ready.

#### Readiness by event

Readiness by event can be done **like this**:

```js
let fs = new lostofs_fs({unformatted:'format'});
fs.on('ready', function () {
    console.log('filesystem is online');
});
```

#### Readiness by promise

Readiness by promise can be done **like this**:

```js
let fs = new lostofs_fs({unformatted:'format'});
fs.ready().then(function () {
    console.log('filesystem is online');
}).catch(function (err) {
    console.log(err);
    throw err;
});
```

For most initialisation error cases, the 'ready' promise will be rejected
(these are non routine cases of permanent failure). In the case of an
unformatted filesystem however the promise will remain unresolved. This
is because an unformatted filesystem is a routine state for the start of
a filesystems life cycle.

## Accessing the filesystem

Once a filesystem is formatted and ready it will have a single (root)
directory (with a full path of /). To 'get' it you can **do this**:

```js
fs.get('/').then(function (root_dir) {
    console.log('retrieved root directory');
}).catch(function (err) {
    console.log(err);
    throw err;
});
```

Yes, it's asynchronous, and at this stage there is (in case you want to)
no getting away from promises! The `root_dir` object in this case is a
lostofs directory object (see [object types](#object-types) later).

### Root directory contents

Building on the above, you can list the contents of the root
directory **like this**:

```js
fs.get('/').then(function (root_dir) {
    return root_dir.ls().then(function (ents) {
        console.log('Listing / (inode '+root_dir.inode()+')');
        for (let i = 0; i < ents.length; i++) {
            console.log('\t'+ents[i][0]+'\t'+ents[i][1].type()+'\t'+ents[i][1].inode()+'\t'+ents[i][1].mod_time());
        }
    });
}).catch(function (err) {
    console.log(err);
    throw err;
});
```

Doing this with a fresh filesystem should yield an output like this:

```js
Listing / (inode i_1)
        .       dir     i_1     Sat  5 Aug 17:47:54 BST 2017
        ..      dir     i_1     Sat  5 Aug 17:47:54 BST 2017
```

For the uninitiated, `.` conventionally points to the current directory, so
in this case that means the root directory, and `..` points to the parent
directory, but because this is the root, like `.` it points to the root.
The third column is the inode, and this explains why the inode, `i_1` is
the same everywhere.

### Create a directory

Like everything else, `mkdir()` is asynchronous and returns a promise.
Creating a directory in the root directory can be done **like this**:

```js
fs.get('/').then(function (root_dir) {
    return root_dir.mkdir('pets');
}).then(function (pets_dir) {
    console.log('Created the /pets directory (inode '+pets_dir.inode()+')');
}).catch(function (err) {
    console.log(err);
    throw err;
});
```

Try the [Root directory contents](#root-directory-contents) example again
now and you should find an 'pets' has appeared in the listing. You can
access the 'pets' directory directly by calling `fs.get('/pets')`, any
full path can be sought this way and either a directory or a file object
will be returned (see [object types](#object-types) later).

### Create a file

Create a file by calling `mkfile()` on any directory object, **like this**:

```js
fs.get('/pets').then(function (pets_dir) {
    return pets_dir.mkfile('nemo.txt', 'name: Nemo');
}).then(function (nemo_file) {
    console.log('Created the /pets/nemo.txt file (inode '+nemo_file.inode()+')');
    console.log('    Inode\t\t'+nemo_file.inode());
    console.log('    Type\t\t'+nemo_file.type());
    console.log('    Created\t\t'+nemo_file.mod_time());
    console.log('    Size\t\t'+nemo_file.size());
}).catch(function (err) {
    console.log(err);
    throw err;
});
```

The `name: Nemo` second argument is the data, the file content.

## Object types

Four object constructors are exported by `lostofs` though you only explicitly
use the filesystem object directly.

Object name | Export                 | Description
:--         | :--                    | :--
lostofs_fs   | require('lostofs').fs   | Filesystem
lostofs_ent  | require('lostofs').ent  | An entity (a file or directory)
lostofs_dir  | require('lostofs').dir  | A directory
lostofs_file | require('lostofs').file | A file

## API reference

### Module exports

The full range of object constructors can be accessed as follows, though
only the `fs`, filesystem constructor, is required:

```js
let lostofs      = require('lostofs');

let lostofs_fs   = lostofs.fs;
let lostofs_ent  = lostofs.ent;
let lostofs_dir  = lostofs.dir;
let lostofs_file = lostofs.file;
```

### Filesystem API reference

1. [new](#new).
2. [destroy](#destroy).
3. [format](#format).
4. [get](#get).
5. [ready](#ready).

#### new

Create a filesystem access object with the filesystem constructor. This
doesn't create or change any actual data, it just creates an interface
object used to access the data.

The constructor accepts one optional object argument, via which named
parameters may be passed:

```js
let fs = new lostofs_fs({});
```

Parameter | Usage
:--       | :--
db_name   | A distinguishing name so that multiple filesystems may be created at once. The default is no name, which is distinct to any name.
debug     | Default is false. Set to true, additional logging may be sent to the console or emitted (see [logging](#logging)).
auto_refresh | Default is true, which means many operations via entities (e.g. `dir.mkdir()`) will reload the entity before completing the operation, instead of using cached data where available. This is safer because an alternate async operation might update the entity leaving other copies of the entity out of date, but if you know this isn't or can't be an issue, setting this to false should improve efficiency, in theory at least.
unformatted | If set to 'format', then the file system will be automatically formatted if it appears to be unformatted and empty. No action will be taken if there is already a valid filesystem. If there is any data present but it does not constitute a valid filesystem then also no action will be taken.

#### destroy

Destroy a filesystem. After completion the filesystem will be empty and
unformatted. Returns a promise, which resolves when the destroy operation
is complete.

```js
fs.destroy().then(function () {
    console.log('filesystem destroyed');
});
```

#### format

Format a filesystem. **WARNING**, all data will be lost!! Returns a promise
which resolves when the operation is complete (just like the ready promise).

```js
fs.format().then(function () {
    console.log('filesystem formatted');
});
```

#### get

Get an entity from its full path. Returns a promise which resolves to the
entity, if it exists.

```js
fs.get('/dir/subdir/something').then(function (ent) {
    console.log('found file/directory');
});
```

#### ready

Returns a promise which resolves if and when the filesystem is ready and
online.

```js
fs.ready().then(function () {
    console.log('filesystem online');
});
```

### Entity API reference

The entity API is common to all files and directories.

1. [inode](#inode).
2. [type](#type).
3. [mod_time](#mod_time).
4. [refresh](#refresh).

#### inode

Returns the inode of the entity.

```js
let inode = ent.inode();
```

#### type

Returns the type of the entity, which is a string, either `dir` or `file`.

```js
let type = ent.type();
```

#### mod_time

Returns the modification time of the entity, which is a `Date` object.

```js
let modified = ent.mod_time();
```

#### refresh

Refreshes the entity by reloading the inode from the underlying database.
Returns a promise that resolves to the entity when the reload is complete.

```js
ent.refresh().then(function (ent2) {
    console.log('entity refreshed');
});
```

The variables `ent` and `ent2` in this case will be the same object, though
the data inside may have changed as a result of the refresh.

### Directory API reference

As well as all the entity calls, directories expose additional API calls.

1. [ls](#ls).
2. [ls_names](#ls_names).
3. [get](#get).
4. [move](#move).
5. [remove](#remove).
6. [mkdir](#mkdir).
7. [mkfile](#mkfile).

#### ls

Returns a promise which resolves to a directory listing. The resolution value
is an array, each with two elements, the first being the filename, and the
second being the entity, something like this:

```js
[ [ 'file1', file1 ],
  [ 'file2', file2 ],
  [ 'dir1',  dir1  ],
  [ 'file3', file3 ], ]
```

See the [root directory contents](#root-directory-contents) example previously
above for a working example.

#### ls_names

Returns a promise which resolves to a list of the filenames in the directory.

```js
file.ls_names().then(function (names) {
    console.log('retrieved list of entries:');
    names.map(function (name) { console.log('\t'+name); });
});
```

#### get

This is like [fs.get()](#fs.get) but it is relative to the directory, not
requiring a full path. A promise is return that resolves to the relative
entity, if found.

```js
dir.get('next_dir/dir_after_that').then(function (ent) {
    console.log('found another two levels');
});
```

#### path

Returns the full path of a directory.

```js
fs.get('/in/here/further').then(function (dir) {
    dir.path().then(function (path) {
        console.log('dir full path is '+path);
    });
});
```

Note that the same functionality can't be provided for files because
although hard links are not currently implemented by the filesystem, they
could be, and thus multiple paths may apply.

#### move

Move (or rename) an entity in the directory. Returns a promise that
resolves when the move is complete (assuming it is successful).

```js
dir.move(old_name, new_name).then(function () {
    console.log('move complete');
});
```

The new name may be either a new name or the full path of another file
(that does not exist).

#### remove

Delete a named entity in the directory. Returns a promise that resolves when
the delete is complete.

```js
dir.remove('some_file').then(function () {
    console.log('deleted');
});
```

#### mkdir

Create a directory. Returns a promise that resolves when the new directory
has been created.

```js
dir.mkdir('subdir').then(function () {
    console.log('subdir created');
});
```

A second optional argument to `mkdir()` may be provided. If given it must
be an object providing named parameters to affect the behaviour of the
directory creation. The following object property parameters are supported:

Name      | Usage
:--       | :--
free_name | The name of the directory may be changed if the given name is taken. If it is changed then a name matching the format "aaa.eee" will become "aaa(n).eee" or "aaa" will become "aaa(n)", where "N" is a number.

#### mkfile

Create a file. Returns a promise that resolves when the new file
has been created.

```js
dir.mkdir('new_file.txt', contents).then(function () {
    console.log('file created');
});
```

A third optional argument to `mkfile()` may be provided. If given it must
be an object providing named parameters to affect the behaviour of the file
creation. The following object property parameters are supported:

Name      | Usage
:--       | :--
mime_type | Retain the given value as the mime type of the data.
mod_time  | Use this (must be a `Date` object) as the modification time of the file (defaults to now).
free_name | The name of the file may be changed if the given name is taken. If it is changed then a name matching the format "aaa.eee" will become "aaa(n).eee" or "aaa" will become "aaa(n)", where "N" is a number.

### File API reference

As well as all the entity calls, files expose additional API calls.

1. [size](#size).
2. [encoding](#encoding).
3. [mime_type](#mime_type).
4. [data](#data).

#### size

Returns the file size (the content length, in bytes).

```js
let size = file.size();
```

#### encoding

Returns a string indicating the encoding of the content. If a plain string was
given as the content when the file was created then this will be `undefined`
but if an array buffer was passed because the data is binary, then this will
return `"arraybuffer"`.

```js
if (file.encoding() === undefined) {
    console.log('plain text');
} else if (file.encoding() === 'arraybuffer') {
    console.log('array buffer');
}
```

#### mime_type

Return the mime type. If no mime type is unknown then `undefined` will be
returned, but otherwise the mime type will be returned as a string.

```js
let mime_type = file.mime_type();
```

#### data

Returns a promise that resolves to the content of the file:

```js
file.data().then(function (content) {
    console.log('file data loaded:');
    console.log(content);
});
```

An optional parameter may be passed to change/set the content:

```js
file.data(new_content).then(function (content) {
    console.log('file saved:');
    console.log(content);
});
```

A second optional argument to `data()` may be provided. If given it must
be an object providing named parameters:

Name      | Usage
:--       | :--
mime_type | Sets the mime type of the data.
mod_time  | Use this (must be a `Date` object) as the modification time of the file (defaults to now).

## Events

The filesystem objects are event emitters, and the following events are
supported relating to the filesystem generally and it's initialisation:

Name        | Usage
:--         | :--
ready       | Emitted when the filesystem comes online. It is usually only emitted once and only once after the filesystem constructor is called, but it may not be called if the filesystem never comes online, or it may be called additional times if the filesystem is reformatted. No arguments are passed with the event.
log         | Emitted for a log worthy event occurrance. Two arguments are passed with the event, the level of the logged event ('debug', 'info', 'warning' or 'error') and the string log message itself.
format      | The filesystem is above to be formatted. No arguments are passed with the event. A 'ready' event should follow, assuming the format is successful.
init_failed | Initialisation of the filesystem failed. One argument, the reason for the failure is passed as an argument. This reason will be the DB state, 'unformatted' or 'corrupt'. A 'log' event will be emitted as well.
init_error  | A completely unrecognised/unexpected error occurred during initialisation. One argument is passed with the event, the error object (or whatever was thrown). A 'log' event will be emitted as well.

The following events are supported relating to routine filesystem operations:

Name        | Usage
:--         | :--
move        | Emitted when a file is moved. Five arguments are passed with the event, the source directory, 'old' name, the destination directory (which might be the same as the source directory), the 'new' name (which might be the same as the 'old' name if the source and destination directories are different) and the new/resultant path (as passed to [dir.move()](#move)).
remove      | Emitted when a file is removed. Two arguments are passed with the event, the directory from which the entity was removed and the entity name.
mkdir       | Emitted when a directory is created. Three arguments are passed with the event, the directory in which the new directory was created, the name of the new directory created, and the directory itself.
mkfile      | Emitted when a file is created. Three arguments are passed with the event, the directory in which the new file was created, the name of the new file created, and the file itself.
create      | Emitted when a file or directory is created. Three arguments are passed with the event, the directory in which the new file was created, the name of the new entity created, and the entity itself.

## Logging

Logging is achieved by event emission; a 'log' event is emitted with two arguments, the level of the logged event, an event name/key and the log message itself.

The level will be 'debug', 'info', 'warning' or 'error'.

## Implementation notes

No block level storage is performed, the most fundamental storage objects are
entities (files and directories).

The filesystem is implemented after the fashion of normal filesystems
however and does have an [inode](https://en.wikipedia.org/wiki/Inode) concept
however, which makes some operations such as moving non empty directories
much saner, and allows hard links (though that remains unimplemented in lostofs
currently).

## Development

Any contributions in the form of pull requests are welcome, but please
consider the following guidelines:

* Include documention updates for any change that affects integration
  or documented behaviour.
* Include new or modified tests for new or modified behaviour, paying
  attention to the coverage (remember just covering it doesn't mean it
  works, the features actually have to be tested for).
* Follow the existing code style and formatting where ever it is reasonable
  to do so (I believe in consistency, but not necessarily for the sake of
  significantly reduced clarity).
* Don't add 'dist' files to the PR, they aren't source files and I will
  update them for releases, or arbitrarily where appropriate.
* Don't add an updated 'package-lock.js' to the PR. It's a big noisy file
  and the changes are really just a distraction, I will regenerate it for
  releases, or arbitrarily where appropriate.

Issues are also (sort of) welcome, should you believe there is a bug or
want to promote or discuss an enhancement.

### Build

run `npm install` to install the dev/build dependencies, and `grunt build`
to build.

This will build `dist/lostofs.js` and run the unit tests.

Running `grunt watch_dev` will invoke the most light weight possible file
watch lint build and test cycle. Running `grunt watch_full` will watch for
file changes and instigate a full build including coverage reports.

### Web applications

LOSTOFS uses aspects of the NodeJS environment, as as such calls `require`.
In order to use it in a web browser environment then it must be bundled in
some way. Either require it, and bundle it with [Webpack](https://webpack.js.org/)
or [Browserify](http://browserify.org/) along with the rest of your app, or
if you currently do not use Webpack or Browserify you could use the pre built
minified bundle, [LOSTOFS FILEMANAGER](https://github.com/mwri/jquery.lostofsfileman)
uses this pre built bundle for its demo, which is then included
by the HTML like any other dependency free Javascript module designed
specifically for or to be compatible with the browser.
