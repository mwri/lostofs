(function () {


'use strict';


let lostofs   = require('./../lib/lostofs.js');
let lostofs_fs = lostofs.fs;

require('chai-jasmine');


let fs;
let root_dir;


describe('mkfile setup', function () {

	it('initial format, get root dir', function () {
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


describe('mkfile', function () {

	let bar_inode;

	it('"bar" succeeded', function () {
		return root_dir.mkfile('bar', 'the_bar_content').then(function (bar_ent) {
			expect(bar_ent.type()).toBe('file');
			bar_inode = bar_ent.inode();
			return true;
		});
	});

	it('"bar" failed second time', function () {
		return new Promise(function (ff, rf) {
			root_dir.mkfile('bar', 'the_bar_content').then(function (bar_ent) {
				rf(new Error('mkfile "bar" worked second time (should fail)'));
			}).catch(function (err) {
				ff(err);
			});
		});
	});

	it('"bar" created a directory (ls /)', function () {
		return fs.get('/').then(function (root_dir) {
			return root_dir.ls().then(function (ents_ls) {
				for (let i = 0; i < ents_ls.length; i++) {
					if (ents_ls[i][0] === 'bar') {
						expect(ents_ls[i][1].inode()).toBe(bar_inode);
						return true;
					}
				}
				throw new Error('"bar" not found in /');
			});
		});
	});

	it('"bar" created a directory (get /bar)', function () {
		return fs.get('/bar').then(function (bar_dir) {
			return expect(bar_dir.inode()).toBe(bar_inode);
		});
	});

	it('"bar" created file with required content', function () {
		return fs.get('/bar').then(function (bar_dir) {
			return bar_dir.data().then(function (content) {
				return expect(content).toBe('the_bar_content');
			});
		});
	});

	let bar2_inode;

	it('"bar2" succeeded, emitted mkfile event', function () {
		let event_new_file;
		let mkfile_event_seen = 0;
		fs.once('mkfile', function (dir, name, new_file) {
			expect(dir).toBe(root_dir);
			expect(name).toBe('bar2');
			expect(new_file.ent_doc.content).toBe('the_bar2_content');
			event_new_file = new_file;
			mkfile_event_seen++;
		});
		return root_dir.mkfile(
				'bar2', 'the_bar2_content', {free_name:true}
				).then(function (bar2_ent) {
			expect(bar2_ent.type()).toBe('file');
			expect(mkfile_event_seen).toBe(1);
			expect(bar2_ent).toBe(event_new_file);
			bar2_inode = bar2_ent.inode();
			return true;
		});
	});

	it('"bar2" failed second time', function () {
		return new Promise(function (ff, rf) {
			root_dir.mkfile('bar2').then(function (bar2_ent) {
				rf(new Error('mkfile "bar2" worked second time (should fail)'));
			}).catch(function (err) {
				ff(err);
			});
		});
	});

	let bar2x2_inode;

	it('"bar2" (with free_name=true) succeeded', function () {
		return root_dir.mkfile(
				'bar2', 'the_bar2x2_content', {free_name:true}
				).then(function (bar2x2_ent) {
			expect(bar2x2_ent.type()).toBe('file');
			bar2x2_inode = bar2x2_ent.inode();
			return true;
		});
	});

	it('"bar2" (with free_name=true) created a directory (get /bar2(2))', function () {
		return fs.get('/bar2(2)').then(function (bar2x2_dir) {
			return expect(bar2x2_dir.inode()).toBe(bar2x2_inode);
		});
	});

	let bar2x3_inode;

	it('"bar2" (with free_name=true) succeeded', function () {
		return root_dir.mkfile(
				'bar2', 'the_bar2x3_content', {free_name:true}
				).then(function (bar2x3_ent) {
			expect(bar2x3_ent.type()).toBe('file');
			bar2x3_inode = bar2x3_ent.inode();
			return true;
		});
	});

	it('"bar2" (with free_name=true) created a directory (get /bar2(3))', function () {
		return fs.get('/bar2(3)').then(function (bar2x3_dir) {
			return expect(bar2x3_dir.inode()).toBe(bar2x3_inode);
		});
	});

	let bat_inode;

	it('"bat.abc" succeeded', function () {
		return root_dir.mkfile(
				'bat.abc', 'the_bat_content', {free_name:true}
				).then(function (bat_ent) {
			expect(bat_ent.type()).toBe('file');
			bat_inode = bat_ent.inode();
			return true;
		});
	});

	it('"bat.abc" failed second time', function () {
		return new Promise(function (ff, rf) {
			root_dir.mkfile('bat.abc').then(function (bat_ent) {
				rf(new Error('mkfile "bat.abc" worked second time (should fail)'));
			}).catch(function (err) {
				ff(err);
			});
		});
	});

	let batx2_inode;

	it('"bat.abc" (with free_name=true) succeeded', function () {
		return root_dir.mkfile(
				'bat.abc', 'the_batx2_content', {free_name:true}
				).then(function (batx2_ent) {
			expect(batx2_ent.type()).toBe('file');
			batx2_inode = batx2_ent.inode();
			return true;
		});
	});

	it('"bat.abc" (with free_name=true) created a directory (get /bat(2).abc)', function () {
		return fs.get('/bat(2).abc').then(function (batx2_dir) {
			return expect(batx2_dir.inode()).toBe(batx2_inode);
		});
	});

	let batx3_inode;

	it('"bat.abc" (with free_name=true) succeeded', function () {
		return root_dir.mkfile(
				'bat.abc', 'the_batx3_content', {free_name:true}
				).then(function (batx3_ent) {
			expect(batx3_ent.type()).toBe('file');
			batx3_inode = batx3_ent.inode();
			return true;
		});
	});

	it('"bat.abc" (with free_name=true) created a directory (get /bat(3).abc)', function () {
		return fs.get('/bat(3).abc').then(function (batx3_dir) {
			return expect(batx3_dir.inode()).toBe(batx3_inode);
		});
	});

	let baz_inode;

	it('"baz" with array buffer content succeeded', function () {
		let text_content = 'the_baz_content';
		let buf = new Uint8Array(text_content.length);
		for (let i = 0; i < text_content.length; i++) {
			buf[i] = text_content.charCodeAt(i);
		}
		return root_dir.mkfile('baz', buf).then(function (baz_ent) {
			baz_inode = baz_ent.inode();
			expect(baz_ent.type()).toBe('file');
			return baz_ent.data().then(function (content) {
				expect(
					typeof content === 'object' && content.constructor === ArrayBuffer
					).toBe(true);
				let decoded_content = String.fromCharCode.apply(null, new Uint8Array(content));
				expect(decoded_content).toEqual(text_content);
				return true;
			});
		});
	});

});


})();
