(function () {


'use strict';


let lostofs    = require('./../dist/lostofs.js');
let lostofs_fs = lostofs.fs;

require('chai-jasmine');


let fs;


describe('init_state setup', function () {

	it('init destroy init format', function () {
		fs = new lostofs_fs();
		return fs.destroy().then(function () {
			fs = new lostofs_fs();
			return fs.format();
		});
	});

});


describe('init get /', function () {

	it('finds root dir', function () {
		return fs.get('/').then(function (ent) {
			expect(ent.inode()).toBe('i_1');
			return true;
		});
	});

});


describe('init root dir', function () {

	it('is first inode', function () {
		return fs.get('/').then(function (root_dir) {
			expect(root_dir.inode()).toBe('i_1');
			return true;
		});
	});

	it('is type "dir"', function () {
		return fs.get('/').then(function (root_dir) {
			expect(root_dir.type()).toBe('dir');
			return true;
		});
	});

	it('has self referential . amd ..', function () {
		return fs.get('/').then(function (root_dir) {
			return root_dir.ls().then(function (ents) {
				expect(ents.length).toBe(2);
				for (let i = 0; i < ents.length; i++) {
					expect(ents[i][0] === '.' || ents[i][0] === '..').toBe(true);
					expect(ents[i][1].inode()).toBe('i_1');
				}
				return true;
			});
		});
	});

});


})();
