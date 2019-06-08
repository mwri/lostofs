(function () {


'use strict';


let mimock  = require('mimock');
let mockset = mimock.mockset;

let gl_mocks    = global.lostofs_fs_tests.gl_mocks;
let pouchdb_lib = global.lostofs_fs_tests.pouchdb_lib;

let lostofs     = require('./../lib/lostofs.js');
let lostofs_fs  = lostofs.fs;
let lostofs_ent = lostofs.ent;

let chai_jasmine = require('chai-jasmine');


let fs;
let root_dir;
let f1_file;


describe('errors setup', function () {

	it('init destroy init, format', function () {
		fs = new lostofs_fs();
		return fs.destroy().then(function () {
			fs = new lostofs_fs();
			return fs.format();
		}).then(function () {
			return fs.get('/');
		}).then(function (ent) {
			root_dir = ent;
			return root_dir.mkfile('f1', 'f1_content');
		}).then(function (ent) {
			f1_file = ent;
		});
	});

});


describe('error thrown', function () {

	it('instantiating entity with bad type', function () {
		let err_thrown;
		try {
			let fake_ent_doc = {
				type: 'foo',
				};
			let ent = new lostofs_ent(fs, fake_ent_doc);
		} catch (err) {
			err_thrown = err;
		}
		if (typeof err_thrown === 'undefined') {
			throw new Error('no exception');
		} else {
			if (!/invalid entity type/.exec(err_thrown))
				throw new Error('exception not as expected: '+err_thrown);
		}
	});

	it('instantiating entity with bad encoding', function () {
		return new Promise(function (fff, rej) {
			return fs.db.get(f1_file.inode()).then(function (ent_doc) {
				ent_doc.encoding = 'not_happening';
				return fs.db.put(ent_doc).then(function () {
					return fs.get('/f1');
				});
			}).catch(function (err) {
				throw new Error('failed to set up test (trying to corrupt DB)');
			}).then(function (ent) {
				ent.data().then(function () {
					rej(new Error('managed to get data after corrupting the encoding'));
				}).catch(function (err) {
					if (/unknown\/unsupported/.exec(err))
						fff(err);
					else
						rej(err);
				});
			});
		});
	});

});


describe('lock recovery after error', function () {

	it('during mkdir, successful', function () {
		let mocks = new mockset();
		mocks.o(fs.db).m('put').wrap(function (helper) {
			if (helper.args[0].type === 'dir')
				throw new Error('sabotage');
			return helper.continue();
		});
		return new Promise (function (fff, rej) {
			return root_dir.mkdir('d1explode').then(function () {
				mocks.restore();
				rej(new Error('no mkdir failure as arranged'));
			}).catch(function (err) {
				mocks.restore();
				if (/sabotage/.exec(err)) {
					return root_dir.mkdir('d1').then(function () {
						fff(err);
					}).catch(function (err) {
						rej(err);
					});
				} else {
					throw err;
				}
			});
		});
	});

	it('during mkfile, successful', function () {
		let mocks = new mockset();
		mocks.o(fs.db).m('put').wrap(function (helper) {
			if (helper.args[0].content === 'f2explode_content')
				throw new Error('sabotage');
			return helper.continue();
		});
		return new Promise (function (fff, rej) {
			return root_dir.mkfile('f2explode', 'f2explode_content').then(function () {
				mocks.restore();
				rej(new Error('no mkfile failure as arranged'));
			}).catch(function (err) {
				mocks.restore();
				if (/sabotage/.exec(err)) {
					return root_dir.mkfile('f2', 'f2_content').then(function () {
						fff(err);
					}).catch(function (err) {
						rej(err);
					});
				} else {
					throw err;
				}
			});
		});
	});

	it('during next_inode, successful', function () {
		let mocks = new mockset();
		mocks.o(fs.db).m('get').wrap(function (helper) {
			if (helper.args[0] === 's_inode')
				throw new Error('sabotage');
			return helper.continue();
		});
		return new Promise (function (fff, rej) {
			return fs.next_inode().then(function () {
				mocks.restore();
				rej(new Error('no next_inode failure as arranged'));
			}).catch(function (err) {
				mocks.restore();
				if (/sabotage/.exec(err)) {
					return fs.next_inode().then(function () {
						fff(err);
					}).catch(function (err) {
						rej(err);
					});
				} else {
					throw err;
				}
			});
		});
	});

});


})();
