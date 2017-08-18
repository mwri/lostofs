(function () {


'use strict';


let lostofs    = require('./../dist/lostofs.js');
let lostofs_fs = lostofs.fs;

require('chai-jasmine');


let fs;

let root_dir;
let d1_dir;
let d2_dir;
let d2d1_dir;
let d2d2_dir;
let d2d3_dir;
let d2d3d1_dir;
let d2d3d2_dir;
let d2d3d3_dir;
let d2d3d3f1_file;
let f1_file;
let f2_file;
let d3_dir;
let d3f1_file;


describe('workout setup', function () {

	it('init destroy init, format, mkdir and mkfile', function () {
		fs = new lostofs_fs();
		return fs.destroy().then(function () {
			return fs.format();
		}).then(function () {
			return fs.get('/');
		}).then(function (ent) {
			root_dir = ent;
			return root_dir.mkdir('d1').then(function (ent) {
				d1_dir = ent;
			}).then(function () {
				return root_dir.mkfile('f1', 'f1_content');
			}).then(function (ent) {
				f1_file = ent;
				return root_dir.mkfile('f2', 'f2_content');
			}).then(function (ent) {
				f2_file = ent;
				return root_dir.mkdir('d2');
			}).then(function (ent) {
				d2_dir = ent;
				return d2_dir.mkdir('d2d1').then(function (ent) {
					d2d1_dir = ent;
					return d2_dir.mkdir('d2d2');
				}).then(function (ent) {
					d2d2_dir = ent;
					return d2_dir.mkdir('d2d3');
				});
			}).then(function (ent) {
				d2d3_dir = ent;
				return d2d3_dir.mkdir('d2d3d1').then(function (ent) {
					d2d3d1_dir = ent;
					return d2d3_dir.mkdir('d2d3d2');
				}).then(function (ent) {
					d2d3d2_dir = ent;
					return d2d3_dir.mkdir('d2d3d3').then(function (ent) {
						d2d3d3_dir = ent;
						return d2d3d3_dir.mkfile('d2d3d3f1', 'd2d3d3f1_content');
					});
				});
			}).then(function (ent) {
				d2d3d3f1_file = ent;
				return root_dir.mkdir('d3');
			}).then(function (ent) {
				d3_dir = ent;
				return d3_dir.mkfile('d3f1', 'd3f1_content');
			});
		}).then(function (ent) {
			d3f1_file = ent;
		});
	});

});


function ls_expect (ls, expected_ls) {

	ls.sort();
	expected_ls.sort();

	for (let i = 0; i < ls.length && i < expected_ls.length; i++) {
		if (ls[i][0] !== expected_ls[i][0])
			throw new Error('expected ls entry '+i+' '+ls[i][0]+' to be '+expected_ls[i][0]);
		if (expected_ls[i][1] === 'undefined')
			continue;
		let valchecks = typeof expected_ls[i][1] !== 'undefined'
			? Object.keys(expected_ls[i][1])
			: [];
		for (let j = 0; j < valchecks.length; j++) {
			if (valchecks[j] === 'inode') {
				if (ls[i][1].inode() !== expected_ls[i][1].inode)
					throw new Error('expected ls entry '+i+' '+ls[i][0]+' to have inode '+expected_ls[i][1].inode);
			} else if (valchecks[j] === 'type') {
				if (ls[i][1].type() !== expected_ls[i][1].type)
					throw new Error('expected ls entry '+i+' '+ls[i][0]+' to have type '+expected_ls[i][1].type);
			} else if (valchecks[j] === 'size') {
				if (ls[i][1].size() !== expected_ls[i][1].size)
					throw new Error('expected ls entry '+i+' '+ls[i][0]+' to have size '+expected_ls[i][1].size);
			} else if (valchecks[j] === 'encoding') {
				if (ls[i][1].encoding() !== expected_ls[i][1].encoding)
					throw new Error(
						'expected ls entry '+i+' '+ls[i][0]+' to have encoding '+expected_ls[i][1].encoding
						);
			} else if (valchecks[j] === 'mime_type') {
				if (ls[i][1].mime_type() !== expected_ls[i][1].mime_type)
					throw new Error(
						'expected ls entry '+i+' '+ls[i][0]+' to have mime_type '+expected_ls[i][1].mime_type
						);
			} else {
				throw new Error('unknown ent check property "'+valchecks[j]+'"');
			}
		}
	}
	if (ls.length > expected_ls.length) {
		throw new Error('unexpected ls entry '+expected_ls.length+' '+ls[expected_ls.length][0]);
	} else if (expected_ls.length > ls.length) {
		throw new Error('expected ls entries ('+(expected_ls.length-ls.length)+' short after '+(ls.length-1)+')');
	}

}


function ls_names_expect (ls_names, expected_ls_names) {

	ls_names.sort();
	expected_ls_names.sort();

	for (let i = 0; i < ls_names.length && i < expected_ls_names.length; i++) {
		if (ls_names[i] !== expected_ls_names[i])
			throw new Error('expected ls entry '+i+' '+ls_names[i]+' to be '+expected_ls_names[i]);
	}
	if (ls_names.length > expected_ls_names.length) {
		throw new Error('unexpected ls entry '+expected_ls_names.length+' '+ls_names[expected_ls_names.length]);
	} else if (expected_ls_names.length > ls_names.length) {
		throw new Error(
			'expected ls entries ('
					+(expected_ls_names.length-ls_names.length)
					+' short after '+(ls_names.length-1)+')'
			);
	}

}


function ls_inodes_expect (ls_inodes, expected_ls_inodes) {

	ls_inodes.sort();
	expected_ls_inodes.sort();

	for (let i = 0; i < ls_inodes.length && i < expected_ls_inodes.length; i++) {
		if (ls_inodes[i] !== expected_ls_inodes[i])
			throw new Error('expected ls entry '+i+' '+ls_inodes[i]+' to be '+expected_ls_inodes[i]);
	}
	if (ls_inodes.length > expected_ls_inodes.length) {
		throw new Error('unexpected ls entry '+expected_ls_inodes.length+' '+ls_inodes[expected_ls_inodes.length]);
	} else if (expected_ls_inodes.length > ls_inodes.length) {
		throw new Error(
			'expected ls entries ('
					+(expected_ls_inodes.length-ls_inodes.length)
					+' short after '+(ls_inodes.length-1)+')'
			);
	}

}


describe('dir.ls', function () {

	it('/ as expected', function () {
		return root_dir.ls().then(function (ents) {
			ls_expect(ents, [
				['.', {inode:'i_1', type:'dir'}],
				['..', {inode:'i_1', type:'dir'}],
				['d1', {type:'dir'}],
				['f1', {type:'file',size:'f1_content'.length,encoding:undefined,mime_type:undefined}],
				['f2', {type:'file',size:'f2_content'.length,encoding:undefined,mime_type:undefined}],
				['d2', {type:'dir'}],
				['d3', {type:'dir'}],
			]);
		});
	});

	it('/d1 as expected', function () {
		return d1_dir.ls().then(function (ents) {
			ls_expect(ents, [
				['.', {inode:d1_dir.inode(), type:'dir'}],
				['..', {inode:'i_1', type:'dir'}],
			]);
		});
	});

	it('/d2 as expected', function () {
		return d2_dir.ls().then(function (ents) {
			ls_expect(ents, [
				['.', {inode:d2_dir.inode(), type:'dir'}],
				['..', {inode:'i_1', type:'dir'}],
				['d2d1', {type:'dir'}],
				['d2d2', {type:'dir'}],
				['d2d3', {type:'dir'}],
			]);
		});
	});

});


describe('dir.ls_names', function () {

	it('/ as expected', function () {
		return root_dir.ls_names().then(function (names) {
			ls_names_expect(names, [
				'.', '..', 'd1', 'f1', 'f2', 'd2', 'd3',
			]);
		});
	});

	it('/d1 as expected', function () {
		return d1_dir.ls_names().then(function (names) {
			ls_names_expect(names, [
				'.', '..',
			]);
		});
	});

	it('/d2 as expected', function () {
		return d2_dir.ls_names().then(function (names) {
			ls_names_expect(names, [
				'.', '..', 'd2d1', 'd2d2', 'd2d3',
			]);
		});
	});

});


describe('dir.ls_inodes', function () {

	it('/ as expected', function () {
		return root_dir.ls_inodes().then(function (inodes) {
			ls_inodes_expect(inodes, [
				'i_1', 'i_1',
				d1_dir.inode(),
				d2_dir.inode(),
				d3_dir.inode(),
				f1_file.inode(),
				f2_file.inode(),
			]);
		});
	});

	it('/d1 as expected', function () {
		return d1_dir.ls_inodes().then(function (inodes) {
			ls_inodes_expect(inodes, [
				d1_dir.inode(), 'i_1',
			]);
		});
	});

	it('/d2 as expected', function () {
		return d2_dir.ls_inodes().then(function (inodes) {
			ls_inodes_expect(inodes, [
				d2_dir.inode(), 'i_1',
				d2d1_dir.inode(),
				d2d2_dir.inode(),
				d2d3_dir.inode(),
			]);
		});
	});

});


describe('dir.get', function () {

	it('d1 of / as expected', function () {
		return root_dir.get('d1').then(function (ent) {
			expect(ent.inode()).toBe(d1_dir.inode());
		});
	});

	it('d2 of / as expected', function () {
		return root_dir.get('d2').then(function (ent) {
			expect(ent.inode()).toBe(d2_dir.inode());
		});
	});

	it('f1 of / as expected', function () {
		return root_dir.get('f1').then(function (ent) {
			expect(ent.inode()).toBe(f1_file.inode());
		});
	});

	it('d2d3d2 of /d2 as expected', function () {
		return d2_dir.get('d2d3/d2d3d2').then(function (ent) {
			expect(ent.inode()).toBe(d2d3d2_dir.inode());
		});
	});

	it('/d2d3d2 of /d2 as expected (leading slash on sub path ignored/skipped)', function () {
		return d2_dir.get('/d2d3/d2d3d2').then(function (ent) {
			expect(ent.inode()).toBe(d2d3d2_dir.inode());
		});
	});

	it('d2/d2d3/d2d3d3/d2d3d3f1 of / as expected', function () {
		return root_dir.get('d2/d2d3/d2d3d3/d2d3d3f1').then(function (ent) {
			expect(ent.inode()).toBe(d2d3d3f1_file.inode());
		});
	});

	it('d2/d2d3//d2d3d3///d2d3d3f1 of / as expected (extra slashes ignored/skipped)', function () {
		return root_dir.get('d2/d2d3//d2d3d3///d2d3d3f1').then(function (ent) {
			expect(ent.inode()).toBe(d2d3d3f1_file.inode());
		});
	});

});


describe('fs.get', function () {

	it('/ succeeds', function () {
		return fs.get('/').then(function (ent) {
			expect(ent.inode()).toBe('i_1');
		});
	});

	it('/f1 succeeds', function () {
		return fs.get('/f1').then(function (ent) {
			expect(ent.inode()).toBe(f1_file.inode());
		});
	});

	it('f1 fails (incomplete path)', function () {
		return new Promise(function (fff, rej) {
			return fs.get('f1').then(function (ent) {
				rej(new Error('no error getting a path without leading slash'));
			}).catch(function (err) {
				if (/does not begin with \//.exec(err))
					fff(err);
				else
					rej(err);
			});
		});
	});

	it('//f1 succeeds (double leading slash ignored/skipped)', function () {
		return fs.get('//f1').then(function (ent) {
			expect(ent.inode()).toBe(f1_file.inode());
		});
	});

	it('/d2 succeeds', function () {
		return fs.get('/d2').then(function (ent) {
			expect(ent.inode()).toBe(d2_dir.inode());
		});
	});

	it('//d2 succeeds (double leading slash ignored/skipped)', function () {
		return fs.get('//d2').then(function (ent) {
			expect(ent.inode()).toBe(d2_dir.inode());
		});
	});

	it('/d2/d2d3 succeeds', function () {
		return fs.get('/d2/d2d3').then(function (ent) {
			expect(ent.inode()).toBe(d2d3_dir.inode());
		});
	});

	it('//d2/d2d3 succeeds (double leading slash ignored/skipped)', function () {
		return fs.get('//d2/d2d3').then(function (ent) {
			expect(ent.inode()).toBe(d2d3_dir.inode());
		});
	});

	it('/d2//d2d3 succeeds (double mid path slash ignored/skipped)', function () {
		return fs.get('/d2//d2d3').then(function (ent) {
			expect(ent.inode()).toBe(d2d3_dir.inode());
		});
	});

	it('//d2///d2d3 succeeds (multiple leading and mid path slashes ignored/skipped)', function () {
		return fs.get('//d2///d2d3').then(function (ent) {
			expect(ent.inode()).toBe(d2d3_dir.inode());
		});
	});

	it('/d2/d2d3/ succeeds (trailing slash ignored/skipped)', function () {
		return fs.get('/d2/d2d3/').then(function (ent) {
			expect(ent.inode()).toBe(d2d3_dir.inode());
		});
	});

	it('/d2/d2d3// succeeds (multiple trailing slashes ignored/skipped)', function () {
		return fs.get('/d2/d2d3//').then(function (ent) {
			expect(ent.inode()).toBe(d2d3_dir.inode());
		});
	});

	it('/d1/bleh fails (non existent path)', function () {
		return new Promise(function (fff, rej) {
			return fs.get('/d1/bleh').then(function (ent) {
				rej(new Error('no error getting a non existent path'));
			}).catch(function (err) {
				if (/not found/.exec(err))
					fff(err);
				else
					rej(err);
			});
		});
	});

	it('/f1/bleh fails (path through a file)', function () {
		return new Promise(function (fff, rej) {
			return fs.get('/f1/bleh').then(function (ent) {
				rej(new Error('no error getting a path without leading slash'));
			}).catch(function (err) {
				if (/not a directory/.exec(err))
					fff(err);
				else
					rej(err);
			});
		});
	});

});


describe('dir.move', function () {

	describe('a file in same directory', function () {

		it('moves', function () {
			return d2d3d3_dir.move('d2d3d3f1', 'd2d3d3f1move1').then(function () {
				return d2d3d3_dir.ls().then(function (ents) {
					ls_expect(ents, [
						['.', {inode:d2d3d3_dir.inode(), type:'dir'}],
						['..', {inode:d2d3_dir.inode(), type:'dir'}],
						['d2d3d3f1move1'],
					]);
				}).then(function () {
					return fs.get('/d2/d2d3/d2d3d3/d2d3d3f1move1').then(function (ent) {
						expect(ent.inode()).toBe(d2d3d3f1_file.inode());
					});
				});
			});
		});

		it('moves back, emits move event', function () {
			let move_event_seen = 0;
			fs.once('move', function (src_dir, old_name, dst_dir, new_name, new_path) {
				expect(src_dir).toBe(d2d3d3_dir);
				expect(old_name).toBe('d2d3d3f1move1');
				expect(dst_dir).toBe(d2d3d3_dir);
				expect(new_name).toBe('d2d3d3f1');
				expect(new_path).toBe('d2d3d3f1');
				move_event_seen++;
			});
			return d2d3d3_dir.move('d2d3d3f1move1', 'd2d3d3f1').then(function () {
				return d2d3d3_dir.ls().then(function (ents) {
					ls_expect(ents, [
						['.', {inode:d2d3d3_dir.inode(), type:'dir'}],
						['..', {inode:d2d3_dir.inode(), type:'dir'}],
						['d2d3d3f1'],
					]);
				}).then(function () {
					return fs.get('/d2/d2d3/d2d3d3/d2d3d3f1').then(function (ent) {
						expect(ent.inode()).toBe(d2d3d3f1_file.inode());
						expect(move_event_seen).toBe(1);
					});
				});
			});
		});

	});

	describe('a directory in same directory', function () {

		it('moves', function () {
			return d2_dir.move('d2d3', 'd2d3move1').then(function () {
				return d2_dir.refresh().then(function () {
					return d2_dir.ls();
				}).then(function (ents) {
					ls_expect(ents, [
						['.', {inode:d2_dir.inode(), type:'dir'}],
						['..', {inode:'i_1', type:'dir'}],
						['d2d1'],
						['d2d2'],
						['d2d3move1'],
					]);
				}).then(function () {
					return fs.get('/d2/d2d3move1').then(function (ent) {
						expect(ent.inode()).toBe(d2d3_dir.inode());
					});
				}).then(function () {
					return fs.get('/d2/d2d3move1/d2d3d3/d2d3d3f1').then(function (ent) {
						expect(ent.inode()).toBe(d2d3d3f1_file.inode());
					});
				});
			});
		});

		it('moves back, emits move event', function () {
			let move_event_seen = 0;
			fs.once('move', function (src_dir, old_name, dst_dir, new_name, new_path) {
				expect(src_dir).toBe(d2_dir);
				expect(old_name).toBe('d2d3move1');
				expect(dst_dir).toBe(d2_dir);
				expect(new_name).toBe('d2d3');
				expect(new_path).toBe('d2d3');
				move_event_seen++;
			});
			return d2_dir.move('d2d3move1', 'd2d3').then(function () {
				return d2_dir.refresh().then(function () {
					return d2_dir.ls();
				}).then(function (ents) {
					ls_expect(ents, [
						['.', {inode:d2_dir.inode(), type:'dir'}],
						['..', {inode:'i_1', type:'dir'}],
						['d2d1'],
						['d2d2'],
						['d2d3'],
					]);
				}).then(function () {
					return fs.get('/d2/d2d3').then(function (ent) {
						expect(ent.inode()).toBe(d2d3_dir.inode());
					});
				}).then(function () {
					return fs.get('/d2/d2d3/d2d3d3/d2d3d3f1').then(function (ent) {
						expect(ent.inode()).toBe(d2d3d3f1_file.inode());
						expect(move_event_seen).toBe(1);
					});
				});
			});
		});

	});

	describe('a file to a different directory', function () {

		it('moves', function () {
			return d3_dir.move('d3f1', '/d2/d2d3/d3f1move1').then(function () {
				return d2d3_dir.refresh().then(function () {
					return d2d3_dir.ls();
				}).then(function (ents) {
					ls_expect(ents, [
						['.', {inode:d2d3_dir.inode(), type:'dir'}],
						['..', {inode:d2_dir.inode(), type:'dir'}],
						['d2d3d1'],
						['d2d3d2'],
						['d2d3d3'],
						['d3f1move1'],
					]);
					return d3_dir.refresh();
				}).then(function () {
					return d3_dir.ls();
				}).then(function (ents) {
					ls_expect(ents, [
						['.', {inode:d3_dir.inode(), type:'dir'}],
						['..', {inode:'i_1', type:'dir'}],
					]);
				}).then(function () {
					return fs.get('/d2/d2d3/d3f1move1').then(function (ent) {
						expect(ent.inode()).toBe(d3f1_file.inode());
					});
				});
			});
		});

		it('moves back, emits move event', function () {
			let move_event_seen = 0;
			fs.once('move', function (src_dir, old_name, dst_dir, new_name, new_path) {
				expect(src_dir).toBe(d2d3_dir);
				expect(old_name).toBe('d3f1move1');
				expect(dst_dir.inode()).toBe(d3_dir.inode());
				expect(new_name).toBe('d3f1');
				expect(new_path).toBe('/d3/d3f1');
				move_event_seen++;
			});
			return d2d3_dir.move('d3f1move1', '/d3/d3f1').then(function () {
				return d3_dir.refresh().then(function () {
					return d3_dir.ls();
				}).then(function (ents) {
					ls_expect(ents, [
						['.', {inode:d3_dir.inode(), type:'dir'}],
						['..', {inode:'i_1', type:'dir'}],
						['d3f1'],
					]);
					return d2d3_dir.refresh();
				}).then(function () {
					return d2d3_dir.ls();
				}).then(function (ents) {
					ls_expect(ents, [
						['.', {inode:d2d3_dir.inode(), type:'dir'}],
						['..', {inode:d2_dir.inode(), type:'dir'}],
						['d2d3d1'],
						['d2d3d2'],
						['d2d3d3'],
					]);
				}).then(function () {
					return fs.get('/d3/d3f1').then(function (ent) {
						expect(ent.inode()).toBe(d3f1_file.inode());
						expect(move_event_seen).toBe(1);
					});
				});
			});
		});

	});

	it('a destination path with a trailing slash is rejected', function () {
		return new Promise(function (fff, rej) {
			d3_dir.move('d3f1', '/d2/d2d3/').then(function () {
				rej(new Error('the promise should have been rejected'));
			}).catch(function (err) {
				fff(err);
			});
		});
	});

	it('a non existent entity fails', function () {
		return new Promise(function (fff, rej) {
			return d2d3_dir.move('d2d3d1nothere', 'd2d3d1move1').then(function () {
				rej(new Error('moving a non existent entity apparently succeeded'));
			}).catch(function (err) {
				if (/not found/.exec(err))
					fff(err);
				else
					rej(err);
			});
		});
	});

	it('over an already existing destination fails', function () {
		return new Promise(function (fff, rej) {
			return d2d3_dir.move('d2d3d1', 'd2d3d2').then(function () {
				rej(new Error('moving a non existent entity apparently succeeded'));
			}).catch(function (err) {
				if (/already exists/.exec(err))
					fff(err);
				else
					rej(err);
			});
		});
	});

});


describe('dir.remove', function () {

	it('/ f1 succeeds', function () {
		return root_dir.remove('f1').then(function () {
			return root_dir.ls().then(function (ents) {
				ls_expect(ents, [
					['.', {inode:'i_1', type:'dir'}],
					['..', {inode:'i_1', type:'dir'}],
					['d1', {type:'dir'}],
					['f2', {type:'file',size:'f2_content'.length,encoding:undefined,mime_type:undefined}],
					['d2', {type:'dir'}],
					['d3', {type:'dir'}],
				]);
			}).then(function () {
				return new Promise(function (fff, rej) {
					return fs.get('/f1').then(function () {
						throw new Error('fs.get /f1 apparently works after removing /f1');
					}).catch(function (err) {
						if (/not found/.exec(err))
							fff(err);
						else
							rej(err);
					});
				});
			});
		});
	});

	it('/ f2 succeeds, emits event', function () {
		let remove_event_seen = 0;
		fs.once('remove', function (dir, name) {
			expect(dir).toBe(root_dir);
			expect(name).toBe('f2');
			remove_event_seen++;
		});
		return root_dir.remove('f2').then(function () {
			expect(remove_event_seen).toBe(1);
		});
	});

	it('/ f1 fails second time (non existing)', function () {
		return new Promise(function (fff, rej) {
			return root_dir.remove('f1').then(function () {
				throw new Error('removing f1 from / apparently succeeded (just deleted it)');
			}).catch(function (err) {
				if (/no such/.exec(err))
					fff(err);
				else
					rej(err);
			});
		});
	});

	it('/ d2 fails (not empty)', function () {
		return new Promise(function (fff, rej) {
			return root_dir.remove('d2').then(function () {
				throw new Error('removing d2 from / apparently succeeded (should have sub entities)');
			}).catch(function (err) {
				if (/not empty/.exec(err))
					fff(err);
				else
					rej(err);
			});
		});
	});

	it('/ d1missed fails (non existing)', function () {
		return new Promise(function (fff, rej) {
			return root_dir.remove('d1missed').then(function () {
				throw new Error('removing d1missed from / apparently succeeded');
			}).catch(function (err) {
				if (/no such/.exec(err))
					fff(err);
				else
					rej(err);
			});
		});
	});

	it('/d1 . fails (cannot remove current directory)', function () {
		return new Promise(function (fff, rej) {
			return d1_dir.remove('.').then(function () {
				throw new Error('removing . from /d1 apparently succeeded');
			}).catch(function (err) {
				if (/cannot delete/.exec(err))
					fff(err);
				else
					rej(err);
			});
		});
	});

	it('/d1 .. fails (cannot remove parent directory)', function () {
		return new Promise(function (fff, rej) {
			return d1_dir.remove('..').then(function () {
				throw new Error('removing .. from /d1 apparently succeeded');
			}).catch(function (err) {
				if (/cannot delete/.exec(err))
					fff(err);
				else
					rej(err);
			});
		});
	});

	it('/ d1 succeeds', function () {
		return root_dir.remove('d1').then(function () {
			return root_dir.ls().then(function (ents) {
				ls_expect(ents, [
					['.', {inode:'i_1', type:'dir'}],
					['..', {inode:'i_1', type:'dir'}],
					['d2', {type:'dir'}],
					['d3', {type:'dir'}],
				]);
			}).then(function () {
				return new Promise(function (fff, rej) {
					return fs.get('/d1').then(function () {
						throw new Error('fs.get /d1 apparently works after removing /d1');
					}).catch(function (err) {
						if (/not found/.exec(err))
							fff(err);
						else
							rej(err);
					});
				});
			});
		});
	});

});


})();
