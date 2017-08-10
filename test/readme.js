(function () {


'use strict';


let lostofs;
let lostofs_fs;
let lostofs_ent;
let lostofs_dir;
let lostofs_file;

require('chai-jasmine');

describe('readme', function () {

	it('synopsis', function () {

		let lostofs    = require('./../dist/lostofs.js');  // import module
		let lostofs_fs = lostofs.fs;

		let fs = new lostofs_fs();                  // create FS
		fs.format();                                // format FS

		fs.ready().then(function () {               // wait for the FS to come online

			fs.get('/').then(function (root_dir) {  // fetch the root directory

				return root_dir.mkdir('pets');      // create a 'pets' directory in the root

			}).then(function (pets_dir) {

				console.log('Created the /pets directory)');
	
				return pets_dir.mkfile('nemo.txt', 'name: Nemo');  // create 'nemo.txt' file
		
			}).then(function (nemo_file) {
	
				console.log('Created the /pets/nemo.txt file');
		
			}).catch(function (err) {
	
				console.log(err);
				throw err;
		
			});

		});

	});

	it('imports', function () {

		lostofs      = require('./../dist/lostofs.js');
		lostofs_fs   = lostofs.fs;
		lostofs_ent  = lostofs.ent;
		lostofs_dir  = lostofs.dir;
		lostofs_file = lostofs.file;

	});

	it('create a filesystem', function () {

		let fs = new lostofs_fs();

		expect(typeof fs).toBe('object');

	});

	it('create named filesystem', function () {

		let foobar_fs = new lostofs_fs({db_name:'foobar'});

		expect(typeof foobar_fs).toBe('object');

	});

	it('filesystem instances are different', function () {

		let foobar_fs_1 = new lostofs_fs({db_name:'foobar'});
		let foobar_fs_2 = new lostofs_fs({db_name:'foobar'});
		let foobar_fs_3 = new lostofs_fs({db_name:'foobar'});

		expect(foobar_fs_1).not.toBe(foobar_fs_2);
		expect(foobar_fs_1).not.toBe(foobar_fs_2);
		expect(foobar_fs_1).not.toBe(foobar_fs_3);
		expect(foobar_fs_2).not.toBe(foobar_fs_3);

	});

	it('format the filesystem', function () {

		let fs = new lostofs_fs();

		return fs.format();

	});

	it('create formatted filesystem', function () {

		let fs = new lostofs_fs();
		return fs.destroy().then(function () {

			let fs = new lostofs_fs({unformatted:'format'});

			expect(typeof fs).toBe('object');

		});

	});

	it('readiness by event', function (done) {

		let fs = new lostofs_fs();
		fs.destroy().then(function () {

			let fs = new lostofs_fs({unformatted:'format'});
			fs.on('ready', function () {
			    console.log('filesystem is online');
				done();
			});

		});

	});

	it('readiness by promise', function () {

		let fs = new lostofs_fs();
		return fs.destroy().then(function () {

			let fs = new lostofs_fs({unformatted:'format'});
			return fs.ready().then(function () {
				console.log('filesystem is online');
			}).catch(function (err) {
				console.log(err);
				throw err;
			});

		});

	});

	it('accessing the filesystem', function () {

		let fs = new lostofs_fs();

		return fs.get('/').then(function (root_dir) {
			console.log('retrieved root directory');
		}).catch(function (err) {
			console.log(err);
			throw err;
		});

	});

	it('root directory contents', function () {

		let fs = new lostofs_fs();
		let logs = [];

		return fs.get('/').then(function (root_dir) {
			return root_dir.ls().then(function (ents) {
				console.log('Listing / (inode '+root_dir.inode()+')');
				for (let i = 0; i < ents.length; i++) {
					console.log('\t'+ents[i][0]+'\t'+ents[i][1].type()+'\t'+ents[i][1].inode()+'\t'+ents[i][1].mod_time());
					logs.push('\t'+ents[i][0]+'\t'+ents[i][1].type()+'\t'+ents[i][1].inode()+'\t'+ents[i][1].mod_time());
				}
			});
		}).catch(function (err) {
			console.log(err);
			throw err;
		}).then(function () {
			expect(/\t\.\tdir\ti_1\t/.exec(logs[0])).toBeTruthy();
			expect(/\t\.\.\tdir\ti_1\t/.exec(logs[1])).toBeTruthy();
		});

	});

	it('create a directory', function () {

		let fs = new lostofs_fs();

		return fs.get('/').then(function (root_dir) {
			return root_dir.mkdir('pets');
		}).then(function (pets_dir) {
			console.log('Created the /pets directory (inode '+pets_dir.inode()+')');
		}).catch(function (err) {
			console.log(err);
			throw err;
		});

	});

	it('create a file', function () {

		let fs = new lostofs_fs();

		return fs.get('/pets').then(function (pets_dir) {
			return pets_dir.mkfile('nemo.txt', 'name: Nemo');
		}).then(function (nemo_file) {
			console.log('Created the /pets/nemo.txt file (inode '+nemo_file.inode()+')');
			console.log('    Inode\t\t'+nemo_file.inode());
			console.log('    Type\t\t'+nemo_file.type());
			console.log('    Created\t\t'+nemo_file.mod_time());
			console.log('    Size\t\t'+nemo_file.size());
		}).catch(function (err) {
			console.log(err);
			throw err;
		});

	});

});


})();
