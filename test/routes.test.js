"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator.throw(value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments)).next());
    });
};
const ava_1 = require('ava');
const helpers_1 = require('./helpers');
const sinon = require('sinon');
const stream_1 = require('stream');
const jwt = require('jsonwebtoken');
const PubSub = require('pubsub-js');
const routes_1 = require('../src/routes');
const index_1 = require('../src/index');
routes_1.SimpleReadable.prototype._read = function (size) {
    setTimeout(() => this.emit('end'), 500);
};
ava_1.default(`getRouter shpuld return router object`, (t) => {
    const router = routes_1.default(null, null, null);
    t.truthy(router);
});
ava_1.default(`POST '/login' should login with exists user`, (t) => __awaiter(this, void 0, void 0, function* () {
    yield helpers_1.runWithServer((request) => __awaiter(this, void 0, void 0, function* () {
        const response = yield request.login('login1');
        t.true(response.ok);
        t.truthy(response.body.token);
        t.truthy(response.body.expire);
    }));
}));
ava_1.default(`POST '/login' should fail with non-exists user`, (t) => __awaiter(this, void 0, void 0, function* () {
    yield helpers_1.runWithServer((request) => __awaiter(this, void 0, void 0, function* () {
        const response = yield request.login('login2', true);
        t.false(response.ok);
    }));
}));
ava_1.default(`POST '/login' should fail for wrong password`, (t) => __awaiter(this, void 0, void 0, function* () {
    yield index_1.models.user.remove({ userName: 'login3' });
    const user = new index_1.models.user({
        userName: 'login3',
        areaCode: '910',
        phoneNumber: '+1234567890',
        endpointId: 'endpointId',
        sipUri: 'test@test.net',
        sipPassword: '123456',
    });
    yield user.setPassword('000000');
    yield user.save();
    yield helpers_1.runWithServer((request) => __awaiter(this, void 0, void 0, function* () {
        const response = yield request.login('login3', true);
        t.false(response.ok);
    }));
}));
ava_1.default(`POST '/login' should fail if any auth data missing`, () => __awaiter(this, void 0, void 0, function* () {
    yield helpers_1.runWithServer((request) => __awaiter(this, void 0, void 0, function* () {
        yield request.post('/login').send({}).expect(400);
    }));
}));
ava_1.default(`POST '/register' should register new user`, (t) => __awaiter(this, void 0, void 0, function* () {
    yield helpers_1.runWithServer((request, app) => __awaiter(this, void 0, void 0, function* () {
        yield index_1.models.user.remove({ userName: 'register1' });
        const stub1 = sinon.stub(app.api, 'createPhoneNumber').returns(Promise.resolve('+1234567890'));
        const stub2 = sinon.stub(app.api, 'createSIPAccount').returns(Promise.resolve({ endpointId: 'endpointId', uri: 'uri', password: 'password' }));
        const response = (yield request.post('/register').send({ userName: 'register1', password: '123456', repeatPassword: '123456', areaCode: '910' }));
        t.true(response.ok);
        t.true(stub1.called);
        t.is(stub1.lastCall.args[1], '910');
        t.true(stub2.called);
        const user = yield index_1.models.user.findOne({ userName: 'register1' }).exec();
        t.truthy(user);
    }));
}));
ava_1.default(`POST '/register' should fail if user exists already`, (t) => __awaiter(this, void 0, void 0, function* () {
    yield helpers_1.runWithServer((request, app) => __awaiter(this, void 0, void 0, function* () {
        yield index_1.models.user.remove({ userName: 'register11' });
        const user = new index_1.models.user({
            userName: 'register11',
            areaCode: '910',
            phoneNumber: '+1234567811',
            endpointId: 'endpointId',
            sipUri: 'test@test.net',
            sipPassword: '123456',
        });
        yield user.setPassword('000000');
        yield user.save();
        const response = (yield request.post('/register').send({ userName: 'register11', password: '123456', repeatPassword: '123456', areaCode: '910' }));
        t.false(response.ok);
    }));
}));
ava_1.default(`POST '/register' should fail if required fields missing`, (t) => __awaiter(this, void 0, void 0, function* () {
    yield helpers_1.runWithServer((request, app) => __awaiter(this, void 0, void 0, function* () {
        yield index_1.models.user.remove({ userName: 'register2' });
        const response = (yield request.post('/register').send({ userName: 'register2', password: '123456' }));
        t.false(response.ok);
        const user = yield index_1.models.user.findOne({ userName: 'register2' }).exec();
        t.falsy(user);
    }));
}));
ava_1.default(`POST '/register' should fail if passwords are mismatched `, (t) => __awaiter(this, void 0, void 0, function* () {
    yield helpers_1.runWithServer((request, app) => __awaiter(this, void 0, void 0, function* () {
        yield index_1.models.user.remove({ userName: 'register3' });
        const response = (yield request.post('/register').send({ userName: 'register3', password: '123456', repeatPassword: '123450', areaCode: '910' }));
        t.false(response.ok);
        const user = yield index_1.models.user.findOne({ userName: 'register3' }).exec();
        t.falsy(user);
    }));
}));
ava_1.default(`GET '/refreshToken' should refresh auth token`, (t) => __awaiter(this, void 0, void 0, function* () {
    yield helpers_1.runWithServer((request, app) => __awaiter(this, void 0, void 0, function* () {
        let response = yield request.login('refreshToken1');
        t.true(response.ok);
        response = (yield request.get('/refreshToken').set('Authorization', `Bearer ${response.body.token}`));
        t.true(response.ok);
        t.truthy(response.body.token);
    }));
}));
ava_1.default(`GET '/sipData' should return sip auth data for user`, (t) => __awaiter(this, void 0, void 0, function* () {
    yield helpers_1.runWithServer((request, app) => __awaiter(this, void 0, void 0, function* () {
        const clock = sinon.useFakeTimers();
        let response = yield request.login('sipData1');
        t.true(response.ok);
        const stub1 = sinon.stub(app.api, 'createSIPAuthToken').returns(Promise.resolve({
            token: 'token',
            expires: 3600
        }));
        response = (yield request.get('/sipData').set('Authorization', `Bearer ${response.body.token}`));
        clock.restore();
        t.true(response.ok);
        t.true(stub1.called);
        t.is(stub1.lastCall.args[1], 'endpointId');
        t.deepEqual(response.body, {
            phoneNumber: '+1234567890',
            sipUri: 'sip:test@test.net',
            sipPassword: '123456',
            token: 'token',
            expire: '1970-01-01T01:00:00.000Z'
        });
    }));
}));
ava_1.default(`GET '/sipData' should fail on unauthorized call`, (t) => __awaiter(this, void 0, void 0, function* () {
    yield helpers_1.runWithServer((request, app) => __awaiter(this, void 0, void 0, function* () {
        const response = (yield request.get('/sipData'));
        t.false(response.ok);
    }));
}));
ava_1.default(`GET '/voiceMessages' should return list of messages`, (t) => __awaiter(this, void 0, void 0, function* () {
    yield helpers_1.runWithServer((request, app) => __awaiter(this, void 0, void 0, function* () {
        let response = yield request.login('voiceMessages1');
        t.true(response.ok);
        const user = yield index_1.models.user.findOne({ userName: 'voiceMessages1' }).exec();
        yield index_1.models.voiceMailMessage.create({
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
        response = (yield request.get('/voiceMessages').set('Authorization', `Bearer ${response.body.token}`));
        t.true(response.ok);
        t.is(response.body.length, 2);
        t.is(response.body[0].from, 'from2');
        t.is(response.body[1].from, 'from1');
    }));
}));
ava_1.default(`GET '/voiceMessages/:id/media' should return file content`, (t) => __awaiter(this, void 0, void 0, function* () {
    yield helpers_1.runWithServer((request, app) => __awaiter(this, void 0, void 0, function* () {
        let response = yield request.login('voiceMessages2');
        t.true(response.ok);
        const user = yield index_1.models.user.findOne({ userName: 'voiceMessages2' }).exec();
        yield index_1.models.voiceMailMessage.remove({ user: user.id });
        const message = new index_1.models.voiceMailMessage({
            startTime: '2016-06-30T10:00:00Z',
            endTime: '2016-06-30T10:01:00Z',
            mediaUrl: 'http://loclahost/file1',
            from: 'fr1',
            user: user.id
        });
        yield message.save();
        const stream = new stream_1.Readable();
        stream.push('123456');
        stream.push(null);
        const stub1 = sinon.stub(app.api, 'downloadMediaFile').withArgs('file1').returns(Promise.resolve({
            content: stream,
            contentType: 'text/plain'
        }));
        response = (yield request.get(`/voiceMessages/${message.id}/media`).set('Authorization', `Bearer ${response.body.token}`));
        t.true(response.ok);
        t.true(stub1.called);
        t.is(response.text, '123456');
        t.is(response.type, 'text/plain');
    }));
}));
ava_1.default(`GET '/voiceMessages/:id/media' should return 404 for non-existing item`, (t) => __awaiter(this, void 0, void 0, function* () {
    yield helpers_1.runWithServer((request, app) => __awaiter(this, void 0, void 0, function* () {
        let response = yield request.login('voiceMessages21');
        t.true(response.ok);
        const user = yield index_1.models.user.findOne({ userName: 'voiceMessages21' }).exec();
        yield index_1.models.voiceMailMessage.remove({ user: user.id });
        const message = new index_1.models.voiceMailMessage({
            startTime: '2016-06-30T10:00:00Z',
            endTime: '2016-06-30T10:01:00Z',
            mediaUrl: 'http://loclahost/file1',
            from: 'fr1',
            user: user.id
        });
        yield message.save();
        const id = message.id;
        yield message.remove();
        response = (yield request.get(`/voiceMessages/${id}/media`).set('Authorization', `Bearer ${response.body.token}`));
        t.false(response.ok);
    }));
}));
ava_1.default(`DELETE '/voiceMessages/:id' should delete voice message`, (t) => __awaiter(this, void 0, void 0, function* () {
    yield helpers_1.runWithServer((request, app) => __awaiter(this, void 0, void 0, function* () {
        let response = yield request.login('voiceMessages3');
        t.true(response.ok);
        const user = yield index_1.models.user.findOne({ userName: 'voiceMessages3' }).exec();
        yield index_1.models.voiceMailMessage.remove({ user: user.id });
        const message = new index_1.models.voiceMailMessage({
            startTime: '2016-06-30T10:00:00Z',
            endTime: '2016-06-30T10:01:00Z',
            mediaUrl: 'http://loclahost/file2',
            from: 'fr2',
            user: user.id
        });
        yield message.save();
        response = (yield request.delete(`/voiceMessages/${message.id}`).set('Authorization', `Bearer ${response.body.token}`));
        t.true(response.ok);
        const m = yield index_1.models.voiceMailMessage.findById(message.id.toString()).exec();
        t.falsy(m);
    }));
}));
ava_1.default.serial(`GET '/voiceMessagesStream should listen to server side events`, (t) => __awaiter(this, void 0, void 0, function* () {
    yield helpers_1.runWithServer((request, app, server) => __awaiter(this, void 0, void 0, function* () {
        let response = yield request.login('voiceMessages4');
        t.true(response.ok);
        const user = yield index_1.models.user.findOne({ userName: 'voiceMessages4' }).exec();
        const token = yield (jwt.sign).promise(user.id, routes_1.jwtToken, {});
        response = (yield request.get(`/voiceMessagesStream?token=${token}`).set('Authorization', `Bearer ${response.body.token}`));
        t.true(response.ok);
        t.is(response.type, 'text/event-stream');
    }));
}));
ava_1.default.serial(`GET '/voiceMessagesStream should fail for missing token`, (t) => __awaiter(this, void 0, void 0, function* () {
    yield helpers_1.runWithServer((request, app) => __awaiter(this, void 0, void 0, function* () {
        let response = yield request.login('voiceMessages5');
        t.true(response.ok);
        const user = yield index_1.models.user.findOne({ userName: 'voiceMessages5' }).exec();
        response = (yield request.get(`/voiceMessagesStream`).set('Authorization', `Bearer ${response.body.token}`));
        t.false(response.ok);
    }));
}));
ava_1.default.serial(`GET '/voiceMessagesStream should fail for invalid token`, (t) => __awaiter(this, void 0, void 0, function* () {
    yield helpers_1.runWithServer((request, app) => __awaiter(this, void 0, void 0, function* () {
        let response = yield request.login('voiceMessages6');
        t.true(response.ok);
        const user = yield index_1.models.user.findOne({ userName: 'voiceMessages6' }).exec();
        response = (yield request.get(`/voiceMessagesStream?token=123456`).set('Authorization', `Bearer ${response.body.token}`));
        t.false(response.ok);
    }));
}));
ava_1.default.serial(`GET '/voiceMessagesStream should listen to server side events`, (t) => __awaiter(this, void 0, void 0, function* () {
    yield helpers_1.runWithServer((request, app) => __awaiter(this, void 0, void 0, function* () {
        let response = yield request.login('voiceMessages7');
        t.true(response.ok);
        const user = yield index_1.models.user.findOne({ userName: 'voiceMessages7' }).exec();
        const token = yield (jwt.sign).promise(user.id, routes_1.jwtToken, {});
        let sseCalled = false;
        class MockWritable extends stream_1.Writable {
            _write(chunk, encoding, callback) {
                const text = chunk.toString();
                if (text !== '\n') {
                    t.is(text, 'data: {"id":"id","message":"message"}\n\n');
                }
                sseCalled = true;
                callback();
            }
        }
        yield new Promise((resolve, reject) => {
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
    }));
}));
ava_1.default.serial(`GET '/voiceMessagesStream should fail for non-exists user`, (t) => __awaiter(this, void 0, void 0, function* () {
    yield helpers_1.runWithServer((request, app, server) => __awaiter(this, void 0, void 0, function* () {
        const user = yield helpers_1.createUser('voiceMessages8');
        const id = user.id;
        yield user.remove();
        const token = yield (jwt.sign).promise(id, routes_1.jwtToken, {});
        const response = (yield request.get(`/voiceMessagesStream?token=${token}`).set('Authorization', `Bearer ${token}`));
        t.false(response.ok);
    }));
}));
ava_1.default(`POST '/recordGreeting' should make call callback`, (t) => __awaiter(this, void 0, void 0, function* () {
    yield helpers_1.runWithServer((request, app) => __awaiter(this, void 0, void 0, function* () {
        let response = yield request.login('recordGreeting');
        t.true(response.ok);
        const stub = sinon.stub(app.api, 'createCall').returns(Promise.resolve('callId'));
        const user = yield index_1.models.user.findOne({ userName: 'recordGreeting' }).exec();
        response = (yield request.post(`/recordGreeting`).set('Authorization', `Bearer ${response.body.token}`));
        t.true(response.ok);
        t.true(stub.called);
        t.is(stub.lastCall.args[0].from, '+1234567890');
        t.is(stub.lastCall.args[0].to, 'sip:test@test.net');
    }));
}));
ava_1.default(`POST '/callCallback' should handle outgoing call`, (t) => __awaiter(this, void 0, void 0, function* () {
    yield helpers_1.runWithServer((request, app) => __awaiter(this, void 0, void 0, function* () {
        const stub = sinon.stub(app.api, 'transferCall')
            .withArgs('callID', '+1472583690', '+1234567890')
            .returns(Promise.resolve());
        const user = yield helpers_1.createUser('ouser1');
        yield index_1.models.user.update({ _id: user.id }, { $set: { sipUri: 'sip:otest@test.com' } });
        const response = (yield request.post(`/callCallback`).send({
            callId: 'callID',
            eventType: 'answer',
            from: 'sip:otest@test.com',
            to: '+1472583690'
        }));
        t.true(response.ok);
        t.true(stub.called);
    }));
}));
ava_1.default(`POST '/callCallback' should handle incoming call`, (t) => __awaiter(this, void 0, void 0, function* () {
    yield helpers_1.runWithServer((request, app, server) => __awaiter(this, void 0, void 0, function* () {
        const stub1 = sinon.stub(app.api, 'playAudioToCall')
            .withArgs('callID', routes_1.tonesURL, true, '')
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
        const user = yield helpers_1.createUser('iuser1');
        yield index_1.models.user.update({ _id: user.id }, { $set: { sipUri: 'sip:itest@test.com', phoneNumber: '+1234567891' } });
        const response = (yield request.post(`/callCallback`).send({
            callId: 'callID',
            eventType: 'answer',
            from: '+1472583690',
            to: '+1234567891'
        }));
        t.true(response.ok);
        t.true(stub1.called);
        t.true(stub2.called);
        t.true(stub3.called);
    }));
}));
ava_1.default(`POST '/callCallback' should handle incoming call (from sip account)`, (t) => __awaiter(this, void 0, void 0, function* () {
    yield helpers_1.runWithServer((request, app, server) => __awaiter(this, void 0, void 0, function* () {
        const stub1 = sinon.stub(app.api, 'playAudioToCall')
            .withArgs('callID', routes_1.tonesURL, true, '')
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
        const user = yield helpers_1.createUser('iuser2');
        yield index_1.models.user.update({ _id: user.id }, { $set: { sipUri: 'sip:itest2@test.com', phoneNumber: '+1234567892' } });
        const user2 = yield helpers_1.createUser('iuser3');
        yield index_1.models.user.update({ _id: user2.id }, { $set: { sipUri: 'sip:itest3@test.com', phoneNumber: '+1234567893' } });
        const response = (yield request.post(`/callCallback`).send({
            callId: 'callID',
            eventType: 'answer',
            from: 'sip:itest3@test.com',
            to: '+1234567892'
        }));
        t.true(response.ok);
        t.true(stub1.called);
        t.true(stub2.called);
        t.true(stub3.called);
    }));
}));
ava_1.default(`POST '/callCallback' should do nothing if user is not found`, (t) => __awaiter(this, void 0, void 0, function* () {
    yield helpers_1.runWithServer((request, app, server) => __awaiter(this, void 0, void 0, function* () {
        const response = (yield request.post(`/callCallback`).send({
            callId: 'callID',
            eventType: 'answer',
            from: '+1112583690',
            to: '+1114567891'
        }));
        t.true(response.ok);
    }));
}));
ava_1.default(`POST '/callCallback' should handle call for second leg`, (t) => __awaiter(this, void 0, void 0, function* () {
    yield helpers_1.runWithServer((request, app, server) => __awaiter(this, void 0, void 0, function* () {
        const stub1 = sinon.stub(app.api, 'stopPlayAudioToCall')
            .withArgs('callID')
            .returns(Promise.resolve());
        const response = (yield request.post(`/callCallback`).send({
            callId: 'anotherCallID',
            eventType: 'answer',
            from: '+1472583690',
            to: '+1234567891',
            tag: 'AnotherLeg:callID'
        }));
        t.true(response.ok);
        t.true(stub1.called);
    }));
}));
ava_1.default(`POST '/callCallback' should handle ending of playback (after greeting)`, (t) => __awaiter(this, void 0, void 0, function* () {
    yield helpers_1.runWithServer((request, app, server) => __awaiter(this, void 0, void 0, function* () {
        const stub1 = sinon.stub(app.api, 'playAudioToCall')
            .withArgs('callID', routes_1.beepURL, false, 'Beep')
            .returns(Promise.resolve());
        const response = (yield request.post(`/callCallback`).send({
            callId: 'callID',
            eventType: 'speak',
            status: 'done',
            tag: 'Greeting'
        }));
        t.true(response.ok);
        t.true(stub1.called);
    }));
}));
ava_1.default(`POST '/callCallback' should handle ending of playback (after beep)`, (t) => __awaiter(this, void 0, void 0, function* () {
    yield helpers_1.runWithServer((request, app, server) => __awaiter(this, void 0, void 0, function* () {
        const stub1 = sinon.stub(app.api, 'updateCall')
            .withArgs('callID', { recordingEnabled: true })
            .returns(Promise.resolve());
        const response = (yield request.post(`/callCallback`).send({
            callId: 'callID',
            eventType: 'speak',
            status: 'done',
            tag: 'Beep'
        }));
        t.true(response.ok);
        t.true(stub1.called);
    }));
}));
ava_1.default(`POST '/callCallback' should handle timeout (play default greeting) for second leg`, (t) => __awaiter(this, void 0, void 0, function* () {
    yield helpers_1.runWithServer((request, app, server) => __awaiter(this, void 0, void 0, function* () {
        const stub1 = sinon.stub(app.api, 'stopPlayAudioToCall')
            .withArgs('tcallID')
            .returns(Promise.resolve());
        const stub2 = sinon.stub(app.api, 'speakSentenceToCall')
            .withArgs('tcallID', 'Hello. Please leave a message after beep.', 'Greeting')
            .returns(Promise.resolve());
        const user = yield helpers_1.createUser('tuser1');
        yield index_1.models.user.update({ _id: user.id }, { $set: { sipUri: 'sip:ttest@test.com', phoneNumber: '+1324567891' } });
        yield index_1.models.activeCall.remove({ callId: 'tcallID' });
        yield index_1.models.activeCall.create({ callId: 'tcallID', user: user.id });
        const response = (yield request.post(`/callCallback`).send({
            callId: 'anotherCallID',
            eventType: 'timeout',
            tag: 'AnotherLeg:tcallID'
        }));
        t.true(response.ok);
        t.true(stub1.called);
        t.true(stub2.called);
    }));
}));
ava_1.default(`POST '/callCallback' should handle timeout (play user's greeting) for second leg`, (t) => __awaiter(this, void 0, void 0, function* () {
    yield helpers_1.runWithServer((request, app, server) => __awaiter(this, void 0, void 0, function* () {
        const stub1 = sinon.stub(app.api, 'stopPlayAudioToCall')
            .withArgs('t2callID')
            .returns(Promise.resolve());
        const stub2 = sinon.stub(app.api, 'playAudioToCall')
            .withArgs('t2callID', 'url', false, 'Greeting')
            .returns(Promise.resolve());
        const user = yield helpers_1.createUser('tuser2');
        yield index_1.models.user.update({ _id: user.id }, { $set: { sipUri: 'sip:t2test@test.com', phoneNumber: '+1324567892', greetingUrl: 'url' } });
        yield index_1.models.activeCall.remove({ callId: 't2callID' });
        yield index_1.models.activeCall.create({ callId: 't2callID', user: user.id });
        const response = (yield request.post(`/callCallback`).send({
            callId: 'anotherCallID',
            eventType: 'timeout',
            tag: 'AnotherLeg:t2callID'
        }));
        t.true(response.ok);
        t.true(stub1.called);
        t.true(stub2.called);
    }));
}));
ava_1.default(`POST '/callCallback' should handle completed recording`, (t) => __awaiter(this, void 0, void 0, function* () {
    yield helpers_1.runWithServer((request, app, server) => __awaiter(this, void 0, void 0, function* () {
        const user = yield helpers_1.createUser('ruser1');
        const stub1 = sinon.stub(app.api, 'getRecording')
            .withArgs('recordingID')
            .returns(Promise.resolve({
            media: 'url',
            startTime: '2016-07-04T10:40:00Z',
            endTime: '2016-07-04T10:41:00Z',
        }));
        const stub2 = sinon.stub(app.api, 'getCall')
            .withArgs('rcallID')
            .returns(Promise.resolve({ from: '+1234567891' }));
        const stub3 = sinon.stub(PubSub, 'publish');
        try {
            yield index_1.models.activeCall.remove({ callId: 'rcallID' });
            yield index_1.models.activeCall.create({ callId: 'rcallID', user: user.id });
            const response = (yield request.post(`/callCallback`).send({
                callId: 'rcallID',
                eventType: 'recording',
                state: 'complete',
                recordingId: 'recordingID'
            }));
            t.true(response.ok);
            t.true(stub1.called);
            t.true(stub2.called);
            t.true(stub3.called);
        }
        finally {
            stub3.restore();
        }
    }));
}));
ava_1.default(`POST '/callCallback' should handle hangup of completed calls`, (t) => __awaiter(this, void 0, void 0, function* () {
    yield helpers_1.runWithServer((request, app, server) => __awaiter(this, void 0, void 0, function* () {
        const user = yield helpers_1.createUser('cuser1');
        yield index_1.models.activeCall.remove({ callId: 'ccallID' });
        yield index_1.models.activeCall.remove({ callId: 'ccallID1' });
        yield index_1.models.activeCall.remove({ callId: 'ccallID2' });
        yield index_1.models.activeCall.create({ callId: 'ccallID', bridgeId: 'bridgeID', user: user.id });
        yield index_1.models.activeCall.create({ callId: 'ccallID1', bridgeId: 'bridgeID', user: user.id });
        yield index_1.models.activeCall.create({ callId: 'ccallID2', bridgeId: 'bridgeID', user: user.id });
        const stub1 = sinon.stub(app.api, 'hangup')
            .withArgs('ccallID1').returns(Promise.resolve())
            .withArgs('ccallID2').returns(Promise.resolve());
        const response = (yield request.post(`/callCallback`).send({
            callId: 'ccallID',
            eventType: 'hangup'
        }));
        t.true(response.ok);
        t.true(stub1.called);
    }));
}));
ava_1.default(`POST '/callCallback' should do nothing on hangup of other calls`, (t) => __awaiter(this, void 0, void 0, function* () {
    yield helpers_1.runWithServer((request, app, server) => __awaiter(this, void 0, void 0, function* () {
        const response = (yield request.post(`/callCallback`).send({
            callId: 'c2callID',
            eventType: 'hangup'
        }));
        t.true(response.ok);
    }));
}));
ava_1.default(`POST '/recordCallback' should play voice menu on answer`, (t) => __awaiter(this, void 0, void 0, function* () {
    yield helpers_1.runWithServer((request, app) => __awaiter(this, void 0, void 0, function* () {
        const stub = sinon.stub(app.api, 'createGather').returns(Promise.resolve({
            maxDigits: 1,
            interDigitTimeout: 30,
            prompt: {
                sentence: 'Press 1 to listen to your current greeting. Press 2 to record new greeting. Press 3 to set greeting to default.'
            },
            tag: 'mainMenu'
        }));
        const response = (yield request.post(`/recordCallback`).send({
            eventType: 'answer'
        }));
        t.true(response.ok);
        t.true(stub.called);
    }));
}));
ava_1.default(`POST '/recordCallback' should play greeting on press 1`, (t) => __awaiter(this, void 0, void 0, function* () {
    yield helpers_1.runWithServer((request, app) => __awaiter(this, void 0, void 0, function* () {
        const stub = sinon.stub(app.api, 'speakSentenceToCall')
            .withArgs('rccallID', 'Hello. Please leave a message after beep.', 'Greeting')
            .returns(Promise.resolve());
        const user = yield helpers_1.createUser('rcuser1');
        yield index_1.models.activeCall.remove({ callId: 'rccallID' });
        yield index_1.models.activeCall.create({ callId: 'rccallID', user: user.id });
        const response = (yield request.post(`/recordCallback`).send({
            eventType: 'gather',
            tag: 'mainMenu',
            digits: '1',
            callId: 'rccallID',
            state: 'completed'
        }));
        t.true(response.ok);
        t.true(stub.called);
    }));
}));
ava_1.default(`POST '/recordCallback' should start greeting recording on press 2`, (t) => __awaiter(this, void 0, void 0, function* () {
    yield helpers_1.runWithServer((request, app) => __awaiter(this, void 0, void 0, function* () {
        const stub = sinon.stub(app.api, 'speakSentenceToCall')
            .withArgs('rccallID2', 'Say your greeting after beep. Press 0 to complete recording.', 'PlayBeep')
            .returns(Promise.resolve());
        const user = yield helpers_1.createUser('rcuser2');
        yield index_1.models.activeCall.remove({ callId: 'rccallID2' });
        yield index_1.models.activeCall.create({ callId: 'rccallID2', user: user.id });
        const response = (yield request.post(`/recordCallback`).send({
            eventType: 'gather',
            tag: 'mainMenu',
            digits: '2',
            callId: 'rccallID2',
            state: 'completed'
        }));
        t.true(response.ok);
        t.true(stub.called);
    }));
}));
ava_1.default(`POST '/recordCallback' should reset greeting on press 3`, (t) => __awaiter(this, void 0, void 0, function* () {
    yield helpers_1.runWithServer((request, app) => __awaiter(this, void 0, void 0, function* () {
        const stub = sinon.stub(app.api, 'speakSentenceToCall')
            .withArgs('rccallID3', 'Your greeting has been set to default.', 'PlayMenu')
            .returns(Promise.resolve());
        let user = yield helpers_1.createUser('rcuser3');
        yield index_1.models.user.update({ _id: user.id }, { $set: { greetingUrl: 'url' } });
        yield index_1.models.activeCall.remove({ callId: 'rccallID3' });
        yield index_1.models.activeCall.create({ callId: 'rccallID3', user: user.id });
        user = yield index_1.models.user.findById(user.id.toString()).exec();
        t.truthy(user.greetingUrl);
        const response = (yield request.post(`/recordCallback`).send({
            eventType: 'gather',
            tag: 'mainMenu',
            digits: '3',
            callId: 'rccallID3',
            state: 'completed'
        }));
        t.true(response.ok);
        t.true(stub.called);
        user = yield index_1.models.user.findById(user.id.toString()).exec();
        t.falsy(user.greetingUrl);
    }));
}));
ava_1.default(`POST '/recordCallback' should stop recording on 0`, (t) => __awaiter(this, void 0, void 0, function* () {
    yield helpers_1.runWithServer((request, app) => __awaiter(this, void 0, void 0, function* () {
        const stub = sinon.stub(app.api, 'updateCall')
            .withArgs('rccallID3', { recordingEnabled: false })
            .returns(Promise.resolve());
        const response = (yield request.post(`/recordCallback`).send({
            eventType: 'gather',
            tag: 'GreetingRecording',
            digits: '0',
            callId: 'rccallID3',
            state: 'completed'
        }));
        t.true(response.ok);
        t.true(stub.called);
    }));
}));
ava_1.default(`POST '/recordCallback' should write recording on complete`, (t) => __awaiter(this, void 0, void 0, function* () {
    yield helpers_1.runWithServer((request, app) => __awaiter(this, void 0, void 0, function* () {
        const stub = sinon.stub(app.api, 'speakSentenceToCall')
            .withArgs('rccallID5', 'Your greeting has been saved.', 'PlayMenu')
            .returns(Promise.resolve());
        const stub1 = sinon.stub(app.api, 'getRecording')
            .withArgs('recordingID')
            .returns(Promise.resolve({
            media: 'url'
        }));
        const stub2 = sinon.stub(app.api, 'getCall')
            .withArgs('rccallID5')
            .returns(Promise.resolve({
            state: 'active'
        }));
        let user = yield helpers_1.createUser('rcuser5');
        yield index_1.models.activeCall.remove({ callId: 'rccallID5' });
        yield index_1.models.activeCall.create({ callId: 'rccallID5', user: user.id });
        const response = (yield request.post(`/recordCallback`).send({
            eventType: 'recording',
            state: 'complete',
            callId: 'rccallID5',
            recordingId: 'recordingID'
        }));
        t.true(response.ok);
        t.true(stub.called);
        t.true(stub1.called);
        t.true(stub2.called);
        user = yield index_1.models.user.findById(user.id.toString()).exec();
        t.is(user.greetingUrl, 'url');
    }));
}));
ava_1.default(`POST '/recordCallback' should do nothing for non-completed recording`, (t) => __awaiter(this, void 0, void 0, function* () {
    yield helpers_1.runWithServer((request, app) => __awaiter(this, void 0, void 0, function* () {
        const response = (yield request.post(`/recordCallback`).send({
            eventType: 'recording',
            state: 'start',
            callId: 'rccallID51',
            recordingId: 'recordingID'
        }));
        t.true(response.ok);
    }));
}));
ava_1.default(`POST '/recordCallback' should handle complete of speak (play beep)`, (t) => __awaiter(this, void 0, void 0, function* () {
    yield helpers_1.runWithServer((request, app) => __awaiter(this, void 0, void 0, function* () {
        const stub = sinon.stub(app.api, 'playAudioToCall')
            .withArgs('rccallID6', routes_1.beepURL, false, 'Beep')
            .returns(Promise.resolve());
        const response = (yield request.post(`/recordCallback`).send({
            eventType: 'speak',
            tag: 'PlayBeep',
            status: 'done',
            callId: 'rccallID6'
        }));
        t.true(response.ok);
        t.true(stub.called);
    }));
}));
ava_1.default(`POST '/recordCallback' should handle complete of speak (play greeting)`, (t) => __awaiter(this, void 0, void 0, function* () {
    yield helpers_1.runWithServer((request, app) => __awaiter(this, void 0, void 0, function* () {
        const stub = sinon.stub(app.api, 'updateCall')
            .withArgs('rccallID7', { recordingEnabled: true })
            .returns(Promise.resolve());
        const stub1 = sinon.stub(app.api, 'createGather')
            .withArgs('rccallID7', {
            maxDigits: 1,
            interDigitTimeout: 30,
            tag: 'GreetingRecording'
        })
            .returns(Promise.resolve());
        const response = (yield request.post(`/recordCallback`).send({
            eventType: 'speak',
            tag: 'Beep',
            status: 'done',
            callId: 'rccallID7'
        }));
        t.true(response.ok);
        t.true(stub.called);
    }));
}));
ava_1.default(`POST '/recordCallback' should handle complete of speak (default: play voice menu)`, (t) => __awaiter(this, void 0, void 0, function* () {
    yield helpers_1.runWithServer((request, app) => __awaiter(this, void 0, void 0, function* () {
        const stub = sinon.stub(app.api, 'createGather').returns(Promise.resolve({
            maxDigits: 1,
            interDigitTimeout: 30,
            prompt: {
                sentence: 'Press 1 to listen to your current greeting. Press 2 to record new greeting. Press 3 to set greeting to default.'
            },
            tag: 'mainMenu'
        }));
        const response = (yield request.post(`/recordCallback`).send({
            eventType: 'speak',
            status: 'done',
            callId: 'rccallID8'
        }));
        t.true(response.ok);
        t.true(stub.called);
    }));
}));
ava_1.default(`GET '/' should return status 200`, () => __awaiter(this, void 0, void 0, function* () {
    yield helpers_1.runWithServer((request) => __awaiter(this, void 0, void 0, function* () {
        yield request.get('/')
            .expect(200);
    }));
}));
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicm91dGVzLnRlc3QuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyJyb3V0ZXMudGVzdC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7QUFBQSxzQkFBaUIsS0FBSyxDQUFDLENBQUE7QUFDdkIsMEJBQW9ELFdBQVcsQ0FBQyxDQUFBO0FBRWhFLE1BQVksS0FBSyxXQUFNLE9BQU8sQ0FBQyxDQUFBO0FBQy9CLHlCQUFpQyxRQUFRLENBQUMsQ0FBQTtBQUMxQyxNQUFZLEdBQUcsV0FBTSxjQUFjLENBQUMsQ0FBQTtBQUNwQyxNQUFZLE1BQU0sV0FBTSxXQUFXLENBQUMsQ0FBQTtBQUNwQyx5QkFBK0UsZUFBZSxDQUFDLENBQUE7QUFDL0Ysd0JBQXFCLGNBQWMsQ0FBQyxDQUFBO0FBRXBDLHVCQUFjLENBQUMsU0FBUyxDQUFDLEtBQUssR0FBRyxVQUFVLElBQUk7SUFDOUMsVUFBVSxDQUFDLE1BQU0sSUFBSSxDQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsRUFBRSxHQUFHLENBQUMsQ0FBQztBQUN6QyxDQUFDLENBQUM7QUFFRixhQUFJLENBQUMsdUNBQXVDLEVBQUUsQ0FBQyxDQUFDO0lBQy9DLE1BQU0sTUFBTSxHQUFHLGdCQUFTLENBQUMsSUFBSSxFQUFFLElBQUksRUFBRSxJQUFJLENBQUMsQ0FBQztJQUMzQyxDQUFDLENBQUMsTUFBTSxDQUFDLE1BQU0sQ0FBQyxDQUFDO0FBQ2xCLENBQUMsQ0FBQyxDQUFDO0FBRUgsYUFBSSxDQUFDLDZDQUE2QyxFQUFFLENBQU8sQ0FBQztJQUMzRCxNQUFNLHVCQUFhLENBQUMsQ0FBTyxPQUFtQjtRQUM3QyxNQUFNLFFBQVEsR0FBRyxNQUFNLE9BQU8sQ0FBQyxLQUFLLENBQUMsUUFBUSxDQUFDLENBQUM7UUFDL0MsQ0FBQyxDQUFDLElBQUksQ0FBQyxRQUFRLENBQUMsRUFBRSxDQUFDLENBQUM7UUFDcEIsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxRQUFRLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxD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LE1BQU0sQ0FBQyxHQUFHLENBQUMsQ0FBQztJQUNkLENBQUMsQ0FBQSxDQUFDLENBQUM7QUFDSixDQUFDLENBQUEsQ0FBQyxDQUFDIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0IHRlc3QgZnJvbSAnYXZhJztcbmltcG9ydCB7cnVuV2l0aFNlcnZlciwgSVN1cGVyVGVzdCwgY3JlYXRlVXNlcn0gZnJvbSAnLi9oZWxwZXJzJztcbmltcG9ydCB7UmVzcG9uc2V9IGZyb20gJ3N1cGVydGVzdCc7XG5pbXBvcnQgKiBhcyBzaW5vbiBmcm9tICdzaW5vbic7XG5pbXBvcnQge1JlYWRhYmxlLCBXcml0YWJsZX0gZnJvbSAnc3RyZWFtJztcbmltcG9ydCAqIGFzIGp3dCBmcm9tICdqc29ud2VidG9rZW4nO1xuaW1wb3J0ICogYXMgUHViU3ViIGZyb20gJ3B1YnN1Yi1qcyc7XG5pbXBvcnQgZ2V0Um91dGVyLCB7SUNvbnRleHQsIGp3dFRva2VuLCBTaW1wbGVSZWFkYWJsZSwgdG9uZXNVUkwsIGJlZXBVUkx9IGZyb20gJy4uL3NyYy9yb3V0ZXMnO1xuaW1wb3J0IHttb2RlbHN9IGZyb20gJy4uL3NyYy9pbmRleCc7XG5cblNpbXBsZVJlYWRhYmxlLnByb3RvdHlwZS5fcmVhZCA9IGZ1bmN0aW9uIChzaXplKSB7XG5cdHNldFRpbWVvdXQoKCkgPT4gdGhpcy5lbWl0KCdlbmQnKSwgNTAwKTtcbn07XG5cbnRlc3QoYGdldFJvdXRlciBzaHB1bGQgcmV0dXJuIHJvdXRlciBvYmplY3RgLCAodCkgPT4ge1xuXHRjb25zdCByb3V0ZXIgPSBnZXRSb3V0ZXIobnVsbCwgbnVsbCwgbnVsbCk7XG5cdHQudHJ1dGh5KHJvdXRlcik7XG59KTtcblxudGVzdChgUE9TVCAnL2xvZ2luJyBzaG91bGQgbG9naW4gd2l0aCBleGlzdHMgdXNlcmAsIGFzeW5jICh0KSA9PiB7XG5cdGF3YWl0IHJ1bldpdGhTZXJ2ZXIoYXN5bmMgKHJlcXVlc3Q6IElTdXBlclRlc3QpID0+IHtcblx0XHRjb25zdCByZXNwb25zZSA9IGF3YWl0IHJlcXVlc3QubG9naW4oJ2xvZ2luMScpO1xuXHRcdHQudHJ1ZShyZXNwb25zZS5vayk7XG5cdFx0dC50cnV0aHkocmVzcG9uc2UuYm9keS50b2tlbik7XG5cdFx0dC50cnV0aHkocmVzcG9uc2UuYm9keS5leHBpcmUpO1xuXHR9KTtcbn0pO1xuXG50ZXN0KGBQT1NUICcvbG9naW4nIHNob3VsZCBmYWlsIHdpdGggbm9uLWV4aXN0cyB1c2VyYCwgYXN5bmMgKHQpID0+IHtcblx0YXdhaXQgcnVuV2l0aFNlcnZlcihhc3luYyAocmVxdWVzdDogSVN1cGVyVGVzdCkgPT4ge1xuXHRcdGNvbnN0IHJlc3BvbnNlID0gYXdhaXQgcmVxdWVzdC5sb2dpbignbG9naW4yJywgdHJ1ZSk7XG5cdFx0dC5mYWxzZShyZXNwb25zZS5vayk7XG5cdH0pO1xufSk7XG5cbnRlc3QoYFBPU1QgJy9sb2dpbicgc2hvdWxkIGZhaWwgZm9yIHdyb25nIHBhc3N3b3JkYCwgYXN5bmMgKHQpID0+IHtcblx0YXdhaXQgbW9kZWxzLnVzZXIucmVtb3ZlKHsgdXNlck5hbWU6ICdsb2dpbjMnIH0pO1xuXHRjb25zdCB1c2VyID0gbmV3IG1vZGVscy51c2VyKHtcblx0XHR1c2VyTmFtZTogJ2xvZ2luMycsXG5cdFx0YXJlYUNvZGU6ICc5MTAnLFxuXHRcdHBob25lTnVtYmVyOiAnKzEyMzQ1Njc4OTAnLFxuXHRcdGVuZHBvaW50SWQ6ICdlbmRwb2ludElkJyxcblx0XHRzaXBVcmk6ICd0ZXN0QHRlc3QubmV0Jyxcblx0XHRzaXBQYXNzd29yZDogJzEyMzQ1NicsXG5cdH0pO1xuXHRhd2FpdCB1c2VyLnNldFBhc3N3b3JkKCcwMDAwMDAnKTtcblx0YXdhaXQgdXNlci5zYXZlKCk7XG5cdGF3YWl0IHJ1bldpdGhTZXJ2ZXIoYXN5bmMgKHJlcXVlc3Q6IElTdXBlclRlc3QpID0+IHtcblx0XHRjb25zdCByZXNwb25zZSA9IGF3YWl0IHJlcXVlc3QubG9naW4oJ2xvZ2luMycsIHRydWUpO1xuXHRcdHQuZmFsc2UocmVzcG9uc2Uub2spO1xuXHR9KTtcbn0pO1xuXG50ZXN0KGBQT1NUICcvbG9naW4nIHNob3VsZCBmYWlsIGlmIGFueSBhdXRoIGRhdGEgbWlzc2luZ2AsIGFzeW5jICgpID0+IHtcblx0YXdhaXQgcnVuV2l0aFNlcnZlcihhc3luYyAocmVxdWVzdDogSVN1cGVyVGVzdCkgPT4ge1xuXHRcdGF3YWl0IHJlcXVlc3QucG9zdCgnL2xvZ2luJykuc2VuZCh7fSkuZXhwZWN0KDQwMCk7XG5cdH0pO1xufSk7XG5cbnRlc3QoYFBPU1QgJy9yZWdpc3Rlcicgc2hvdWxkIHJlZ2lzdGVyIG5ldyB1c2VyYCwgYXN5bmMgKHQpID0+IHtcblx0YXdhaXQgcnVuV2l0aFNlcnZlcihhc3luYyAocmVxdWVzdCwgYXBwKSA9PiB7XG5cdFx0YXdhaXQgbW9kZWxzLnVzZXIucmVtb3ZlKHsgdXNlck5hbWU6ICdyZWdpc3RlcjEnIH0pO1xuXHRcdGNvbnN0IHN0dWIxID0gc2lub24uc3R1YihhcHAuYXBpLCAnY3JlYXRlUGhvbmVOdW1iZXInKS5yZXR1cm5zKFByb21pc2UucmVzb2x2ZSgnKzEyMzQ1Njc4OTAnKSk7XG5cdFx0Y29uc3Qgc3R1YjIgPSBzaW5vbi5zdHViKGFwcC5hcGksICdjcmVhdGVTSVBBY2NvdW50JykucmV0dXJucyhQcm9taXNlLnJlc29sdmUoeyBlbmRwb2ludElkOiAnZW5kcG9pbnRJZCcsIHVyaTogJ3VyaScsIHBhc3N3b3JkOiAncGFzc3dvcmQnIH0pKTtcblx0XHRjb25zdCByZXNwb25zZSA9IDxSZXNwb25zZT48YW55Pihhd2FpdCByZXF1ZXN0LnBvc3QoJy9yZWdpc3RlcicpLnNlbmQoeyB1c2VyTmFtZTogJ3JlZ2lzdGVyMScsIHBhc3N3b3JkOiAnMTIzNDU2JywgcmVwZWF0UGFzc3dvcmQ6ICcxMjM0NTYnLCBhcmVhQ29kZTogJzkxMCcgfSkpO1xuXHRcdHQudHJ1ZShyZXNwb25zZS5vayk7XG5cdFx0dC50cnVlKHN0dWIxLmNhbGxlZCk7XG5cdFx0dC5pcyhzdHViMS5sYXN0Q2FsbC5hcmdzWzFdLCAnOTEwJyk7XG5cdFx0dC50cnVlKHN0dWIyLmNhbGxlZCk7XG5cdFx0Y29uc3QgdXNlciA9IGF3YWl0IG1vZGVscy51c2VyLmZpbmRPbmUoeyB1c2VyTmFtZTogJ3JlZ2lzdGVyMScgfSkuZXhlYygpO1xuXHRcdHQudHJ1dGh5KHVzZXIpO1xuXHR9KTtcbn0pO1xuXG50ZXN0KGBQT1NUICcvcmVnaXN0ZXInIHNob3VsZCBmYWlsIGlmIHVzZXIgZXhpc3RzIGFscmVhZHlgLCBhc3luYyAodCkgPT4ge1xuXHRhd2FpdCBydW5XaXRoU2VydmVyKGFzeW5jIChyZXF1ZXN0LCBhcHApID0+IHtcblx0XHRhd2FpdCBtb2RlbHMudXNlci5yZW1vdmUoeyB1c2VyTmFtZTogJ3JlZ2lzdGVyMTEnIH0pO1xuXHRcdGNvbnN0IHVzZXIgPSBuZXcgbW9kZWxzLnVzZXIoe1xuXHRcdFx0dXNlck5hbWU6ICdyZWdpc3RlcjExJyxcblx0XHRcdGFyZWFDb2RlOiAnOTEwJyxcblx0XHRcdHBob25lTnVtYmVyOiAnKzEyMzQ1Njc4MTEnLFxuXHRcdFx0ZW5kcG9pbnRJZDogJ2VuZHBvaW50SWQnLFxuXHRcdFx0c2lwVXJpOiAndGVzdEB0ZXN0Lm5ldCcsXG5cdFx0XHRzaXBQYXNzd29yZDogJzEyMzQ1NicsXG5cdFx0fSk7XG5cdFx0YXdhaXQgdXNlci5zZXRQYXNzd29yZCgnMDAwMDAwJyk7XG5cdFx0YXdhaXQgdXNlci5zYXZlKCk7XG5cdFx0Y29uc3QgcmVzcG9uc2UgPSA8UmVzcG9uc2U+PGFueT4oYXdhaXQgcmVxdWVzdC5wb3N0KCcvcmVnaXN0ZXInKS5zZW5kKHsgdXNlck5hbWU6ICdyZWdpc3RlcjExJywgcGFzc3dvcmQ6ICcxMjM0NTYnLCByZXBlYXRQYXNzd29yZDogJzEyMzQ1NicsIGFyZWFDb2RlOiAnOTEwJyB9KSk7XG5cdFx0dC5mYWxzZShyZXNwb25zZS5vayk7XG5cdH0pO1xufSk7XG5cbnRlc3QoYFBPU1QgJy9yZWdpc3Rlcicgc2hvdWxkIGZhaWwgaWYgcmVxdWlyZWQgZmllbGRzIG1pc3NpbmdgLCBhc3luYyAodCkgPT4ge1xuXHRhd2FpdCBydW5XaXRoU2VydmVyKGFzeW5jIChyZXF1ZXN0LCBhcHApID0+IHtcblx0XHRhd2FpdCBtb2RlbHMudXNlci5yZW1vdmUoeyB1c2VyTmFtZTogJ3JlZ2lzdGVyMicgfSk7XG5cdFx0Y29uc3QgcmVzcG9uc2UgPSA8UmVzcG9uc2U+PGFueT4oYXdhaXQgcmVxdWVzdC5wb3N0KCcvcmVnaXN0ZXInKS5zZW5kKHsgdXNlck5hbWU6ICdyZWdpc3RlcjInLCBwYXNzd29yZDogJzEyMzQ1NicgfSkpO1xuXHRcdHQuZmFsc2UocmVzcG9uc2Uub2spO1xuXHRcdGNvbnN0IHVzZXIgPSBhd2FpdCBtb2RlbHMudXNlci5maW5kT25lKHsgdXNlck5hbWU6ICdyZWdpc3RlcjInIH0pLmV4ZWMoKTtcblx0XHR0LmZhbHN5KHVzZXIpO1xuXHR9KTtcbn0pO1xuXG50ZXN0KGBQT1NUICcvcmVnaXN0ZXInIHNob3VsZCBmYWlsIGlmIHBhc3N3b3JkcyBhcmUgbWlzbWF0Y2hlZCBgLCBhc3luYyAodCkgPT4ge1xuXHRhd2FpdCBydW5XaXRoU2VydmVyKGFzeW5jIChyZXF1ZXN0LCBhcHApID0+IHtcblx0XHRhd2FpdCBtb2RlbHMudXNlci5yZW1vdmUoeyB1c2VyTmFtZTogJ3JlZ2lzdGVyMycgfSk7XG5cdFx0Y29uc3QgcmVzcG9uc2UgPSA8UmVzcG9uc2U+PGFueT4oYXdhaXQgcmVxdWVzdC5wb3N0KCcvcmVnaXN0ZXInKS5zZW5kKHsgdXNlck5hbWU6ICdyZWdpc3RlcjMnLCBwYXNzd29yZDogJzEyMzQ1NicsIHJlcGVhdFBhc3N3b3JkOiAnMTIzNDUwJywgYXJlYUNvZGU6ICc5MTAnIH0pKTtcblx0XHR0LmZhbHNlKHJlc3BvbnNlLm9rKTtcblx0XHRjb25zdCB1c2VyID0gYXdhaXQgbW9kZWxzLnVzZXIuZmluZE9uZSh7IHVzZXJOYW1lOiAncmVnaXN0ZXIzJyB9KS5leGVjKCk7XG5cdFx0dC5mYWxzeSh1c2VyKTtcblx0fSk7XG59KTtcblxudGVzdChgR0VUICcvcmVmcmVzaFRva2VuJyBzaG91bGQgcmVmcmVzaCBhdXRoIHRva2VuYCwgYXN5bmMgKHQpID0+IHtcblx0YXdhaXQgcnVuV2l0aFNlcnZlcihhc3luYyAocmVxdWVzdCwgYXBwKSA9PiB7XG5cdFx0bGV0IHJlc3BvbnNlID0gYXdhaXQgcmVxdWVzdC5sb2dpbigncmVmcmVzaFRva2VuMScpO1xuXHRcdHQudHJ1ZShyZXNwb25zZS5vayk7XG5cdFx0cmVzcG9uc2UgPSA8UmVzcG9uc2U+PGFueT4oYXdhaXQgcmVxdWVzdC5nZXQoJy9yZWZyZXNoVG9rZW4nKS5zZXQoJ0F1dGhvcml6YXRpb24nLCBgQmVhcmVyICR7cmVzcG9uc2UuYm9keS50b2tlbn1gKSk7XG5cdFx0dC50cnVlKHJlc3BvbnNlLm9rKTtcblx0XHR0LnRydXRoeShyZXNwb25zZS5ib2R5LnRva2VuKTtcblx0fSk7XG59KTtcblxudGVzdChgR0VUICcvc2lwRGF0YScgc2hvdWxkIHJldHVybiBzaXAgYXV0aCBkYXRhIGZvciB1c2VyYCwgYXN5bmMgKHQpID0+IHtcblx0YXdhaXQgcnVuV2l0aFNlcnZlcihhc3luYyAocmVxdWVzdCwgYXBwKSA9PiB7XG5cdFx0Y29uc3QgY2xvY2sgPSBzaW5vbi51c2VGYWtlVGltZXJzKCk7XG5cdFx0bGV0IHJlc3BvbnNlID0gYXdhaXQgcmVxdWVzdC5sb2dpbignc2lwRGF0YTEnKTtcblx0XHR0LnRydWUocmVzcG9uc2Uub2spO1xuXHRcdGNvbnN0IHN0dWIxID0gc2lub24uc3R1YihhcHAuYXBpLCAnY3JlYXRlU0lQQXV0aFRva2VuJykucmV0dXJucyhQcm9taXNlLnJlc29sdmUoe1xuXHRcdFx0dG9rZW46ICd0b2tlbicsXG5cdFx0XHRleHBpcmVzOiAzNjAwXG5cdFx0fSkpO1xuXHRcdHJlc3BvbnNlID0gPFJlc3BvbnNlPjxhbnk+KGF3YWl0IHJlcXVlc3QuZ2V0KCcvc2lwRGF0YScpLnNldCgnQXV0aG9yaXphdGlvbicsIGBCZWFyZXIgJHtyZXNwb25zZS5ib2R5LnRva2VufWApKTtcblx0XHRjbG9jay5yZXN0b3JlKCk7XG5cdFx0dC50cnVlKHJlc3BvbnNlLm9rKTtcblx0XHR0LnRydWUoc3R1YjEuY2FsbGVkKTtcblx0XHR0LmlzKHN0dWIxLmxhc3RDYWxsLmFyZ3NbMV0sICdlbmRwb2ludElkJyk7XG5cdFx0dC5kZWVwRXF1YWwocmVzcG9uc2UuYm9keSwge1xuXHRcdFx0cGhvbmVOdW1iZXI6ICcrMTIzNDU2Nzg5MCcsXG5cdFx0XHRzaXBVcmk6ICdzaXA6dGVzdEB0ZXN0Lm5ldCcsXG5cdFx0XHRzaXBQYXNzd29yZDogJzEyMzQ1NicsXG5cdFx0XHR0b2tlbjogJ3Rva2VuJyxcblx0XHRcdGV4cGlyZTogJzE5NzAtMDEtMDFUMDE6MDA6MDAuMDAwWidcblx0XHR9KTtcblx0fSk7XG59KTtcblxudGVzdChgR0VUICcvc2lwRGF0YScgc2hvdWxkIGZhaWwgb24gdW5hdXRob3JpemVkIGNhbGxgLCBhc3luYyAodCkgPT4ge1xuXHRhd2FpdCBydW5XaXRoU2VydmVyKGFzeW5jIChyZXF1ZXN0LCBhcHApID0+IHtcblx0XHRjb25zdCByZXNwb25zZSA9IDxSZXNwb25zZT48YW55Pihhd2FpdCByZXF1ZXN0LmdldCgnL3NpcERhdGEnKSk7XG5cdFx0dC5mYWxzZShyZXNwb25zZS5vayk7XG5cdH0pO1xufSk7XG5cbnRlc3QoYEdFVCAnL3ZvaWNlTWVzc2FnZXMnIHNob3VsZCByZXR1cm4gbGlzdCBvZiBtZXNzYWdlc2AsIGFzeW5jICh0KSA9PiB7XG5cdGF3YWl0IHJ1bldpdGhTZXJ2ZXIoYXN5bmMgKHJlcXVlc3QsIGFwcCkgPT4ge1xuXHRcdGxldCByZXNwb25zZSA9IGF3YWl0IHJlcXVlc3QubG9naW4oJ3ZvaWNlTWVzc2FnZXMxJyk7XG5cdFx0dC50cnVlKHJlc3BvbnNlLm9rKTtcblx0XHRjb25zdCB1c2VyID0gYXdhaXQgbW9kZWxzLnVzZXIuZmluZE9uZSh7IHVzZXJOYW1lOiAndm9pY2VNZXNzYWdlczEnIH0pLmV4ZWMoKTtcblx0XHRhd2FpdCBtb2RlbHMudm9pY2VNYWlsTWVzc2FnZS5jcmVhdGUoe1xuXHRcdFx0c3RhcnRUaW1lOiAnMjAxNi0wNi0zMFQxMjowMDowMFonLFxuXHRcdFx0ZW5kVGltZTogJzIwMTYtMDYtMzBUMTI6MDE6MDBaJyxcblx0XHRcdG1lZGlhVXJsOiAndXJsMScsXG5cdFx0XHRmcm9tOiAnZnJvbTEnLFxuXHRcdFx0dXNlcjogdXNlci5pZFxuXHRcdH0sIHtcblx0XHRcdFx0c3RhcnRUaW1lOiAnMjAxNi0wNi0zMFQxMjowMjowMFonLFxuXHRcdFx0XHRlbmRUaW1lOiAnMjAxNi0wNi0zMFQxMjowMzowMFonLFxuXHRcdFx0XHRtZWRpYVVybDogJ3VybDInLFxuXHRcdFx0XHRmcm9tOiAnZnJvbTInLFxuXHRcdFx0XHR1c2VyOiB1c2VyLmlkXG5cdFx0XHR9LCB7XG5cdFx0XHRcdHN0YXJ0VGltZTogJzIwMTYtMDYtMzBUMTI6MDM6MDBaJyxcblx0XHRcdFx0ZW5kVGltZTogJzIwMTYtMDYtMzBUMTI6MDQ6MDBaJyxcblx0XHRcdFx0bWVkaWFVcmw6ICd1cmwzJyxcblx0XHRcdFx0ZnJvbTogJ2Zyb20zJ1xuXHRcdFx0fSk7XG5cdFx0cmVzcG9uc2UgPSA8UmVzcG9uc2U+PGFueT4oYXdhaXQgcmVxdWVzdC5nZXQoJy92b2ljZU1lc3NhZ2VzJykuc2V0KCdBdXRob3JpemF0aW9uJywgYEJlYXJlciAke3Jlc3BvbnNlLmJvZHkudG9rZW59YCkpO1xuXHRcdHQudHJ1ZShyZXNwb25zZS5vayk7XG5cdFx0dC5pcyhyZXNwb25zZS5ib2R5Lmxlbmd0aCwgMik7XG5cdFx0dC5pcyhyZXNwb25zZS5ib2R5WzBdLmZyb20sICdmcm9tMicpO1xuXHRcdHQuaXMocmVzcG9uc2UuYm9keVsxXS5mcm9tLCAnZnJvbTEnKTtcblx0fSk7XG59KTtcblxudGVzdChgR0VUICcvdm9pY2VNZXNzYWdlcy86aWQvbWVkaWEnIHNob3VsZCByZXR1cm4gZmlsZSBjb250ZW50YCwgYXN5bmMgKHQpID0+IHtcblx0YXdhaXQgcnVuV2l0aFNlcnZlcihhc3luYyAocmVxdWVzdCwgYXBwKSA9PiB7XG5cdFx0bGV0IHJlc3BvbnNlID0gYXdhaXQgcmVxdWVzdC5sb2dpbigndm9pY2VNZXNzYWdlczInKTtcblx0XHR0LnRydWUocmVzcG9uc2Uub2spO1xuXHRcdGNvbnN0IHVzZXIgPSBhd2FpdCBtb2RlbHMudXNlci5maW5kT25lKHsgdXNlck5hbWU6ICd2b2ljZU1lc3NhZ2VzMicgfSkuZXhlYygpO1xuXHRcdGF3YWl0IG1vZGVscy52b2ljZU1haWxNZXNzYWdlLnJlbW92ZSh7IHVzZXI6IHVzZXIuaWQgfSk7XG5cdFx0Y29uc3QgbWVzc2FnZSA9IG5ldyBtb2RlbHMudm9pY2VNYWlsTWVzc2FnZSh7XG5cdFx0XHRzdGFydFRpbWU6ICcyMDE2LTA2LTMwVDEwOjAwOjAwWicsXG5cdFx0XHRlbmRUaW1lOiAnMjAxNi0wNi0zMFQxMDowMTowMFonLFxuXHRcdFx0bWVkaWFVcmw6ICdodHRwOi8vbG9jbGFob3N0L2ZpbGUxJyxcblx0XHRcdGZyb206ICdmcjEnLFxuXHRcdFx0dXNlcjogdXNlci5pZFxuXHRcdH0pO1xuXHRcdGF3YWl0IG1lc3NhZ2Uuc2F2ZSgpO1xuXHRcdGNvbnN0IHN0cmVhbSA9IG5ldyBSZWFkYWJsZSgpO1xuXHRcdHN0cmVhbS5wdXNoKCcxMjM0NTYnKTtcblx0XHRzdHJlYW0ucHVzaChudWxsKTtcblx0XHRjb25zdCBzdHViMSA9IHNpbm9uLnN0dWIoYXBwLmFwaSwgJ2Rvd25sb2FkTWVkaWFGaWxlJykud2l0aEFyZ3MoJ2ZpbGUxJykucmV0dXJucyhQcm9taXNlLnJlc29sdmUoe1xuXHRcdFx0Y29udGVudDogc3RyZWFtLFxuXHRcdFx0Y29udGVudFR5cGU6ICd0ZXh0L3BsYWluJ1xuXHRcdH0pKTtcblx0XHRyZXNwb25zZSA9IDxSZXNwb25zZT48YW55Pihhd2FpdCByZXF1ZXN0LmdldChgL3ZvaWNlTWVzc2FnZXMvJHttZXNzYWdlLmlkfS9tZWRpYWApLnNldCgnQXV0aG9yaXphdGlvbicsIGBCZWFyZXIgJHtyZXNwb25zZS5ib2R5LnRva2VufWApKTtcblx0XHR0LnRydWUocmVzcG9uc2Uub2spO1xuXHRcdHQudHJ1ZShzdHViMS5jYWxsZWQpO1xuXHRcdHQuaXMocmVzcG9uc2UudGV4dCwgJzEyMzQ1NicpO1xuXHRcdHQuaXMocmVzcG9uc2UudHlwZSwgJ3RleHQvcGxhaW4nKTtcblx0fSk7XG59KTtcblxudGVzdChgR0VUICcvdm9pY2VNZXNzYWdlcy86aWQvbWVkaWEnIHNob3VsZCByZXR1cm4gNDA0IGZvciBub24tZXhpc3RpbmcgaXRlbWAsIGFzeW5jICh0KSA9PiB7XG5cdGF3YWl0IHJ1bldpdGhTZXJ2ZXIoYXN5bmMgKHJlcXVlc3QsIGFwcCkgPT4ge1xuXHRcdGxldCByZXNwb25zZSA9IGF3YWl0IHJlcXVlc3QubG9naW4oJ3ZvaWNlTWVzc2FnZXMyMScpO1xuXHRcdHQudHJ1ZShyZXNwb25zZS5vayk7XG5cdFx0Y29uc3QgdXNlciA9IGF3YWl0IG1vZGVscy51c2VyLmZpbmRPbmUoeyB1c2VyTmFtZTogJ3ZvaWNlTWVzc2FnZXMyMScgfSkuZXhlYygpO1xuXHRcdGF3YWl0IG1vZGVscy52b2ljZU1haWxNZXNzYWdlLnJlbW92ZSh7IHVzZXI6IHVzZXIuaWQgfSk7XG5cdFx0Y29uc3QgbWVzc2FnZSA9IG5ldyBtb2RlbHMudm9pY2VNYWlsTWVzc2FnZSh7XG5cdFx0XHRzdGFydFRpbWU6ICcyMDE2LTA2LTMwVDEwOjAwOjAwWicsXG5cdFx0XHRlbmRUaW1lOiAnMjAxNi0wNi0zMFQxMDowMTowMFonLFxuXHRcdFx0bWVkaWFVcmw6ICdodHRwOi8vbG9jbGFob3N0L2ZpbGUxJyxcblx0XHRcdGZyb206ICdmcjEnLFxuXHRcdFx0dXNlcjogdXNlci5pZFxuXHRcdH0pO1xuXHRcdGF3YWl0IG1lc3NhZ2Uuc2F2ZSgpO1xuXHRcdGNvbnN0IGlkID0gbWVzc2FnZS5pZDtcblx0XHRhd2FpdCBtZXNzYWdlLnJlbW92ZSgpO1xuXHRcdHJlc3BvbnNlID0gPFJlc3BvbnNlPjxhbnk+KGF3YWl0IHJlcXVlc3QuZ2V0KGAvdm9pY2VNZXNzYWdlcy8ke2lkfS9tZWRpYWApLnNldCgnQXV0aG9yaXphdGlvbicsIGBCZWFyZXIgJHtyZXNwb25zZS5ib2R5LnRva2VufWApKTtcblx0XHR0LmZhbHNlKHJlc3BvbnNlLm9rKTtcblx0fSk7XG59KTtcblxuXG50ZXN0KGBERUxFVEUgJy92b2ljZU1lc3NhZ2VzLzppZCcgc2hvdWxkIGRlbGV0ZSB2b2ljZSBtZXNzYWdlYCwgYXN5bmMgKHQpID0+IHtcblx0YXdhaXQgcnVuV2l0aFNlcnZlcihhc3luYyAocmVxdWVzdCwgYXBwKSA9PiB7XG5cdFx0bGV0IHJlc3BvbnNlID0gYXdhaXQgcmVxdWVzdC5sb2dpbigndm9pY2VNZXNzYWdlczMnKTtcblx0XHR0LnRydWUocmVzcG9uc2Uub2spO1xuXHRcdGNvbnN0IHVzZXIgPSBhd2FpdCBtb2RlbHMudXNlci5maW5kT25lKHsgdXNlck5hbWU6ICd2b2ljZU1lc3NhZ2VzMycgfSkuZXhlYygpO1xuXHRcdGF3YWl0IG1vZGVscy52b2ljZU1haWxNZXNzYWdlLnJlbW92ZSh7IHVzZXI6IHVzZXIuaWQgfSk7XG5cdFx0Y29uc3QgbWVzc2FnZSA9IG5ldyBtb2RlbHMudm9pY2VNYWlsTWVzc2FnZSh7XG5cdFx0XHRzdGFydFRpbWU6ICcyMDE2LTA2LTMwVDEwOjAwOjAwWicsXG5cdFx0XHRlbmRUaW1lOiAnMjAxNi0wNi0zMFQxMDowMTowMFonLFxuXHRcdFx0bWVkaWFVcmw6ICdodHRwOi8vbG9jbGFob3N0L2ZpbGUyJyxcblx0XHRcdGZyb206ICdmcjInLFxuXHRcdFx0dXNlcjogdXNlci5pZFxuXHRcdH0pO1xuXHRcdGF3YWl0IG1lc3NhZ2Uuc2F2ZSgpO1xuXHRcdHJlc3BvbnNlID0gPFJlc3BvbnNlPjxhbnk+KGF3YWl0IHJlcXVlc3QuZGVsZXRlKGAvdm9pY2VNZXNzYWdlcy8ke21lc3NhZ2UuaWR9YCkuc2V0KCdBdXRob3JpemF0aW9uJywgYEJlYXJlciAke3Jlc3BvbnNlLmJvZHkudG9rZW59YCkpO1xuXHRcdHQudHJ1ZShyZXNwb25zZS5vayk7XG5cdFx0Y29uc3QgbSA9IGF3YWl0IG1vZGVscy52b2ljZU1haWxNZXNzYWdlLmZpbmRCeUlkKG1lc3NhZ2UuaWQudG9TdHJpbmcoKSkuZXhlYygpO1xuXHRcdHQuZmFsc3kobSk7XG5cdH0pO1xufSk7XG5cbnRlc3Quc2VyaWFsKGBHRVQgJy92b2ljZU1lc3NhZ2VzU3RyZWFtIHNob3VsZCBsaXN0ZW4gdG8gc2VydmVyIHNpZGUgZXZlbnRzYCwgYXN5bmMgKHQpID0+IHtcblx0YXdhaXQgcnVuV2l0aFNlcnZlcihhc3luYyAocmVxdWVzdCwgYXBwLCBzZXJ2ZXIpID0+IHtcblx0XHRsZXQgcmVzcG9uc2UgPSBhd2FpdCByZXF1ZXN0LmxvZ2luKCd2b2ljZU1lc3NhZ2VzNCcpO1xuXHRcdHQudHJ1ZShyZXNwb25zZS5vayk7XG5cdFx0Y29uc3QgdXNlciA9IGF3YWl0IG1vZGVscy51c2VyLmZpbmRPbmUoeyB1c2VyTmFtZTogJ3ZvaWNlTWVzc2FnZXM0JyB9KS5leGVjKCk7XG5cdFx0Y29uc3QgdG9rZW4gPSBhd2FpdCAoPGFueT4oand0LnNpZ24pKS5wcm9taXNlKHVzZXIuaWQsIGp3dFRva2VuLCB7fSk7XG5cdFx0cmVzcG9uc2UgPSA8UmVzcG9uc2U+PGFueT4oYXdhaXQgcmVxdWVzdC5nZXQoYC92b2ljZU1lc3NhZ2VzU3RyZWFtP3Rva2VuPSR7dG9rZW59YCkuc2V0KCdBdXRob3JpemF0aW9uJywgYEJlYXJlciAke3Jlc3BvbnNlLmJvZHkudG9rZW59YCkpO1xuXHRcdHQudHJ1ZShyZXNwb25zZS5vayk7XG5cdFx0dC5pcyhyZXNwb25zZS50eXBlLCAndGV4dC9ldmVudC1zdHJlYW0nKTtcblx0fSk7XG59KTtcblxudGVzdC5zZXJpYWwoYEdFVCAnL3ZvaWNlTWVzc2FnZXNTdHJlYW0gc2hvdWxkIGZhaWwgZm9yIG1pc3NpbmcgdG9rZW5gLCBhc3luYyAodCkgPT4ge1xuXHRhd2FpdCBydW5XaXRoU2VydmVyKGFzeW5jIChyZXF1ZXN0LCBhcHApID0+IHtcblx0XHRsZXQgcmVzcG9uc2UgPSBhd2FpdCByZXF1ZXN0LmxvZ2luKCd2b2ljZU1lc3NhZ2VzNScpO1xuXHRcdHQudHJ1ZShyZXNwb25zZS5vayk7XG5cdFx0Y29uc3QgdXNlciA9IGF3YWl0IG1vZGVscy51c2VyLmZpbmRPbmUoeyB1c2VyTmFtZTogJ3ZvaWNlTWVzc2FnZXM1JyB9KS5leGVjKCk7XG5cdFx0cmVzcG9uc2UgPSA8UmVzcG9uc2U+PGFueT4oYXdhaXQgcmVxdWVzdC5nZXQoYC92b2ljZU1lc3NhZ2VzU3RyZWFtYCkuc2V0KCdBdXRob3JpemF0aW9uJywgYEJlYXJlciAke3Jlc3BvbnNlLmJvZHkudG9rZW59YCkpO1xuXHRcdHQuZmFsc2UocmVzcG9uc2Uub2spO1xuXHR9KTtcbn0pO1xuXG50ZXN0LnNlcmlhbChgR0VUICcvdm9pY2VNZXNzYWdlc1N0cmVhbSBzaG91bGQgZmFpbCBmb3IgaW52YWxpZCB0b2tlbmAsIGFzeW5jICh0KSA9PiB7XG5cdGF3YWl0IHJ1bldpdGhTZXJ2ZXIoYXN5bmMgKHJlcXVlc3QsIGFwcCkgPT4ge1xuXHRcdGxldCByZXNwb25zZSA9IGF3YWl0IHJlcXVlc3QubG9naW4oJ3ZvaWNlTWVzc2FnZXM2Jyk7XG5cdFx0dC50cnVlKHJlc3BvbnNlLm9rKTtcblx0XHRjb25zdCB1c2VyID0gYXdhaXQgbW9kZWxzLnVzZXIuZmluZE9uZSh7IHVzZXJOYW1lOiAndm9pY2VNZXNzYWdlczYnIH0pLmV4ZWMoKTtcblx0XHRyZXNwb25zZSA9IDxSZXNwb25zZT48YW55Pihhd2FpdCByZXF1ZXN0LmdldChgL3ZvaWNlTWVzc2FnZXNTdHJlYW0/dG9rZW49MTIzNDU2YCkuc2V0KCdBdXRob3JpemF0aW9uJywgYEJlYXJlciAke3Jlc3BvbnNlLmJvZHkudG9rZW59YCkpO1xuXHRcdHQuZmFsc2UocmVzcG9uc2Uub2spO1xuXHR9KTtcbn0pO1xuXG50ZXN0LnNlcmlhbChgR0VUICcvdm9pY2VNZXNzYWdlc1N0cmVhbSBzaG91bGQgbGlzdGVuIHRvIHNlcnZlciBzaWRlIGV2ZW50c2AsIGFzeW5jICh0KSA9PiB7XG5cdGF3YWl0IHJ1bldpdGhTZXJ2ZXIoYXN5bmMgKHJlcXVlc3QsIGFwcCkgPT4ge1xuXHRcdGxldCByZXNwb25zZSA9IGF3YWl0IHJlcXVlc3QubG9naW4oJ3ZvaWNlTWVzc2FnZXM3Jyk7XG5cdFx0dC50cnVlKHJlc3BvbnNlLm9rKTtcblx0XHRjb25zdCB1c2VyID0gYXdhaXQgbW9kZWxzLnVzZXIuZmluZE9uZSh7IHVzZXJOYW1lOiAndm9pY2VNZXNzYWdlczcnIH0pLmV4ZWMoKTtcblx0XHRjb25zdCB0b2tlbiA9IGF3YWl0ICg8YW55Pihqd3Quc2lnbikpLnByb21pc2UodXNlci5pZCwgand0VG9rZW4sIHt9KTtcblx0XHRsZXQgc3NlQ2FsbGVkID0gZmFsc2U7XG5cdFx0Y2xhc3MgTW9ja1dyaXRhYmxlIGV4dGVuZHMgV3JpdGFibGUge1xuXHRcdFx0X3dyaXRlKGNodW5rOiBhbnksIGVuY29kaW5nOiBzdHJpbmcsIGNhbGxiYWNrOiBGdW5jdGlvbik6IHZvaWQge1xuXHRcdFx0XHRjb25zdCB0ZXh0ID0gY2h1bmsudG9TdHJpbmcoKTtcblx0XHRcdFx0aWYgKHRleHQgIT09ICdcXG4nKSB7XG5cdFx0XHRcdFx0dC5pcyh0ZXh0LCAnZGF0YToge1wiaWRcIjpcImlkXCIsXCJtZXNzYWdlXCI6XCJtZXNzYWdlXCJ9XFxuXFxuJyk7XG5cdFx0XHRcdH1cblx0XHRcdFx0c3NlQ2FsbGVkID0gdHJ1ZTtcblx0XHRcdFx0Y2FsbGJhY2soKTtcblx0XHRcdH1cblx0XHR9XG5cdFx0YXdhaXQgbmV3IFByb21pc2UoKHJlc29sdmUsIHJlamVjdCkgPT4ge1xuXHRcdFx0Y29uc3Qgc3RyZWFtID0gbmV3IE1vY2tXcml0YWJsZSgpO1xuXHRcdFx0c3RyZWFtLm9uKCdmaW5pc2gnLCByZXNvbHZlKTtcblx0XHRcdHN0cmVhbS5vbignZXJyb3InLCByZWplY3QpO1xuXHRcdFx0cmVxdWVzdC5nZXQoYC92b2ljZU1lc3NhZ2VzU3RyZWFtP3Rva2VuPSR7dG9rZW59YClcblx0XHRcdFx0LnNldCgnQXV0aG9yaXphdGlvbicsIGBCZWFyZXIgJHtyZXNwb25zZS5ib2R5LnRva2VufWApXG5cdFx0XHRcdC5waXBlKHN0cmVhbSk7XG5cdFx0XHRzZXRUaW1lb3V0KCgpID0+IHtcblx0XHRcdFx0UHViU3ViLnB1Ymxpc2godXNlci5pZCwgeyBpZDogJ2lkJywgbWVzc2FnZTogJ21lc3NhZ2UnIH0pO1xuXHRcdFx0fSwgNTApO1xuXHRcdH0pO1xuXHRcdHQudHJ1ZShzc2VDYWxsZWQpO1xuXHR9KTtcbn0pO1xuXG50ZXN0LnNlcmlhbChgR0VUICcvdm9pY2VNZXNzYWdlc1N0cmVhbSBzaG91bGQgZmFpbCBmb3Igbm9uLWV4aXN0cyB1c2VyYCwgYXN5bmMgKHQpID0+IHtcblx0YXdhaXQgcnVuV2l0aFNlcnZlcihhc3luYyAocmVxdWVzdCwgYXBwLCBzZXJ2ZXIpID0+IHtcblx0XHRjb25zdCB1c2VyID0gYXdhaXQgY3JlYXRlVXNlcigndm9pY2VNZXNzYWdlczgnKTtcblx0XHRjb25zdCBpZCA9IHVzZXIuaWQ7XG5cdFx0YXdhaXQgdXNlci5yZW1vdmUoKTtcblx0XHRjb25zdCB0b2tlbiA9IGF3YWl0ICg8YW55Pihqd3Quc2lnbikpLnByb21pc2UoaWQsIGp3dFRva2VuLCB7fSk7XG5cdFx0Y29uc3QgcmVzcG9uc2UgPSA8UmVzcG9uc2U+PGFueT4oYXdhaXQgcmVxdWVzdC5nZXQoYC92b2ljZU1lc3NhZ2VzU3RyZWFtP3Rva2VuPSR7dG9rZW59YCkuc2V0KCdBdXRob3JpemF0aW9uJywgYEJlYXJlciAke3Rva2VufWApKTtcblx0XHR0LmZhbHNlKHJlc3BvbnNlLm9rKTtcblx0fSk7XG59KTtcblxudGVzdChgUE9TVCAnL3JlY29yZEdyZWV0aW5nJyBzaG91bGQgbWFrZSBjYWxsIGNhbGxiYWNrYCwgYXN5bmMgKHQpID0+IHtcblx0YXdhaXQgcnVuV2l0aFNlcnZlcihhc3luYyAocmVxdWVzdCwgYXBwKSA9PiB7XG5cdFx0bGV0IHJlc3BvbnNlID0gYXdhaXQgcmVxdWVzdC5sb2dpbigncmVjb3JkR3JlZXRpbmcnKTtcblx0XHR0LnRydWUocmVzcG9uc2Uub2spO1xuXHRcdGNvbnN0IHN0dWIgPSBzaW5vbi5zdHViKGFwcC5hcGksICdjcmVhdGVDYWxsJykucmV0dXJucyhQcm9taXNlLnJlc29sdmUoJ2NhbGxJZCcpKTtcblx0XHRjb25zdCB1c2VyID0gYXdhaXQgbW9kZWxzLnVzZXIuZmluZE9uZSh7IHVzZXJOYW1lOiAncmVjb3JkR3JlZXRpbmcnIH0pLmV4ZWMoKTtcblx0XHRyZXNwb25zZSA9IDxSZXNwb25zZT48YW55Pihhd2FpdCByZXF1ZXN0LnBvc3QoYC9yZWNvcmRHcmVldGluZ2ApLnNldCgnQXV0aG9yaXphdGlvbicsIGBCZWFyZXIgJHtyZXNwb25zZS5ib2R5LnRva2VufWApKTtcblx0XHR0LnRydWUocmVzcG9uc2Uub2spO1xuXHRcdHQudHJ1ZShzdHViLmNhbGxlZCk7XG5cdFx0dC5pcyhzdHViLmxhc3RDYWxsLmFyZ3NbMF0uZnJvbSwgJysxMjM0NTY3ODkwJyk7XG5cdFx0dC5pcyhzdHViLmxhc3RDYWxsLmFyZ3NbMF0udG8sICdzaXA6dGVzdEB0ZXN0Lm5ldCcpO1xuXHR9KTtcbn0pO1xuXG50ZXN0KGBQT1NUICcvY2FsbENhbGxiYWNrJyBzaG91bGQgaGFuZGxlIG91dGdvaW5nIGNhbGxgLCBhc3luYyAodCkgPT4ge1xuXHRhd2FpdCBydW5XaXRoU2VydmVyKGFzeW5jIChyZXF1ZXN0LCBhcHApID0+IHtcblx0XHRjb25zdCBzdHViID0gc2lub24uc3R1YihhcHAuYXBpLCAndHJhbnNmZXJDYWxsJylcblx0XHRcdC53aXRoQXJncygnY2FsbElEJywgJysxNDcyNTgzNjkwJywgJysxMjM0NTY3ODkwJylcblx0XHRcdC5yZXR1cm5zKFByb21pc2UucmVzb2x2ZSgpKTtcblx0XHRjb25zdCB1c2VyID0gYXdhaXQgY3JlYXRlVXNlcignb3VzZXIxJyk7XG5cdFx0YXdhaXQgbW9kZWxzLnVzZXIudXBkYXRlKHsgX2lkOiB1c2VyLmlkIH0sIHsgJHNldDogeyBzaXBVcmk6ICdzaXA6b3Rlc3RAdGVzdC5jb20nIH0gfSk7XG5cdFx0Y29uc3QgcmVzcG9uc2UgPSA8UmVzcG9uc2U+PGFueT4oYXdhaXQgcmVxdWVzdC5wb3N0KGAvY2FsbENhbGxiYWNrYCkuc2VuZCh7XG5cdFx0XHRjYWxsSWQ6ICdjYWxsSUQnLFxuXHRcdFx0ZXZlbnRUeXBlOiAnYW5zd2VyJyxcblx0XHRcdGZyb206ICdzaXA6b3Rlc3RAdGVzdC5jb20nLFxuXHRcdFx0dG86ICcrMTQ3MjU4MzY5MCdcblx0XHR9KSk7XG5cdFx0dC50cnVlKHJlc3BvbnNlLm9rKTtcblx0XHR0LnRydWUoc3R1Yi5jYWxsZWQpO1xuXHR9KTtcbn0pO1xuXG50ZXN0KGBQT1NUICcvY2FsbENhbGxiYWNrJyBzaG91bGQgaGFuZGxlIGluY29taW5nIGNhbGxgLCBhc3luYyAodCkgPT4ge1xuXHRhd2FpdCBydW5XaXRoU2VydmVyKGFzeW5jIChyZXF1ZXN0LCBhcHAsIHNlcnZlcikgPT4ge1xuXHRcdGNvbnN0IHN0dWIxID0gc2lub24uc3R1YihhcHAuYXBpLCAncGxheUF1ZGlvVG9DYWxsJylcblx0XHRcdC53aXRoQXJncygnY2FsbElEJywgdG9uZXNVUkwsIHRydWUsICcnKVxuXHRcdFx0LnJldHVybnMoUHJvbWlzZS5yZXNvbHZlKCkpO1xuXHRcdGNvbnN0IHN0dWIyID0gc2lub24uc3R1YihhcHAuYXBpLCAnY3JlYXRlQnJpZGdlJylcblx0XHRcdC53aXRoQXJncyh7XG5cdFx0XHRcdGNhbGxJZHM6IFsnY2FsbElEJ10sXG5cdFx0XHRcdGJyaWRnZUF1ZGlvOiB0cnVlXG5cdFx0XHR9KVxuXHRcdFx0LnJldHVybnMoUHJvbWlzZS5yZXNvbHZlKCdicmlkZ2VJZCcpKTtcblx0XHRjb25zdCBzdHViMyA9IHNpbm9uLnN0dWIoYXBwLmFwaSwgJ2NyZWF0ZUNhbGwnKVxuXHRcdFx0LndpdGhBcmdzKHtcblx0XHRcdFx0YnJpZGdlSWQ6ICdicmlkZ2VJZCcsXG5cdFx0XHRcdGZyb206ICcrMTQ3MjU4MzY5MCcsXG5cdFx0XHRcdHRvOiAnc2lwOml0ZXN0QHRlc3QuY29tJyxcblx0XHRcdFx0dGFnOiAnQW5vdGhlckxlZzpjYWxsSUQnLFxuXHRcdFx0XHRjYWxsVGltZW91dDogMTAsXG5cdFx0XHRcdGNhbGxiYWNrVXJsOiBgaHR0cDovLzEyNy4wLjAuMToke3NlcnZlci5hZGRyZXNzKCkucG9ydH0vY2FsbENhbGxiYWNrYFxuXHRcdFx0fSlcblx0XHRcdC5yZXR1cm5zKFByb21pc2UucmVzb2x2ZSgnYW5vdGhlckNhbGxJZCcpKTtcblx0XHRjb25zdCB1c2VyID0gYXdhaXQgY3JlYXRlVXNlcignaXVzZXIxJyk7XG5cdFx0YXdhaXQgbW9kZWxzLnVzZXIudXBkYXRlKHsgX2lkOiB1c2VyLmlkIH0sIHsgJHNldDogeyBzaXBVcmk6ICdzaXA6aXRlc3RAdGVzdC5jb20nLCBwaG9uZU51bWJlcjogJysxMjM0NTY3ODkxJyB9IH0pO1xuXHRcdGNvbnN0IHJlc3BvbnNlID0gPFJlc3BvbnNlPjxhbnk+KGF3YWl0IHJlcXVlc3QucG9zdChgL2NhbGxDYWxsYmFja2ApLnNlbmQoe1xuXHRcdFx0Y2FsbElkOiAnY2FsbElEJyxcblx0XHRcdGV2ZW50VHlwZTogJ2Fuc3dlcicsXG5cdFx0XHRmcm9tOiAnKzE0NzI1ODM2OTAnLFxuXHRcdFx0dG86ICcrMTIzNDU2Nzg5MSdcblx0XHR9KSk7XG5cdFx0dC50cnVlKHJlc3BvbnNlLm9rKTtcblx0XHR0LnRydWUoc3R1YjEuY2FsbGVkKTtcblx0XHR0LnRydWUoc3R1YjIuY2FsbGVkKTtcblx0XHR0LnRydWUoc3R1YjMuY2FsbGVkKTtcblx0fSk7XG59KTtcblxudGVzdChgUE9TVCAnL2NhbGxDYWxsYmFjaycgc2hvdWxkIGhhbmRsZSBpbmNvbWluZyBjYWxsIChmcm9tIHNpcCBhY2NvdW50KWAsIGFzeW5jICh0KSA9PiB7XG5cdGF3YWl0IHJ1bldpdGhTZXJ2ZXIoYXN5bmMgKHJlcXVlc3QsIGFwcCwgc2VydmVyKSA9PiB7XG5cdFx0Y29uc3Qgc3R1YjEgPSBzaW5vbi5zdHViKGFwcC5hcGksICdwbGF5QXVkaW9Ub0NhbGwnKVxuXHRcdFx0LndpdGhBcmdzKCdjYWxsSUQnLCB0b25lc1VSTCwgdHJ1ZSwgJycpXG5cdFx0XHQucmV0dXJucyhQcm9taXNlLnJlc29sdmUoKSk7XG5cdFx0Y29uc3Qgc3R1YjIgPSBzaW5vbi5zdHViKGFwcC5hcGksICdjcmVhdGVCcmlkZ2UnKVxuXHRcdFx0LndpdGhBcmdzKHtcblx0XHRcdFx0Y2FsbElkczogWydjYWxsSUQnXSxcblx0XHRcdFx0YnJpZGdlQXVkaW86IHRydWVcblx0XHRcdH0pXG5cdFx0XHQucmV0dXJucyhQcm9taXNlLnJlc29sdmUoJ2JyaWRnZUlkJykpO1xuXHRcdGNvbnN0IHN0dWIzID0gc2lub24uc3R1YihhcHAuYXBpLCAnY3JlYXRlQ2FsbCcpXG5cdFx0XHQud2l0aEFyZ3Moe1xuXHRcdFx0XHRicmlkZ2VJZDogJ2JyaWRnZUlkJyxcblx0XHRcdFx0ZnJvbTogJysxMjM0NTY3ODkzJyxcblx0XHRcdFx0dG86ICdzaXA6aXRlc3QyQHRlc3QuY29tJyxcblx0XHRcdFx0dGFnOiAnQW5vdGhlckxlZzpjYWxsSUQnLFxuXHRcdFx0XHRjYWxsVGltZW91dDogMTAsXG5cdFx0XHRcdGNhbGxiYWNrVXJsOiBgaHR0cDovLzEyNy4wLjAuMToke3NlcnZlci5hZGRyZXNzKCkucG9ydH0vY2FsbENhbGxiYWNrYFxuXHRcdFx0fSlcblx0XHRcdC5yZXR1cm5zKFByb21pc2UucmVzb2x2ZSgnYW5vdGhlckNhbGxJZCcpKTtcblx0XHRjb25zdCB1c2VyID0gYXdhaXQgY3JlYXRlVXNlcignaXVzZXIyJyk7XG5cdFx0YXdhaXQgbW9kZWxzLnVzZXIudXBkYXRlKHsgX2lkOiB1c2VyLmlkIH0sIHsgJHNldDogeyBzaXBVcmk6ICdzaXA6aXRlc3QyQHRlc3QuY29tJywgcGhvbmVOdW1iZXI6ICcrMTIzNDU2Nzg5MicgfSB9KTtcblx0XHRjb25zdCB1c2VyMiA9IGF3YWl0IGNyZWF0ZVVzZXIoJ2l1c2VyMycpO1xuXHRcdGF3YWl0IG1vZGVscy51c2VyLnVwZGF0ZSh7IF9pZDogdXNlcjIuaWQgfSwgeyAkc2V0OiB7IHNpcFVyaTogJ3NpcDppdGVzdDNAdGVzdC5jb20nLCBwaG9uZU51bWJlcjogJysxMjM0NTY3ODkzJyB9IH0pO1xuXG5cdFx0Y29uc3QgcmVzcG9uc2UgPSA8UmVzcG9uc2U+PGFueT4oYXdhaXQgcmVxdWVzdC5wb3N0KGAvY2FsbENhbGxiYWNrYCkuc2VuZCh7XG5cdFx0XHRjYWxsSWQ6ICdjYWxsSUQnLFxuXHRcdFx0ZXZlbnRUeXBlOiAnYW5zd2VyJyxcblx0XHRcdGZyb206ICdzaXA6aXRlc3QzQHRlc3QuY29tJyxcblx0XHRcdHRvOiAnKzEyMzQ1Njc4OTInXG5cdFx0fSkpO1xuXHRcdHQudHJ1ZShyZXNwb25zZS5vayk7XG5cdFx0dC50cnVlKHN0dWIxLmNhbGxlZCk7XG5cdFx0dC50cnVlKHN0dWIyLmNhbGxlZCk7XG5cdFx0dC50cnVlKHN0dWIzLmNhbGxlZCk7XG5cdH0pO1xufSk7XG5cbnRlc3QoYFBPU1QgJy9jYWxsQ2FsbGJhY2snIHNob3VsZCBkbyBub3RoaW5nIGlmIHVzZXIgaXMgbm90IGZvdW5kYCwgYXN5bmMgKHQpID0+IHtcblx0YXdhaXQgcnVuV2l0aFNlcnZlcihhc3luYyAocmVxdWVzdCwgYXBwLCBzZXJ2ZXIpID0+IHtcblx0XHRjb25zdCByZXNwb25zZSA9IDxSZXNwb25zZT48YW55Pihhd2FpdCByZXF1ZXN0LnBvc3QoYC9jYWxsQ2FsbGJhY2tgKS5zZW5kKHtcblx0XHRcdGNhbGxJZDogJ2NhbGxJRCcsXG5cdFx0XHRldmVudFR5cGU6ICdhbnN3ZXInLFxuXHRcdFx0ZnJvbTogJysxMTEyNTgzNjkwJyxcblx0XHRcdHRvOiAnKzExMTQ1Njc4OTEnXG5cdFx0fSkpO1xuXHRcdHQudHJ1ZShyZXNwb25zZS5vayk7XG5cdH0pO1xufSk7XG5cbnRlc3QoYFBPU1QgJy9jYWxsQ2FsbGJhY2snIHNob3VsZCBoYW5kbGUgY2FsbCBmb3Igc2Vjb25kIGxlZ2AsIGFzeW5jICh0KSA9PiB7XG5cdGF3YWl0IHJ1bldpdGhTZXJ2ZXIoYXN5bmMgKHJlcXVlc3QsIGFwcCwgc2VydmVyKSA9PiB7XG5cdFx0Y29uc3Qgc3R1YjEgPSBzaW5vbi5zdHViKGFwcC5hcGksICdzdG9wUGxheUF1ZGlvVG9DYWxsJylcblx0XHRcdC53aXRoQXJncygnY2FsbElEJylcblx0XHRcdC5yZXR1cm5zKFByb21pc2UucmVzb2x2ZSgpKTtcblx0XHRjb25zdCByZXNwb25zZSA9IDxSZXNwb25zZT48YW55Pihhd2FpdCByZXF1ZXN0LnBvc3QoYC9jYWxsQ2FsbGJhY2tgKS5zZW5kKHtcblx0XHRcdGNhbGxJZDogJ2Fub3RoZXJDYWxsSUQnLFxuXHRcdFx0ZXZlbnRUeXBlOiAnYW5zd2VyJyxcblx0XHRcdGZyb206ICcrMTQ3MjU4MzY5MCcsXG5cdFx0XHR0bzogJysxMjM0NTY3ODkxJyxcblx0XHRcdHRhZzogJ0Fub3RoZXJMZWc6Y2FsbElEJ1xuXHRcdH0pKTtcblx0XHR0LnRydWUocmVzcG9uc2Uub2spO1xuXHRcdHQudHJ1ZShzdHViMS5jYWxsZWQpO1xuXHR9KTtcbn0pO1xuXG50ZXN0KGBQT1NUICcvY2FsbENhbGxiYWNrJyBzaG91bGQgaGFuZGxlIGVuZGluZyBvZiBwbGF5YmFjayAoYWZ0ZXIgZ3JlZXRpbmcpYCwgYXN5bmMgKHQpID0+IHtcblx0YXdhaXQgcnVuV2l0aFNlcnZlcihhc3luYyAocmVxdWVzdCwgYXBwLCBzZXJ2ZXIpID0+IHtcblx0XHRjb25zdCBzdHViMSA9IHNpbm9uLnN0dWIoYXBwLmFwaSwgJ3BsYXlBdWRpb1RvQ2FsbCcpXG5cdFx0XHQud2l0aEFyZ3MoJ2NhbGxJRCcsIGJlZXBVUkwsIGZhbHNlLCAnQmVlcCcpXG5cdFx0XHQucmV0dXJucyhQcm9taXNlLnJlc29sdmUoKSk7XG5cdFx0Y29uc3QgcmVzcG9uc2UgPSA8UmVzcG9uc2U+PGFueT4oYXdhaXQgcmVxdWVzdC5wb3N0KGAvY2FsbENhbGxiYWNrYCkuc2VuZCh7XG5cdFx0XHRjYWxsSWQ6ICdjYWxsSUQnLFxuXHRcdFx0ZXZlbnRUeXBlOiAnc3BlYWsnLFxuXHRcdFx0c3RhdHVzOiAnZG9uZScsXG5cdFx0XHR0YWc6ICdHcmVldGluZydcblx0XHR9KSk7XG5cdFx0dC50cnVlKHJlc3BvbnNlLm9rKTtcblx0XHR0LnRydWUoc3R1YjEuY2FsbGVkKTtcblx0fSk7XG59KTtcblxudGVzdChgUE9TVCAnL2NhbGxDYWxsYmFjaycgc2hvdWxkIGhhbmRsZSBlbmRpbmcgb2YgcGxheWJhY2sgKGFmdGVyIGJlZXApYCwgYXN5bmMgKHQpID0+IHtcblx0YXdhaXQgcnVuV2l0aFNlcnZlcihhc3luYyAocmVxdWVzdCwgYXBwLCBzZXJ2ZXIpID0+IHtcblx0XHRjb25zdCBzdHViMSA9IHNpbm9uLnN0dWIoYXBwLmFwaSwgJ3VwZGF0ZUNhbGwnKVxuXHRcdFx0LndpdGhBcmdzKCdjYWxsSUQnLCB7IHJlY29yZGluZ0VuYWJsZWQ6IHRydWUgfSlcblx0XHRcdC5yZXR1cm5zKFByb21pc2UucmVzb2x2ZSgpKTtcblx0XHRjb25zdCByZXNwb25zZSA9IDxSZXNwb25zZT48YW55Pihhd2FpdCByZXF1ZXN0LnBvc3QoYC9jYWxsQ2FsbGJhY2tgKS5zZW5kKHtcblx0XHRcdGNhbGxJZDogJ2NhbGxJRCcsXG5cdFx0XHRldmVudFR5cGU6ICdzcGVhaycsXG5cdFx0XHRzdGF0dXM6ICdkb25lJyxcblx0XHRcdHRhZzogJ0JlZXAnXG5cdFx0fSkpO1xuXHRcdHQudHJ1ZShyZXNwb25zZS5vayk7XG5cdFx0dC50cnVlKHN0dWIxLmNhbGxlZCk7XG5cdH0pO1xufSk7XG5cbnRlc3QoYFBPU1QgJy9jYWxsQ2FsbGJhY2snIHNob3VsZCBoYW5kbGUgdGltZW91dCAocGxheSBkZWZhdWx0IGdyZWV0aW5nKSBmb3Igc2Vjb25kIGxlZ2AsIGFzeW5jICh0KSA9PiB7XG5cdGF3YWl0IHJ1bldpdGhTZXJ2ZXIoYXN5bmMgKHJlcXVlc3QsIGFwcCwgc2VydmVyKSA9PiB7XG5cdFx0Y29uc3Qgc3R1YjEgPSBzaW5vbi5zdHViKGFwcC5hcGksICdzdG9wUGxheUF1ZGlvVG9DYWxsJylcblx0XHRcdC53aXRoQXJncygndGNhbGxJRCcpXG5cdFx0XHQucmV0dXJucyhQcm9taXNlLnJlc29sdmUoKSk7XG5cdFx0Y29uc3Qgc3R1YjIgPSBzaW5vbi5zdHViKGFwcC5hcGksICdzcGVha1NlbnRlbmNlVG9DYWxsJylcblx0XHRcdC53aXRoQXJncygndGNhbGxJRCcsICdIZWxsby4gUGxlYXNlIGxlYXZlIGEgbWVzc2FnZSBhZnRlciBiZWVwLicsICdHcmVldGluZycpXG5cdFx0XHQucmV0dXJucyhQcm9taXNlLnJlc29sdmUoKSk7XG5cblx0XHRjb25zdCB1c2VyID0gYXdhaXQgY3JlYXRlVXNlcigndHVzZXIxJyk7XG5cdFx0YXdhaXQgbW9kZWxzLnVzZXIudXBkYXRlKHsgX2lkOiB1c2VyLmlkIH0sIHsgJHNldDogeyBzaXBVcmk6ICdzaXA6dHRlc3RAdGVzdC5jb20nLCBwaG9uZU51bWJlcjogJysxMzI0NTY3ODkxJyB9IH0pO1xuXHRcdGF3YWl0IG1vZGVscy5hY3RpdmVDYWxsLnJlbW92ZSh7IGNhbGxJZDogJ3RjYWxsSUQnIH0pO1xuXHRcdGF3YWl0IG1vZGVscy5hY3RpdmVDYWxsLmNyZWF0ZSh7IGNhbGxJZDogJ3RjYWxsSUQnLCB1c2VyOiB1c2VyLmlkIH0pO1xuXHRcdGNvbnN0IHJlc3BvbnNlID0gPFJlc3BvbnNlPjxhbnk+KGF3YWl0IHJlcXVlc3QucG9zdChgL2NhbGxDYWxsYmFja2ApLnNlbmQoe1xuXHRcdFx0Y2FsbElkOiAnYW5vdGhlckNhbGxJRCcsXG5cdFx0XHRldmVudFR5cGU6ICd0aW1lb3V0Jyxcblx0XHRcdHRhZzogJ0Fub3RoZXJMZWc6dGNhbGxJRCdcblx0XHR9KSk7XG5cdFx0dC50cnVlKHJlc3BvbnNlLm9rKTtcblx0XHR0LnRydWUoc3R1YjEuY2FsbGVkKTtcblx0XHR0LnRydWUoc3R1YjIuY2FsbGVkKTtcblx0fSk7XG59KTtcblxudGVzdChgUE9TVCAnL2NhbGxDYWxsYmFjaycgc2hvdWxkIGhhbmRsZSB0aW1lb3V0IChwbGF5IHVzZXIncyBncmVldGluZykgZm9yIHNlY29uZCBsZWdgLCBhc3luYyAodCkgPT4ge1xuXHRhd2FpdCBydW5XaXRoU2VydmVyKGFzeW5jIChyZXF1ZXN0LCBhcHAsIHNlcnZlcikgPT4ge1xuXHRcdGNvbnN0IHN0dWIxID0gc2lub24uc3R1YihhcHAuYXBpLCAnc3RvcFBsYXlBdWRpb1RvQ2FsbCcpXG5cdFx0XHQud2l0aEFyZ3MoJ3QyY2FsbElEJylcblx0XHRcdC5yZXR1cm5zKFByb21pc2UucmVzb2x2ZSgpKTtcblx0XHRjb25zdCBzdHViMiA9IHNpbm9uLnN0dWIoYXBwLmFwaSwgJ3BsYXlBdWRpb1RvQ2FsbCcpXG5cdFx0XHQud2l0aEFyZ3MoJ3QyY2FsbElEJywgJ3VybCcsIGZhbHNlLCAnR3JlZXRpbmcnKVxuXHRcdFx0LnJldHVybnMoUHJvbWlzZS5yZXNvbHZlKCkpO1xuXG5cdFx0Y29uc3QgdXNlciA9IGF3YWl0IGNyZWF0ZVVzZXIoJ3R1c2VyMicpO1xuXHRcdGF3YWl0IG1vZGVscy51c2VyLnVwZGF0ZSh7IF9pZDogdXNlci5pZCB9LCB7ICRzZXQ6IHsgc2lwVXJpOiAnc2lwOnQydGVzdEB0ZXN0LmNvbScsIHBob25lTnVtYmVyOiAnKzEzMjQ1Njc4OTInLCBncmVldGluZ1VybDogJ3VybCcgfSB9KTtcblx0XHRhd2FpdCBtb2RlbHMuYWN0aXZlQ2FsbC5yZW1vdmUoeyBjYWxsSWQ6ICd0MmNhbGxJRCcgfSk7XG5cdFx0YXdhaXQgbW9kZWxzLmFjdGl2ZUNhbGwuY3JlYXRlKHsgY2FsbElkOiAndDJjYWxsSUQnLCB1c2VyOiB1c2VyLmlkIH0pO1xuXHRcdGNvbnN0IHJlc3BvbnNlID0gPFJlc3BvbnNlPjxhbnk+KGF3YWl0IHJlcXVlc3QucG9zdChgL2NhbGxDYWxsYmFja2ApLnNlbmQoe1xuXHRcdFx0Y2FsbElkOiAnYW5vdGhlckNhbGxJRCcsXG5cdFx0XHRldmVudFR5cGU6ICd0aW1lb3V0Jyxcblx0XHRcdHRhZzogJ0Fub3RoZXJMZWc6dDJjYWxsSUQnXG5cdFx0fSkpO1xuXHRcdHQudHJ1ZShyZXNwb25zZS5vayk7XG5cdFx0dC50cnVlKHN0dWIxLmNhbGxlZCk7XG5cdFx0dC50cnVlKHN0dWIyLmNhbGxlZCk7XG5cdH0pO1xufSk7XG5cbnRlc3QoYFBPU1QgJy9jYWxsQ2FsbGJhY2snIHNob3VsZCBoYW5kbGUgY29tcGxldGVkIHJlY29yZGluZ2AsIGFzeW5jICh0KSA9PiB7XG5cdFx0YXdhaXQgcnVuV2l0aFNlcnZlcihhc3luYyAocmVxdWVzdCwgYXBwLCBzZXJ2ZXIpID0+IHtcblx0XHRjb25zdCB1c2VyID0gYXdhaXQgY3JlYXRlVXNlcigncnVzZXIxJyk7XG5cblx0XHRjb25zdCBzdHViMSA9IHNpbm9uLnN0dWIoYXBwLmFwaSwgJ2dldFJlY29yZGluZycpXG5cdFx0XHQud2l0aEFyZ3MoJ3JlY29yZGluZ0lEJylcblx0XHRcdC5yZXR1cm5zKFByb21pc2UucmVzb2x2ZSh7XG5cdFx0XHRcdG1lZGlhOiAndXJsJyxcblx0XHRcdFx0c3RhcnRUaW1lOiAnMjAxNi0wNy0wNFQxMDo0MDowMFonLFxuXHRcdFx0XHRlbmRUaW1lOiAnMjAxNi0wNy0wNFQxMDo0MTowMFonLFxuXHRcdFx0fSkpO1xuXHRcdGNvbnN0IHN0dWIyID0gc2lub24uc3R1YihhcHAuYXBpLCAnZ2V0Q2FsbCcpXG5cdFx0XHQud2l0aEFyZ3MoJ3JjYWxsSUQnKVxuXHRcdFx0LnJldHVybnMoUHJvbWlzZS5yZXNvbHZlKHsgZnJvbTogJysxMjM0NTY3ODkxJyB9KSk7XG5cblx0XHRjb25zdCBzdHViMyA9IHNpbm9uLnN0dWIoUHViU3ViLCAncHVibGlzaCcpO1xuXHRcdHRyeSB7XG5cdFx0XHRhd2FpdCBtb2RlbHMuYWN0aXZlQ2FsbC5yZW1vdmUoeyBjYWxsSWQ6ICdyY2FsbElEJyB9KTtcblx0XHRcdGF3YWl0IG1vZGVscy5hY3RpdmVDYWxsLmNyZWF0ZSh7IGNhbGxJZDogJ3JjYWxsSUQnLCB1c2VyOiB1c2VyLmlkIH0pO1xuXHRcdFx0Y29uc3QgcmVzcG9uc2UgPSA8UmVzcG9uc2U+PGFueT4oYXdhaXQgcmVxdWVzdC5wb3N0KGAvY2FsbENhbGxiYWNrYCkuc2VuZCh7XG5cdFx0XHRcdGNhbGxJZDogJ3JjYWxsSUQnLFxuXHRcdFx0XHRldmVudFR5cGU6ICdyZWNvcmRpbmcnLFxuXHRcdFx0XHRzdGF0ZTogJ2NvbXBsZXRlJyxcblx0XHRcdFx0cmVjb3JkaW5nSWQ6ICdyZWNvcmRpbmdJRCdcblx0XHRcdH0pKTtcblx0XHRcdHQudHJ1ZShyZXNwb25zZS5vayk7XG5cdFx0XHR0LnRydWUoc3R1YjEuY2FsbGVkKTtcblx0XHRcdHQudHJ1ZShzdHViMi5jYWxsZWQpO1xuXHRcdFx0dC50cnVlKHN0dWIzLmNhbGxlZCk7XG5cdFx0fSBmaW5hbGx5IHtcblx0XHRcdHN0dWIzLnJlc3RvcmUoKTtcblx0XHR9XG5cdFx0fSk7XG59KTtcblxudGVzdChgUE9TVCAnL2NhbGxDYWxsYmFjaycgc2hvdWxkIGhhbmRsZSBoYW5ndXAgb2YgY29tcGxldGVkIGNhbGxzYCwgYXN5bmMgKHQpID0+IHtcblx0XHRhd2FpdCBydW5XaXRoU2VydmVyKGFzeW5jIChyZXF1ZXN0LCBhcHAsIHNlcnZlcikgPT4ge1xuXHRcdGNvbnN0IHVzZXIgPSBhd2FpdCBjcmVhdGVVc2VyKCdjdXNlcjEnKTtcblx0XHRhd2FpdCBtb2RlbHMuYWN0aXZlQ2FsbC5yZW1vdmUoeyBjYWxsSWQ6ICdjY2FsbElEJyB9KTtcblx0XHRhd2FpdCBtb2RlbHMuYWN0aXZlQ2FsbC5yZW1vdmUoeyBjYWxsSWQ6ICdjY2FsbElEMScgfSk7XG5cdFx0YXdhaXQgbW9kZWxzLmFjdGl2ZUNhbGwucmVtb3ZlKHsgY2FsbElkOiAnY2NhbGxJRDInIH0pO1xuXG5cdFx0YXdhaXQgbW9kZWxzLmFjdGl2ZUNhbGwuY3JlYXRlKHsgY2FsbElkOiAnY2NhbGxJRCcsIGJyaWRnZUlkOiAnYnJpZGdlSUQnLCB1c2VyOiB1c2VyLmlkIH0pO1xuXHRcdGF3YWl0IG1vZGVscy5hY3RpdmVDYWxsLmNyZWF0ZSh7IGNhbGxJZDogJ2NjYWxsSUQxJywgYnJpZGdlSWQ6ICdicmlkZ2VJRCcsIHVzZXI6IHVzZXIuaWQgfSk7XG5cdFx0YXdhaXQgbW9kZWxzLmFjdGl2ZUNhbGwuY3JlYXRlKHsgY2FsbElkOiAnY2NhbGxJRDInLCBicmlkZ2VJZDogJ2JyaWRnZUlEJywgdXNlcjogdXNlci5pZCB9KTtcblxuXHRcdGNvbnN0IHN0dWIxID0gc2lub24uc3R1YihhcHAuYXBpLCAnaGFuZ3VwJylcblx0XHRcdC53aXRoQXJncygnY2NhbGxJRDEnKS5yZXR1cm5zKFByb21pc2UucmVzb2x2ZSgpKVxuXHRcdFx0LndpdGhBcmdzKCdjY2FsbElEMicpLnJldHVybnMoUHJvbWlzZS5yZXNvbHZlKCkpO1xuXHRcdGNvbnN0IHJlc3BvbnNlID0gPFJlc3BvbnNlPjxhbnk+KGF3YWl0IHJlcXVlc3QucG9zdChgL2NhbGxDYWxsYmFja2ApLnNlbmQoe1xuXHRcdFx0Y2FsbElkOiAnY2NhbGxJRCcsXG5cdFx0XHRldmVudFR5cGU6ICdoYW5ndXAnXG5cdFx0fSkpO1xuXHRcdHQudHJ1ZShyZXNwb25zZS5vayk7XG5cdFx0dC50cnVlKHN0dWIxLmNhbGxlZCk7XG5cdFx0fSk7XG59KTtcblxudGVzdChgUE9TVCAnL2NhbGxDYWxsYmFjaycgc2hvdWxkIGRvIG5vdGhpbmcgb24gaGFuZ3VwIG9mIG90aGVyIGNhbGxzYCwgYXN5bmMgKHQpID0+IHtcblx0XHRhd2FpdCBydW5XaXRoU2VydmVyKGFzeW5jIChyZXF1ZXN0LCBhcHAsIHNlcnZlcikgPT4ge1xuXHRcdGNvbnN0IHJlc3BvbnNlID0gPFJlc3BvbnNlPjxhbnk+KGF3YWl0IHJlcXVlc3QucG9zdChgL2NhbGxDYWxsYmFja2ApLnNlbmQoe1xuXHRcdFx0Y2FsbElkOiAnYzJjYWxsSUQnLFxuXHRcdFx0ZXZlbnRUeXBlOiAnaGFuZ3VwJ1xuXHRcdH0pKTtcblx0XHR0LnRydWUocmVzcG9uc2Uub2spO1xuXHRcdH0pO1xufSk7XG5cbnRlc3QoYFBPU1QgJy9yZWNvcmRDYWxsYmFjaycgc2hvdWxkIHBsYXkgdm9pY2UgbWVudSBvbiBhbnN3ZXJgLCBhc3luYyAodCkgPT4ge1xuXHRhd2FpdCBydW5XaXRoU2VydmVyKGFzeW5jIChyZXF1ZXN0LCBhcHApID0+IHtcblx0XHRjb25zdCBzdHViID0gc2lub24uc3R1YihhcHAuYXBpLCAnY3JlYXRlR2F0aGVyJykucmV0dXJucyhQcm9taXNlLnJlc29sdmUoe1xuXHRcdFx0bWF4RGlnaXRzOiAxLFxuXHRcdFx0aW50ZXJEaWdpdFRpbWVvdXQ6IDMwLFxuXHRcdFx0cHJvbXB0OiB7XG5cdFx0XHRcdHNlbnRlbmNlOiAnUHJlc3MgMSB0byBsaXN0ZW4gdG8geW91ciBjdXJyZW50IGdyZWV0aW5nLiBQcmVzcyAyIHRvIHJlY29yZCBuZXcgZ3JlZXRpbmcuIFByZXNzIDMgdG8gc2V0IGdyZWV0aW5nIHRvIGRlZmF1bHQuJ1xuXHRcdFx0fSxcblx0XHRcdHRhZzogJ21haW5NZW51J1xuXHRcdH0pKTtcblx0XHRjb25zdCByZXNwb25zZSA9IDxSZXNwb25zZT48YW55Pihhd2FpdCByZXF1ZXN0LnBvc3QoYC9yZWNvcmRDYWxsYmFja2ApLnNlbmQoe1xuXHRcdFx0ZXZlbnRUeXBlOiAnYW5zd2VyJ1xuXHRcdH0pKTtcblx0XHR0LnRydWUocmVzcG9uc2Uub2spO1xuXHRcdHQudHJ1ZShzdHViLmNhbGxlZCk7XG5cdH0pO1xufSk7XG5cbnRlc3QoYFBPU1QgJy9yZWNvcmRDYWxsYmFjaycgc2hvdWxkIHBsYXkgZ3JlZXRpbmcgb24gcHJlc3MgMWAsIGFzeW5jICh0KSA9PiB7XG5cdGF3YWl0IHJ1bldpdGhTZXJ2ZXIoYXN5bmMgKHJlcXVlc3QsIGFwcCkgPT4ge1xuXHRcdGNvbnN0IHN0dWIgPSBzaW5vbi5zdHViKGFwcC5hcGksICdzcGVha1NlbnRlbmNlVG9DYWxsJylcblx0XHRcdC53aXRoQXJncygncmNjYWxsSUQnLCAnSGVsbG8uIFBsZWFzZSBsZWF2ZSBhIG1lc3NhZ2UgYWZ0ZXIgYmVlcC4nLCAnR3JlZXRpbmcnKVxuXHRcdFx0LnJldHVybnMoUHJvbWlzZS5yZXNvbHZlKCkpO1xuXHRcdGNvbnN0IHVzZXIgPSBhd2FpdCBjcmVhdGVVc2VyKCdyY3VzZXIxJyk7XG5cdFx0YXdhaXQgbW9kZWxzLmFjdGl2ZUNhbGwucmVtb3ZlKHsgY2FsbElkOiAncmNjYWxsSUQnIH0pO1xuXHRcdGF3YWl0IG1vZGVscy5hY3RpdmVDYWxsLmNyZWF0ZSh7IGNhbGxJZDogJ3JjY2FsbElEJywgdXNlcjogdXNlci5pZCB9KTtcblxuXHRcdGNvbnN0IHJlc3BvbnNlID0gPFJlc3BvbnNlPjxhbnk+KGF3YWl0IHJlcXVlc3QucG9zdChgL3JlY29yZENhbGxiYWNrYCkuc2VuZCh7XG5cdFx0XHRldmVudFR5cGU6ICdnYXRoZXInLFxuXHRcdFx0dGFnOiAnbWFpbk1lbnUnLFxuXHRcdFx0ZGlnaXRzOiAnMScsXG5cdFx0XHRjYWxsSWQ6ICdyY2NhbGxJRCcsXG5cdFx0XHRzdGF0ZTogJ2NvbXBsZXRlZCdcblx0XHR9KSk7XG5cdFx0dC50cnVlKHJlc3BvbnNlLm9rKTtcblx0XHR0LnRydWUoc3R1Yi5jYWxsZWQpO1xuXHR9KTtcbn0pO1xuXG50ZXN0KGBQT1NUICcvcmVjb3JkQ2FsbGJhY2snIHNob3VsZCBzdGFydCBncmVldGluZyByZWNvcmRpbmcgb24gcHJlc3MgMmAsIGFzeW5jICh0KSA9PiB7XG5cdGF3YWl0IHJ1bldpdGhTZXJ2ZXIoYXN5bmMgKHJlcXVlc3QsIGFwcCkgPT4ge1xuXHRcdGNvbnN0IHN0dWIgPSBzaW5vbi5zdHViKGFwcC5hcGksICdzcGVha1NlbnRlbmNlVG9DYWxsJylcblx0XHRcdC53aXRoQXJncygncmNjYWxsSUQyJywgJ1NheSB5b3VyIGdyZWV0aW5nIGFmdGVyIGJlZXAuIFByZXNzIDAgdG8gY29tcGxldGUgcmVjb3JkaW5nLicsICdQbGF5QmVlcCcpXG5cdFx0XHQucmV0dXJucyhQcm9taXNlLnJlc29sdmUoKSk7XG5cdFx0Y29uc3QgdXNlciA9IGF3YWl0IGNyZWF0ZVVzZXIoJ3JjdXNlcjInKTtcblx0XHRhd2FpdCBtb2RlbHMuYWN0aXZlQ2FsbC5yZW1vdmUoeyBjYWxsSWQ6ICdyY2NhbGxJRDInIH0pO1xuXHRcdGF3YWl0IG1vZGVscy5hY3RpdmVDYWxsLmNyZWF0ZSh7IGNhbGxJZDogJ3JjY2FsbElEMicsIHVzZXI6IHVzZXIuaWQgfSk7XG5cblx0XHRjb25zdCByZXNwb25zZSA9IDxSZXNwb25zZT48YW55Pihhd2FpdCByZXF1ZXN0LnBvc3QoYC9yZWNvcmRDYWxsYmFja2ApLnNlbmQoe1xuXHRcdFx0ZXZlbnRUeXBlOiAnZ2F0aGVyJyxcblx0XHRcdHRhZzogJ21haW5NZW51Jyxcblx0XHRcdGRpZ2l0czogJzInLFxuXHRcdFx0Y2FsbElkOiAncmNjYWxsSUQyJyxcblx0XHRcdHN0YXRlOiAnY29tcGxldGVkJ1xuXHRcdH0pKTtcblx0XHR0LnRydWUocmVzcG9uc2Uub2spO1xuXHRcdHQudHJ1ZShzdHViLmNhbGxlZCk7XG5cdH0pO1xufSk7XG5cbnRlc3QoYFBPU1QgJy9yZWNvcmRDYWxsYmFjaycgc2hvdWxkIHJlc2V0IGdyZWV0aW5nIG9uIHByZXNzIDNgLCBhc3luYyAodCkgPT4ge1xuXHRhd2FpdCBydW5XaXRoU2VydmVyKGFzeW5jIChyZXF1ZXN0LCBhcHApID0+IHtcblx0XHRjb25zdCBzdHViID0gc2lub24uc3R1YihhcHAuYXBpLCAnc3BlYWtTZW50ZW5jZVRvQ2FsbCcpXG5cdFx0XHQud2l0aEFyZ3MoJ3JjY2FsbElEMycsICdZb3VyIGdyZWV0aW5nIGhhcyBiZWVuIHNldCB0byBkZWZhdWx0LicsICdQbGF5TWVudScpXG5cdFx0XHQucmV0dXJucyhQcm9taXNlLnJlc29sdmUoKSk7XG5cdFx0bGV0IHVzZXIgPSBhd2FpdCBjcmVhdGVVc2VyKCdyY3VzZXIzJyk7XG5cdFx0YXdhaXQgbW9kZWxzLnVzZXIudXBkYXRlKHsgX2lkOiB1c2VyLmlkIH0sIHsgJHNldDogeyBncmVldGluZ1VybDogJ3VybCcgfSB9KTtcblx0XHRhd2FpdCBtb2RlbHMuYWN0aXZlQ2FsbC5yZW1vdmUoeyBjYWxsSWQ6ICdyY2NhbGxJRDMnIH0pO1xuXHRcdGF3YWl0IG1vZGVscy5hY3RpdmVDYWxsLmNyZWF0ZSh7IGNhbGxJZDogJ3JjY2FsbElEMycsIHVzZXI6IHVzZXIuaWQgfSk7XG5cdFx0dXNlciA9IGF3YWl0IG1vZGVscy51c2VyLmZpbmRCeUlkKHVzZXIuaWQudG9TdHJpbmcoKSkuZXhlYygpO1xuXHRcdHQudHJ1dGh5KHVzZXIuZ3JlZXRpbmdVcmwpO1xuXHRcdGNvbnN0IHJlc3BvbnNlID0gPFJlc3BvbnNlPjxhbnk+KGF3YWl0IHJlcXVlc3QucG9zdChgL3JlY29yZENhbGxiYWNrYCkuc2VuZCh7XG5cdFx0XHRldmVudFR5cGU6ICdnYXRoZXInLFxuXHRcdFx0dGFnOiAnbWFpbk1lbnUnLFxuXHRcdFx0ZGlnaXRzOiAnMycsXG5cdFx0XHRjYWxsSWQ6ICdyY2NhbGxJRDMnLFxuXHRcdFx0c3RhdGU6ICdjb21wbGV0ZWQnXG5cdFx0fSkpO1xuXHRcdHQudHJ1ZShyZXNwb25zZS5vayk7XG5cdFx0dC50cnVlKHN0dWIuY2FsbGVkKTtcblx0XHR1c2VyID0gYXdhaXQgbW9kZWxzLnVzZXIuZmluZEJ5SWQodXNlci5pZC50b1N0cmluZygpKS5leGVjKCk7XG5cdFx0dC5mYWxzeSh1c2VyLmdyZWV0aW5nVXJsKTtcblx0fSk7XG59KTtcblxudGVzdChgUE9TVCAnL3JlY29yZENhbGxiYWNrJyBzaG91bGQgc3RvcCByZWNvcmRpbmcgb24gMGAsIGFzeW5jICh0KSA9PiB7XG5cdGF3YWl0IHJ1bldpdGhTZXJ2ZXIoYXN5bmMgKHJlcXVlc3QsIGFwcCkgPT4ge1xuXHRcdGNvbnN0IHN0dWIgPSBzaW5vbi5zdHViKGFwcC5hcGksICd1cGRhdGVDYWxsJylcblx0XHRcdC53aXRoQXJncygncmNjYWxsSUQzJywgeyByZWNvcmRpbmdFbmFibGVkOiBmYWxzZSB9KVxuXHRcdFx0LnJldHVybnMoUHJvbWlzZS5yZXNvbHZlKCkpO1xuXHRcdGNvbnN0IHJlc3BvbnNlID0gPFJlc3BvbnNlPjxhbnk+KGF3YWl0IHJlcXVlc3QucG9zdChgL3JlY29yZENhbGxiYWNrYCkuc2VuZCh7XG5cdFx0XHRldmVudFR5cGU6ICdnYXRoZXInLFxuXHRcdFx0dGFnOiAnR3JlZXRpbmdSZWNvcmRpbmcnLFxuXHRcdFx0ZGlnaXRzOiAnMCcsXG5cdFx0XHRjYWxsSWQ6ICdyY2NhbGxJRDMnLFxuXHRcdFx0c3RhdGU6ICdjb21wbGV0ZWQnXG5cdFx0fSkpO1xuXHRcdHQudHJ1ZShyZXNwb25zZS5vayk7XG5cdFx0dC50cnVlKHN0dWIuY2FsbGVkKTtcblx0fSk7XG59KTtcblxudGVzdChgUE9TVCAnL3JlY29yZENhbGxiYWNrJyBzaG91bGQgd3JpdGUgcmVjb3JkaW5nIG9uIGNvbXBsZXRlYCwgYXN5bmMgKHQpID0+IHtcblx0YXdhaXQgcnVuV2l0aFNlcnZlcihhc3luYyAocmVxdWVzdCwgYXBwKSA9PiB7XG5cdFx0Y29uc3Qgc3R1YiA9IHNpbm9uLnN0dWIoYXBwLmFwaSwgJ3NwZWFrU2VudGVuY2VUb0NhbGwnKVxuXHRcdFx0LndpdGhBcmdzKCdyY2NhbGxJRDUnLCAnWW91ciBncmVldGluZyBoYXMgYmVlbiBzYXZlZC4nLCAnUGxheU1lbnUnKVxuXHRcdFx0LnJldHVybnMoUHJvbWlzZS5yZXNvbHZlKCkpO1xuXHRcdGNvbnN0IHN0dWIxID0gc2lub24uc3R1YihhcHAuYXBpLCAnZ2V0UmVjb3JkaW5nJylcblx0XHRcdC53aXRoQXJncygncmVjb3JkaW5nSUQnKVxuXHRcdFx0LnJldHVybnMoUHJvbWlzZS5yZXNvbHZlKHtcblx0XHRcdFx0bWVkaWE6ICd1cmwnXG5cdFx0XHR9KSk7XG5cdFx0Y29uc3Qgc3R1YjIgPSBzaW5vbi5zdHViKGFwcC5hcGksICdnZXRDYWxsJylcblx0XHRcdC53aXRoQXJncygncmNjYWxsSUQ1Jylcblx0XHRcdC5yZXR1cm5zKFByb21pc2UucmVzb2x2ZSh7XG5cdFx0XHRcdHN0YXRlOiAnYWN0aXZlJ1xuXHRcdFx0fSkpO1xuXHRcdGxldCB1c2VyID0gYXdhaXQgY3JlYXRlVXNlcigncmN1c2VyNScpO1xuXHRcdGF3YWl0IG1vZGVscy5hY3RpdmVDYWxsLnJlbW92ZSh7IGNhbGxJZDogJ3JjY2FsbElENScgfSk7XG5cdFx0YXdhaXQgbW9kZWxzLmFjdGl2ZUNhbGwuY3JlYXRlKHsgY2FsbElkOiAncmNjYWxsSUQ1JywgdXNlcjogdXNlci5pZCB9KTtcblx0XHRjb25zdCByZXNwb25zZSA9IDxSZXNwb25zZT48YW55Pihhd2FpdCByZXF1ZXN0LnBvc3QoYC9yZWNvcmRDYWxsYmFja2ApLnNlbmQoe1xuXHRcdFx0ZXZlbnRUeXBlOiAncmVjb3JkaW5nJyxcblx0XHRcdHN0YXRlOiAnY29tcGxldGUnLFxuXHRcdFx0Y2FsbElkOiAncmNjYWxsSUQ1Jyxcblx0XHRcdHJlY29yZGluZ0lkOiAncmVjb3JkaW5nSUQnXG5cdFx0fSkpO1xuXHRcdHQudHJ1ZShyZXNwb25zZS5vayk7XG5cdFx0dC50cnVlKHN0dWIuY2FsbGVkKTtcblx0XHR0LnRydWUoc3R1YjEuY2FsbGVkKTtcblx0XHR0LnRydWUoc3R1YjIuY2FsbGVkKTtcblx0XHR1c2VyID0gYXdhaXQgbW9kZWxzLnVzZXIuZmluZEJ5SWQodXNlci5pZC50b1N0cmluZygpKS5leGVjKCk7XG5cdFx0dC5pcyh1c2VyLmdyZWV0aW5nVXJsLCAndXJsJyk7XG5cdH0pO1xufSk7XG5cbnRlc3QoYFBPU1QgJy9yZWNvcmRDYWxsYmFjaycgc2hvdWxkIGRvIG5vdGhpbmcgZm9yIG5vbi1jb21wbGV0ZWQgcmVjb3JkaW5nYCwgYXN5bmMgKHQpID0+IHtcblx0YXdhaXQgcnVuV2l0aFNlcnZlcihhc3luYyAocmVxdWVzdCwgYXBwKSA9PiB7XG5cdFx0Y29uc3QgcmVzcG9uc2UgPSA8UmVzcG9uc2U+PGFueT4oYXdhaXQgcmVxdWVzdC5wb3N0KGAvcmVjb3JkQ2FsbGJhY2tgKS5zZW5kKHtcblx0XHRcdGV2ZW50VHlwZTogJ3JlY29yZGluZycsXG5cdFx0XHRzdGF0ZTogJ3N0YXJ0Jyxcblx0XHRcdGNhbGxJZDogJ3JjY2FsbElENTEnLFxuXHRcdFx0cmVjb3JkaW5nSWQ6ICdyZWNvcmRpbmdJRCdcblx0XHR9KSk7XG5cdFx0dC50cnVlKHJlc3BvbnNlLm9rKTtcblx0fSk7XG59KTtcblxudGVzdChgUE9TVCAnL3JlY29yZENhbGxiYWNrJyBzaG91bGQgaGFuZGxlIGNvbXBsZXRlIG9mIHNwZWFrIChwbGF5IGJlZXApYCwgYXN5bmMgKHQpID0+IHtcblx0YXdhaXQgcnVuV2l0aFNlcnZlcihhc3luYyAocmVxdWVzdCwgYXBwKSA9PiB7XG5cdFx0Y29uc3Qgc3R1YiA9IHNpbm9uLnN0dWIoYXBwLmFwaSwgJ3BsYXlBdWRpb1RvQ2FsbCcpXG5cdFx0XHQud2l0aEFyZ3MoJ3JjY2FsbElENicsIGJlZXBVUkwsIGZhbHNlLCAnQmVlcCcpXG5cdFx0XHQucmV0dXJucyhQcm9taXNlLnJlc29sdmUoKSk7XG5cdFx0Y29uc3QgcmVzcG9uc2UgPSA8UmVzcG9uc2U+PGFueT4oYXdhaXQgcmVxdWVzdC5wb3N0KGAvcmVjb3JkQ2FsbGJhY2tgKS5zZW5kKHtcblx0XHRcdGV2ZW50VHlwZTogJ3NwZWFrJyxcblx0XHRcdHRhZzogJ1BsYXlCZWVwJyxcblx0XHRcdHN0YXR1czogJ2RvbmUnLFxuXHRcdFx0Y2FsbElkOiAncmNjYWxsSUQ2J1xuXHRcdH0pKTtcblx0XHR0LnRydWUocmVzcG9uc2Uub2spO1xuXHRcdHQudHJ1ZShzdHViLmNhbGxlZCk7XG5cdH0pO1xufSk7XG5cbnRlc3QoYFBPU1QgJy9yZWNvcmRDYWxsYmFjaycgc2hvdWxkIGhhbmRsZSBjb21wbGV0ZSBvZiBzcGVhayAocGxheSBncmVldGluZylgLCBhc3luYyAodCkgPT4ge1xuXHRhd2FpdCBydW5XaXRoU2VydmVyKGFzeW5jIChyZXF1ZXN0LCBhcHApID0+IHtcblx0XHRjb25zdCBzdHViID0gc2lub24uc3R1YihhcHAuYXBpLCAndXBkYXRlQ2FsbCcpXG5cdFx0XHQud2l0aEFyZ3MoJ3JjY2FsbElENycsIHsgcmVjb3JkaW5nRW5hYmxlZDogdHJ1ZSB9KVxuXHRcdFx0LnJldHVybnMoUHJvbWlzZS5yZXNvbHZlKCkpO1xuXHRcdGNvbnN0IHN0dWIxID0gc2lub24uc3R1YihhcHAuYXBpLCAnY3JlYXRlR2F0aGVyJylcblx0XHRcdC53aXRoQXJncygncmNjYWxsSUQ3Jywge1xuXHRcdFx0XHRcdFx0XHRcdG1heERpZ2l0czogMSxcblx0XHRcdFx0XHRcdFx0XHRpbnRlckRpZ2l0VGltZW91dDogMzAsXG5cdFx0XHRcdFx0XHRcdFx0dGFnOiAnR3JlZXRpbmdSZWNvcmRpbmcnXG5cdFx0XHR9KVxuXHRcdFx0LnJldHVybnMoUHJvbWlzZS5yZXNvbHZlKCkpO1xuXHRcdGNvbnN0IHJlc3BvbnNlID0gPFJlc3BvbnNlPjxhbnk+KGF3YWl0IHJlcXVlc3QucG9zdChgL3JlY29yZENhbGxiYWNrYCkuc2VuZCh7XG5cdFx0XHRldmVudFR5cGU6ICdzcGVhaycsXG5cdFx0XHR0YWc6ICdCZWVwJyxcblx0XHRcdHN0YXR1czogJ2RvbmUnLFxuXHRcdFx0Y2FsbElkOiAncmNjYWxsSUQ3J1xuXHRcdH0pKTtcblx0XHR0LnRydWUocmVzcG9uc2Uub2spO1xuXHRcdHQudHJ1ZShzdHViLmNhbGxlZCk7XG5cdH0pO1xufSk7XG5cbnRlc3QoYFBPU1QgJy9yZWNvcmRDYWxsYmFjaycgc2hvdWxkIGhhbmRsZSBjb21wbGV0ZSBvZiBzcGVhayAoZGVmYXVsdDogcGxheSB2b2ljZSBtZW51KWAsIGFzeW5jICh0KSA9PiB7XG5cdGF3YWl0IHJ1bldpdGhTZXJ2ZXIoYXN5bmMgKHJlcXVlc3QsIGFwcCkgPT4ge1xuXHRcdGNvbnN0IHN0dWIgPSBzaW5vbi5zdHViKGFwcC5hcGksICdjcmVhdGVHYXRoZXInKS5yZXR1cm5zKFByb21pc2UucmVzb2x2ZSh7XG5cdFx0XHRtYXhEaWdpdHM6IDEsXG5cdFx0XHRpbnRlckRpZ2l0VGltZW91dDogMzAsXG5cdFx0XHRwcm9tcHQ6IHtcblx0XHRcdFx0c2VudGVuY2U6ICdQcmVzcyAxIHRvIGxpc3RlbiB0byB5b3VyIGN1cnJlbnQgZ3JlZXRpbmcuIFByZXNzIDIgdG8gcmVjb3JkIG5ldyBncmVldGluZy4gUHJlc3MgMyB0byBzZXQgZ3JlZXRpbmcgdG8gZGVmYXVsdC4nXG5cdFx0XHR9LFxuXHRcdFx0dGFnOiAnbWFpbk1lbnUnXG5cdFx0fSkpO1xuXHRcdGNvbnN0IHJlc3BvbnNlID0gPFJlc3BvbnNlPjxhbnk+KGF3YWl0IHJlcXVlc3QucG9zdChgL3JlY29yZENhbGxiYWNrYCkuc2VuZCh7XG5cdFx0XHRldmVudFR5cGU6ICdzcGVhaycsXG5cdFx0XHRzdGF0dXM6ICdkb25lJyxcblx0XHRcdGNhbGxJZDogJ3JjY2FsbElEOCdcblx0XHR9KSk7XG5cdFx0dC50cnVlKHJlc3BvbnNlLm9rKTtcblx0XHR0LnRydWUoc3R1Yi5jYWxsZWQpO1xuXHR9KTtcbn0pO1xuXG50ZXN0KGBHRVQgJy8nIHNob3VsZCByZXR1cm4gc3RhdHVzIDIwMGAsIGFzeW5jICgpID0+IHtcblx0YXdhaXQgcnVuV2l0aFNlcnZlcihhc3luYyAocmVxdWVzdDogSVN1cGVyVGVzdCkgPT4ge1xuXHRcdGF3YWl0IHJlcXVlc3QuZ2V0KCcvJylcblx0XHQuZXhwZWN0KDIwMCk7XG5cdH0pO1xufSk7XG4iXX0=