// Package: lostofs
// Copyright: (C) 2017 Michael Wright <mjw@methodanalysis.com>
// License: MIT


(function (exports) {


'use strict';


let pouchdb = require('pouchdb');

let PouchDB = typeof pouchdb === 'function'
	? pouchdb
	: /* istanbul ignore next */ pouchdb.default;

let polylock     = require('polylock');
let EventEmitter = require('events').EventEmitter;


let locks = {};


let lostofs_fs = (function() {

	const default_debug        = false;
	const default_auto_refresh = true;

	let lostofs_fs = function lostofs_fs (params) {

		if (params === undefined)
			params = {};

		let db_name = 'db_name' in params
			? 'lostofs_fs_'+params.db_name
			: 'lostofs_fs';

		let db = dbop.create(db_name);

		this.debug        = 'debug' in params        ? params.debug        : default_debug;
		this.auto_refresh = 'auto_refresh' in params ? params.auto_refresh : default_auto_refresh;
		this.db_name      = db_name;
		this.db           = db;

		if (!(db_name in locks))
			locks[db_name] = new polylock();
		this.locks = locks[db_name];

		let this_fs = this;

		this.ready_prom = new Promise(function (ready_ff, ready_rf) {

			this_fs.ready_ff = ready_ff;
			this_fs.ready_rf = ready_rf;

			dbop.db_init_state(db, this_fs.id).then(function (db_state) {
				if (db_state === 'ok') {
					ready_ff(true);
					this_fs.emit('ready');
					this_fs.emit('log', 'info', 'filesystem online');
				} else if (db_state === 'unformatted' && params.unformatted === 'format') {
					this_fs.format();
				} else {
					this_fs.emit('init_failed', db_state);
					if (db_state === 'unformatted') {
						let errmsg = 'filesystem unformatted/empty, call format';
						this_fs.emit('log', 'error', errmsg);
					}  else if (db_state === 'corrupt') {
						let errmsg = 'filesystem corrupt/unformatted/invalid';
						this_fs.emit('log', 'error', errmsg);
						ready_rf(new Error(errmsg));
					} else {
						let errmsg = 'DB state "'+db_state+'" not recognised';
						this_fs.emit('log', 'error', errmsg);
						ready_rf(new Error(errmsg));
					}
				}
			}).catch(function (err) {
				let errmsg = 'unrecognised filesystem error: ' + err;
				this_fs.emit('init_error', err);
				this_fs.emit('log', 'error', errmsg);
				ready_rf(err);
			});

		});

		EventEmitter.apply(this);

	};

	lostofs_fs.prototype = new EventEmitter();
	lostofs_fs.prototype.constructor = lostofs_fs;


	lostofs_fs.prototype.ready = function () {

		return this.ready_prom;

	};


	lostofs_fs.prototype.destroy = function () {

		let this_fs = this;
		return dbop.destroy(this.db).then(function () {
			this_fs.db    = undefined;
			this_fs.locks = undefined;
			this_fs.ready_prom = new Promise(function (ready_ff, ready_rf) {
				this_fs.ready_ff = ready_ff;
				this_fs.ready_rf = ready_rf;
			});
			return true;
		});

	};


	lostofs_fs.prototype.format = function () {

		let db      = this.db;
		let db_name = this.db_name;
		let this_fs = this;

		this_fs.emit('format');
		this_fs.emit('log', 'info', 'filesystem format initiated');
		return dbop.destroy(db).then(function() {
			this_fs.db    = dbop.create(db_name);
			this_fs.locks = new polylock();
			db = this_fs.db;
			return this_fs.locks.wait({superblock:'write'}).then(function (release) {
				return dbop.mk_superblock(db).then(function () {
					return dbop.mkrootdir(db);
				}).then(function () {
					release();
				}).catch(function (err) {
					release();
					throw err;
				});
			});
		}).then(function () {
			this_fs.ready_ff(true);
			this_fs.emit('log', 'info', 'filesystem online');
			this_fs.emit('ready');
			return true;
		});

	};


	lostofs_fs.prototype.next_inode = function () {

		let fs = this;
		let db = fs.db;

		return this.locks.wait({superblock:'write'}).then(function (release) {
			return new Promise(function (fff, rej) {
				return dbop.next_inode(db).then(function (inode) {
					release();
					fff(inode);
				});
			}).catch(function (err) {
				release();
				throw err;
			});
		});

	};


	lostofs_fs.prototype.get = function (path) {

		let fs = this;
		let db = this.db;

		return dbop.path_to_doc(db, path).then(function (doc) {
			return new lostofs_ent(fs, doc);
		});

	};


	return lostofs_fs;


})();


let lostofs_ent = (function() {

	let lostofs_ent = function lostofs_ent (fs, ent_doc) {

		if (fs === null)
			return;

		if (this.constructor === lostofs_ent) {
			if (ent_doc.type === 'file')
				return new lostofs_file(fs, ent_doc);
			else if (ent_doc.type === 'dir')
				return new lostofs_dir(fs, ent_doc);
			else
				throw new Error('instantiating entity, internal error, invalid entity type "'+ent_doc.type+'" in DB document');
		}

		this.fs      = fs;
		this.ent_doc = ent_doc;

	};


	lostofs_ent.prototype.inode     = function () { return this.ent_doc._id;                };
	lostofs_ent.prototype.type      = function () { return this.ent_doc.type;               };
	lostofs_ent.prototype.mod_time  = function () { return new Date(this.ent_doc.mod_time); };


	lostofs_ent.prototype.refresh = function () {

		let fs       = this.fs;
		let db       = fs.db;
		let this_ent = this;

		return dbop.latest_ent_doc(db, this.ent_doc).then(function (latest_doc) {
			this_ent.ent_doc = latest_doc;
			return this_ent;
		});

	};


	lostofs_ent.prototype.opt_refresh = function () {

		if (!this.fs.auto_refresh)
			return Promise.resolve(this);

		let fs = this.fs;
		let db = fs.db;

		return dbop.latest_ent_doc(db, this.ent_doc).then((latest_doc) => {
			this.ent_doc = latest_doc;
			return this;
		});

	};


	return lostofs_ent;


})();


let lostofs_file = (function() {

	let lostofs_file = function lostofs_file (fs, ent_doc) {

		lostofs_ent.apply(this, [fs, ent_doc]);

	};

	lostofs_file.prototype = new lostofs_ent(null);
	lostofs_file.prototype.constructor = lostofs_file;


	lostofs_file.prototype.size      = function () { return this.ent_doc.size;      };
	lostofs_file.prototype.encoding  = function () { return this.ent_doc.encoding;  };
	lostofs_file.prototype.mime_type = function () { return this.ent_doc.mime_type; };


	lostofs_file.prototype.data = function (new_content, options) {

		let fs = this.fs;
		let db = fs.db;

		if (new_content !== undefined) {

			if (options === undefined)
				options = {};

			let encoding;
			let mime_type;
			let mod_time;
			let size;

			if (typeof new_content === 'object'
					&& (new_content.constructor === ArrayBuffer || ArrayBuffer.isView(new_content))) {
				size        = new_content.byteLength;
				new_content = arraybuffer_to_base64(new_content);
				encoding    = 'arraybuffer';
			} else {
				size = new_content.length;
			}

			mime_type = options.mime_type;
			mod_time  = options.mod_time || new Date();

			return dbop.savefile(
					db, this.ent_doc, new_content, size, mod_time, encoding, mime_type
					).then(() => {
				if (encoding === undefined)
					return new_content;
				else
					return base64_to_arraybuffer(new_content);
			});

		}

		return this.opt_refresh().then(() => {
			let ent_doc = this.ent_doc;
			if (ent_doc.encoding === undefined)
				return ent_doc.content;
			else if (ent_doc.encoding === 'arraybuffer')
				return base64_to_arraybuffer(ent_doc.content);
			else
				throw new Error('encoding '+ent_doc.encoding+' unknown/unsupported');
		});

	};


	return lostofs_file;


})();


let lostofs_dir = (function() {

	let lostofs_dir = function lostofs_dir (fs, ent_doc) {

		lostofs_ent.apply(this, [fs, ent_doc]);

	};

	lostofs_dir.prototype = new lostofs_ent(null);
	lostofs_dir.prototype.constructor = lostofs_dir;


	lostofs_dir.prototype.ls = function () {

		let fs = this.fs;
		let db = fs.db;

		return this.opt_refresh().then(function (this_dir) {
			let this_doc = this_dir.ent_doc;
			let content  = this_doc.content;
			return Promise.all(Object.keys(content).map(function(name) {
				return dbop.inode_to_doc(db, content[name]).then(function (ent_doc) {
					return [name, new lostofs_ent(fs, ent_doc)];
				});
			}));
		});

	};


	lostofs_dir.prototype.ls_names = function () {

		return this.opt_refresh().then(function (this_dir) {
			return Object.keys(this_dir.ent_doc.content);
		});

	};


	lostofs_dir.prototype.ls_inodes = function () {

		return this.opt_refresh().then(function (this_dir) {
			let content = this_dir.ent_doc.content;
			return Object.keys(content).map(function (k) { return content[k]; });
		});

	};


	lostofs_dir.prototype.get = function (path) {

		let fs = this.fs;
		let db = fs.db;

		return dbop.doc_path_to_doc(db, this.ent_doc, path).then(function(ent_doc) {
			return new lostofs_ent(fs, ent_doc);
		});

	};


	lostofs_dir.prototype.path = function () {

		let fs = this.fs;
		let db = fs.db;

		let path = '';

		function parent_path (doc) {
			return dbop.doc_name_to_doc(db, doc, '..').then(function (parent_doc) {
				let ent_names = Object.keys(parent_doc.content);
				for (let i = 0; i < ent_names.length; i++)
					if (parent_doc.content[ent_names[i]] === doc._id) {
						path = path ? ent_names[i]+'/'+path : ent_names[i];
						if (parent_doc.content['..'] === parent_doc._id) {
							path = '/'+path;
							return path;
						}
						return parent_path(parent_doc);
					}
			});
		}

		return parent_path(this.ent_doc);

	};



	lostofs_dir.prototype.move = function (old_name, new_path) {

		let fs = this.fs;
		let db = fs.db;

		let this_dir = this;

		return this.opt_refresh().then(function (src_dir) {

			let dst_dir_prom;
			let new_name;

			if (new_path.indexOf('/') === -1) {
				new_name     = new_path;
				dst_dir_prom = Promise.resolve(src_dir);
			} else {
				let match = /^(.*)\/([^\/]+)$/.exec(new_path);
				if (match) {
					new_name     = match[2];
					dst_dir_prom = fs.get(match[1]);
				} else {
					return Promise.reject(new Error('destination must be a new file path, not a directory'));
				}
			}

			return dst_dir_prom.then(function (dst_dir) {
				return dbop.move(db, src_dir.ent_doc, old_name, dst_dir.ent_doc, new_name).then(function () {
					fs.emit('move', src_dir, old_name, dst_dir, new_name, new_path);
					return true;
				});
			});

		});

	};


	lostofs_dir.prototype.remove = function (name) {

		let fs = this.fs;
		let db = fs.db;

		let this_doc = this.ent_doc;

		if (name === '.')
			return Promise.reject(new Error('cannot delete "." (current directory)'));
		if (name === '..')
			return Promise.reject(new Error('cannot delete ".." (parent directory)'));

		if (!(name in this_doc.content))
			return Promise.reject(new Error('no such file or directory; "'+name+'" not found'));

		return this.opt_refresh().then(function (this_dir) {

			return db.get(this_doc.content[name]).then(function (rm_doc) {
				if (rm_doc.type === 'dir' && Object.keys(rm_doc.content).length > 2)
					throw new Error('directory not empty');
				return db.remove(rm_doc);
			}).then(function () {
				delete this_doc.content[name];
				return db.put(this_doc).then(function (this_doc_update) {
					return db.get(this_doc_update.id);
				});
			}).then(function (new_this_doc) {
				this_dir.ent_doc = new_this_doc;
				fs.emit('remove', this_dir, name);
				return true;
			});

		});

	};


	lostofs_dir.prototype.mkdir = function (name, options) {

		if (options === undefined)
			options = {};

		let fs = this.fs;
		let db = fs.db;

		if (options.free_name) {
			let this_dir = this;
			return this.free_name(name).then(function (free_name) {
				options.free_name = false;
				return this_dir.mkdir(free_name, options);
			});
		}

		return this.opt_refresh().then(function(this_dir) {

			let this_doc = this_dir.ent_doc;

			if (name in this_doc.content)
				return Promise.reject(new Error('mkdir "'+name+'" failed, file or directory already exists'));

			return fs.next_inode().then(function (inode) {
				let pardir_locks = {};
				pardir_locks[this_dir.inode()] = 'write';
				return fs.locks.wait(pardir_locks).then(function (release) {
					return new Promise(function (fff, rej) {
						dbop.mkdir(db, inode, this_doc, name).then(function (ent_doc) {
							release();
							fff(ent_doc);
						});
					}).catch(function (err) {
						release();
						throw err;
					});
				});
			}).then(function (newdir_doc) {
				let new_dir = new lostofs_dir(fs, newdir_doc);
				fs.emit('mkdir', this_dir, name, new_dir);
				fs.emit('create', this_dir, name, new_dir);
				return new_dir;
			});

		});

	};


	lostofs_dir.prototype.mkfile = function (name, content, options) {

		if (options === undefined)
			options = {};

		let fs = this.fs;
		let db = fs.db;

		if (options.free_name) {
			let this_dir = this;
			return this.free_name(name).then(function (free_name) {
				options.free_name = false;
				return this_dir.mkfile(free_name, content, options);
			});
		}

		return this.opt_refresh().then(function(this_dir) {

			let this_doc = this_dir.ent_doc;

			if (name in this_doc.content)
				throw new Error('creating file "'+name+'" failed, file or directory already exists');

			let encoding;
			let mime_type;
			let mod_time;
			let size;

			if (typeof content === 'object'
					&& (content.constructor === ArrayBuffer || ArrayBuffer.isView(content))) {
				size     = content.byteLength;
				content  = arraybuffer_to_base64(content);
				encoding = 'arraybuffer';
			} else {
				size = content.length;
			}

			mime_type = options.mime_type;
			mod_time  = options.mod_time || new Date();

			return fs.next_inode().then(function (inode) {
				let pardir_locks = {};
				pardir_locks[this_dir.inode()] = 'write';
				return fs.locks.wait(pardir_locks).then(function (release) {
					return new Promise(function (fff, rej) {
						dbop.mkfile(
								db, inode, this_doc, name, content, size, mod_time, encoding, mime_type
								).then(function (ent_doc) {
							release();
							fff(ent_doc);
						});
					}).catch(function (err) {
						release();
						throw err;
					});
				});
			}).then(function (newfile_doc) {
				let new_file = new lostofs_file(fs, newfile_doc);
				fs.emit('mkfile', this_dir, name, new_file);
				fs.emit('create', this_dir, name, new_file);
				return new_file;
			});
		});

	};


	lostofs_dir.prototype.free_name = function (name) {

		let fs = this.fs;

		let name_ext;
		let re_match = /^(\S+.*)\.(\S{3,4})$/.exec(name);
		if (re_match) {
			name     = re_match[1];
			name_ext = re_match[2];
		}

		return this.opt_refresh().then(function (this_dir) {

			let this_doc = this_dir.ent_doc;
			let content  = this_doc.content;

			if (name_ext === undefined) {
				if (!(name in content)) {
					return name;
				} else {
					let i = 2;
					while (name+'('+i+')' in content)
						i++;
					return name+'('+i+')';
				}
			} else {
				if (!(name+'.'+name_ext in content)) {
					return name+'.'+name_ext;
				} else {
					let i = 2;
					while (name+'('+i+').'+name_ext in content)
						i++;
					return name+'('+i+').'+name_ext;
				}
			}

		});

	};


	return lostofs_dir;


})();


function base64_to_arraybuffer (base64) {

	let bin_str = (new Buffer(base64, 'base64')).toString();
	let len     = bin_str.length;
	let bytes   = new Uint8Array(len);

	for (let i = 0; i < len; i++)
		bytes[i] = bin_str.charCodeAt(i);

	return bytes.buffer;

}


function arraybuffer_to_base64 (buffer) {

	let bin_str = '';
	let bytes   = new Uint8Array(buffer);
	let len     = bytes.byteLength;

	for (let i = 0; i < len; i++)
		bin_str += String.fromCharCode(bytes[i]);

	return (new Buffer(bin_str)).toString('base64');

}


let dbop = {

	create: function create (name) {

		return new PouchDB(name);

	},

	destroy: function destroy (db) {

		return db === undefined ? Promise.resolve(true) : db.destroy();

	},

	mk_superblock: function mk_superblock (db) {

		return db.put({
			_id:  's_inode',
			next: 2,
		});

	},

	db_init_state: function db_init_state (db) {

		return db.get('i_1').then(function () {
			return db.get('s_inode');
		}).then(function () {
			return 'ok';
		}).catch(function (err) {
			if (err.status === 404) {
				return db.info().then(function (db_info) {
					return db_info.doc_count === 0 ? 'unformatted' : 'corrupt';
				});
			} else {
				return 'corrupt';
			}
		});

	},

	mkrootdir: function mkrootdir (db) {

		return db.put({
			_id:       'i_1',
			type:      'dir',
			mod_time:  new Date(),
			content:   {
				'.':  'i_1',
				'..': 'i_1',
				},
		});

	},

	latest_ent_doc: function latest_ent_doc (db, doc) {

		return db.get(doc._id);

	},

	inode_to_doc: function inode_to_doc (db, inode) {

		return db.get(inode);

	},

	path_to_doc: function path_to_doc (db, path) {

		if (path.charAt(0) !== '/')
			return Promise.reject(new Error('path "'+path+'" does not begin with /'));

		return db.get('i_1').then(function (root_doc) {
			return dbop.doc_path_to_doc(db, root_doc, path);
		});

	},

	doc_path_to_doc: function doc_path_to_doc (db, doc, path) {

		if (path === '')
			return doc;

		let slash_index = path.indexOf('/');

		if (slash_index === 0)
			return dbop.doc_path_to_doc(db, doc, path.substr(1));

		if (slash_index === -1)
			return dbop.doc_name_to_doc(db, doc, path);

		return dbop.doc_name_to_doc(
					db, doc, path.substr(0, slash_index)
				).then(function (next_doc) {
			return dbop.doc_path_to_doc(db, next_doc, path.substr(slash_index+1));
		});

	},

	doc_name_to_doc: function doc_name_to_doc (db, doc, name) {

		if (doc.type !== 'dir')
			return Promise.reject(new Error('not a directory'));

		if (name in doc.content)
			return db.get(doc.content[name]);
		else
			return Promise.reject(new Error('"'+name+'" not found'));

	},

	next_inode: function next_inode (db) {

		return db.get('s_inode').then(function (sb_inode_doc) {
			let inode_num = sb_inode_doc.next;
			sb_inode_doc.next = inode_num+1;
			return db.put(sb_inode_doc).then(function () {
				return 'i_'+inode_num;
			});
		});

	},

	mkdir: function mkdir (db, inode, pardir_doc, name) {

		let new_dir_doc = {
			_id:       inode,
			type:      'dir',
			mod_time:  new Date(),
			content:   {
				'.':  inode,
				'..': pardir_doc._id,
				},
			};
		return db.put(new_dir_doc).then(function (new_dir_put) {
			new_dir_doc._rev = new_dir_put.rev;
			pardir_doc.content[name] = new_dir_doc._id;
			return db.put(pardir_doc);
		}).then(function () {
			return new_dir_doc;
		});

	},

	mkfile: function mkfile (db, inode, pardir_doc, name, content, size, mod_time, encoding, mime_type) {

		let new_file_doc = {
			_id:       inode,
			type:      'file',
			size:      size,
			mod_time:  mod_time || new Date(),
			links:     1,
			content:   content,
			encoding:  encoding,
			mime_type: mime_type,
			};

		return db.put(new_file_doc).then(function (new_file_put) {
			new_file_doc._rev = new_file_put.rev;
			pardir_doc.content[name] = new_file_doc._id;
			return db.put(pardir_doc).then(function () {
				return new_file_doc;
			});
		});

	},

	savefile: function save (db, doc, content, size, mod_time, encoding, mime_type) {

		if (doc.type !== 'file')
			return Promise.reject(new Error('cannot save the content of a directory'));

		doc.size      = size;
		doc.mod_time  = mod_time || new Date();
		doc.content   = content;
		doc.encoding  = encoding;
		doc.mime_type = mime_type;

		return db.put(doc).then((put) => {
			return db.get(doc._id);
		});

	},

	move: function move (db, pardir_doc, old_name, new_pardir_doc, new_name) {

		if (!(old_name in pardir_doc.content))
			return Promise.reject(new Error('"'+old_name+'" not found'));

		if (new_name in new_pardir_doc.content)
			return Promise.reject(new Error('"'+new_name+'" already exists'));

		return new Promise(function (fff, rej) {
			if (pardir_doc._id === new_pardir_doc._id)
				return fff(true);
			function parent_dir (doc) {
				return dbop.doc_name_to_doc(db, doc, '..').then(function (parent_doc) {
					return doc._id !== parent_doc._id
						? parent_doc._id === pardir_doc._id
							? rej(new Error('cannot move an entity to a subdirectory of itself'))
							: parent_dir(parent_doc)
						: fff(true);
				});
			}
			return db.get(pardir_doc.content[old_name]).then(function (move_ent) {
				if (move_ent.type === 'file')
					return fff(true);
				return parent_dir(new_pardir_doc);
			});
		}).then(function () {
			return new Promise(function (fff, rej) {
				if (pardir_doc._id === new_pardir_doc._id) {
					pardir_doc.content[new_name] = pardir_doc.content[old_name];
					delete pardir_doc.content[old_name];
					db.put(pardir_doc).then(function (put) {
						fff(put);
					});
				} else {
					new_pardir_doc.content[new_name] = pardir_doc.content[old_name];
					return db.put(new_pardir_doc).then(function () {
						delete pardir_doc.content[old_name];
						db.put(pardir_doc).then(function (put) {
							fff(put);
						});
					});
				}
			}).then(function (put) {
				return db.get(put.id);
			});
		});

	},

};


module.exports = {
	fs:   lostofs_fs,
	ent:  lostofs_ent,
	dir:  lostofs_dir,
	file: lostofs_file,
};

/* test-code */

module.exports.test = {
	dbop: dbop,
};

/* end-test-code */


})(typeof exports !== 'undefined' ? exports : /* istanbul ignore next */ this.lostofs={});
