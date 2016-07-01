import * as Koa from 'koa';
import * as Router from 'koa-router';
import * as jwt from 'jsonwebtoken';
import * as moment from 'moment';
import {Readable} from 'stream';
import {Query} from 'mongoose';
import * as debugFactory from 'debug';
import * as PubSub from 'pubsub-js';

import {IUser, IActiveCall, IVoiceMailMessage, IModels} from './models';
import {ICatapultApi, buildAbsoluteUrl} from './catapult';

require('promisify-patch').patch();

const debug = debugFactory('routes');

export const beepURL = 'https://s3.amazonaws.com/bwdemos/beep.mp3';
export const tonesURL = 'https://s3.amazonaws.com/bwdemos/media/ring.mp3';
export const jwtToken = '42VFYo1fiIaFa1nguHI2pmulRo2sKyf-';

const koaJwt = require('koa-jwt')({
	secret: jwtToken
}).unless({ path: [/^\/public/, /^\/login/, /^\/refreshToken/, /^\/register/, /^\/callCallback/] });

export interface IContext extends Router.IRouterContext {
	user: IUser;
	api: ICatapultApi;
}

export default function getRouter(app: Koa, models: IModels, api: ICatapultApi): Router {
	const router = new Router();
	router.use(require('koa-convert')(require('koa-body')()));
	router.use(koaJwt);
	router.use(async (ctx: IContext, next: Function) => {
		try {
			const userId = (ctx.state.user || '').replace(/\"/gi, '');
			if (userId) {
				const user = await models.user.findById(userId).exec();
				if (user) {
					ctx.user = <IUser>user;
				}
			}
			await next();
		}
		catch (err) {
			ctx.body = {
				code: err.status,
				message: err.message
			};
			ctx.status = err.status || 500;
		}
	});

	router.post('/login', async (ctx: IContext) => {
		const body = (<any>ctx.request).body;
		if (!body.userName || !body.password) {
			return ctx.throw(400, 'Missing user name and/or password');
		}
		const user = await models.user.findOne({ userName: body.userName }).exec();
		if (!user) {
			return ctx.throw(400, 'Missing user');
		}
		if (await user.comparePassword(body.password)) {
			const token = await (<any>(jwt.sign)).promise(user.id, jwtToken, {});
			ctx.body = { token, expire: moment().add(30, 'd').toISOString() };
		}

	});

	router.post('/register', async (ctx: IContext) => {
		const body = (<any>ctx.request).body;
		if (!body.userName || !body.password || !body.areaCode) {
			return ctx.throw(400, 'Missing some required fields');
		}
		if (body.password !== body.repeatPassword) {
			return ctx.throw(400, 'Password are mismatched');
		}
		if (await models.user.findOne({ userName: body.userName }).exec()) {
			return ctx.throw(400, 'User with such name is exists already');
		}
		const user = new models.user({ userName: body.userName, areaCode: body.areaCode });
		await user.setPassword(body.password);

		debug(`Reserving phone number for area code ${body.areaCode}`);
		const phoneNumber = await api.createPhoneNumber(body.areaCode);
		debug('Creating SIP account');
		const sipAccount = await api.createSIPAccount();
		user.phoneNumber = phoneNumber;
		user.sipUri = sipAccount.uri;
		user.sipPassword = sipAccount.password;
		user.endpointId = sipAccount.endpointId;
		await user.save();
		ctx.body = { id: user.id };
	});

	router.get('/sipData', async (ctx: IContext) => {
		debug('Get SIP data');
		const token = await api.createSIPAuthToken(ctx.user.endpointId);
		debug('Return SIP data as JSON');
		ctx.body = {
			phoneNumber: ctx.user.phoneNumber,
			sipUri: ctx.user.sipUri,
			sipPassword: ctx.user.sipPassword,
			token: token.token,
			expire: moment().add(token.expires, 's').toISOString()
		};
	});

	router.post('/callCallback', async (ctx: IContext) => {
		debug(`Catapult Event: ${ctx.request.url}`);
		const form = (<any>ctx.request).body;
		debug(`Body: %j`, form);
		const primaryCallId = getPrimaryCallId(form.tag);
		const fromAnotherLeg = (primaryCallId !== '');
		let callId: string = '';
		if (fromAnotherLeg) {
			callId = primaryCallId;
		} else {
			callId = form.callId;
		}
		ctx.body = '';
		let user = await getUserForCall(callId, models);
		switch (form.eventType) {
			case 'answer':
				debug('answer');
				const from = form.from;
				const to = form.to;
				if (fromAnotherLeg) {
					debug('Another leg has answered');
					await api.stopPlayAudioToCall(callId); // stop tones
					break;
				}
				user = await models.user.findOne({ $or: [{ sipUri: from }, { phoneNumber: to }] }).exec();
				if (!user) {
					break;
				}
				if (to === user.phoneNumber) {
					debug(`Bridging incoming call with ${user.sipUri}`);
					const callerId = await getCallerId(models, from);
					await api.playAudioToCall(callId, tonesURL, true, '');

					debug(`Using caller id ${callerId}`);
					const bridgeId = await api.createBridge({
						callIds: [callId],
						bridgeAudio: true
					});

					// save current call data to db
					await models.activeCall.create({
						callId,
						bridgeId,
						user: user.id,
						from,
						to,
					});

					debug(`Calling to another leg ${user.sipUri}`);

					const anotherCallId = await api.createCall({
						bridgeId,
						from: callerId,
						to: user.sipUri,
						tag: `AnotherLeg:${callId}`,
						callTimeout: 10,
						callbackUrl: buildAbsoluteUrl(ctx, `/callCallback`),
					});

					// save bridged call data to db too
					await models.activeCall.create({
						callId: anotherCallId,
						bridgeId,
						user: user.id,
						from: callerId,
						To: user.sipUri
					});
					break;
				}
				if (from === user.sipUri) {
					debug(`Transfering outgoing call to  ${to}`);
					await api.transferCall(to, user.phoneNumber);
					return;
				}
				break;
			case 'speak':
			case 'playback':
				if (form.status === 'done') {
					switch (form.tag) {
						case 'Greeting':
							// after greeting play beep
							debug('Play beep');
							await api.playAudioToCall(form.callId, beepURL, false, 'Beep');
							break;
						case 'Beep':
							// after beep srart voice message recording
							debug('Starting call recording');
							await api.updateCall(form.callId, { recordingEnabled: true });
							break;
					}
				}
				break;
			case 'timeout':
				if (fromAnotherLeg) {
					// another leg didn't answer call (for bridged incoming call)
					debug('Another leg timeout');
					await api.stopPlayAudioToCall(callId);
					await models.activeCall.update({ callId: callId }, { bridgeId: '' }); // to suppress hang up this call too
					debug('Moving to voice mail');
					await playGreeting(api, callId, user);
					break;
				}
			case 'recording':
				{
					if (form.state === 'complete') {
						// Voice message has been recorded. Save it into db.
						debug('Get recorded voice message info');
						const recording = await api.getRecording(form.recordingId);
						const call = await api.getCall(callId);
						if (!user) {
							debug('Saving recorded voice message to db');
							const message = new models.voiceMailMessage({
								mediaUrl: recording.media,
								startTime: recording.startTime,
								endTime: recording.endTime,
								userId: user.id,
								from: await getCallerId(models, call.from),
							});
							await message.save();

							// send notification about new voice mail message
							debug(`Publish SSE notification (for user ${user.userName})`);
							PubSub.publish(user.id.toString(), message.toJSON());
						}
					}
				}
			case 'hangup':
				callId = form.callId;
				debug(`Hangup ${callId}`);
				// look for bridge data for call first
				const activeCall = await models.activeCall.findOne({ callId }).exec();
				if (!activeCall || activeCall.bridgeId === '') {
					break;
				}
				// then look for other calls in the bridge
				const activeCalls = await models.activeCall.find({ bridgeId: activeCall.bridgeId, $not: { callId } }).exec();

				debug(`Hangup other ${activeCalls.length} calls`);
				await Promise.all(activeCalls.map((c: IActiveCall) => api.hangup(c.callId)));
				break;
		}
	});

	router.post('/recordGreeting', async (ctx: IContext) => {
		debug('Creating a call');
		const callId = await api.createCall({
			from: ctx.user.phoneNumber,
			to: ctx.user.sipUri,
			callbackUrl: buildAbsoluteUrl(ctx, '/recordCallback')
		});
		debug('Saving created call');
		await models.activeCall.create({
			user: ctx.user.id,
			callId: callId,
			from: ctx.user.phoneNumber,
			to: ctx.user.sipUri
		});
		ctx.body = '';
	});

	router.post('/recordCallback', async (ctx: IContext) => {
		const form = (<any>(ctx.request)).body;
		debug('Catapult Event for greeting record: ${ctx.request.url}');
		const user = await getUserForCall(form.callId, models);
		const mainMenu = async () => {
			await api.createGather({
				maxDigits: 1,
				interDigitTimeout: 30,
				prompt: {
					sentence: 'Press 1 to listen to your current greeting. Press 2 to record new greeting. Press 3 to set greeting to default.'
				},
				tag: 'mainMenu'
			});
		};
		ctx.body = '';
		switch (form.eventType) {
			case 'answer':
				debug('Play voice menu');
				return await mainMenu();
			case 'gather':
				if (form.state === 'completed') {
					switch (form.tag) {
						case 'mainMenu': {
							switch (form.digits) {
								case '1':
									debug('Play greeting');
									return await playGreeting(api, form.callId, user);
								case '2':
									debug('Record greeting');
									return await api.speakSentenceToCall(form.callId, 'Say your greeting after beep. Press 0 to complete recording.', 'PlayBeep');
								case '3':
									debug('Reset greeting');
									await models.user.update({ _id: user.id }, { greetingUrl: '' });
									return await api.speakSentenceToCall(form.callId, 'Your greeting has been set to default.', 'PlayMenu');
							}
						}
						case 'GreetingRecording': {
							if (form.digits === '0') {
								debug('Stop greeting recording');
								await api.updateCall(form.callId, { recordingEnabled: false });
							}
						}
					}
				}
				break;
			case `recording`:
				if (form.state === 'complete') {
					const recording = await api.getRecording(form.recordingId);
					ctx.user.greetingUrl = recording.media;
					await ctx.user.save();
					const call = await api.getCall(form.callId);
					if (call.state === 'active') {
						return await api.speakSentenceToCall(form.callId, 'Your greeting has been saved.', 'PlayMenu');
					}
				}
				break;
			case 'speak':
			case 'playback':
				if (form.status === 'done') {
					switch (form.tag) {
						case 'PlayBeep':
							debug('Play beep');
							return await api.playAudioToCall(form.callId, beepURL, false, 'Beep');
						case 'Beep':
							// after beep srart voice message recording
							debug('Start greeting recording');
							await api.updateCall(form.callId, { recordingEnabled: true });
							await api.createGather({
								maxDigits: 1,
								interDigitTimeout: 30,
								tag: 'GreetingRecording'
							});
							break;
						default:
							return await mainMenu();
					}
				}
				break;
		}
	});

	router.get('/voiceMessages', async (ctx: IContext) => {
		const list = await models.voiceMailMessage.find({ user: ctx.user.id }).sort({ startTime: -1 }).exec();
		ctx.body = list.map(i => i.toJSON());
	});

	router.get('/voiceMessages/:id/media', async (ctx: IContext) => {
		const voiceMessage = await models.voiceMailMessage.findOne({ _id: ctx.params.id, user: ctx.user.id }).exec();
		if (!voiceMessage) {
			return ctx.throw(404);
		}
		const parts = (voiceMessage.mediaUrl || '').split('/');
		const file = await api.downloadMediaFile(parts[parts.length - 1]);
		ctx.type = file.contentType;
		ctx.body = file.content;
	});

	router.delete('/voiceMessages/:id', async (ctx: IContext) => {
		await models.voiceMailMessage.remove({ _id: ctx.params.id, user: ctx.user.id });
		ctx.body = '';
	});

	router.get('/voiceMessagesStream', async (ctx: IContext) => {
		const token = ctx.request.query.token;
		if (!token) {
			return ctx.throw(400, 'Missing token');
		}
		const userId = (await (<any>jwt.verify).promise(token, jwtToken)).replace(/\"/g, '');
		const user = await models.user.findById(userId).exec();
		if (!user) {
			return ctx.throw(404);
		}
		const req = ctx.req;
		const stream = new SimpleReadable();
		req.setTimeout(Number.MAX_VALUE, () => { });
		ctx.set('Cache-Control', 'no-cache');
		ctx.set('Connection', 'keep-alive');
		ctx.type = 'text/event-stream';
		ctx.body = stream;
		stream.push(new Buffer('\n'));
		const subToken = PubSub.subscribe(userId, (message: any, data: any) => {
			if (data) {
				debug('Emit SSE event');
				stream.push(new Buffer(`id: ${data.id}\ndata: ${JSON.stringify(data)}\n\n`));
			}
		});
		const close = () => {
			PubSub.unsubscribe(subToken);
			req.socket.removeListener('error', close);
			req.socket.removeListener('close', close);
		};
		req.socket.on('error', close);
		req.socket.on('close', close);
	});

	return router;
}

function getPrimaryCallId(tag: string): string {
	const values = (tag || '').split(':');
	if (values.length === 2 && values[0] === 'AnotherLeg') {
		return values[1];
	}
	return '';
}


async function getUserForCall(callId: string, models: IModels): Promise<IUser> {
	const call = await models.activeCall.findOne({ callId }).populate('user').exec();
	if (call && call.user) {
		return call.user;
	}
	return null;
}

async function getCallerId(models: IModels, phoneNumber: string): Promise<string> {
	if (phoneNumber.startsWith('sip:')) {
		const user = await models.user.findOne({ sipUri: phoneNumber }).exec();
		if (user) {
			return user.phoneNumber;
		}
	}
	return phoneNumber;
}

async function playGreeting(api: ICatapultApi, callId: string, user: IUser) {
	// Play greeting
	if (user.greetingUrl === '') {
		debug('Play default greeting');
		await api.speakSentenceToCall(callId, 'Hello. Please leave a message after beep.', 'Greeting');
	} else {
		debug(`Play user's greeting`);
		api.playAudioToCall(callId, user.greetingUrl, false, 'Greeting');
	}
}

export class SimpleReadable extends Readable {
	_read(size: number): void {
	}
}
