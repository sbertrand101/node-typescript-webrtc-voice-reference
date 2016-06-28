import {IContext} from './routes';
import * as url from 'url';

export interface ICatapultApi {
	createPhoneNumber(areaCode: string): Promise<string>;
	createSIPAccount(): Promise<ISIPAccount>;
	createSIPAuthToken(endpointId: string): Promise<ISIPAuthToken>;
	createBridge(data: any): Promise<string>;
	createCall(data: any): Promise<string>;
	createGather(data: any): Promise<string>;
	updateCall(callId: string, data: any): Promise<string>;
	stopPlayAudioToCall(callId: string): Promise<void>;
	playAudioToCall(callId: string, tonesURL: string, loop: boolean, tag: string): Promise<void>;
	transferCall(to: string, callerId: string): Promise<string>;
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

class CatapultApi implements ICatapultApi {
	constructor(private userId: string, private apiToken: string, private apiSecret: string) {
	}
	createPhoneNumber(areaCode: string): Promise<string> {
		throw new Error('Not implemented yet');
	}
	createSIPAccount(): Promise<ISIPAccount> {
		throw new Error('Not implemented yet');
	}

	createSIPAuthToken(endpointId: string): Promise<ISIPAuthToken> {
		throw new Error('Not implemented yet');
	}

	createBridge(data: any): Promise<string> {
		throw new Error('Not implemented yet');
	}

	createCall(data: any): Promise<string> {
		throw new Error('Not implemented yet');
	}

	createGather(data: any): Promise<string> {
		throw new Error('Not implemented yet');
	}

	updateCall(callId: string, data: any): Promise<string> {
		throw new Error('Not implemented yet');
	}

	stopPlayAudioToCall(callId: string): Promise<void> {
		throw new Error('Not implemented yet');
	}

	playAudioToCall(callId: string, url: string, loop: boolean, tag: string): Promise<void> {
		throw new Error('Not implemented yet');
	}

	transferCall(to: string, callerId: string): Promise<string> {
		throw new Error('Not implemented yet');
	}

	speakSentenceToCall(callId: string, text: string, tag: string): Promise<void> {
		throw new Error('Not implemented yet');
	}

	getCall(callId: string): Promise<ICall> {
		throw new Error('Not implemented yet');
	}

	getRecording(recordingId: string): Promise<IRecording> {
		throw new Error('Not implemented yet');
	}

	hangup(callId: string): Promise<void> {
		throw new Error('Not implemented yet');
	}

	downloadMediaFile(name: string): Promise<IMediaFile> {
		throw new Error('Not implemented yet');
	}
}

export const catapultMiddleware = async (ctx: IContext, next: Function) => {
	ctx.api = <ICatapultApi>new CatapultApi(process.env.CATAPULT_USER_ID, process.env.CATAPULT_API_TOKEN, process.env.CATAPULT_API_SECRET);
	await next();
};

export function buildAbsoluteUrl(ctx: IContext, path: string): string {
	let proto = ctx.request.headers['X-Forwarded-Proto'];
	if (!proto) {
		const u = url.parse(ctx.request.url, false);
		proto = u.protocol;
		if (!proto) {
			proto = 'http';
		}
	}
	if (path[0] != '/') {
		path = `/${path}`;
	}
	return `${proto}://${ctx.request.host}${path}`;
}
