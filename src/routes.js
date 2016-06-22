"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator.throw(value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments)).next());
    });
};
const Router = require('koa-router');
const jwt = require('jsonwebtoken');
const moment = require('moment');
const stream_1 = require('stream');
const debugFactory = require('debug');
const PubSub = require('pubsub-js');
const catapult_1 = require('./catapult');
require('promisify-patch').patch();
const debug = debugFactory('routes');
exports.beepURL = 'https://s3.amazonaws.com/bwdemos/beep.mp3';
exports.tonesURL = 'https://s3.amazonaws.com/bwdemos/media/ring.mp3';
exports.jwtToken = '42VFYo1fiIaFa1nguHI2pmulRo2sKyf-';
const koaJwt = require('koa-jwt')({
    secret: exports.jwtToken
}).unless({ path: [/^\/public/, /^\/login/, /^\/register/, /^\/(\w+)Callback/, /^\/voiceMessagesStream/] });
function getRouter(app, models, api) {
    const router = new Router();
    router.use(require('koa-convert')(require('koa-body')()));
    router.use(koaJwt);
    router.use((ctx, next) => __awaiter(this, void 0, void 0, function* () {
        try {
            const userId = (ctx.state.user || '').replace(/\"/gi, '');
            if (userId) {
                const user = yield models.user.findById(userId).exec();
                if (user) {
                    ctx.user = user;
                }
            }
            yield next();
        }
        catch (err) {
            ctx.body = {
                code: err.status,
                message: err.message
            };
            ctx.status = err.status || 500;
        }
    }));
    const generateToken = (user) => __awaiter(this, void 0, void 0, function* () {
        const token = yield (jwt.sign).promise(user.id, exports.jwtToken, {});
        return { token: token, expire: moment().add(30, 'd').toISOString() };
    });
    router.get('/refreshToken', (ctx) => __awaiter(this, void 0, void 0, function* () {
        ctx.body = yield generateToken(ctx.user);
    }));
    router.post('/login', (ctx) => __awaiter(this, void 0, void 0, function* () {
        const body = ctx.request.body;
        if (!body.userName || !body.password) {
            return ctx.throw(400, 'Missing user name and/or password');
        }
        const user = yield models.user.findOne({ userName: body.userName }).exec();
        if (!user) {
            return ctx.throw(400, 'Missing user');
        }
        if (yield user.comparePassword(body.password)) {
            const token = yield (jwt.sign).promise(user.id, exports.jwtToken, {});
            ctx.body = yield generateToken(user);
        }
    }));
    router.post('/register', (ctx) => __awaiter(this, void 0, void 0, function* () {
        const body = ctx.request.body;
        if (!body.userName || !body.password || !body.areaCode) {
            return ctx.throw(400, 'Missing some required fields');
        }
        if (body.password !== body.repeatPassword) {
            return ctx.throw(400, 'Password are mismatched');
        }
        if (yield models.user.findOne({ userName: body.userName }).exec()) {
            return ctx.throw(400, 'User with such name is exists already');
        }
        const user = new models.user({ userName: body.userName, areaCode: body.areaCode });
        yield user.setPassword(body.password);
        debug(`Reserving phone number for area code ${body.areaCode}`);
        const phoneNumber = yield api.createPhoneNumber(ctx, body.areaCode);
        debug('Creating SIP account');
        const sipAccount = yield api.createSIPAccount(ctx);
        user.phoneNumber = phoneNumber;
        user.sipUri = sipAccount.uri;
        user.sipPassword = sipAccount.password;
        user.endpointId = sipAccount.endpointId;
        yield user.save();
        ctx.body = { id: user.id };
    }));
    router.get('/sipData', (ctx) => __awaiter(this, void 0, void 0, function* () {
        debug('Get SIP data');
        const token = yield api.createSIPAuthToken(ctx, ctx.user.endpointId);
        debug('Return SIP data as JSON');
        ctx.body = {
            phoneNumber: ctx.user.phoneNumber,
            sipUri: ctx.user.sipUri,
            sipPassword: ctx.user.sipPassword,
            token: token.token,
            expire: moment().add(token.expires, 's').toISOString()
        };
    }));
    router.post('/callCallback', (ctx) => __awaiter(this, void 0, void 0, function* () {
        debug(`Catapult Event: ${ctx.request.url}`);
        const form = ctx.request.body;
        debug(`Body: %j`, form);
        const primaryCallId = getPrimaryCallId(form.tag);
        const fromAnotherLeg = (primaryCallId !== '');
        let callId = '';
        if (fromAnotherLeg) {
            callId = primaryCallId;
        }
        else {
            callId = form.callId;
        }
        ctx.body = '';
        let user = yield getUserForCall(callId, models);
        switch (form.eventType) {
            case 'answer':
                debug('answer');
                const from = form.from;
                const to = form.to;
                if (fromAnotherLeg) {
                    debug('Another leg has answered');
                    yield api.stopPlayAudioToCall(callId);
                    break;
                }
                user = yield models.user.findOne({ $or: [{ sipUri: from }, { phoneNumber: to }] }).exec();
                if (!user) {
                    break;
                }
                if (to === user.phoneNumber) {
                    debug(`Bridging incoming call with ${user.sipUri}`);
                    const callerId = yield getCallerId(models, from);
                    yield api.playAudioToCall(callId, exports.tonesURL, true, '');
                    debug(`Using caller id ${callerId}`);
                    const bridgeId = yield api.createBridge({
                        callIds: [callId],
                        bridgeAudio: true
                    });
                    yield models.activeCall.create({
                        callId: callId,
                        bridgeId: bridgeId,
                        user: user.id,
                        from: from,
                        to: to,
                    });
                    debug(`Calling to another leg ${user.sipUri}`);
                    const anotherCallId = yield api.createCall({
                        bridgeId: bridgeId,
                        from: callerId,
                        to: user.sipUri,
                        tag: `AnotherLeg:${callId}`,
                        callTimeout: 10,
                        callbackUrl: catapult_1.buildAbsoluteUrl(ctx, `/callCallback`),
                    });
                    yield models.activeCall.create({
                        callId: anotherCallId,
                        bridgeId: bridgeId,
                        user: user.id,
                        from: callerId,
                        To: user.sipUri
                    });
                    break;
                }
                if (from === user.sipUri) {
                    debug(`Transfering outgoing call to  ${to}`);
                    yield api.transferCall(callId, to, user.phoneNumber);
                    return;
                }
                break;
            case 'speak':
            case 'playback':
                if (form.status === 'done') {
                    switch (form.tag) {
                        case 'Greeting':
                            debug('Play beep');
                            yield api.playAudioToCall(form.callId, exports.beepURL, false, 'Beep');
                            break;
                        case 'Beep':
                            debug('Starting call recording');
                            yield api.updateCall(form.callId, { recordingEnabled: true });
                            break;
                    }
                }
                break;
            case 'timeout':
                if (fromAnotherLeg) {
                    debug('Another leg timeout');
                    yield api.stopPlayAudioToCall(callId);
                    yield models.activeCall.update({ callId: callId }, { bridgeId: '' });
                    debug('Moving to voice mail');
                    yield playGreeting(api, callId, user);
                    break;
                }
            case 'recording':
                {
                    if (form.state === 'complete' && user) {
                        debug('Get recorded voice message info');
                        const recording = yield api.getRecording(form.recordingId);
                        const call = yield api.getCall(callId);
                        debug('Saving recorded voice message to db');
                        const message = new models.voiceMailMessage({
                            mediaUrl: recording.media,
                            startTime: new Date(recording.startTime),
                            endTime: new Date(recording.endTime),
                            user: user.id,
                            from: yield getCallerId(models, call.from),
                        });
                        yield message.save();
                        debug(`Publish SSE notification (for user ${user.userName})`);
                        PubSub.publish(user.id.toString(), message.toJSON());
                    }
                    break;
                }
            case 'hangup':
                callId = form.callId;
                debug(`Hangup ${callId}`);
                const activeCall = yield models.activeCall.findOne({ callId: callId }).exec();
                if (!activeCall || !activeCall.bridgeId) {
                    break;
                }
                debug(`Look for other calls`);
                const activeCalls = yield models.activeCall.find({ bridgeId: activeCall.bridgeId, callId: { $ne: callId } }).exec();
                debug(`Hangup other ${activeCalls.length} calls`);
                yield Promise.all(activeCalls.map((c) => api.hangup(c.callId)));
                break;
        }
    }));
    router.post('/recordGreeting', (ctx) => __awaiter(this, void 0, void 0, function* () {
        debug('Creating a call');
        const callId = yield api.createCall({
            from: ctx.user.phoneNumber,
            to: ctx.user.sipUri,
            callbackUrl: catapult_1.buildAbsoluteUrl(ctx, '/recordCallback')
        });
        debug('Saving created call');
        yield models.activeCall.create({
            user: ctx.user.id,
            callId: callId,
            from: ctx.user.phoneNumber,
            to: ctx.user.sipUri
        });
        ctx.body = '';
    }));
    router.post('/recordCallback', (ctx) => __awaiter(this, void 0, void 0, function* () {
        const form = (ctx.request).body;
        debug(`Catapult Event for greeting record: %j`, form);
        const user = yield getUserForCall(form.callId, models);
        const mainMenu = () => __awaiter(this, void 0, void 0, function* () {
            yield api.createGather(form.callId, {
                maxDigits: 1,
                interDigitTimeout: 30,
                prompt: {
                    sentence: 'Press 1 to listen to your current greeting. Press 2 to record new greeting. Press 3 to set greeting to default.'
                },
                tag: 'mainMenu'
            });
        });
        ctx.body = '';
        switch (form.eventType) {
            case 'answer':
                debug('Play voice menu');
                return yield mainMenu();
            case 'gather':
                debug('Gather %j', form);
                if (form.state === 'completed') {
                    switch (form.tag) {
                        case 'mainMenu': {
                            switch (form.digits) {
                                case '1':
                                    debug('Play greeting');
                                    return yield playGreeting(api, form.callId, user);
                                case '2':
                                    debug('Record greeting');
                                    return yield api.speakSentenceToCall(form.callId, 'Say your greeting after beep. Press 0 to complete recording.', 'PlayBeep');
                                case '3':
                                    debug('Reset greeting');
                                    yield models.user.update({ _id: user.id }, { $set: { greetingUrl: '' } });
                                    return yield api.speakSentenceToCall(form.callId, 'Your greeting has been set to default.', 'PlayMenu');
                            }
                        }
                        case 'GreetingRecording': {
                            if (form.digits === '0') {
                                debug('Stop greeting recording');
                                yield api.updateCall(form.callId, { recordingEnabled: false });
                            }
                        }
                    }
                }
                break;
            case `recording`:
                if (form.state === 'complete') {
                    const recording = yield api.getRecording(form.recordingId);
                    yield models.user.update({ _id: user.id }, { $set: { greetingUrl: recording.media } });
                    const call = yield api.getCall(form.callId);
                    if (call.state === 'active') {
                        return yield api.speakSentenceToCall(form.callId, 'Your greeting has been saved.', 'PlayMenu');
                    }
                }
                break;
            case 'speak':
            case 'playback':
                if (form.status === 'done') {
                    switch (form.tag) {
                        case 'PlayBeep':
                            debug('Play beep');
                            return yield api.playAudioToCall(form.callId, exports.beepURL, false, 'Beep');
                        case 'Beep':
                            debug('Start greeting recording');
                            yield api.updateCall(form.callId, { recordingEnabled: true });
                            yield api.createGather(form.callId, {
                                maxDigits: 1,
                                interDigitTimeout: 30,
                                tag: 'GreetingRecording'
                            });
                            break;
                        default:
                            return yield mainMenu();
                    }
                }
                break;
        }
    }));
    router.get('/voiceMessages', (ctx) => __awaiter(this, void 0, void 0, function* () {
        const list = yield models.voiceMailMessage.find({ user: ctx.user.id }).sort({ startTime: -1 }).exec();
        ctx.body = list.map(i => i.toJSON());
    }));
    router.get('/voiceMessages/:id/media', (ctx) => __awaiter(this, void 0, void 0, function* () {
        const voiceMessage = yield models.voiceMailMessage.findOne({ _id: ctx.params.id, user: ctx.user.id }).exec();
        if (!voiceMessage) {
            return ctx.throw(404);
        }
        const parts = (voiceMessage.mediaUrl || '').split('/');
        const file = yield api.downloadMediaFile(parts[parts.length - 1]);
        ctx.type = file.contentType;
        ctx.body = file.content;
    }));
    router.delete('/voiceMessages/:id', (ctx) => __awaiter(this, void 0, void 0, function* () {
        yield models.voiceMailMessage.remove({ _id: ctx.params.id, user: ctx.user.id });
        ctx.body = '';
    }));
    router.get('/voiceMessagesStream', (ctx) => __awaiter(this, void 0, void 0, function* () {
        const token = ctx.request.query.token;
        if (!token) {
            return ctx.throw(400, 'Missing token');
        }
        const userId = (yield jwt.verify.promise(token, exports.jwtToken)).replace(/\"/g, '');
        const user = yield models.user.findById(userId).exec();
        if (!user) {
            return ctx.throw(404);
        }
        const req = ctx.req;
        const stream = new SimpleReadable();
        req.setTimeout(Number.MAX_VALUE, () => { });
        ctx.set('Cache-Control', 'no-cache');
        ctx.set('Connection', 'keep-alive');
        ctx.type = 'text/event-stream';
        stream.push(new Buffer('\n'));
        debug('Start SSE streaming');
        ctx.body = stream;
        const subToken = PubSub.subscribe(userId, (message, data) => {
            if (data) {
                debug('Emit SSE event');
                stream.push(new Buffer(`data: ${JSON.stringify(data)}\n\n`));
            }
        });
        const close = () => {
            PubSub.unsubscribe(subToken);
            req.socket.removeListener('error', close);
            req.socket.removeListener('close', close);
        };
        req.socket.on('error', close);
        req.socket.on('close', close);
    }));
    return router;
}
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = getRouter;
function getPrimaryCallId(tag) {
    const values = (tag || '').split(':');
    if (values.length === 2 && values[0] === 'AnotherLeg') {
        return values[1];
    }
    return '';
}
function getUserForCall(callId, models) {
    return __awaiter(this, void 0, Promise, function* () {
        debug(`Get user for call ${callId}`);
        const call = yield models.activeCall.findOne({ callId: callId }).populate('user').exec();
        if (call && call.user) {
            debug(`Found user ${call.user.id} for call ${callId}`);
            return call.user;
        }
        return null;
    });
}
function getCallerId(models, phoneNumber) {
    return __awaiter(this, void 0, Promise, function* () {
        if (phoneNumber.startsWith('sip:')) {
            const user = yield models.user.findOne({ sipUri: phoneNumber }).exec();
            if (user) {
                return user.phoneNumber;
            }
        }
        return phoneNumber;
    });
}
function playGreeting(api, callId, user) {
    return __awaiter(this, void 0, void 0, function* () {
        if (user.greetingUrl) {
            debug(`Play user's greeting`);
            yield api.playAudioToCall(callId, user.greetingUrl, false, 'Greeting');
        }
        else {
            debug('Play default greeting');
            yield api.speakSentenceToCall(callId, 'Hello. Please leave a message after beep.', 'Greeting');
        }
    });
}
class SimpleReadable extends stream_1.Readable {
    _read(size) {
    }
}
exports.SimpleReadable = SimpleReadable;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicm91dGVzLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsicm91dGVzLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7Ozs7Ozs7OztBQUNBLE1BQVksTUFBTSxXQUFNLFlBQVksQ0FBQyxDQUFBO0FBQ3JDLE1BQVksR0FBRyxXQUFNLGNBQWMsQ0FBQyxDQUFBO0FBQ3BDLE1BQVksTUFBTSxXQUFNLFFBQVEsQ0FBQyxDQUFBO0FBQ2pDLHlCQUF1QixRQUFRLENBQUMsQ0FBQTtBQUVoQyxNQUFZLFlBQVksV0FBTSxPQUFPLENBQUMsQ0FBQTtBQUN0QyxNQUFZLE1BQU0sV0FBTSxXQUFXLENBQUMsQ0FBQTtBQUdwQywyQkFBNkMsWUFBWSxDQUFDLENBQUE7QUFFMUQsT0FBTyxDQUFDLGlCQUFpQixDQUFDLENBQUMsS0FBSyxFQUFFLENBQUM7QUFFbkMsTUFBTSxLQUFLLEdBQUcsWUFBWSxDQUFDLFFBQVEsQ0FBQyxDQUFDO0FBRXhCLGVBQU8sR0FBRywyQ0FBMkMsQ0FBQztBQUN0RCxnQkFBUSxHQUFHLGlEQUFpRCxDQUFDO0FBQzdELGdCQUFRLEdBQUcsa0NBQWtDLENBQUM7QUFFM0QsTUFBTSxNQUFNLEdBQUcsT0FBTyxDQUFDLFNBQVMsQ0FBQyxDQUFDO0lBQ2pDLE1BQU0sRUFBRSxnQkFBUTtDQUNoQixDQUFDLENBQUMsTUFBTSxDQUFDLEVBQUUsSUFBSSxFQUFFLENBQUMsV0FBVyxFQUFFLFVBQVUsRUFBRSxhQUFhLEVBQUUsa0JBQWtCLEVBQUUsd0JBQXdCLENBQUMsRUFBRSxDQUFDLENBQUM7QUFPNUcsbUJBQWtDLEdBQVEsRUFBRSxNQUFlLEVBQUUsR0FBaUI7SUFDN0UsTUFBTSxNQUFNLEdBQUcsSUFBSSxNQUFNLEVBQUUsQ0FBQztJQUM1QixNQUFNLENBQUMsR0FBRyxDQUFDLE9BQU8sQ0FBQyxhQUFhLENBQUMsQ0FBQyxPQUFPLENBQUMsVUFBVSxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUM7SUFDMUQsTUFBTSxDQUFDLEdBQUcsQ0FBQyxN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RyxDQUFDLG1CQUFtQixDQUFDLE1BQU0sRUFBRSwyQ0FBMkMsRUFBRSxVQUFVLENBQUMsQ0FBQztRQUNoRyxDQUFDO0lBQ0YsQ0FBQztDQUFBO0FBRUQsNkJBQW9DLGlCQUFRO0lBQzNDLEtBQUssQ0FBQyxJQUFZO0lBQ2xCLENBQUM7QUFDRixDQUFDO0FBSFksc0JBQWMsaUJBRzFCLENBQUEiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgKiBhcyBLb2EgZnJvbSAna29hJztcbmltcG9ydCAqIGFzIFJvdXRlciBmcm9tICdrb2Etcm91dGVyJztcbmltcG9ydCAqIGFzIGp3dCBmcm9tICdqc29ud2VidG9rZW4nO1xuaW1wb3J0ICogYXMgbW9tZW50IGZyb20gJ21vbWVudCc7XG5pbXBvcnQge1JlYWRhYmxlfSBmcm9tICdzdHJlYW0nO1xuaW1wb3J0IHtRdWVyeX0gZnJvbSAnbW9uZ29vc2UnO1xuaW1wb3J0ICogYXMgZGVidWdGYWN0b3J5IGZyb20gJ2RlYnVnJztcbmltcG9ydCAqIGFzIFB1YlN1YiBmcm9tICdwdWJzdWItanMnO1xuXG5pbXBvcnQge0lVc2VyLCBJQWN0aXZlQ2FsbCwgSVZvaWNlTWFpbE1lc3NhZ2UsIElNb2RlbHN9IGZyb20gJy4vbW9kZWxzJztcbmltcG9ydCB7SUNhdGFwdWx0QXBpLCBidWlsZEFic29sdXRlVXJsfSBmcm9tICcuL2NhdGFwdWx0JztcblxucmVxdWlyZSgncHJvbWlzaWZ5LXBhdGNoJykucGF0Y2goKTtcblxuY29uc3QgZGVidWcgPSBkZWJ1Z0ZhY3RvcnkoJ3JvdXRlcycpO1xuXG5leHBvcnQgY29uc3QgYmVlcFVSTCA9ICdodHRwczovL3MzLmFtYXpvbmF3cy5jb20vYndkZW1vcy9iZWVwLm1wMyc7XG5leHBvcnQgY29uc3QgdG9uZXNVUkwgPSAnaHR0cHM6Ly9zMy5hbWF6b25hd3MuY29tL2J3ZGVtb3MvbWVkaWEvcmluZy5tcDMnO1xuZXhwb3J0IGNvbnN0IGp3dFRva2VuID0gJzQyVkZZbzFmaUlhRmExbmd1SEkycG11bFJvMnNLeWYtJztcblxuY29uc3Qga29hSnd0ID0gcmVxdWlyZSgna29hLWp3dCcpKHtcblx0c2VjcmV0OiBqd3RUb2tlblxufSkudW5sZXNzKHsgcGF0aDogWy9eXFwvcHVibGljLywgL15cXC9sb2dpbi8sIC9eXFwvcmVnaXN0ZXIvLCAvXlxcLyhcXHcrKUNhbGxiYWNrLywgL15cXC92b2ljZU1lc3NhZ2VzU3RyZWFtL10gfSk7XG5cbmV4cG9ydCBpbnRlcmZhY2UgSUNvbnRleHQgZXh0ZW5kcyBSb3V0ZXIuSVJvdXRlckNvbnRleHQge1xuXHR1c2VyOiBJVXNlcjtcblx0YXBpOiBJQ2F0YXB1bHRBcGk7XG59XG5cbmV4cG9ydCBkZWZhdWx0IGZ1bmN0aW9uIGdldFJvdXRlcihhcHA6IEtvYSwgbW9kZWxzOiBJTW9kZWxzLCBhcGk6IElDYXRhcHVsdEFwaSk6IFJvdXRlciB7XG5cdGNvbnN0IHJvdXRlciA9IG5ldyBSb3V0ZXIoKTtcblx0cm91dGVyLnVzZShyZXF1aXJlKCdrb2EtY29udmVydCcpKHJlcXVpcmUoJ2tvYS1ib2R5JykoKSkpO1xuXHRyb3V0ZXIudXNlKGtvYUp3dCk7XG5cdHJvdXRlci51c2UoYXN5bmMgKGN0eDogSUNvbnRleHQsIG5leHQ6IEZ1bmN0aW9uKSA9PiB7XG5cdFx0dHJ5IHtcblx0XHRcdGNvbnN0IHVzZXJJZCA9IChjdHguc3RhdGUudXNlciB8fCAnJykucmVwbGFjZSgvXFxcIi9naSwgJycpO1xuXHRcdFx0aWYgKHVzZXJJZCkge1xuXHRcdFx0XHRjb25zdCB1c2VyID0gYXdhaXQgbW9kZWxzLnVzZXIuZmluZEJ5SWQodXNlcklkKS5leGVjKCk7XG5cdFx0XHRcdGlmICh1c2VyKSB7XG5cdFx0XHRcdFx0Y3R4LnVzZXIgPSA8SVVzZXI+dXNlcjtcblx0XHRcdFx0fVxuXHRcdFx0fVxuXHRcdFx0YXdhaXQgbmV4dCgpO1xuXHRcdH1cblx0XHRjYXRjaCAoZXJyKSB7XG5cdFx0XHRjdHguYm9keSA9IHtcblx0XHRcdFx0Y29kZTogZXJyLnN0YXR1cyxcblx0XHRcdFx0bWVzc2FnZTogZXJyLm1lc3NhZ2Vcblx0XHRcdH07XG5cdFx0XHRjdHguc3RhdHVzID0gZXJyLnN0YXR1cyB8fCA1MDA7XG5cdFx0fVxuXHR9KTtcblxuXHRjb25zdCBnZW5lcmF0ZVRva2VuID0gYXN5bmMgKHVzZXI6IElVc2VyKSA9PiB7XG5cdFx0Y29uc3QgdG9rZW4gPSBhd2FpdCAoPGFueT4oand0LnNpZ24pKS5wcm9taXNlKHVzZXIuaWQsIGp3dFRva2VuLCB7fSk7XG5cdFx0cmV0dXJuIHsgdG9rZW4sIGV4cGlyZTogbW9tZW50KCkuYWRkKDMwLCAnZCcpLnRvSVNPU3RyaW5nKCkgfTtcblx0fTtcblxuXHRyb3V0ZXIuZ2V0KCcvcmVmcmVzaFRva2VuJywgYXN5bmMgKGN0eDogSUNvbnRleHQpID0+IHtcblx0XHRjdHguYm9keSA9IGF3YWl0IGdlbmVyYXRlVG9rZW4oY3R4LnVzZXIpO1xuXHR9KTtcblxuXHRyb3V0ZXIucG9zdCgnL2xvZ2luJywgYXN5bmMgKGN0eDogSUNvbnRleHQpID0+IHtcblx0XHRjb25zdCBib2R5ID0gKDxhbnk+Y3R4LnJlcXVlc3QpLmJvZHk7XG5cdFx0aWYgKCFib2R5LnVzZXJOYW1lIHx8ICFib2R5LnBhc3N3b3JkKSB7XG5cdFx0XHRyZXR1cm4gY3R4LnRocm93KDQwMCwgJ01pc3NpbmcgdXNlciBuYW1lIGFuZC9vciBwYXNzd29yZCcpO1xuXHRcdH1cblx0XHRjb25zdCB1c2VyID0gYXdhaXQgbW9kZWxzLnVzZXIuZmluZE9uZSh7IHVzZXJOYW1lOiBib2R5LnVzZXJOYW1lIH0pLmV4ZWMoKTtcblx0XHRpZiAoIXVzZXIpIHtcblx0XHRcdHJldHVybiBjdHgudGhyb3coNDAwLCAnTWlzc2luZyB1c2VyJyk7XG5cdFx0fVxuXHRcdGlmIChhd2FpdCB1c2VyLmNvbXBhcmVQYXNzd29yZChib2R5LnBhc3N3b3JkKSkge1xuXHRcdFx0Y29uc3QgdG9rZW4gPSBhd2FpdCAoPGFueT4oand0LnNpZ24pKS5wcm9taXNlKHVzZXIuaWQsIGp3dFRva2VuLCB7fSk7XG5cdFx0XHRjdHguYm9keSA9IGF3YWl0IGdlbmVyYXRlVG9rZW4odXNlcik7XG5cdFx0fVxuXG5cdH0pO1xuXG5cdHJvdXRlci5wb3N0KCcvcmVnaXN0ZXInLCBhc3luYyAoY3R4OiBJQ29udGV4dCkgPT4ge1xuXHRcdGNvbnN0IGJvZHkgPSAoPGFueT5jdHgucmVxdWVzdCkuYm9keTtcblx0XHRpZiAoIWJvZHkudXNlck5hbWUgfHwgIWJvZHkucGFzc3dvcmQgfHwgIWJvZHkuYXJlYUNvZGUpIHtcblx0XHRcdHJldHVybiBjdHgudGhyb3coNDAwLCAnTWlzc2luZyBzb21lIHJlcXVpcmVkIGZpZWxkcycpO1xuXHRcdH1cblx0XHRpZiAoYm9keS5wYXNzd29yZCAhPT0gYm9keS5yZXBlYXRQYXNzd29yZCkge1xuXHRcdFx0cmV0dXJuIGN0eC50aHJvdyg0MDAsICdQYXNzd29yZCBhcmUgbWlzbWF0Y2hlZCcpO1xuXHRcdH1cblx0XHRpZiAoYXdhaXQgbW9kZWxzLnVzZXIuZmluZE9uZSh7IHVzZXJOYW1lOiBib2R5LnVzZXJOYW1lIH0pLmV4ZWMoKSkge1xuXHRcdFx0cmV0dXJuIGN0eC50aHJvdyg0MDAsICdVc2VyIHdpdGggc3VjaCBuYW1lIGlzIGV4aXN0cyBhbHJlYWR5Jyk7XG5cdFx0fVxuXHRcdGNvbnN0IHVzZXIgPSBuZXcgbW9kZWxzLnVzZXIoeyB1c2VyTmFtZTogYm9keS51c2VyTmFtZSwgYXJlYUNvZGU6IGJvZHkuYXJlYUNvZGUgfSk7XG5cdFx0YXdhaXQgdXNlci5zZXRQYXNzd29yZChib2R5LnBhc3N3b3JkKTtcblxuXHRcdGRlYnVnKGBSZXNlcnZpbmcgcGhvbmUgbnVtYmVyIGZvciBhcmVhIGNvZGUgJHtib2R5LmFyZWFDb2RlfWApO1xuXHRcdGNvbnN0IHBob25lTnVtYmVyID0gYXdhaXQgYXBpLmNyZWF0ZVBob25lTnVtYmVyKGN0eCwgYm9keS5hcmVhQ29kZSk7XG5cdFx0ZGVidWcoJ0NyZWF0aW5nIFNJUCBhY2NvdW50Jyk7XG5cdFx0Y29uc3Qgc2lwQWNjb3VudCA9IGF3YWl0IGFwaS5jcmVhdGVTSVBBY2NvdW50KGN0eCk7XG5cdFx0dXNlci5waG9uZU51bWJlciA9IHBob25lTnVtYmVyO1xuXHRcdHVzZXIuc2lwVXJpID0gc2lwQWNjb3VudC51cmk7XG5cdFx0dXNlci5zaXBQYXNzd29yZCA9IHNpcEFjY291bnQucGFzc3dvcmQ7XG5cdFx0dXNlci5lbmRwb2ludElkID0gc2lwQWNjb3VudC5lbmRwb2ludElkO1xuXHRcdGF3YWl0IHVzZXIuc2F2ZSgpO1xuXHRcdGN0eC5ib2R5ID0geyBpZDogdXNlci5pZCB9O1xuXHR9KTtcblxuXHRyb3V0ZXIuZ2V0KCcvc2lwRGF0YScsIGFzeW5jIChjdHg6IElDb250ZXh0KSA9PiB7XG5cdFx0ZGVidWcoJ0dldCBTSVAgZGF0YScpO1xuXHRcdGNvbnN0IHRva2VuID0gYXdhaXQgYXBpLmNyZWF0ZVNJUEF1dGhUb2tlbihjdHgsIGN0eC51c2VyLmVuZHBvaW50SWQpO1xuXHRcdGRlYnVnKCdSZXR1cm4gU0lQIGRhdGEgYXMgSlNPTicpO1xuXHRcdGN0eC5ib2R5ID0ge1xuXHRcdFx0cGhvbmVOdW1iZXI6IGN0eC51c2VyLnBob25lTnVtYmVyLFxuXHRcdFx0c2lwVXJpOiBjdHgudXNlci5zaXBVcmksXG5cdFx0XHRzaXBQYXNzd29yZDogY3R4LnVzZXIuc2lwUGFzc3dvcmQsXG5cdFx0XHR0b2tlbjogdG9rZW4udG9rZW4sXG5cdFx0XHRleHBpcmU6IG1vbWVudCgpLmFkZCh0b2tlbi5leHBpcmVzLCAncycpLnRvSVNPU3RyaW5nKClcblx0XHR9O1xuXHR9KTtcblxuXHRyb3V0ZXIucG9zdCgnL2NhbGxDYWxsYmFjaycsIGFzeW5jIChjdHg6IElDb250ZXh0KSA9PiB7XG5cdFx0ZGVidWcoYENhdGFwdWx0IEV2ZW50OiAke2N0eC5yZXF1ZXN0LnVybH1gKTtcblx0XHRjb25zdCBmb3JtID0gKDxhbnk+Y3R4LnJlcXVlc3QpLmJvZHk7XG5cdFx0ZGVidWcoYEJvZHk6ICVqYCwgZm9ybSk7XG5cdFx0Y29uc3QgcHJpbWFyeUNhbGxJZCA9IGdldFByaW1hcnlDYWxsSWQoZm9ybS50YWcpO1xuXHRcdGNvbnN0IGZyb21Bbm90aGVyTGVnID0gKHByaW1hcnlDYWxsSWQgIT09ICcnKTtcblx0XHRsZXQgY2FsbElkOiBzdHJpbmcgPSAnJztcblx0XHRpZiAoZnJvbUFub3RoZXJMZWcpIHtcblx0XHRcdGNhbGxJZCA9IHByaW1hcnlDYWxsSWQ7XG5cdFx0fSBlbHNlIHtcblx0XHRcdGNhbGxJZCA9IGZvcm0uY2FsbElkO1xuXHRcdH1cblx0XHRjdHguYm9keSA9ICcnO1xuXHRcdGxldCB1c2VyID0gYXdhaXQgZ2V0VXNlckZvckNhbGwoY2FsbElkLCBtb2RlbHMpO1xuXHRcdHN3aXRjaCAoZm9ybS5ldmVudFR5cGUpIHtcblx0XHRcdGNhc2UgJ2Fuc3dlcic6XG5cdFx0XHRcdGRlYnVnKCdhbnN3ZXInKTtcblx0XHRcdFx0Y29uc3QgZnJvbSA9IGZvcm0uZnJvbTtcblx0XHRcdFx0Y29uc3QgdG8gPSBmb3JtLnRvO1xuXHRcdFx0XHRpZiAoZnJvbUFub3RoZXJMZWcpIHtcblx0XHRcdFx0XHRkZWJ1ZygnQW5vdGhlciBsZWcgaGFzIGFuc3dlcmVkJyk7XG5cdFx0XHRcdFx0YXdhaXQgYXBpLnN0b3BQbGF5QXVkaW9Ub0NhbGwoY2FsbElkKTsgLy8gc3RvcCB0b25lc1xuXHRcdFx0XHRcdGJyZWFrO1xuXHRcdFx0XHR9XG5cdFx0XHRcdHVzZXIgPSBhd2FpdCBtb2RlbHMudXNlci5maW5kT25lKHsgJG9yOiBbeyBzaXBVcmk6IGZyb20gfSwgeyBwaG9uZU51bWJlcjogdG8gfV0gfSkuZXhlYygpO1xuXHRcdFx0XHRpZiAoIXVzZXIpIHtcblx0XHRcdFx0XHRicmVhaztcblx0XHRcdFx0fVxuXHRcdFx0XHRpZiAodG8gPT09IHVzZXIucGhvbmVOdW1iZXIpIHtcblx0XHRcdFx0XHRkZWJ1ZyhgQnJpZGdpbmcgaW5jb21pbmcgY2FsbCB3aXRoICR7dXNlci5zaXBVcml9YCk7XG5cdFx0XHRcdFx0Y29uc3QgY2FsbGVySWQgPSBhd2FpdCBnZXRDYWxsZXJJZChtb2RlbHMsIGZyb20pO1xuXHRcdFx0XHRcdGF3YWl0IGFwaS5wbGF5QXVkaW9Ub0NhbGwoY2FsbElkLCB0b25lc1VSTCwgdHJ1ZSwgJycpO1xuXG5cdFx0XHRcdFx0ZGVidWcoYFVzaW5nIGNhbGxlciBpZCAke2NhbGxlcklkfWApO1xuXHRcdFx0XHRcdGNvbnN0IGJyaWRnZUlkID0gYXdhaXQgYXBpLmNyZWF0ZUJyaWRnZSh7XG5cdFx0XHRcdFx0XHRjYWxsSWRzOiBbY2FsbElkXSxcblx0XHRcdFx0XHRcdGJyaWRnZUF1ZGlvOiB0cnVlXG5cdFx0XHRcdFx0fSk7XG5cblx0XHRcdFx0XHQvLyBzYXZlIGN1cnJlbnQgY2FsbCBkYXRhIHRvIGRiXG5cdFx0XHRcdFx0YXdhaXQgbW9kZWxzLmFjdGl2ZUNhbGwuY3JlYXRlKHtcblx0XHRcdFx0XHRcdGNhbGxJZCxcblx0XHRcdFx0XHRcdGJyaWRnZUlkLFxuXHRcdFx0XHRcdFx0dXNlcjogdXNlci5pZCxcblx0XHRcdFx0XHRcdGZyb20sXG5cdFx0XHRcdFx0XHR0byxcblx0XHRcdFx0XHR9KTtcblxuXHRcdFx0XHRcdGRlYnVnKGBDYWxsaW5nIHRvIGFub3RoZXIgbGVnICR7dXNlci5zaXBVcml9YCk7XG5cblx0XHRcdFx0XHRjb25zdCBhbm90aGVyQ2FsbElkID0gYXdhaXQgYXBpLmNyZWF0ZUNhbGwoe1xuXHRcdFx0XHRcdFx0YnJpZGdlSWQsXG5cdFx0XHRcdFx0XHRmcm9tOiBjYWxsZXJJZCxcblx0XHRcdFx0XHRcdHRvOiB1c2VyLnNpcFVyaSxcblx0XHRcdFx0XHRcdHRhZzogYEFub3RoZXJMZWc6JHtjYWxsSWR9YCxcblx0XHRcdFx0XHRcdGNhbGxUaW1lb3V0OiAxMCxcblx0XHRcdFx0XHRcdGNhbGxiYWNrVXJsOiBidWlsZEFic29sdXRlVXJsKGN0eCwgYC9jYWxsQ2FsbGJhY2tgKSxcblx0XHRcdFx0XHR9KTtcblxuXHRcdFx0XHRcdC8vIHNhdmUgYnJpZGdlZCBjYWxsIGRhdGEgdG8gZGIgdG9vXG5cdFx0XHRcdFx0YXdhaXQgbW9kZWxzLmFjdGl2ZUNhbGwuY3JlYXRlKHtcblx0XHRcdFx0XHRcdGNhbGxJZDogYW5vdGhlckNhbGxJZCxcblx0XHRcdFx0XHRcdGJyaWRnZUlkLFxuXHRcdFx0XHRcdFx0dXNlcjogdXNlci5pZCxcblx0XHRcdFx0XHRcdGZyb206IGNhbGxlcklkLFxuXHRcdFx0XHRcdFx0VG86IHVzZXIuc2lwVXJpXG5cdFx0XHRcdFx0fSk7XG5cdFx0XHRcdFx0YnJlYWs7XG5cdFx0XHRcdH1cblx0XHRcdFx0aWYgKGZyb20gPT09IHVzZXIuc2lwVXJpKSB7XG5cdFx0XHRcdFx0ZGVidWcoYFRyYW5zZmVyaW5nIG91dGdvaW5nIGNhbGwgdG8gICR7dG99YCk7XG5cdFx0XHRcdFx0YXdhaXQgYXBpLnRyYW5zZmVyQ2FsbChjYWxsSWQsIHRvLCB1c2VyLnBob25lTnVtYmVyKTtcblx0XHRcdFx0XHRyZXR1cm47XG5cdFx0XHRcdH1cblx0XHRcdFx0YnJlYWs7XG5cdFx0XHRjYXNlICdzcGVhayc6XG5cdFx0XHRjYXNlICdwbGF5YmFjayc6XG5cdFx0XHRcdGlmIChmb3JtLnN0YXR1cyA9PT0gJ2RvbmUnKSB7XG5cdFx0XHRcdFx0c3dpdGNoIChmb3JtLnRhZykge1xuXHRcdFx0XHRcdFx0Y2FzZSAnR3JlZXRpbmcnOlxuXHRcdFx0XHRcdFx0XHQvLyBhZnRlciBncmVldGluZyBwbGF5IGJlZXBcblx0XHRcdFx0XHRcdFx0ZGVidWcoJ1BsYXkgYmVlcCcpO1xuXHRcdFx0XHRcdFx0XHRhd2FpdCBhcGkucGxheUF1ZGlvVG9DYWxsKGZvcm0uY2FsbElkLCBiZWVwVVJMLCBmYWxzZSwgJ0JlZXAnKTtcblx0XHRcdFx0XHRcdFx0YnJlYWs7XG5cdFx0XHRcdFx0XHRjYXNlICdCZWVwJzpcblx0XHRcdFx0XHRcdFx0Ly8gYWZ0ZXIgYmVlcCBzcmFydCB2b2ljZSBtZXNzYWdlIHJlY29yZGluZ1xuXHRcdFx0XHRcdFx0XHRkZWJ1ZygnU3RhcnRpbmcgY2FsbCByZWNvcmRpbmcnKTtcblx0XHRcdFx0XHRcdFx0YXdhaXQgYXBpLnVwZGF0ZUNhbGwoZm9ybS5jYWxsSWQsIHsgcmVjb3JkaW5nRW5hYmxlZDogdHJ1ZSB9KTtcblx0XHRcdFx0XHRcdFx0YnJlYWs7XG5cdFx0XHRcdFx0fVxuXHRcdFx0XHR9XG5cdFx0XHRcdGJyZWFrO1xuXHRcdFx0Y2FzZSAndGltZW91dCc6XG5cdFx0XHRcdGlmIChmcm9tQW5vdGhlckxlZykge1xuXHRcdFx0XHRcdC8vIGFub3RoZXIgbGVnIGRpZG4ndCBhbnN3ZXIgY2FsbCAoZm9yIGJyaWRnZWQgaW5jb21pbmcgY2FsbClcblx0XHRcdFx0XHRkZWJ1ZygnQW5vdGhlciBsZWcgdGltZW91dCcpO1xuXHRcdFx0XHRcdGF3YWl0IGFwaS5zdG9wUGxheUF1ZGlvVG9DYWxsKGNhbGxJZCk7XG5cdFx0XHRcdFx0YXdhaXQgbW9kZWxzLmFjdGl2ZUNhbGwudXBkYXRlKHsgY2FsbElkOiBjYWxsSWQgfSwgeyBicmlkZ2VJZDogJycgfSk7IC8vIHRvIHN1cHByZXNzIGhhbmcgdXAgdGhpcyBjYWxsIHRvb1xuXHRcdFx0XHRcdGRlYnVnKCdNb3ZpbmcgdG8gdm9pY2UgbWFpbCcpO1xuXHRcdFx0XHRcdGF3YWl0IHBsYXlHcmVldGluZyhhcGksIGNhbGxJZCwgdXNlcik7XG5cdFx0XHRcdFx0YnJlYWs7XG5cdFx0XHRcdH1cblx0XHRcdGNhc2UgJ3JlY29yZGluZyc6XG5cdFx0XHRcdHtcblx0XHRcdFx0XHRpZiAoZm9ybS5zdGF0ZSA9PT0gJ2NvbXBsZXRlJyAmJiB1c2VyKSB7XG5cdFx0XHRcdFx0XHQvLyBWb2ljZSBtZXNzYWdlIGhhcyBiZWVuIHJlY29yZGVkLiBTYXZlIGl0IGludG8gZGIuXG5cdFx0XHRcdFx0XHRkZWJ1ZygnR2V0IHJlY29yZGVkIHZvaWNlIG1lc3NhZ2UgaW5mbycpO1xuXHRcdFx0XHRcdFx0Y29uc3QgcmVjb3JkaW5nID0gYXdhaXQgYXBpLmdldFJlY29yZGluZyhmb3JtLnJlY29yZGluZ0lkKTtcblx0XHRcdFx0XHRcdGNvbnN0IGNhbGwgPSBhd2FpdCBhcGkuZ2V0Q2FsbChjYWxsSWQpO1xuXHRcdFx0XHRcdFx0ZGVidWcoJ1NhdmluZyByZWNvcmRlZCB2b2ljZSBtZXNzYWdlIHRvIGRiJyk7XG5cdFx0XHRcdFx0XHRjb25zdCBtZXNzYWdlID0gbmV3IG1vZGVscy52b2ljZU1haWxNZXNzYWdlKHtcblx0XHRcdFx0XHRcdFx0bWVkaWFVcmw6IHJlY29yZGluZy5tZWRpYSxcblx0XHRcdFx0XHRcdFx0c3RhcnRUaW1lOiBuZXcgRGF0ZShyZWNvcmRpbmcuc3RhcnRUaW1lKSxcblx0XHRcdFx0XHRcdFx0ZW5kVGltZTogbmV3IERhdGUocmVjb3JkaW5nLmVuZFRpbWUpLFxuXHRcdFx0XHRcdFx0XHR1c2VyOiB1c2VyLmlkLFxuXHRcdFx0XHRcdFx0XHRmcm9tOiBhd2FpdCBnZXRDYWxsZXJJZChtb2RlbHMsIGNhbGwuZnJvbSksXG5cdFx0XHRcdFx0XHR9KTtcblx0XHRcdFx0XHRcdGF3YWl0IG1lc3NhZ2Uuc2F2ZSgpO1xuXG5cdFx0XHRcdFx0XHQvLyBzZW5kIG5vdGlmaWNhdGlvbiBhYm91dCBuZXcgdm9pY2UgbWFpbCBtZXNzYWdlXG5cdFx0XHRcdFx0XHRkZWJ1ZyhgUHVibGlzaCBTU0Ugbm90aWZpY2F0aW9uIChmb3IgdXNlciAke3VzZXIudXNlck5hbWV9KWApO1xuXHRcdFx0XHRcdFx0UHViU3ViLnB1Ymxpc2godXNlci5pZC50b1N0cmluZygpLCBtZXNzYWdlLnRvSlNPTigpKTtcblx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0YnJlYWs7XG5cdFx0XHRcdH1cblx0XHRcdGNhc2UgJ2hhbmd1cCc6XG5cdFx0XHRcdGNhbGxJZCA9IGZvcm0uY2FsbElkO1xuXHRcdFx0XHRkZWJ1ZyhgSGFuZ3VwICR7Y2FsbElkfWApO1xuXHRcdFx0XHQvLyBsb29rIGZvciBicmlkZ2UgZGF0YSBmb3IgY2FsbCBmaXJzdFxuXHRcdFx0XHRjb25zdCBhY3RpdmVDYWxsID0gYXdhaXQgbW9kZWxzLmFjdGl2ZUNhbGwuZmluZE9uZSh7IGNhbGxJZCB9KS5leGVjKCk7XG5cdFx0XHRcdGlmICghYWN0aXZlQ2FsbCB8fCAhYWN0aXZlQ2FsbC5icmlkZ2VJZCkge1xuXHRcdFx0XHRcdGJyZWFrO1xuXHRcdFx0XHR9XG5cdFx0XHRcdC8vIHRoZW4gbG9vayBmb3Igb3RoZXIgY2FsbHMgaW4gdGhlIGJyaWRnZVxuXHRcdFx0XHRkZWJ1ZyhgTG9vayBmb3Igb3RoZXIgY2FsbHNgKTtcblx0XHRcdFx0Y29uc3QgYWN0aXZlQ2FsbHMgPSBhd2FpdCBtb2RlbHMuYWN0aXZlQ2FsbC5maW5kKHsgYnJpZGdlSWQ6IGFjdGl2ZUNhbGwuYnJpZGdlSWQsIGNhbGxJZDogeyRuZTogY2FsbElkIH0gfSkuZXhlYygpO1xuXG5cdFx0XHRcdGRlYnVnKGBIYW5ndXAgb3RoZXIgJHthY3RpdmVDYWxscy5sZW5ndGh9IGNhbGxzYCk7XG5cdFx0XHRcdGF3YWl0IFByb21pc2UuYWxsKGFjdGl2ZUNhbGxzLm1hcCgoYzogSUFjdGl2ZUNhbGwpID0+IGFwaS5oYW5ndXAoYy5jYWxsSWQpKSk7XG5cdFx0XHRcdGJyZWFrO1xuXHRcdH1cblx0fSk7XG5cblx0cm91dGVyLnBvc3QoJy9yZWNvcmRHcmVldGluZycsIGFzeW5jIChjdHg6IElDb250ZXh0KSA9PiB7XG5cdFx0ZGVidWcoJ0NyZWF0aW5nIGEgY2FsbCcpO1xuXHRcdGNvbnN0IGNhbGxJZCA9IGF3YWl0IGFwaS5jcmVhdGVDYWxsKHtcblx0XHRcdGZyb206IGN0eC51c2VyLnBob25lTnVtYmVyLFxuXHRcdFx0dG86IGN0eC51c2VyLnNpcFVyaSxcblx0XHRcdGNhbGxiYWNrVXJsOiBidWlsZEFic29sdXRlVXJsKGN0eCwgJy9yZWNvcmRDYWxsYmFjaycpXG5cdFx0fSk7XG5cdFx0ZGVidWcoJ1NhdmluZyBjcmVhdGVkIGNhbGwnKTtcblx0XHRhd2FpdCBtb2RlbHMuYWN0aXZlQ2FsbC5jcmVhdGUoe1xuXHRcdFx0dXNlcjogY3R4LnVzZXIuaWQsXG5cdFx0XHRjYWxsSWQ6IGNhbGxJZCxcblx0XHRcdGZyb206IGN0eC51c2VyLnBob25lTnVtYmVyLFxuXHRcdFx0dG86IGN0eC51c2VyLnNpcFVyaVxuXHRcdH0pO1xuXHRcdGN0eC5ib2R5ID0gJyc7XG5cdH0pO1xuXG5cdHJvdXRlci5wb3N0KCcvcmVjb3JkQ2FsbGJhY2snLCBhc3luYyAoY3R4OiBJQ29udGV4dCkgPT4ge1xuXHRcdGNvbnN0IGZvcm0gPSAoPGFueT4oY3R4LnJlcXVlc3QpKS5ib2R5O1xuXHRcdGRlYnVnKGBDYXRhcHVsdCBFdmVudCBmb3IgZ3JlZXRpbmcgcmVjb3JkOiAlamAsIGZvcm0pO1xuXHRcdGNvbnN0IHVzZXIgPSBhd2FpdCBnZXRVc2VyRm9yQ2FsbChmb3JtLmNhbGxJZCwgbW9kZWxzKTtcblx0XHRjb25zdCBtYWluTWVudSA9IGFzeW5jICgpID0+IHtcblx0XHRcdGF3YWl0IGFwaS5jcmVhdGVHYXRoZXIoZm9ybS5jYWxsSWQsIHtcblx0XHRcdFx0bWF4RGlnaXRzOiAxLFxuXHRcdFx0XHRpbnRlckRpZ2l0VGltZW91dDogMzAsXG5cdFx0XHRcdHByb21wdDoge1xuXHRcdFx0XHRcdHNlbnRlbmNlOiAnUHJlc3MgMSB0byBsaXN0ZW4gdG8geW91ciBjdXJyZW50IGdyZWV0aW5nLiBQcmVzcyAyIHRvIHJlY29yZCBuZXcgZ3JlZXRpbmcuIFByZXNzIDMgdG8gc2V0IGdyZWV0aW5nIHRvIGRlZmF1bHQuJ1xuXHRcdFx0XHR9LFxuXHRcdFx0XHR0YWc6ICdtYWluTWVudSdcblx0XHRcdH0pO1xuXHRcdH07XG5cdFx0Y3R4LmJvZHkgPSAnJztcblx0XHRzd2l0Y2ggKGZvcm0uZXZlbnRUeXBlKSB7XG5cdFx0XHRjYXNlICdhbnN3ZXInOlxuXHRcdFx0XHRkZWJ1ZygnUGxheSB2b2ljZSBtZW51Jyk7XG5cdFx0XHRcdHJldHVybiBhd2FpdCBtYWluTWVudSgpO1xuXHRcdFx0Y2FzZSAnZ2F0aGVyJzpcblx0XHRcdFx0ZGVidWcoJ0dhdGhlciAlaicsIGZvcm0pO1xuXHRcdFx0XHRpZiAoZm9ybS5zdGF0ZSA9PT0gJ2NvbXBsZXRlZCcpIHtcblx0XHRcdFx0XHRzd2l0Y2ggKGZvcm0udGFnKSB7XG5cdFx0XHRcdFx0XHRjYXNlICdtYWluTWVudSc6IHtcblx0XHRcdFx0XHRcdFx0c3dpdGNoIChmb3JtLmRpZ2l0cykge1xuXHRcdFx0XHRcdFx0XHRcdGNhc2UgJzEnOlxuXHRcdFx0XHRcdFx0XHRcdFx0ZGVidWcoJ1BsYXkgZ3JlZXRpbmcnKTtcblx0XHRcdFx0XHRcdFx0XHRcdHJldHVybiBhd2FpdCBwbGF5R3JlZXRpbmcoYXBpLCBmb3JtLmNhbGxJZCwgdXNlcik7XG5cdFx0XHRcdFx0XHRcdFx0Y2FzZSAnMic6XG5cdFx0XHRcdFx0XHRcdFx0XHRkZWJ1ZygnUmVjb3JkIGdyZWV0aW5nJyk7XG5cdFx0XHRcdFx0XHRcdFx0XHRyZXR1cm4gYXdhaXQgYXBpLnNwZWFrU2VudGVuY2VUb0NhbGwoZm9ybS5jYWxsSWQsICdTYXkgeW91ciBncmVldGluZyBhZnRlciBiZWVwLiBQcmVzcyAwIHRvIGNvbXBsZXRlIHJlY29yZGluZy4nLCAnUGxheUJlZXAnKTtcblx0XHRcdFx0XHRcdFx0XHRjYXNlICczJzpcblx0XHRcdFx0XHRcdFx0XHRcdGRlYnVnKCdSZXNldCBncmVldGluZycpO1xuXHRcdFx0XHRcdFx0XHRcdFx0YXdhaXQgbW9kZWxzLnVzZXIudXBkYXRlKHsgX2lkOiB1c2VyLmlkIH0sIHskc2V0OiB7IGdyZWV0aW5nVXJsOiAnJyB9fSk7XG5cdFx0XHRcdFx0XHRcdFx0XHRyZXR1cm4gYXdhaXQgYXBpLnNwZWFrU2VudGVuY2VUb0NhbGwoZm9ybS5jYWxsSWQsICdZb3VyIGdyZWV0aW5nIGhhcyBiZWVuIHNldCB0byBkZWZhdWx0LicsICdQbGF5TWVudScpO1xuXHRcdFx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0XHRjYXNlICdHcmVldGluZ1JlY29yZGluZyc6IHtcblx0XHRcdFx0XHRcdFx0aWYgKGZvcm0uZGlnaXRzID09PSAnMCcpIHtcblx0XHRcdFx0XHRcdFx0XHRkZWJ1ZygnU3RvcCBncmVldGluZyByZWNvcmRpbmcnKTtcblx0XHRcdFx0XHRcdFx0XHRhd2FpdCBhcGkudXBkYXRlQ2FsbChmb3JtLmNhbGxJZCwgeyByZWNvcmRpbmdFbmFibGVkOiBmYWxzZSB9KTtcblx0XHRcdFx0XHRcdFx0fVxuXHRcdFx0XHRcdFx0fVxuXHRcdFx0XHRcdH1cblx0XHRcdFx0fVxuXHRcdFx0XHRicmVhaztcblx0XHRcdGNhc2UgYHJlY29yZGluZ2A6XG5cdFx0XHRcdGlmIChmb3JtLnN0YXRlID09PSAnY29tcGxldGUnKSB7XG5cdFx0XHRcdFx0Y29uc3QgcmVjb3JkaW5nID0gYXdhaXQgYXBpLmdldFJlY29yZGluZyhmb3JtLnJlY29yZGluZ0lkKTtcblx0XHRcdFx0XHRhd2FpdCBtb2RlbHMudXNlci51cGRhdGUoe19pZDogdXNlci5pZH0sIHskc2V0OiB7Z3JlZXRpbmdVcmw6IHJlY29yZGluZy5tZWRpYX19KTtcblx0XHRcdFx0XHRjb25zdCBjYWxsID0gYXdhaXQgYXBpLmdldENhbGwoZm9ybS5jYWxsSWQpO1xuXHRcdFx0XHRcdGlmIChjYWxsLnN0YXRlID09PSAnYWN0aXZlJykge1xuXHRcdFx0XHRcdFx0cmV0dXJuIGF3YWl0IGFwaS5zcGVha1NlbnRlbmNlVG9DYWxsKGZvcm0uY2FsbElkLCAnWW91ciBncmVldGluZyBoYXMgYmVlbiBzYXZlZC4nLCAnUGxheU1lbnUnKTtcblx0XHRcdFx0XHR9XG5cdFx0XHRcdH1cblx0XHRcdFx0YnJlYWs7XG5cdFx0XHRjYXNlICdzcGVhayc6XG5cdFx0XHRjYXNlICdwbGF5YmFjayc6XG5cdFx0XHRcdGlmIChmb3JtLnN0YXR1cyA9PT0gJ2RvbmUnKSB7XG5cdFx0XHRcdFx0c3dpdGNoIChmb3JtLnRhZykge1xuXHRcdFx0XHRcdFx0Y2FzZSAnUGxheUJlZXAnOlxuXHRcdFx0XHRcdFx0XHRkZWJ1ZygnUGxheSBiZWVwJyk7XG5cdFx0XHRcdFx0XHRcdHJldHVybiBhd2FpdCBhcGkucGxheUF1ZGlvVG9DYWxsKGZvcm0uY2FsbElkLCBiZWVwVVJMLCBmYWxzZSwgJ0JlZXAnKTtcblx0XHRcdFx0XHRcdGNhc2UgJ0JlZXAnOlxuXHRcdFx0XHRcdFx0XHQvLyBhZnRlciBiZWVwIHNyYXJ0IHZvaWNlIG1lc3NhZ2UgcmVjb3JkaW5nXG5cdFx0XHRcdFx0XHRcdGRlYnVnKCdTdGFydCBncmVldGluZyByZWNvcmRpbmcnKTtcblx0XHRcdFx0XHRcdFx0YXdhaXQgYXBpLnVwZGF0ZUNhbGwoZm9ybS5jYWxsSWQsIHsgcmVjb3JkaW5nRW5hYmxlZDogdHJ1ZSB9KTtcblx0XHRcdFx0XHRcdFx0YXdhaXQgYXBpLmNyZWF0ZUdhdGhlcihmb3JtLmNhbGxJZCwge1xuXHRcdFx0XHRcdFx0XHRcdG1heERpZ2l0czogMSxcblx0XHRcdFx0XHRcdFx0XHRpbnRlckRpZ2l0VGltZW91dDogMzAsXG5cdFx0XHRcdFx0XHRcdFx0dGFnOiAnR3JlZXRpbmdSZWNvcmRpbmcnXG5cdFx0XHRcdFx0XHRcdH0pO1xuXHRcdFx0XHRcdFx0XHRicmVhaztcblx0XHRcdFx0XHRcdGRlZmF1bHQ6XG5cdFx0XHRcdFx0XHRcdHJldHVybiBhd2FpdCBtYWluTWVudSgpO1xuXHRcdFx0XHRcdH1cblx0XHRcdFx0fVxuXHRcdFx0XHRicmVhaztcblx0XHR9XG5cdH0pO1xuXG5cdHJvdXRlci5nZXQoJy92b2ljZU1lc3NhZ2VzJywgYXN5bmMgKGN0eDogSUNvbnRleHQpID0+IHtcblx0XHRjb25zdCBsaXN0ID0gYXdhaXQgbW9kZWxzLnZvaWNlTWFpbE1lc3NhZ2UuZmluZCh7IHVzZXI6IGN0eC51c2VyLmlkIH0pLnNvcnQoeyBzdGFydFRpbWU6IC0xIH0pLmV4ZWMoKTtcblx0XHRjdHguYm9keSA9IGxpc3QubWFwKGkgPT4gaS50b0pTT04oKSk7XG5cdH0pO1xuXG5cdHJvdXRlci5nZXQoJy92b2ljZU1lc3NhZ2VzLzppZC9tZWRpYScsIGFzeW5jIChjdHg6IElDb250ZXh0KSA9PiB7XG5cdFx0Y29uc3Qgdm9pY2VNZXNzYWdlID0gYXdhaXQgbW9kZWxzLnZvaWNlTWFpbE1lc3NhZ2UuZmluZE9uZSh7IF9pZDogY3R4LnBhcmFtcy5pZCwgdXNlcjogY3R4LnVzZXIuaWQgfSkuZXhlYygpO1xuXHRcdGlmICghdm9pY2VNZXNzYWdlKSB7XG5cdFx0XHRyZXR1cm4gY3R4LnRocm93KDQwNCk7XG5cdFx0fVxuXHRcdGNvbnN0IHBhcnRzID0gKHZvaWNlTWVzc2FnZS5tZWRpYVVybCB8fCAnJykuc3BsaXQoJy8nKTtcblx0XHRjb25zdCBmaWxlID0gYXdhaXQgYXBpLmRvd25sb2FkTWVkaWFGaWxlKHBhcnRzW3BhcnRzLmxlbmd0aCAtIDFdKTtcblx0XHRjdHgudHlwZSA9IGZpbGUuY29udGVudFR5cGU7XG5cdFx0Y3R4LmJvZHkgPSBmaWxlLmNvbnRlbnQ7XG5cdH0pO1xuXG5cdHJvdXRlci5kZWxldGUoJy92b2ljZU1lc3NhZ2VzLzppZCcsIGFzeW5jIChjdHg6IElDb250ZXh0KSA9PiB7XG5cdFx0YXdhaXQgbW9kZWxzLnZvaWNlTWFpbE1lc3NhZ2UucmVtb3ZlKHsgX2lkOiBjdHgucGFyYW1zLmlkLCB1c2VyOiBjdHgudXNlci5pZCB9KTtcblx0XHRjdHguYm9keSA9ICcnO1xuXHR9KTtcblxuXHRyb3V0ZXIuZ2V0KCcvdm9pY2VNZXNzYWdlc1N0cmVhbScsIGFzeW5jIChjdHg6IElDb250ZXh0KSA9PiB7XG5cdFx0Y29uc3QgdG9rZW4gPSBjdHgucmVxdWVzdC5xdWVyeS50b2tlbjtcblx0XHRpZiAoIXRva2VuKSB7XG5cdFx0XHRyZXR1cm4gY3R4LnRocm93KDQwMCwgJ01pc3NpbmcgdG9rZW4nKTtcblx0XHR9XG5cdFx0Y29uc3QgdXNlcklkID0gKGF3YWl0ICg8YW55Pmp3dC52ZXJpZnkpLnByb21pc2UodG9rZW4sIGp3dFRva2VuKSkucmVwbGFjZSgvXFxcIi9nLCAnJyk7XG5cdFx0Y29uc3QgdXNlciA9IGF3YWl0IG1vZGVscy51c2VyLmZpbmRCeUlkKHVzZXJJZCkuZXhlYygpO1xuXHRcdGlmICghdXNlcikge1xuXHRcdFx0cmV0dXJuIGN0eC50aHJvdyg0MDQpO1xuXHRcdH1cblx0XHRjb25zdCByZXEgPSBjdHgucmVxO1xuXHRcdGNvbnN0IHN0cmVhbSA9IG5ldyBTaW1wbGVSZWFkYWJsZSgpO1xuXHRcdHJlcS5zZXRUaW1lb3V0KE51bWJlci5NQVhfVkFMVUUsICgpID0+IHsgfSk7XG5cdFx0Y3R4LnNldCgnQ2FjaGUtQ29udHJvbCcsICduby1jYWNoZScpO1xuXHRcdGN0eC5zZXQoJ0Nvbm5lY3Rpb24nLCAna2VlcC1hbGl2ZScpO1xuXHRcdGN0eC50eXBlID0gJ3RleHQvZXZlbnQtc3RyZWFtJztcblx0XHRzdHJlYW0ucHVzaChuZXcgQnVmZmVyKCdcXG4nKSk7XG5cdFx0ZGVidWcoJ1N0YXJ0IFNTRSBzdHJlYW1pbmcnKTtcblx0XHRjdHguYm9keSA9IHN0cmVhbTtcblx0XHRjb25zdCBzdWJUb2tlbiA9IFB1YlN1Yi5zdWJzY3JpYmUodXNlcklkLCAobWVzc2FnZTogYW55LCBkYXRhOiBhbnkpID0+IHtcblx0XHRcdGlmIChkYXRhKSB7XG5cdFx0XHRcdGRlYnVnKCdFbWl0IFNTRSBldmVudCcpO1xuXHRcdFx0XHRzdHJlYW0ucHVzaChuZXcgQnVmZmVyKGBkYXRhOiAke0pTT04uc3RyaW5naWZ5KGRhdGEpfVxcblxcbmApKTtcblx0XHRcdH1cblx0XHR9KTtcblx0XHRjb25zdCBjbG9zZSA9ICgpID0+IHtcblx0XHRcdFB1YlN1Yi51bnN1YnNjcmliZShzdWJUb2tlbik7XG5cdFx0XHRyZXEuc29ja2V0LnJlbW92ZUxpc3RlbmVyKCdlcnJvcicsIGNsb3NlKTtcblx0XHRcdHJlcS5zb2NrZXQucmVtb3ZlTGlzdGVuZXIoJ2Nsb3NlJywgY2xvc2UpO1xuXHRcdH07XG5cdFx0cmVxLnNvY2tldC5vbignZXJyb3InLCBjbG9zZSk7XG5cdFx0cmVxLnNvY2tldC5vbignY2xvc2UnLCBjbG9zZSk7XG5cdH0pO1xuXG5cdHJldHVybiByb3V0ZXI7XG59XG5cbmZ1bmN0aW9uIGdldFByaW1hcnlDYWxsSWQodGFnOiBzdHJpbmcpOiBzdHJpbmcge1xuXHRjb25zdCB2YWx1ZXMgPSAodGFnIHx8ICcnKS5zcGxpdCgnOicpO1xuXHRpZiAodmFsdWVzLmxlbmd0aCA9PT0gMiAmJiB2YWx1ZXNbMF0gPT09ICdBbm90aGVyTGVnJykge1xuXHRcdHJldHVybiB2YWx1ZXNbMV07XG5cdH1cblx0cmV0dXJuICcnO1xufVxuXG5cbmFzeW5jIGZ1bmN0aW9uIGdldFVzZXJGb3JDYWxsKGNhbGxJZDogc3RyaW5nLCBtb2RlbHM6IElNb2RlbHMpOiBQcm9taXNlPElVc2VyPiB7XG5cdGRlYnVnKGBHZXQgdXNlciBmb3IgY2FsbCAke2NhbGxJZH1gKTtcblx0Y29uc3QgY2FsbCA9IGF3YWl0IG1vZGVscy5hY3RpdmVDYWxsLmZpbmRPbmUoeyBjYWxsSWQgfSkucG9wdWxhdGUoJ3VzZXInKS5leGVjKCk7XG5cdGlmIChjYWxsICYmIGNhbGwudXNlcikge1xuXHRcdGRlYnVnKGBGb3VuZCB1c2VyICR7Y2FsbC51c2VyLmlkfSBmb3IgY2FsbCAke2NhbGxJZH1gKTtcblx0XHRyZXR1cm4gY2FsbC51c2VyO1xuXHR9XG5cdHJldHVybiBudWxsO1xufVxuXG5hc3luYyBmdW5jdGlvbiBnZXRDYWxsZXJJZChtb2RlbHM6IElNb2RlbHMsIHBob25lTnVtYmVyOiBzdHJpbmcpOiBQcm9taXNlPHN0cmluZz4ge1xuXHRpZiAocGhvbmVOdW1iZXIuc3RhcnRzV2l0aCgnc2lwOicpKSB7XG5cdFx0Y29uc3QgdXNlciA9IGF3YWl0IG1vZGVscy51c2VyLmZpbmRPbmUoeyBzaXBVcmk6IHBob25lTnVtYmVyIH0pLmV4ZWMoKTtcblx0XHRpZiAodXNlcikge1xuXHRcdFx0cmV0dXJuIHVzZXIucGhvbmVOdW1iZXI7XG5cdFx0fVxuXHR9XG5cdHJldHVybiBwaG9uZU51bWJlcjtcbn1cblxuYXN5bmMgZnVuY3Rpb24gcGxheUdyZWV0aW5nKGFwaTogSUNhdGFwdWx0QXBpLCBjYWxsSWQ6IHN0cmluZywgdXNlcjogSVVzZXIpIHtcblx0Ly8gUGxheSBncmVldGluZ1xuXHRpZiAodXNlci5ncmVldGluZ1VybCkge1xuXHRcdGRlYnVnKGBQbGF5IHVzZXIncyBncmVldGluZ2ApO1xuXHRcdGF3YWl0IGFwaS5wbGF5QXVkaW9Ub0NhbGwoY2FsbElkLCB1c2VyLmdyZWV0aW5nVXJsLCBmYWxzZSwgJ0dyZWV0aW5nJyk7XG5cdH0gZWxzZSB7XG5cdFx0ZGVidWcoJ1BsYXkgZGVmYXVsdCBncmVldGluZycpO1xuXHRcdGF3YWl0IGFwaS5zcGVha1NlbnRlbmNlVG9DYWxsKGNhbGxJZCwgJ0hlbGxvLiBQbGVhc2UgbGVhdmUgYSBtZXNzYWdlIGFmdGVyIGJlZXAuJywgJ0dyZWV0aW5nJyk7XG5cdH1cbn1cblxuZXhwb3J0IGNsYXNzIFNpbXBsZVJlYWRhYmxlIGV4dGVuZHMgUmVhZGFibGUge1xuXHRfcmVhZChzaXplOiBudW1iZXIpOiB2b2lkIHtcblx0fVxufVxuIl19