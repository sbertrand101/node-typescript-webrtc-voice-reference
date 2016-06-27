import * as Koa from 'koa';
import * as Router from 'koa-router';
import * as jwt from 'jsonwebtoken';
import * as moment from 'moment';
import {Query} from 'mongoose';
import * as debugFactory from 'debug';

import {IUser, IActiveCall, IModels} from './models';
import {ICatapultApi} from './catapult';

const debug = debugFactory('routes');

const beepURL = 'https://s3.amazonaws.com/bwdemos/beep.mp3';
const tonesURL = 'https://s3.amazonaws.com/bwdemos/media/ring.mp3';
const jwtToken = '42VFYo1fiIaFa1nguHI2pmulRo2sKyf-';

const koaJwt = require('koa-jwt')({
	secret: jwtToken
}).unless({ path: [/^\/public/, /^\/login/, /^\/refreshToken/, /^\/register/, /^\/callCallback/] });

export interface IContext extends Router.IRouterContext {
	user: IUser;
	api: ICatapultApi;
}

export default function getRouter(app: Koa, models: IModels): Router {
	const router = new Router();
	router.use(require('koa-convert')(require('koa-body')()));
	router.use(koaJwt);
	router.use(async (ctx: IContext, next: Function) => {
		const userId = ctx.state.user;
		const user = <any>(await models.user.findById(userId));
		if (user) {
			ctx.user = <IUser>user;
		}
		await next();
	});

	router.post('/login', async (ctx: IContext) => {
		const body = (<any>ctx.request).body;
		if (!body.userName || !body.password) {
			return ctx.throw(400, 'Missing user name and/or password');
		}
		const user = <IUser>(<any>(await models.user.findOne({ userName: body.userName })));
		if (!user) {
			return ctx.throw(400, 'Missing user');
		}
		if (await user.comparePassword(body.password)) {
			const token = jwt.sign(user.id, jwtToken, { expiresIn: '7d' });
			ctx.body = { token, expire: moment().add(7, 'd').toISOString() };
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
		if (await models.user.findOne({ userName: body.userName })) {
			return ctx.throw(400, 'User with such name is exists already');
		}
		const user = new models.user({ userName: body.userName, areaCode: body.areaCode });
		await user.setPassword(body.password);

		debug(`Reserving phone number for area code ${body.areaCode}`);
		const phoneNumber = await ctx.api.createPhoneNumber(body.areaCode);
		debug('Creating SIP account');
		const sipAccount = await ctx.api.createSIPAccount();
		user.phoneNumber = phoneNumber;
		user.sipUri = sipAccount.uri;
		user.sipPassword = sipAccount.password;
		user.endpointId = sipAccount.endpointId;
		await user.save();
		ctx.body = { id: user.id };
	});

	router.get('/sipData', async (ctx: IContext) => {
		const token = await ctx.api.createSIPAuthToken(ctx.user.endpointId);
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
		const api = ctx.api;
		const form = (<any>ctx.request).body;
		const primaryCallId = getPrimaryCallId(form.tag);
		const fromAnotherLeg = (primaryCallId !== '');
		let callId: string = '';
		if (fromAnotherLeg) {
			callId = primaryCallId;
		} else {
			callId = form.callId;
		}
		const user = await getUserForCall(callId, models);
		switch (form.eventType) {
			case 'answer':
				const from = form.from;
				const to = form.to;
				if (fromAnotherLeg) {
					debug('Another leg has answered');
					await ctx.api.stopPlayAudioToCall(callId); // stop tones
					break;
				}
				const user = <IUser>(<any>(await models.user.findOne({ sipUri: from, phoneNumber: to })));

				if (!user) {
					break;
				}
				if (to === user.phoneNumber) {
					debug(`Bridging incoming call with ${user.sipUri}`);
					const callerId = await getCallerId(models, from);
					await ctx.api.playAudioToCall(callId, tonesURL, true, '');

					debug(`Using caller id ${callerId}`);
					const bridgeId = await ctx.api.createBridge({
						callIds: [callId],
						bridgeAudio: true
					})

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
						tag: `AnotherLeg:${callerId}`,
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
					await ctx.api.transferCall(to, user.phoneNumber);
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
							await ctx.api.playAudioToCall(form.callId, beepURL, false, 'Beep');
							break;
						case 'Beep':
							// after beep srart voice message recording
							debug('Starting call recording')
							await ctx.api.updateCall(form.callId, { recordingEnabled: true });
							break;
					}
				}
				break;
			case 'timeout':
				if (fromAnotherLeg) {
					// another leg didn't answer call (for bridged incoming call)
					debug('Another leg timeout');
					await ctx.api.stopPlayAudioToCall(callId);
					await models.activeCall.update({ callId: callId }, { bridgeId: '' }); // to suppress hang up this call too
					debug('Moving to voice mail');
					// Play greeting
					if (user.greetingUrl === '') {
						debug('Play default greeting');
						await api.speakSentenceToCall(callId, 'Hello. Please leave a message after beep.', 'Greeting');
					} else {
						debug(`Play user's greeting`);
						ctx.api.playAudioToCall(callId, user.greetingUrl, false, 'Greeting');
					}
					break;
				}
			case 'recording':
				{
					if (form.state === 'complete') {
						// Voice message has been recorded. Save it into db.
						debug('Get recorded voice message info');
						const recording = await ctx.api.getRecording(form.recordingId);
						const call = await ctx.api.getCall(callId);
						if (!user) {
							debug('Saving recorded voice message to db');
							const message = new models.voiceMailMessage({
								mediaUrl: recording.media,
								startTime: recording.startTime,
								endTime: recording.endTime,
								userId: user.id,
								from: await getCallerId(models, call.from),
							});

							// send notification about new voice mail message
							// TODO rasie SSE event
						}
					}
				}
			case 'hangup':
				callId = form.callId;
				debug(`Hangup ${callId}`);
				// look for bridge data for call first
				const activeCall = <IActiveCall>(<any>(await models.activeCall.findOne({ callId })));
				if (!activeCall || activeCall.bridgeId === '') {
					break;
				}
				// then look for other calls in the bridge
				const activeCalls = <IActiveCall[]>(<any>(await models.activeCall.find({ bridgeId: activeCall.bridgeId, $not: { callId } })));

				debug(`Hangup other ${activeCalls.length} calls`);
				await Promise.all(activeCalls.map((c: IActiveCall) => ctx.api.hangup(c.callId)));
				break;
		}
		ctx.body = '';
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
	const call = <any>(await models.activeCall.findOne({ callId }).populate('user'));
	if (call && call.user) {
		return <IUser>call.user;
	}
	return null;
}

async function getCallerId(models: IModels, phoneNumber: string): Promise<string> {
	if(phoneNumber.startsWith('sip:')) {
		const user = <IUser>(<any>(await models.user.findOne({sipUri: phoneNumber})));
		if(user) {
			return user.phoneNumber;
		}
	}
	return phoneNumber;
}

function buildAbsoluteUrl(ctx: IContext, path: string): string {
	// TODO implement
	return '';
}
