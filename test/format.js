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


describe('format', function () {

	it('locks and unlocks the superblock', function () {
		let mocks = new mockset();
		fs = new lostofs_fs();
		let call_count = 0;
		expect(fs.locks.test_locks({superblock:'write'})).toBe(0);
		let dbop_mk_superblock_wrap = mocks.o(lostofs.dbop).m('mk_superblock').w(function (helper) {
			call_count++;
			expect(fs.locks.test_locks({superblock:'write'})).not.toBe(0);
			return helper.continue();
		});
		return fs.format().then(function () {
			mocks.restore();
			expect(call_count).toBe(1);
			expect(fs.locks.test_locks({superblock:'write'})).toBe(0);
		});
	});

	it('locks and unlocks the superblock when an error occurs', function () {
		let mocks = new mockset();
		fs = new lostofs_fs();
		let call_count = 0;
		expect(fs.locks.test_locks({superblock:'write'})).toBe(0);
		let dbop_mk_superblock_wrap = mocks.o(lostofs.dbop).m('mk_superblock').w(function (helper) {
			call_count++;
			expect(fs.locks.test_locks({superblock:'write'})).not.toBe(0);
			return Promise.reject(new Error('beetle'));
		});
		return new Promise(function (fff, rej) {
			fs.format().then(function () {
				mocks.restore();
				rej(new Error('promise should have been rejected'));
			}).catch(function (err) {
				mocks.restore();
				expect(call_count).toBe(1);
				expect(fs.locks.test_locks({superblock:'write'})).toBe(0);
				fff(err);
			});
		});
	});

});


})();
