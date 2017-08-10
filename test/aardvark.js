(function () {


'use strict';


let mimock   = require('mimock');
let mockset  = mimock.mockset;
let gl_mocks = new mockset();

let pouchdb_lib = gl_mocks.l('pouchdb');

if (!('lostofs_fs_tests' in global))
	global.lostofs_fs_tests = {};

global.lostofs_fs_tests.gl_mocks    = gl_mocks;
global.lostofs_fs_tests.pouchdb_lib = pouchdb_lib;


})();
