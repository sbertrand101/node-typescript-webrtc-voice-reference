import test from 'ava';
import {runWithServer, ISuperTest, createUser} from './helpers';
import {Response} from 'supertest';
import * as sinon from 'sinon';
import {Readable, Writable} from 'stream';
import * as jwt from 'jsonwebtoken';
import * as PubSub from 'pubsub-js';
import getRouter, {IContext, jwtToken, SimpleReadable, tonesURL, beepURL} from '../src/routes';
import {models} from '../src/index';

SimpleReadable.prototype._read = function (size) {
	setTimeout(() => this.emit('end'), 500);
};

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
			sipUri: 'sip:test@test.net',
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
		await models.voiceMailMessage.remove({ user: user.id });
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
		await models.voiceMailMessage.remove({ user: user.id });
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

test(`GET '/voiceMessagesStream should listen to server side events`, async (t) => {
	await runWithServer(async (request, app, server) => {
		let response = await request.login('voiceMessages4');
		t.true(response.ok);
		const user = await models.user.findOne({ userName: 'voiceMessages4' }).exec();
		const token = await (<any>(jwt.sign)).promise(user.id, jwtToken, {});
		response = <Response><any>(await request.get(`/voiceMessagesStream?token=${token}`).set('Authorization', `Bearer ${response.body.token}`));
		t.true(response.ok);
		t.is(response.type, 'text/event-stream');
	});
});

test(`GET '/voiceMessagesStream should fail for missing token`, async (t) => {
	await runWithServer(async (request, app) => {
		let response = await request.login('voiceMessages5');
		t.true(response.ok);
		const user = await models.user.findOne({ userName: 'voiceMessages5' }).exec();
		response = <Response><any>(await request.get(`/voiceMessagesStream`).set('Authorization', `Bearer ${response.body.token}`));
		t.false(response.ok);
	});
});

test(`GET '/voiceMessagesStream should fail for invalid token`, async (t) => {
	await runWithServer(async (request, app) => {
		let response = await request.login('voiceMessages6');
		t.true(response.ok);
		const user = await models.user.findOne({ userName: 'voiceMessages6' }).exec();
		response = <Response><any>(await request.get(`/voiceMessagesStream?token=123456`).set('Authorization', `Bearer ${response.body.token}`));
		t.false(response.ok);
	});
});

test(`GET '/voiceMessagesStream should listen to server side events`, async (t) => {
	await runWithServer(async (request, app) => {
		let response = await request.login('voiceMessages7');
		t.true(response.ok);
		const user = await models.user.findOne({ userName: 'voiceMessages7' }).exec();
		const token = await (<any>(jwt.sign)).promise(user.id, jwtToken, {});
		let sseCalled = false;
		class MockWritable extends Writable {
			_write(chunk: any, encoding: string, callback: Function): void {
				const text = chunk.toString();
				if (text !== '\n') {
					t.is(text, 'id: id\ndata: {"id":"id","message":"message"}\n\n');
				}
				sseCalled = true;
				callback();
			}
		}
		await new Promise((resolve, reject) => {
			const stream = new MockWritable();
			stream.on('finish', resolve);
			stream.on('error', reject);
			request.get(`/voiceMessagesStream?token=${token}`)
				.set('Authorization', `Bearer ${response.body.token}`)
				.pipe(stream);
			setTimeout(() => {
				PubSub.publish(user.id, { id: 'id', message: 'message' });
			}, 50);
		});
		t.true(sseCalled);
	});
});

test(`POST '/recordGreeting' should make call callback`, async (t) => {
	await runWithServer(async (request, app) => {
		let response = await request.login('recordGreeting');
		t.true(response.ok);
		const stub = sinon.stub(app.api, 'createCall').returns(Promise.resolve('callId'));
		const user = await models.user.findOne({ userName: 'recordGreeting' }).exec();
		response = <Response><any>(await request.post(`/recordGreeting`).set('Authorization', `Bearer ${response.body.token}`));
		t.true(response.ok);
		t.true(stub.called);
		t.is(stub.lastCall.args[0].from, '+1234567890');
		t.is(stub.lastCall.args[0].to, 'sip:test@test.net');
	});
});

