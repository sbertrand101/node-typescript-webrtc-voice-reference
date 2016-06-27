import {IContext} from './routes';

export interface ICatapultApi {
	createPhoneNumber(areaCode: string): Promise<string>;
	createSIPAccount(): Promise<ISIPAccount>;
	createSIPAuthToken(endpointId: string): Promise<ISIPAuthToken>;
	createBridge(data: any): Promise<string>;
	createCall(data: any): Promise<string>;
	updateCall(callId: string, data: any): Promise<string>;
	stopPlayAudioToCall(callId: string): Promise<void>;
	playAudioToCall(callId: string, tonesURL: string, loop: boolean, tag: string): Promise<void>;
	transferCall(to: string, callerId: string): Promise<string>;
	speakSentenceToCall(callId: string, text: string, tag: string): Promise<void>;
	getCall(callId: string): Promise<ICall>;
	getRecording(recordingId: string): Promise<IRecording>;
	hangup(callId: string): Promise<void>;
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
}

export interface IRecording {
	media: string;
	startTime: string;
	endTime: string;
}

class CatapultApi extends ICatapultApi {

}

export const catapultMiddleware = async (ctx: IContext, next: Function) => {
	ctx.api = <ICatapultApi>new CatapultApi();
	await next();
};
