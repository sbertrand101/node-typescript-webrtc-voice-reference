import {IContext} from './routes';
import * as url from 'url';
import * as debugFactory from 'debug';
import * as randomstring from 'randomstring';

const CatapultClient = require('node-bandwidth');
const debug = debugFactory('catapult');

const applicationName = 'NodeJSVoiceReferenceApp';
const applicationIds = new Map<string, string>();
const domainInfo = <IDomainInfo>{};

export interface ICatapultApi {
	createPhoneNumber(ctx: IContext, areaCode: string): Promise<string>;
	createSIPAccount(ctx: IContext): Promise<ISIPAccount>;
	createSIPAuthToken(ctx: IContext, endpointId: string): Promise<ISIPAuthToken>;
	createBridge(data: any): Promise<string>;
	createCall(data: any): Promise<string>;
	createGather(callId: string, data: any): Promise<string>;
	updateCall(callId: string, data: any): Promise<void>;
	stopPlayAudioToCall(callId: string): Promise<void>;
	playAudioToCall(callId: string, tonesURL: string, loop: boolean, tag: string): Promise<void>;
	transferCall(callId: string, to: string, callerId: string): Promise<string>;
	speakSentenceToCall(callId: string, text: string, tag: string): Promise<void>;
	getCall(callId: string): Promise<ICall>;
	getRecording(recordingId: string): Promise<IRecording>;
	hangup(callId: string): Promise<void>;
	downloadMediaFile(name: string): Promise<IMediaFile>;
}

export interface ISIPAccount {
	endpointId: string;
	uri: string;
	password: string;
}

export interface ISIPAuthToken {
	token: string;
	expires: string;
}

export interface ICall {
	callId: string;
	from: string;
	to: string;
	state: string;
}

export interface IRecording {
	media: string;
	startTime: string;
	endTime: string;
}

export interface IMediaFile {
	content: any;
	contentType: string;
}

export class CatapultApi implements ICatapultApi {

	private catapult: any;

	constructor(private userId: string, private apiToken: string, private apiSecret: string) {
		this.catapult = new CatapultClient({ userId, apiToken, apiSecret });
	}

	async createPhoneNumber(ctx: IContext, areaCode: string): Promise<string> {
		debug(`Reserving a new phone number for area code #{areaCode}`);
		const applicationId = await this.getApplicationId(ctx);
		debug(`Search and order available number`);
		const numbers = await this.catapult.AvailableNumber.searchAndOrder('local', { areaCode, quantity: 1 });
		await this.catapult.PhoneNumber.update(numbers[0].id, { applicationId });
		return numbers[0].number;
	}

	async createSIPAccount(ctx: IContext): Promise<ISIPAccount> {
		const applicationId = await this.getApplicationId(ctx);
		const domain = await this.getDomain(ctx);
		const sipUserName = `vu-${randomstring.generate(12)}`;
		const sipPassword = randomstring.generate(16);
		debug('Creating SIP account');
		const endpoint = await this.catapult.Endpoint.create(domain.id, {
			applicationId,
			domainId: domain.id,
			name: sipUserName,
			description: `${applicationName}'s SIP Account`,
			credentials: { password: sipPassword }
		});
		return <ISIPAccount>{
			endpointId: endpoint.id,
			uri: `sip:${sipUserName}@${domain.name}.bwapp.bwsip.io`,
			password: sipPassword
		};
	}

	async createSIPAuthToken(ctx: IContext, endpointId: string): Promise<ISIPAuthToken> {
		debug('Creating SIP account auth token');
		const domain = await this.getDomain(ctx);
		return <ISIPAuthToken>(await this.catapult.Endpoint.createAuthToken(domain.id, endpointId));
	}

	async createBridge(data: any): Promise<string> {
		debug('Creating a bridge %j', data);
		return (await this.catapult.Bridge.create(data)).id;
	}

	async createCall(data: any): Promise<string> {
		debug('Creating a call %j', data);
		return (await this.catapult.Call.create(data)).id;
	}

	async createGather(callId: string, data: any): Promise<string> {
		debug('Creating a gather for call %s %j', callId, data);
		return (await this.catapult.Call.createGather(callId, data)).id;
	}

	updateCall(callId: string, data: any): Promise<void> {
		debug('Updating call %s %j', callId, data);
		return this.catapult.Call.update(callId, data);
	}