test(`POST '/callCallback' should handle outgoing call`, async (t) => {
	await runWithServer(async (request, app) => {
		const stub = sinon.stub(app.api, 'transferCall')
			.withArgs('+1472583690', '+1234567890')
			.returns(Promise.resolve());
		const user = await createUser('ouser1');
		await models.user.update({ _id: user.id }, { $set: { sipUri: 'sip:otest@test.com' } });
		const response = <Response><any>(await request.post(`/callCallback`).send({
			callId: 'callID',
			eventType: 'answer',
			from: 'sip:otest@test.com',
			to: '+1472583690'
		}));
		t.true(response.ok);
		t.true(stub.called);
	});
});

test(`POST '/callCallback' should handle incoming call`, async (t) => {
	await runWithServer(async (request, app, server) => {
		const stub1 = sinon.stub(app.api, 'playAudioToCall')
			.withArgs('callID', tonesURL, true, '')
			.returns(Promise.resolve());
		const stub2 = sinon.stub(app.api, 'createBridge')
			.withArgs({
				callIds: ['callID'],
				bridgeAudio: true
			})
			.returns(Promise.resolve('bridgeId'));
		const stub3 = sinon.stub(app.api, 'createCall')
			.withArgs({
				bridgeId: 'bridgeId',
				from: '+1472583690',
				to: 'sip:itest@test.com',
				tag: 'AnotherLeg:callID',
				callTimeout: 10,
				callbackUrl: `http://127.0.0.1:${server.address().port}/callCallback`
			})
			.returns(Promise.resolve('anotherCallId'));
		const user = await createUser('iuser1');
		await models.user.update({ _id: user.id }, { $set: { sipUri: 'sip:itest@test.com', phoneNumber: '+1234567891' } });
		const response = <Response><any>(await request.post(`/callCallback`).send({
			callId: 'callID',
			eventType: 'answer',
			from: '+1472583690',
			to: '+1234567891'
		}));
		t.true(response.ok);
		t.true(stub1.called);
		t.true(stub2.called);
		t.true(stub3.called);
	});
});

test(`POST '/callCallback' should handle incoming call (from sip account)`, async (t) => {
	await runWithServer(async (request, app, server) => {
		const stub1 = sinon.stub(app.api, 'playAudioToCall')
			.withArgs('callID', tonesURL, true, '')
			.returns(Promise.resolve());
		const stub2 = sinon.stub(app.api, 'createBridge')
			.withArgs({
				callIds: ['callID'],
				bridgeAudio: true
			})
			.returns(Promise.resolve('bridgeId'));
		const stub3 = sinon.stub(app.api, 'createCall')
			.withArgs({
				bridgeId: 'bridgeId',
				from: '+1234567893',
				to: 'sip:itest2@test.com',
				tag: 'AnotherLeg:callID',
				callTimeout: 10,
				callbackUrl: `http://127.0.0.1:${server.address().port}/callCallback`
			})
			.returns(Promise.resolve('anotherCallId'));
		const user = await createUser('iuser2');
		await models.user.update({ _id: user.id }, { $set: { sipUri: 'sip:itest2@test.com', phoneNumber: '+1234567892' } });
		const user2 = await createUser('iuser3');
		await models.user.update({ _id: user2.id }, { $set: { sipUri: 'sip:itest3@test.com', phoneNumber: '+1234567893' } });

		const response = <Response><any>(await request.post(`/callCallback`).send({
			callId: 'callID',
			eventType: 'answer',
			from: 'sip:itest3@test.com',
			to: '+1234567892'
		}));
		t.true(response.ok);
		t.true(stub1.called);
		t.true(stub2.called);
		t.true(stub3.called);
	});
});

test(`POST '/callCallback' should do nothing if user is not found`, async (t) => {
	await runWithServer(async (request, app, server) => {
		const response = <Response><any>(await request.post(`/callCallback`).send({
			callId: 'callID',
			eventType: 'answer',
			from: '+1112583690',
			to: '+1114567891'
		}));
		t.true(response.ok);
	});
});

