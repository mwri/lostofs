(function () {


'use strict';


let mimock  = require('mimock');
let mockset = mimock.mockset;

let gl_mocks    = global.lostofs_fs_tests.gl_mocks;
let pouchdb_lib = global.lostofs_fs_tests.pouchdb_lib;

let lostofs    = require('./../lib/lostofs.js');
let lostofs_fs = lostofs.fs;

let chai_jasmine = require('chai-jasmine');

let PouchDB = require('pouchdb');


describe('init setup', function() {

	it('init destroy init unnamed and named filesystems', function () {
		let fs = new lostofs_fs();
		return fs.destroy().then(function () {
			let foobar_fs = new lostofs_fs({db_name:'foobar_db'});
			return foobar_fs.destroy();
		});
	});

});

describe('initialisation', function() {

	it('succeeds', function () {
		let fs = new lostofs_fs();
	});

});


describe('format', function () {

	it('succeeds', function () {
		let fs = new lostofs_fs();
		return fs.format();
	});

	it('emits format then ready', function () {
		let state = 'unknown';
		let fs = new lostofs_fs();
		function on_format () {
			expect(state).toBe('unknown');
			state = 'formatting';
		}
		function on_ready () {
			expect(state).toBe('formatting');
			state = 'ready';
		}
		fs.once('format', on_format);
		fs.once('ready', on_ready);
		return fs.format().then(function () {
			expect(state).toBe('ready');
			return true;
		});
	});

	it('not required second time', function () {
		let fs = new lostofs_fs();
		return fs.ready();
	});

});


describe('post init inode', function() {

	it('starts at i_2 and continues i_3, i_4', function () {
		let fs = new lostofs_fs();
		return fs.next_inode().then(function (ni) {
			expect(ni).toBe('i_2');
			return fs.next_inode();
		}).then(function (ni) {
			expect(ni).toBe('i_3');
			return fs.next_inode();
		}).then(function (ni) {
			expect(ni).toBe('i_4');
			return true;
		});
	});

});


describe('FS without name inode', function() {

	it('starts at i_5', function () {
		let fs = new lostofs_fs();
		return fs.next_inode().then(function (ni) {
			expect(ni).toBe('i_5');
			return true;
		});
	});

});


describe('alternative (named) DB filesystem', function() {

	it('initialisation succeeds', function () {
		let fs = new lostofs_fs({db_name:'foobar_db'});
	});


	it('reinit and format succeeds', function () {
		let fs = new lostofs_fs({db_name:'foobar_db'});
		return fs.format();
	});


	it('inode starts at i_2', function () {
		let fs = new lostofs_fs({db_name:'foobar_db'});
		return fs.next_inode().then(function (ni) {
			expect(ni).toBe('i_2');
			return true;
		});
	});

});


describe('unnamed filesystem', function() {

	it('inode starts at i_6 (parallel filesystems distinct)', function () {
		let fs = new lostofs_fs();
		return fs.next_inode().then(function (ni) {
			expect(ni).toBe('i_6');
			return true;
		});
	});

});


describe('alternative (named) DB filesystem', function() {

	it('inode starts at i_3 (parallel filesystems distinct)', function () {
		let fs = new lostofs_fs({db_name:'foobar_db'});
		return fs.next_inode().then(function (ni) {
			expect(ni).toBe('i_3');
			return true;
		});
	});

});


describe('initialisation with format (but already formatted)', function() {

	it('succeeds', function () {
		let fs = new lostofs_fs({unformatted:'format'});
	});

	it('inode starts at i_7 after init and unnecessary format', function () {
		let fs = new lostofs_fs();
		return fs.next_inode().then(function (ni) {
			expect(ni).toBe('i_7');
			return true;
		});
	});

});


describe('FS destroy', function() {

	it('succeeds', function () {
		let fs = new lostofs_fs();
		return fs.destroy();
	});

	it('renders new FS initialisation not ready', function () {
		let fs = new lostofs_fs();
		return new Promise(function (ff, rf) {
			// FS destroyed so the promise returned by ready() should not resolve
			setTimeout(function () { ff('waited 1000ms, FS not becoming ready'); }, 1000);
			fs.ready().then(function () {
				rf(new Error('filesystem ready after destroy'));
			}).catch(function (err) {
				ff(err);
			});
		});
	});

});


describe('initialisation with format (not formatted)', function() {

	it('succeeds and becomes ready', function () {
		let fs = new lostofs_fs({unformatted:'format',debug:true});
		return fs.ready();
	});

	it('inode starts at i_2 after init and required format', function () {
		let fs = new lostofs_fs();
		return fs.next_inode().then(function (ni) {
			expect(ni).toBe('i_2');
			return true;
		});
	});

});


describe('initialisation not ok', function () {

	it('emits error log and not ready when corrupt', function () {
		let mocks = new mockset();
		let db = new PouchDB('lostofs_fs');
		let db_init_state_wrap = mocks.o(lostofs.dbop).m('db_init_state').w(function (helper) {
			return Promise.resolve('corrupt');
		});
		let failed_event_seen = 0;
		function on_init_failed (reason) {
			expect(reason).toBe('corrupt');
			failed_event_seen++;
		}
		let log_event_seen = 0;
		function on_log (level, msg) {
			expect(level).toBe('error');
			expect(/filesystem corrupt/.exec(msg)).toBeTruthy();
			log_event_seen++;
		}
		let fs = new lostofs_fs();
		fs.once('log', on_log);
		fs.once('init_failed', on_init_failed);
		return new Promise(function (ff, rf) {
			setTimeout(function () { ff('waited 1000ms, FS not becoming ready'); }, 1000);
			fs.ready().then(function () {
				rf(new Error('filesystem ready when corrupt'));
			}).catch(function (err) {
				if (/filesystem corrupt/.exec(err))
					ff(err);
				else
					rf(err);
			});
		}).then(function () {
			expect(failed_event_seen).toBe(1);
			expect(log_event_seen).toBe(1);
			mocks.restore();
		}).catch(function (err) {
			mocks.restore();
			throw err;
		});
	});

	it('emits error log and not ready when unknown state', function () {
		let mocks = new mockset();
		let db = new PouchDB('lostofs_fs');
		let db_init_state_wrap = mocks.o(lostofs.dbop).m('db_init_state').w(function (helper) {
			return Promise.resolve('blooop');
		});
		let failed_event_seen = 0;
		function on_init_failed (reason) {
			expect(reason).toBe('blooop');
			failed_event_seen++;
		}
		let log_event_seen = 0;
		function on_log (level, msg) {
			expect(level).toBe('error');
			expect(/DB state "blooop" not recognised/.exec(msg)).toBeTruthy();
			log_event_seen++;
		}
		let fs = new lostofs_fs();
		fs.once('log', on_log);
		fs.once('init_failed', on_init_failed);
		return new Promise(function (ff, rf) {
			fs.ready().then(function () {
				rf(new Error('filesystem ready when DB state unknown'));
			}).catch(function (err) {
				if (/DB state "blooop" not recognised/.exec(err))
					ff(err);
				else
					rf(err);
			});
		}).then(function () {
			expect(log_event_seen).toBe(1);
			expect(failed_event_seen).toBe(1);
			mocks.restore();
		}).catch(function (err) {
			mocks.restore();
			throw err;
		});
	});

	it('emits error log and ready rejected when error occurs determining state', function () {
		let mocks = new mockset();
		let db = new PouchDB('lostofs_fs');
		let db_init_state_wrap = mocks.o(lostofs.dbop).m('db_init_state').w(function (helper) {
			return Promise.reject(new Error('uuurrghh'));
		});
		let error_event_seen = 0;
		function on_init_error (reason) {
			expect(/uuurrghh/.exec(reason)).toBeTruthy();
			error_event_seen++;
		}
		let log_event_seen = 0;
		function on_log (level, msg) {
			expect(level).toBe('error');
			expect(/uuurrghh/.exec(msg)).toBeTruthy();
			log_event_seen++;
		}
		let fs = new lostofs_fs();
		fs.once('log', on_log);
		fs.once('init_error', on_init_error);
		return new Promise(function (ff, rf) {
			setTimeout(function () { ff('waited 1000ms, FS not becoming ready'); }, 1000);
			fs.ready().then(function () {
				rf(new Error('filesystem ready when DB state determination error'));
			}).catch(function (err) {
				ff(err);
			});
		}).then(function () {
			expect(log_event_seen).toBe(1);
			expect(error_event_seen).toBe(1);
			mocks.restore();
		}).catch(function (err) {
			mocks.restore();
			throw err;
		});
	});

});


})();
