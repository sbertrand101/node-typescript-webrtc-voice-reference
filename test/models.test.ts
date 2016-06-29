import test from 'ava';
import * as bcrypt from 'bcryptjs';
import {Mongoose, Types} from 'mongoose';
import getModels, {IModels} from '../src/models';
import * as sinon from 'sinon';

const mongoose = new Mongoose();
(<any>mongoose).Promise = global.Promise;
const models = getModels(mongoose);

test.afterEach(t => {
	if (t.context.stub) {
		t.context.stub.restore();
		t.context.stub = null;
	}
});

test.serial(`User#setPassword() should set field 'passwordHash'`, async (t) => {
	t.context.stub = sinon.stub(bcrypt, 'hash').callsArgWithAsync(2, null, 'hash');
	const user = new models.user();
	await user.setPassword('password');
	t.true(t.context.stub.called);
	t.true(t.context.stub.lastCall.args[0].startsWith('password'));
	t.is((<any>user).passwordHash, 'hash');
});


test.serial(`User#setPassword() should fail if bcrypt.hash failed'`, t => {
	t.context.stub = sinon.stub(bcrypt, 'hash').callsArgWithAsync(2, new Error('error'), null);
	const user = new models.user();
	t.throws(user.setPassword('password'), 'error');
});

test.serial(`User#comparePassword() should compare password hashes`, async (t) => {
	const user = new models.user();
	await user.setPassword('password');
	t.true(await user.comparePassword('password'));
	t.false(await user.comparePassword('123'));
});

test.serial(`User#comparePassword() should fail if bcrypt.compare failed`, async (t) => {
	t.context.stub = sinon.stub(bcrypt, 'compare').callsArgWithAsync(2, new Error('error'), null);
	const user = new models.user();
	await user.setPassword('password');
	t.throws(user.comparePassword('password'), 'error');
});

test(`VoiceMailMessage#toJSON() should return valid json object`, async (t) => {
	const id = new Types.ObjectId();
	const m = new models.voiceMailMessage({
		from: 'from',
		startTime: '2016-06-29T10:00:00Z',
		endTime: '2016-06-29T10:01:00Z',
		mediaUrl: 'url'
	});
	m._id = id;
	t.deepEqual(m.toJSON(), <any>{id: id.toString(), from: 'from', startTime: '2016-06-29T10:00:00.000Z', endTime: '2016-06-29T10:01:00.000Z'});
});