	async stopPlayAudioToCall(callId: string): Promise<void> {
		debug('Stop play of audio for call %s', callId);
		await this.catapult.Call.playAudioAdvanced(callId, { fileUrl: '' });
	}

	async playAudioToCall(callId: string, url: string, loop: boolean, tag: string): Promise<void> {
		debug('Play audio for call %s', callId);
		await this.catapult.Call.playAudioAdvanced(callId, { fileUrl: url, tag, loopEnabled: loop });
	}

	async transferCall(callId: string, to: string, callerId: string): Promise<string> {
		debug('Transfering call %s to %s', callId, to);
		return (await this.catapult.Call.transfer(callId, {transferTo: to, transferCallerId: callerId})).id;
	}

	async speakSentenceToCall(callId: string, text: string, tag: string): Promise<void> {
		debug('Speak sentence to call %s', callId);
		await this.catapult.Call.playAudioAdvanced(callId, { sentence: text,  tag });
	}

	async getCall(callId: string): Promise<ICall> {
		debug('Get call info for %s', callId);
		return <ICall>(await this.catapult.Call.get(callId));
	}

	async getRecording(recordingId: string): Promise<IRecording> {
		debug('Get recording info for %s', recordingId);
		return <IRecording>(await this.catapult.Recording.get(recordingId));
	}

	hangup(callId: string): Promise<void> {
		debug('Hang up call %s', callId);
		return this.catapult.Call.update(callId, { state: 'completed' });
	}

	async downloadMediaFile(name: string): Promise<IMediaFile> {
		debug('Downloading media file %s', name);
		return <IMediaFile>(await this.catapult.Media.download(name));
	}

	private async getApplicationId(ctx: IContext): Promise<string> {
		const host = ctx.request.host;
		debug('Get application id');
		const applicationId = applicationIds.get(host);
		if (applicationId) {
			debug(`Using cached application id ${applicationId}`);
			return applicationId;
		}
		const appName = `${applicationName} on ${host}`;
		debug('Get application list');
		const applications = (await this.catapult.Application.list({ size: 1000 })).applications;
		let application = applications.filter((a: any) => a.name === appName)[0];
		if (application) {
			applicationIds.set(host, application.id);
			debug(`Using existing application id ${application.id}`);
			return application.id;
		}
		debug(`Creating new application with callback ${buildAbsoluteUrl(ctx, '/callCallback')}`);
		application = await this.catapult.Application.create({
			name: appName,
			autoAnswer: true,
			incomingCallUrl: buildAbsoluteUrl(ctx, '/callCallback')
		});
		applicationIds.set(host, application.id);
		debug(`Using new application id ${application.id}`);
		return application.id;
	}

	private async getDomain(ctx: IContext): Promise<IDomainInfo> {
		const getDomainInfo = (d: any) => {
			domainInfo.id = domain.id;
			domainInfo.name = domain.name;
			return Object.assign(<IDomainInfo>{}, domainInfo);
		};
		if (domainInfo.id) {
			debug(`Using cached domain info for ${domainInfo.name}`);
			return Object.assign(<IDomainInfo>{}, domainInfo);
		}
		const description = `${applicationName}'s domain'`;
		const domains = (await this.catapult.Domain.list({ size: 100 })).domains;
		let domain = domains.filter((d: any) => d.description === description)[0];
		if (domain) {
			debug(`Using existing domain info for ${domain.name}`);
			return getDomainInfo(domain);
		}

		const name = randomstring.generate({
			length: 1,
			charset: 'alphabetic'
		}) + randomstring.generate({
			length: 14,
			charset: 'alphanumeric'
		});
		debug(`Creating new domain ${name}`);
		domain = await this.catapult.Domain.create({ name, description });
		debug(`Using new domain info for ${domain.name}`);
		return getDomainInfo(domain);
	}
}

interface IDomainInfo {
	name: string;
	id: string;
}

export function buildAbsoluteUrl(ctx: IContext, path: string): string {
	if (path[0] !== '/') {
		path = `/${path}`;
	}
	const baseUrl = ctx.request.headers.origin ? ctx.request.headers.origin : `${ctx.request.protocol}://${ctx.request.host}`;
	return `${baseUrl}${path}`;
}
