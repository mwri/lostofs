(function () {


'use strict';


let lostofs    = require('./../dist/lostofs.js');
let lostofs_fs = lostofs.fs;

require('chai-jasmine');


let fs;
let root_dir;


describe('mkdir setup', function () {

	it('init destroy init, format, get root dir', function () {
		fs = new lostofs_fs();
		return fs.destroy().then(function () {
			fs = new lostofs_fs();
			return fs.format();
		}).then(function () {
			return fs.get('/').then(function (ent) {
				root_dir = ent;
				return true;
			});
		});
	});

});


describe('mkdir', function () {

	let foo_inode;

	it('"foo" succeeded', function () {
		let start_time_ms = (new Date()).getTime();
		return root_dir.mkdir('foo').then(function (foo_ent) {
			expect(foo_ent.type()).toBe('dir');
			let created_time_ms  = (new Date()).getTime();
			let creation_time_ms = created_time_ms - start_time_ms;
			let age_ms           = created_time_ms - foo_ent.mod_time().getTime();
			expect(creation_time_ms).toBeLessThan(500);
			expect(age_ms).toBeLessThan(500);
			foo_inode = foo_ent.inode();
			return true;
		});
	});

	it('"foo" failed second time', function () {
		return new Promise(function (ff, rf) {
			root_dir.mkdir('foo').then(function (foo_ent) {
				rf(new Error('mkdir "foo" worked second time (should fail)'));
			}).catch(function (err) {
				ff(err);
			});
		});
	});

	it('"foo" created a directory (ls /)', function () {
		return fs.get('/').then(function (root_dir) {
			return root_dir.ls().then(function (ents_ls) {
				for (let i = 0; i < ents_ls.length; i++) {
					if (ents_ls[i][0] === 'foo') {
						expect(ents_ls[i][1].inode()).toBe(foo_inode);
						return true;
					}
				}
				throw new Error('"foo" not found in /');
			});
		});
	});

	it('"foo" created a directory (get /foo)', function () {
		return fs.get('/foo').then(function (foo_dir) {
			expect(foo_dir.inode()).toBe(foo_inode);
		});
	});

	it('"foo" created directory with . and ..', function () {
		return fs.get('/foo').then(function (foo_dir) {
			return foo_dir.ls().then(function (ents_ls) {
				expect(ents_ls.length).toBe(2);
				for (let i = 0; i < ents_ls.length; i++) {
					if (ents_ls[i][0] === '.')
						expect(ents_ls[i][1].inode()).toBe('i_2');
					else if (ents_ls[i][0] === '..')
						expect(ents_ls[i][1].inode()).toBe('i_1');
					else
						throw new Error('found ent called "'+ents_ls[i][0]+'" (not . or ..)');
				}
				return true;
			});
		});
	});

	let foo2_inode;

	it('"foo2" succeeded, emitted mkdir event', function () {
		let event_new_dir;
		let mkdir_event_seen = 0;
		fs.once('mkdir', function (dir, name, new_dir) {
			expect(dir).toBe(root_dir);
			expect(name).toBe('foo2');
			event_new_dir = new_dir;
			mkdir_event_seen++;
		});
		return root_dir.mkdir('foo2').then(function (foo2_ent) {
			expect(foo2_ent.type()).toBe('dir');
			expect(mkdir_event_seen).toBe(1);
			expect(foo2_ent).toBe(event_new_dir);
			foo2_inode = foo2_ent.inode();
			return true;
		});
	});

	it('"foo2" failed second time', function () {
		return new Promise(function (ff, rf) {
			root_dir.mkdir('foo2').then(function (foo2_ent) {
				rf(new Error('mkdir "foo2" worked second time (should fail)'));
			}).catch(function (err) {
				ff(err);
			});
		});
	});

	let foo2x2_inode;

	it('"foo2" (with free_name=true) succeeded', function () {
		return root_dir.mkdir('foo2', {free_name:true}).then(function (foo2_ent) {
			expect(foo2_ent.type()).toBe('dir');
			foo2x2_inode = foo2_ent.inode();
			return true;
		});
	});

	it('"foo2" (with free_name=true) created a directory (get /foo2(2))', function () {
		return fs.get('/foo2(2)').then(function (foo2x2_dir) {
			expect(foo2x2_dir.inode()).toBe(foo2x2_inode);
		});
	});

	let foo2x3_inode;

	it('"foo2" again (with free_name=true) succeeded', function () {
		return root_dir.mkdir('foo2', {free_name:true}).then(function (foo2_ent) {
			expect(foo2_ent.type()).toBe('dir');
			foo2x3_inode = foo2_ent.inode();
			return true;
		});
	});

	it('"foo2" (with free_name=true) created a directory (get /foo2(3))', function () {
		return fs.get('/foo2(3)').then(function (foo2x3_dir) {
			expect(foo2x3_dir.inode()).toBe(foo2x3_inode);
		});
	});

});


})();
