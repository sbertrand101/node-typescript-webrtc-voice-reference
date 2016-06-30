import test from 'ava';
import {runWithServer, ISuperTest} from './helpers';
import {Response} from 'supertest';
import * as sinon from 'sinon';
import {Readable} from 'stream';
import getRouter, {IContext} from '../src/routes';
import {models} from '../src/index';

test(`getRouter shpuld return router object`, (t) => {
	const router = getRouter(null, null, null);
	t.truthy(router);
});

test(`POST '/login' should login with exists user`, async (t) => {
	await runWithServer(async (request: ISuperTest) => {
		const response = await request.login('login1');
		t.true(response.ok);
		t.truthy(response.body.token);
		t.truthy(response.body.expire);
	});
});

test(`POST '/login' should fail with non-exists user`, async (t) => {
	await runWithServer(async (request: ISuperTest) => {
		const response = await request.login('login2', true);
		t.false(response.ok);
	});
});

test(`POST '/login' should fail for wrong password`, async (t) => {
	await models.user.remove({ userName: 'login3' });
	const user = new models.user({
		userName: 'login3',
		areaCode: '910',
		phoneNumber: '+1234567890',
		endpointId: 'endpointId',
		sipUri: 'test@test.net',
		sipPassword: '123456',
	});
	await user.setPassword('000000');
	await user.save();
	await runWithServer(async (request: ISuperTest) => {
		const response = await request.login('login3', true);
		t.false(response.ok);
	});
});

test(`POST '/login' should fail if any auth data missing`, async () => {
	await runWithServer(async (request: ISuperTest) => {
		await request.post('/login').send({}).expect(400);
	});
});

test(`POST '/register' should register new user`, async (t) => {
	await runWithServer(async (request, app) => {
		await models.user.remove({ userName: 'register1' });
		const stub1 = sinon.stub(app.api, 'createPhoneNumber').withArgs('910').returns(Promise.resolve('+1234567890'));
		const stub2 = sinon.stub(app.api, 'createSIPAccount').returns(Promise.resolve({ endpointId: 'endpointId', uri: 'uri', password: 'password' }));
		const response = <Response><any>(await request.post('/register').send({ userName: 'register1', password: '123456', repeatPassword: '123456', areaCode: '910' }));
		t.true(response.ok);
		t.true(stub1.called);
		t.true(stub2.called);
		const user = await models.user.findOne({ userName: 'register1' }).exec();
		t.truthy(user);
	});
});

test(`POST '/register' should fail if required fields missing`, async (t) => {
	await runWithServer(async (request, app) => {
		await models.user.remove({ userName: 'register2' });
		const response = <Response><any>(await request.post('/register').send({ userName: 'register2', password: '123456' }));
		t.false(response.ok);
		const user = await models.user.findOne({ userName: 'register2' }).exec();
		t.falsy(user);
	});
});

test(`POST '/register' should fail if passwords are mismatched `, async (t) => {
	await runWithServer(async (request, app) => {
		await models.user.remove({ userName: 'register3' });
		const response = <Response><any>(await request.post('/register').send({ userName: 'register3', password: '123456', repeatPassword: '123450', areaCode: '910' }));
		t.false(response.ok);
		const user = await models.user.findOne({ userName: 'register3' }).exec();
		t.falsy(user);
	});
});

test(`GET '/sipData' should return sip auth data for user`, async (t) => {
	await runWithServer(async (request, app) => {
		const clock = sinon.useFakeTimers();
		let response = await request.login('sipData1');
		t.true(response.ok);
		const stub1 = sinon.stub(app.api, 'createSIPAuthToken').withArgs('endpointId').returns(Promise.resolve({
			token: 'token',
			expires: 3600
		}));
		response = <Response><any>(await request.get('/sipData').set('Authorization', `Bearer ${response.body.token}`));
		clock.restore();
		t.true(response.ok);
		t.true(stub1.called);
		t.deepEqual(response.body, {
			phoneNumber: '+1234567890',
			sipUri: 'test@test.net',
			sipPassword: '123456',
			token: 'token',
			expire: '1970-01-01T01:00:00.000Z'
		});
	});
});

test(`GET '/sipData' should fail on unauthorized call`, async (t) => {
	await runWithServer(async (request, app) => {
		const response = <Response><any>(await request.get('/sipData'));
		t.false(response.ok);
	});
});

test(`GET '/voiceMessages' should return list of messages`, async (t) => {
	await runWithServer(async (request, app) => {
		let response = await request.login('voiceMessages1');
		t.true(response.ok);
		const user = await models.user.findOne({ userName: 'voiceMessages1' }).exec();
		await models.voiceMailMessage.create({
			startTime: '2016-06-30T12:00:00Z',
			endTime: '2016-06-30T12:01:00Z',
			mediaUrl: 'url1',
			from: 'from1',
			user: user.id
		}, {
				startTime: '2016-06-30T12:02:00Z',
				endTime: '2016-06-30T12:03:00Z',
				mediaUrl: 'url2',
				from: 'from2',
				user: user.id
			}, {
				startTime: '2016-06-30T12:03:00Z',
				endTime: '2016-06-30T12:04:00Z',
				mediaUrl: 'url3',
				from: 'from3'
			});
		response = <Response><any>(await request.get('/voiceMessages').set('Authorization', `Bearer ${response.body.token}`));
		t.true(response.ok);
		t.is(response.body.length, 2);
		t.is(response.body[0].from, 'from2');
		t.is(response.body[1].from, 'from1');
	});
});

test(`GET '/voiceMessages/:id/media' should return file content`, async (t) => {
	await runWithServer(async (request, app) => {
		let response = await request.login('voiceMessages2');
		t.true(response.ok);
		const user = await models.user.findOne({ userName: 'voiceMessages2' }).exec();
		await models.voiceMailMessage.remove({user: user.id});
		const message = new models.voiceMailMessage({
			startTime: '2016-06-30T10:00:00Z',
			endTime: '2016-06-30T10:01:00Z',
			mediaUrl: 'http://loclahost/file1',
			from: 'fr1',
			user: user.id
		});
		await message.save();
		const stream = new Readable();
		stream.push('123456');
		stream.push(null);
		const stub1 = sinon.stub(app.api, 'downloadMediaFile').withArgs('file1').returns(Promise.resolve({
			content: stream,
			contentType: 'text/plain'
		}));
		response = <Response><any>(await request.get(`/voiceMessages/${message.id}/media`).set('Authorization', `Bearer ${response.body.token}`));
		t.true(response.ok);
		t.true(stub1.called);
		t.is(response.text, '123456');
		t.is(response.type, 'text/plain');
	});
});

test(`DELETE '/voiceMessages/:id' should delete voice message`, async (t) => {
	await runWithServer(async (request, app) => {
		let response = await request.login('voiceMessages3');
		t.true(response.ok);
		const user = await models.user.findOne({ userName: 'voiceMessages3' }).exec();
		await models.voiceMailMessage.remove({user: user.id});
		const message = new models.voiceMailMessage({
			startTime: '2016-06-30T10:00:00Z',
			endTime: '2016-06-30T10:01:00Z',
			mediaUrl: 'http://loclahost/file2',
			from: 'fr2',
			user: user.id
		});
		await message.save();
		response = <Response><any>(await request.delete(`/voiceMessages/${message.id}`).set('Authorization', `Bearer ${response.body.token}`));
		t.true(response.ok);
		const m = await models.voiceMailMessage.findById(message.id.toString()).exec();
		t.falsy(m);
	});
});
