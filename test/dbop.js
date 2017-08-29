(function () {


'use strict';


let mimock  = require('mimock');
let mockset = mimock.mockset;

let gl_mocks    = global.lostofs_fs_tests.gl_mocks;
let pouchdb_lib = global.lostofs_fs_tests.pouchdb_lib;

let lostofs    = require('./../dist/lostofs.js');
let lostofs_fs = lostofs.fs;

let chai_jasmine = require('chai-jasmine');

let PouchDB = require('pouchdb');


function fake_pouchdb_error (code, msg) {

	let err = new Error(msg);
	err.status = code;

	return err;

}


describe('dbop (DB operation)', function () {

	describe('dbop.create', function () {

		it('creates PouchDB DB (default)', function () {
			let cons_wrap = pouchdb_lib.e().w(function (helper) {
				expect(helper.args[0]).toBe(undefined);
				return {a:1};
			});
			expect(lostofs.test.dbop.create()).toEqual({a:1});
			cons_wrap.restore();
		});

		it('creates PouchDB DB (named)', function () {
			let cons_wrap = pouchdb_lib.e().w(function (helper) {
				expect(helper.args[0]).toBe('named');
				return {a:2};
			});
			expect(lostofs.test.dbop.create('named')).toEqual({a:2});
			cons_wrap.restore();
		});

	});

	describe('dbop.destroy', function () {

		it('skips undefined db', function () {
			let destroy_prom = lostofs.test.dbop.destroy(undefined);
			return destroy_prom.then(function (result) {
				expect(result).toBe(true);
			});
		});

		it('destroys defined db', function () {
			let mocks = new mockset();
			let db = new PouchDB('lostofs_fs');
			let destroy_seen = 0;
			mocks.o(db).m('destroy').wrap(function () {
				destroy_seen++;
				return Promise.resolve(true);
			});
			return lostofs.test.dbop.destroy(db).then(function (result) {
				expect(result).toBe(true);
				expect(destroy_seen).toBe(1);
				mocks.restore();
			});
		});

	});

	describe('dbop.mk_superblock', function () {

		it('creates superblock', function () {
			let mocks = new mockset();
			let db = new PouchDB('lostofs_fs');
			mocks.o(db).m('put').wrap(function (helper) {
				if (helper.args[0]._id === 's_inode')
					return Promise.resolve({ok:true,id:helper.args[0]._id,rev:'123'});
				return Promise.reject(new Error('unexpected PouchDB operation'));
			});
			return lostofs.test.dbop.mk_superblock(db).then(function (result) {
				mocks.restore();
			});
		});

	});

	describe('dbop.db_init_state', function () {

		it('returns ok when superblock and root inode exist', function () {
			let mocks = new mockset();
			let db = new PouchDB('lostofs_fs');
			mocks.o(db).m('get').wrap(function (helper) {
				if (helper.args[0] === 'i_1')
					return Promise.resolve({_id:helper.args[0]._id,_rev:'123'});
				if (helper.args[0] === 's_inode')
					return Promise.resolve({_id:helper.args[0]._id,_rev:'123'});
				return Promise.reject(new Error('unexpected PouchDB get() operation'));
			});
			mocks.o(db).m('info').wrap(function (helper) {
				return Promise.reject(new Error('unexpected PouchDB info() operation'));
			});
			return lostofs.test.dbop.db_init_state(db).then(function (result) {
				expect(result).toBe('ok');
				mocks.restore();
			});
		});

		it('returns unformatted when superblock is missing and DB is empty', function () {
			let mocks = new mockset();
			let db = new PouchDB('lostofs_fs');
			mocks.o(db).m('get').wrap(function (helper) {
				if (helper.args[0] === 'i_1')
					return Promise.resolve({_id:helper.args[0]._id,_rev:'123'});
				if (helper.args[0] === 's_inode')
					return Promise.reject(fake_pouchdb_error(404, 'not found (superblock)'));
				return Promise.reject(new Error('unexpected PouchDB operation'));
			});
			mocks.o(db).m('info').wrap(function (helper) {
				return Promise.resolve({doc_count:0});
			});
			return lostofs.test.dbop.db_init_state(db).then(function (result) {
				expect(result).toBe('unformatted');
				mocks.restore();
			});
		});

		it('returns unformatted when root inode is missing and DB is empty', function () {
			let mocks = new mockset();
			let db = new PouchDB('lostofs_fs');
			mocks.o(db).m('get').wrap(function (helper) {
				if (helper.args[0] === 'i_1')
					return Promise.reject(fake_pouchdb_error(404, 'not found (root inode)'));
				if (helper.args[0] === 's_inode')
					return Promise.resolve({_id:helper.args[0]._id,_rev:'123'});
				return Promise.reject(new Error('unexpected PouchDB operation'));
			});
			mocks.o(db).m('info').wrap(function (helper) {
				return Promise.resolve({doc_count:0});
			});
			return lostofs.test.dbop.db_init_state(db).then(function (result) {
				expect(result).toBe('unformatted');
				mocks.restore();
			});
		});

		it('returns corrupt when superblock is missing and DB is not empty', function () {
			let mocks = new mockset();
			let db = new PouchDB('lostofs_fs');
			mocks.o(db).m('get').wrap(function (helper) {
				if (helper.args[0] === 'i_1')
					return Promise.resolve({_id:helper.args[0]._id,_rev:'123'});
				if (helper.args[0] === 's_inode')
					return Promise.reject(fake_pouchdb_error(404, 'not found (superblock)'));
				return Promise.reject(new Error('unexpected PouchDB operation'));
			});
			mocks.o(db).m('info').wrap(function (helper) {
				return Promise.resolve({doc_count:1});
			});
			return lostofs.test.dbop.db_init_state(db).then(function (result) {
				expect(result).toBe('corrupt');
				mocks.restore();
			});
		});

		it('returns corrupt when root inode is missing and DB is not empty', function () {
			let mocks = new mockset();
			let db = new PouchDB('lostofs_fs');
			mocks.o(db).m('get').wrap(function (helper) {
				if (helper.args[0] === 'i_1')
					return Promise.reject(fake_pouchdb_error(404, 'not found (root inode)'));
				if (helper.args[0] === 's_inode')
					return Promise.resolve({_id:helper.args[0]._id,_rev:'123'});
				return Promise.reject(new Error('unexpected PouchDB operation'));
			});
			mocks.o(db).m('info').wrap(function (helper) {
				return Promise.resolve({doc_count:1});
			});
			return lostofs.test.dbop.db_init_state(db).then(function (result) {
				expect(result).toBe('corrupt');
				mocks.restore();
			});
		});

		it('returns corrupt when an unexpected error occurs fetching superblock', function () {
			let mocks = new mockset();
			let db = new PouchDB('lostofs_fs');
			mocks.o(db).m('get').wrap(function (helper) {
				if (helper.args[0] === 'i_1')
					return Promise.resolve({_id:helper.args[0]._id,_rev:'123'});
				if (helper.args[0] === 's_inode')
					return Promise.reject(new Error('curve ball'));
				return Promise.reject(new Error('unexpected PouchDB operation'));
			});
			mocks.o(db).m('info').wrap(function (helper) {
				return Promise.reject(new Error('unexpected PouchDB info() operation'));
			});
			return lostofs.test.dbop.db_init_state(db).then(function (result) {
				expect(result).toBe('corrupt');
				mocks.restore();
			});
		});

		it('returns corrupt when an unexpected error occurs fetching root inode', function () {
			let mocks = new mockset();
			let db = new PouchDB('lostofs_fs');
			mocks.o(db).m('get').wrap(function (helper) {
				if (helper.args[0] === 'i_1')
					return Promise.reject(new Error('curve ball'));
				if (helper.args[0] === 's_inode')
					return Promise.resolve({_id:helper.args[0]._id,_rev:'123'});
				return Promise.reject(new Error('unexpected PouchDB operation'));
			});
			mocks.o(db).m('info').wrap(function (helper) {
				return Promise.reject(new Error('unexpected PouchDB info() operation'));
			});
			return lostofs.test.dbop.db_init_state(db).then(function (result) {
				expect(result).toBe('corrupt');
				mocks.restore();
			});
		});

	});

	describe('dbop.mkrootdir', function () {

		it('creates root directory', function () {
			let mocks = new mockset();
			let db = new PouchDB('lostofs_fs');
			mocks.o(db).m('put').wrap(function (helper) {
				if (helper.args[0]._id === 'i_1')
					return Promise.resolve({ok:true,id:helper.args[0]._id,rev:'123'});
				return Promise.reject(new Error('unexpected PouchDB operation'));
			});
			return lostofs.test.dbop.mkrootdir(db).then(function (result) {
				mocks.restore();
			});
		});

	});

	describe('dbop.latest_ent_doc', function () {

		it('fetches latest entity doc', function () {
			let mocks = new mockset();
			let db = new PouchDB('lostofs_fs');
			mocks.o(db).m('get').wrap(function (helper) {
				return Promise.resolve({_id:helper.args[0],rev:'123'});
			});
			return lostofs.test.dbop.latest_ent_doc(db, {_id:'i_100'}).then(function (result) {
				expect(typeof result).toBe('object');
				expect(result._id).toBe('i_100');
				return lostofs.test.dbop.latest_ent_doc(db, {_id:'i_2000'});
			}).then(function (result) {
				expect(typeof result).toBe('object');
				expect(result._id).toBe('i_2000');
				mocks.restore();
			});
		});

	});

	describe('dbop.inode_to_doc', function () {

		it('fetches doc for inode', function () {
			let mocks = new mockset();
			let db = new PouchDB('lostofs_fs');
			mocks.o(db).m('get').wrap(function (helper) {
				return Promise.resolve({_id:helper.args[0],rev:'123'});
			});
			return lostofs.test.dbop.inode_to_doc(db, 'i_100').then(function (result) {
				expect(typeof result).toBe('object');
				expect(result._id).toBe('i_100');
				return lostofs.test.dbop.inode_to_doc(db, 'i_2000');
			}).then(function (result) {
				expect(typeof result).toBe('object');
				expect(result._id).toBe('i_2000');
				mocks.restore();
			});
		});

	});

	describe('dbop.path_to_doc', function () {

		it('rejects non full paths', function () {
			let mocks = new mockset();
			let db = new PouchDB('lostofs_fs');
			mocks.o(db).m('get').wrap(function (helper) {
				return Promise.resolve({_id:helper.args[0],rev:'123'});
			});
			return new Promise(function (fff, rej) {
				lostofs.test.dbop.path_to_doc(db, 'foo/bar').then(function (result) {
					rej(new Error('not rejected'));
				}).catch(function (err) {
					fff(err);
				}).then(function () {
					mocks.restore();
				});
			}).then(function (err) {
				if (!/does not begin with \//.exec(err))
					throw err;
			});
		});

		it('calls through to dbop.doc_path_to_doc when full path', function () {
			let mocks = new mockset();
			let db = new PouchDB('lostofs_fs');
			mocks.o(db).m('get').wrap(function (helper) {
				return Promise.resolve({_id:helper.args[0],rev:'123'});
			});
			let doc_path_to_doc_wrap = mocks.o(lostofs.test.dbop).m('doc_path_to_doc').w(function (helper) {
				expect(helper.args[0]).toBe(db);
				expect(helper.args[1]).toEqual({_id:'i_1',rev:'123'});
				expect(helper.args[2]).toBe('/foo/bar');
				return Promise.resolve(true);
			});
			return lostofs.test.dbop.path_to_doc(db, '/foo/bar').then(function (result) {
				mocks.restore();
				expect(result).toBe(true);
			});
		});

	});

	describe('dbop.doc_path_to_doc', function () {

		it('empty path returns current inode', function () {
			let db = new PouchDB('lostofs_fs');
			expect(lostofs.test.dbop.doc_path_to_doc(db, {_id:'i_1',rev:'123'}, '')).toEqual({_id:'i_1',rev:'123'});
		});

		it('strips preceeding slashes', function () {
			let mocks = new mockset();
			let db = new PouchDB('lostofs_fs');
			let call_count = 0;
			let doc_path_to_doc_wrap = mocks.o(lostofs.test.dbop).m('doc_path_to_doc').w(function (helper) {
				call_count++;
				expect(helper.args[0]).toBe(db);
				expect(helper.args[1]).toEqual({_id:'i_1',rev:'123'});
				if (call_count === 1) {
					expect(helper.args[2]).toBe('/foo/bar');
					return helper.continue();
				} else if (call_count === 2) {
					expect(helper.args[2]).toBe('foo/bar');
					return Promise.resolve(true);
				}
			});
			return lostofs.test.dbop.doc_path_to_doc(db, {_id:'i_1',rev:'123'}, '/foo/bar').then(function (result) {
				mocks.restore();
				expect(result).toBe(true);
				expect(call_count).toBe(2);
			});
		});

		it('calls through to dbop.doc_name_to_doc when no slashes', function () {
			let mocks = new mockset();
			let db = new PouchDB('lostofs_fs');
			let doc_name_to_doc_wrap = mocks.o(lostofs.test.dbop).m('doc_name_to_doc').w(function (helper) {
				expect(helper.args[0]).toBe(db);
				expect(helper.args[1]).toEqual({_id:'i_2',rev:'123'});
				expect(helper.args[2]).toBe('bar');
				return Promise.resolve({_id:'i_3',rev:'123'});
			});
			return lostofs.test.dbop.doc_path_to_doc(db, {_id:'i_2',rev:'123'}, 'bar').then(function (result) {
				mocks.restore();
				expect(result).toEqual({_id:'i_3',rev:'123'});
			});
		});

		it('splits first leaf for dbop.doc_name_to_doc and recurses a path', function () {
			let mocks = new mockset();
			let db = new PouchDB('lostofs_fs');
			let call_count = 0;
			let doc_name_to_doc_wrap = mocks.o(lostofs.test.dbop).m('doc_name_to_doc').w(function (helper) {
				call_count++;
				if (call_count === 2) {
					expect(helper.args[0]).toBe(db);
					expect(helper.args[1]).toEqual({_id:'i_2',rev:'123'});
					expect(helper.args[2]).toBe('foo');
					return Promise.resolve({_id:'i_3',rev:'123'});
				} else {
					throw new Error('unexpected or out of order call to doc_name_to_doc');
				}
			});
			let doc_path_to_doc_wrap = mocks.o(lostofs.test.dbop).m('doc_path_to_doc').w(function (helper) {
				call_count++;
				expect(helper.args[0]).toBe(db);
				if (call_count === 1) {
					expect(helper.args[1]).toEqual({_id:'i_2',rev:'123'});
					expect(helper.args[2]).toBe('foo/bar');
					return helper.continue();
				} else if (call_count === 3) {
					expect(helper.args[1]).toEqual({_id:'i_3',rev:'123'});
					expect(helper.args[2]).toBe('bar');
					return Promise.resolve({_id:'i_4',rev:'123'});
				} else {
					throw new Error('unexpected or out of order call to doc_path_to_doc');
				}
			});
			return lostofs.test.dbop.doc_path_to_doc(db, {_id:'i_2',rev:'123'}, 'foo/bar').then(function (result) {
				mocks.restore();
				expect(result).toEqual({_id:'i_4',rev:'123'});
			});
		});

	});

	describe('dbop.doc_name_to_doc', function () {

		it('throws an error if doc is not a directory', function () {
			let db = new PouchDB('lostofs_fs');
			try {
				lostofs.test.dbop.doc_name_to_doc(
					db, {_id:'i_2',rev:'123',type:'file',content:{bar:'i_4'}}, 'bar'
					);
				throw new Error('exception should have been thrown');
			} catch (err) {
				if (!/not a dir/.exec(err))
					throw err;
			}
		});

		it('throws an error if name is not in directory', function () {
			let db = new PouchDB('lostofs_fs');
			try {
				lostofs.test.dbop.doc_name_to_doc(
					db, {_id:'i_2',rev:'123',type:'dir',content:{bar:'i_4'}}, 'baz'
					);
				throw new Error('exception should have been thrown');
			} catch (err) {
				if (!/not found/.exec(err))
					throw err;
			}
		});

		it('returns doc when in directory', function () {
			let mocks = new mockset();
			let db = new PouchDB('lostofs_fs');
			mocks.o(db).m('get').wrap(function (helper) {
				return Promise.resolve({_id:helper.args[0],rev:'123'});
			});
			return lostofs.test.dbop.doc_name_to_doc(
					db, {_id:'i_2',rev:'123',type:'dir',content:{bar:'i_4'}}, 'bar'
					).then(function (result) {
				expect(result).toEqual({_id:'i_4',rev:'123'});
				mocks.restore();
			});
		});

	});

	describe('dbop.next_inode', function () {

		it('returns next inode', function () {
			let mocks = new mockset();
			let db = new PouchDB('lostofs_fs');
			let call_count = 0;
			mocks.o(db).m('get').wrap(function (helper) {
				call_count++;
				expect(call_count).toBe(1);
				if (helper.args[0] === 's_inode')
					return Promise.resolve({_id:'s_inode',next:10});
				return Promise.reject(new Error('unexpected PouchDB get operation'));
			});
			mocks.o(db).m('put').wrap(function (helper) {
				call_count++;
				expect(call_count).toBe(2);
				if (helper.args[0]._id !== 's_inode')
					return Promise.reject(new Error('unexpected PouchDB put operation'));
				expect(helper.args[0].next === 11);
				return Promise.resolve({ok:true,id:helper.args[0]._id,next:11,rev:'123'});
			});
			return lostofs.test.dbop.next_inode(db).then(function (result) {
				mocks.restore();
				expect(result).toEqual('i_10');
				expect(call_count).toBe(2);
			});
		});

	});

	describe('dbop.mkdir', function () {

		it('creates directory entity and updates parent directory', function () {
			let mocks = new mockset();
			let db = new PouchDB('lostofs_fs');
			let dir_ent_created = 0;
			let pardir_ent_updated = 0;
			mocks.o(db).m('put').wrap(function (helper) {
				if (helper.args[0]._id === 'i_5') {
					expect(helper.args[0].type).toBe('dir');
					dir_ent_created++;
					return Promise.resolve({ok:true,id:helper.args[0]._id,rev:'123'});
				} else if (helper.args[0]._id === 'i_4') {
					expect(helper.args[0].content.baz).toBe('i_5');
					pardir_ent_updated++;
					return Promise.resolve({ok:true,id:helper.args[0]._id,rev:'123'});
				} else {
					return Promise.reject(new Error('unexpected PouchDB put operation'));
				}
			});
			return lostofs.test.dbop.mkdir(
					db, 'i_5', {_id:'i_4',type:'dir',content:{'.':'i_4','..':'i_3'}}, 'baz'
					).then(function (result) {
				mocks.restore();
				expect(dir_ent_created).toBe(1);
				expect(pardir_ent_updated).toBe(1);
				expect(result._id).toEqual('i_5');
				expect(result.type).toEqual('dir');
				expect(result.content).toEqual({'.':'i_5','..':'i_4'});
				expect(result._rev).toEqual('123');
				expect(result.mod_time.constructor).toEqual(Date);
			});
		});

	});

	describe('dbop.mkfile', function () {

		it('creates file entity and updates parent directory', function () {
			let mocks = new mockset();
			let db = new PouchDB('lostofs_fs');
			let file_ent_created = 0;
			let pardir_ent_updated = 0;
			mocks.o(db).m('put').wrap(function (helper) {
				if (helper.args[0]._id === 'i_5') {
					file_ent_created++;
					return Promise.resolve({ok:true,id:helper.args[0]._id,rev:'123'});
				} else if (helper.args[0]._id === 'i_4') {
					expect(helper.args[0].content.bat).toBe('i_5');
					pardir_ent_updated++;
					return Promise.resolve({ok:true,id:helper.args[0]._id,rev:'123'});
				} else {
					return Promise.reject(new Error('unexpected PouchDB put operation'));
				}
			});
			return lostofs.test.dbop.mkfile(
					db, 'i_5', {_id:'i_4',type:'dir',content:{'.':'i_4','..':'i_3'}},
					'bat', 'bat_content', 100, new Date(), undefined, 'test/type'
					).then(function (result) {
				mocks.restore();
				expect(file_ent_created).toBe(1);
				expect(pardir_ent_updated).toBe(1);
				expect(result._id).toEqual('i_5');
				expect(result.type).toEqual('file');
				expect(result.content).toEqual('bat_content');
				expect(result._rev).toEqual('123');
				expect(result.mod_time.constructor).toEqual(Date);
				expect(result.size).toEqual(100);
				expect(result.mime_type).toEqual('test/type');
				expect(result.encoding).toEqual(undefined);
			});
		});

	});

	describe('dbop.move', function () {

		it('throws an error when the target name does not exist', function () {
			let db = new PouchDB('lostofs_fs');
			return new Promise(function (fff, rej) {
				lostofs.test.dbop.move(
						db, {_id:'i_4',type:'dir',content:{'.':'i_4','..':'i_3'}}, 'foo',
						{_id:'i_40',type:'dir',content:{'.':'i_40','..':'i_30'}}, 'bar'
						).then(function (result) {
					rej(new Error('should have rejected promise'));
				}).catch(function (err) {
					if (/not found/.exec(err))
						fff(err);
					else
						rej(err);
				});
			});
		});

		it('throws an error when the target name exists in destination dir', function () {
			let db = new PouchDB('lostofs_fs');
			return new Promise(function (fff, rej) {
				lostofs.test.dbop.move(
						db, {_id:'i_4',type:'dir',content:{'.':'i_4','..':'i_3','foo':'i_5'}}, 'foo',
						{_id:'i_40',type:'dir',content:{'.':'i_40','..':'i_30','bar':'i_5'}}, 'bar'
						).then(function (result) {
					rej(new Error('should have rejected promise'));
				}).catch(function (err) {
					if (/already exists/.exec(err))
						fff(err);
					else
						rej(err);
				});
			});
		});

		it('single puts same directory move', function () {
			let mocks = new mockset();
			let db = new PouchDB('lostofs_fs');
			let put_count = 0;
			mocks.o(db).m('put').wrap(function (helper) {
				put_count++;
				if (helper.args[0]._id === 'i_4') {
					expect('foo' in helper.args[0].content).toBe(false);
					expect('bar' in helper.args[0].content).toBe(true);
					expect(helper.args[0].content.bar).toBe('i_5');
					return Promise.resolve({ok:true,id:helper.args[0]._id,rev:'123'});
				} else {
					return Promise.reject(new Error('unexpected PouchDB put operation'));
				}
			});
			mocks.o(db).m('get').wrap(function (helper) {
				return Promise.resolve({_id:helper.args[0],rev:'123'});
			});
			return lostofs.test.dbop.move(
					db, {_id:'i_4',type:'dir',content:{'.':'i_4','..':'i_3','foo':'i_5'}}, 'foo',
					{_id:'i_4',type:'dir',content:{'.':'i_4','..':'i_3','foo':'i_5'}}, 'bar'
					).then(function (result) {
				mocks.restore();
				expect(put_count).toBe(1);
			});
		});

		it('double puts different directory move', function () {
			let mocks = new mockset();
			let db = new PouchDB('lostofs_fs');
			let put_count = 0;
			mocks.o(db).m('put').wrap(function (helper) {
				put_count++;
				if (helper.args[0]._id === 'i_4') {
					expect('foo' in helper.args[0].content).toBe(false);
					return Promise.resolve({ok:true,id:helper.args[0]._id,rev:'123'});
				} else if (helper.args[0]._id === 'i_40') {
					expect('bar' in helper.args[0].content).toBe(true);
					expect(helper.args[0].content.bar).toBe('i_5');
					return Promise.resolve({ok:true,id:helper.args[0]._id,rev:'123'});
				} else {
					return Promise.reject(new Error('unexpected PouchDB put operation'));
				}
			});
			mocks.o(db).m('get').wrap(function (helper) {
				if (helper.args[0] === 'i_40')
					return Promise.resolve({_id:'i_40',rev:'123',type:'dir',content:{'.':'i_40','..':'i_30'}});
				if (helper.args[0] === 'i_30')
					return Promise.resolve({_id:'i_30',rev:'123',type:'dir',content:{'.':'i_30','..':'i_30'}});
				return Promise.resolve({_id:helper.args[0],rev:'123'});
			});
			return lostofs.test.dbop.move(
					db, {_id:'i_4',type:'dir',content:{'.':'i_4','..':'i_3','foo':'i_5'}}, 'foo',
					{_id:'i_40',type:'dir',content:{'.':'i_40','..':'i_30'}}, 'bar'
					).then(function (result) {
				mocks.restore();
				expect(put_count).toBe(2);
			});
		});

		it('fails when destination dir is a subdir of the source dir', function () {
			let mocks = new mockset();
			let db = new PouchDB('lostofs_fs');
			let put_count = 0;
			mocks.o(db).m('put').wrap(function (helper) {
				put_count++;
				if (helper.args[0]._id === 'i_4') {
					expect('foo' in helper.args[0].content).toBe(false);
					return Promise.resolve({ok:true,id:helper.args[0]._id,rev:'123'});
				} else if (helper.args[0]._id === 'i_40') {
					expect('bar' in helper.args[0].content).toBe(true);
					expect(helper.args[0].content.bar).toBe('i_5');
					return Promise.resolve({ok:true,id:helper.args[0]._id,rev:'123'});
				} else {
					return Promise.reject(new Error('unexpected PouchDB put operation'));
				}
			});
			mocks.o(db).m('get').wrap(function (helper) {
				if (helper.args[0] === 'i_40')
					return Promise.resolve({_id:'i_40',rev:'123',type:'dir',content:{'.':'i_40','..':'i_30'}});
				if (helper.args[0] === 'i_30')
					return Promise.resolve({_id:'i_30',rev:'123',type:'dir',content:{'.':'i_30','..':'i_4'}});
				return Promise.resolve({_id:helper.args[0],rev:'123'});
			});
			return new Promise(function (fff, rej) {
				return lostofs.test.dbop.move(
						db, {_id:'i_4',type:'dir',content:{'.':'i_4','..':'i_3','foo':'i_5'}}, 'foo',
						{_id:'i_40',type:'dir',content:{'.':'i_40','..':'i_30'}}, 'bar'
						).then(function (result) {
					mocks.restore();
					expect(put_count).toBe(2);
				}).then(function () {
					throw new Error('promise should have been rejected');
				}).catch(function (err) {
					if (/subdirectory of itself/.exec(err))
						fff(err);
					else
						rej(err);
				});
			});
		});

	});

});


})();