test(`POST '/callCallback' should handle call for second leg`, async (t) => {
	await runWithServer(async (request, app, server) => {
		const stub1 = sinon.stub(app.api, 'stopPlayAudioToCall')
			.withArgs('callID')
			.returns(Promise.resolve());
		const response = <Response><any>(await request.post(`/callCallback`).send({
			callId: 'anotherCallID',
			eventType: 'answer',
			from: '+1472583690',
			to: '+1234567891',
			tag: 'AnotherLeg:callID'
		}));
		t.true(response.ok);
		t.true(stub1.called);
	});
});

test(`POST '/callCallback' should handle ending of playback (after greeting)`, async (t) => {
	await runWithServer(async (request, app, server) => {
		const stub1 = sinon.stub(app.api, 'playAudioToCall')
			.withArgs('callID', beepURL, false, 'Beep')
			.returns(Promise.resolve());
		const response = <Response><any>(await request.post(`/callCallback`).send({
			callId: 'callID',
			eventType: 'speak',
			status: 'done',
			tag: 'Greeting'
		}));
		t.true(response.ok);
		t.true(stub1.called);
	});
});

test(`POST '/callCallback' should handle ending of playback (after beep)`, async (t) => {
	await runWithServer(async (request, app, server) => {
		const stub1 = sinon.stub(app.api, 'updateCall')
			.withArgs('callID', { recordingEnabled: true })
			.returns(Promise.resolve());
		const response = <Response><any>(await request.post(`/callCallback`).send({
			callId: 'callID',
			eventType: 'speak',
			status: 'done',
			tag: 'Beep'
		}));
		t.true(response.ok);
		t.true(stub1.called);
	});
});

test(`POST '/callCallback' should handle timeout (play default greeting) for second leg`, async (t) => {
	await runWithServer(async (request, app, server) => {
		const stub1 = sinon.stub(app.api, 'stopPlayAudioToCall')
			.withArgs('tcallID')
			.returns(Promise.resolve());
		const stub2 = sinon.stub(app.api, 'speakSentenceToCall')
			.withArgs('tcallID', 'Hello. Please leave a message after beep.', 'Greeting')
			.returns(Promise.resolve());

		const user = await createUser('tuser1');
		await models.user.update({ _id: user.id }, { $set: { sipUri: 'sip:ttest@test.com', phoneNumber: '+1324567891' } });
		await models.activeCall.remove({callId: 'tcallID'});
		await models.activeCall.create({callId: 'tcallID', user: user.id});
		const response = <Response><any>(await request.post(`/callCallback`).send({
			callId: 'anotherCallID',
			eventType: 'timeout',
			tag: 'AnotherLeg:tcallID'
		}));
		t.true(response.ok);
		t.true(stub1.called);
		t.true(stub2.called);
	});
});

test.only(`POST '/callCallback' should handle timeout (play user's greeting) for second leg`, async (t) => {
	await runWithServer(async (request, app, server) => {
		const stub1 = sinon.stub(app.api, 'stopPlayAudioToCall')
			.withArgs('t2callID')
			.returns(Promise.resolve());
		const stub2 = sinon.stub(app.api, 'playAudioToCall')
			.withArgs('t2callID', 'url', false, 'Greeting')
			.returns(Promise.resolve());

		const user = await createUser('tuser2');
		await models.user.update({ _id: user.id }, { $set: { sipUri: 'sip:t2test@test.com', phoneNumber: '+1324567892', greetingUrl: 'url' } });
		await models.activeCall.remove({callId: 't2callID'});
		await models.activeCall.create({callId: 't2callID', user: user.id});
		const response = <Response><any>(await request.post(`/callCallback`).send({
			callId: 'anotherCallID',
			eventType: 'timeout',
			tag: 'AnotherLeg:t2callID'
		}));
		console.log(response.text);
		t.true(response.ok);
		t.true(stub1.called);
		t.true(stub2.called);
	});
});
