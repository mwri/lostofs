(function () {


'use strict';


let lostofs    = require('./../dist/lostofs.js');
let lostofs_fs = lostofs.fs;

require('chai-jasmine');


describe('auto_refresh', function () {

	it('set true by default (no error from breaking entity doc, ent_doc refreshed)', function () {
		let fs = new lostofs_fs();
		return fs.destroy().then(function () {
			return fs.format();
		}).then(function () {
			return fs.get('/').then(function (root_dir) {
				expect(typeof root_dir.ent_doc.content).not.toEqual('undefined');
				delete root_dir.ent_doc.content;
				expect(typeof root_dir.ent_doc.content).toEqual('undefined');
				return root_dir.ls();
			});
		});
	});

	it('instantiating with auto_refresh=false causes error after breaking entity doc', function () {
		let fs = new lostofs_fs({auto_refresh:false});
		return fs.destroy().then(function () {
			return fs.format();
		}).then(function () {
			return fs.get('/').then(function (root_dir) {
				expect(typeof root_dir.ent_doc.content).not.toEqual('undefined');
				delete root_dir.ent_doc.content;
				expect(typeof root_dir.ent_doc.content).toEqual('undefined');
				return new Promise(function (fff, rej) {
					return root_dir.ls().then(function (ents) {
						rej(new Error('no exception'));
					}).catch (function (err) {
						expect(/convert undefined or null to object/.exec(err)).toBeTruthy();
						fff(err);
					});
				});
			});
		});
	});

	it('instantiating with auto_refresh=true stops error after breaking entity doc', function () {
		let fs = new lostofs_fs({auto_refresh:true});
		return fs.destroy().then(function () {
			return fs.format();
		}).then(function () {
			return fs.get('/').then(function (root_dir) {
				expect(typeof root_dir.ent_doc.content).not.toEqual('undefined');
				delete root_dir.ent_doc.content;
				expect(typeof root_dir.ent_doc.content).toEqual('undefined');
				return root_dir.ls();
			});
		});
	});

});


})();
