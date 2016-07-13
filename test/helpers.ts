import * as Koa from 'koa';
import {agent, SuperTest, Response} from 'supertest';
import {ICatapultApi, ISIPAccount, ICall, IMediaFile, IRecording, ISIPAuthToken} from '../src/catapult';
import {IUser} from '../src/models';
import {models, Application} from '../src/index';
import getRouter, {IContext} from '../src/routes';
import * as http from 'http';

export interface ISuperTest extends SuperTest {
	login: (userName: string, useExistsUser?: boolean) => Promise<Response>;
}

export class TestApplication extends Application {
	api: ICatapultApi;

	constructor() {
		const api = new MockCatapultApi();
		super(api);
		this.api = api;
	}
}

export async function createUser(userName: string): Promise<IUser> {
	await models.user.remove({ userName });
	const user = new models.user({
				userName,
				areaCode: '910',
				phoneNumber: '+1234567890',
				endpointId: 'endpointId',
				sipUri: 'sip:test@test.net',
				sipPassword: '123456',
	});
	await user.setPassword('123456');
	await user.save();
	return user;
}

export async function runWithServer(action: (request: ISuperTest, app: TestApplication, server: http.Server) => Promise<any>) {
	const app = new TestApplication();
	const server = (<any>(app)).listen();
	const request = <ISuperTest>agent(server);
	request.login = async (userName, useExistsUser?): Promise<Response> => {
		if (!useExistsUser) {
			await createUser(userName);
		}
		return <Response><any>(await request
			.post('/login')
			.send({ userName, password: '123456' }));
	};
	try {
		await action(request, app, server);
	} finally {
		server.close();
	}
}

export function createContext(): IContext {
	const app = new Koa();
	app.proxy = true;
	const ctx = (<any>(app)).createContext({ socket: {}, headers: { host: 'localhost' } }, {});
	return ctx;
}

export class MockCatapultApi implements ICatapultApi {

	createPhoneNumber(areaCode: string): Promise<string> {
		throw new Error('Not implemented');
	}
	createSIPAccount(): Promise<ISIPAccount> {
		throw new Error('Not implemented');
	}

	createSIPAuthToken(endpointId: string): Promise<ISIPAuthToken> {
		throw new Error('Not implemented');
	}

	createBridge(data: any): Promise<string> {
		throw new Error('Not implemented');
	}

	createCall(data: any): Promise<string> {
		throw new Error('Not implemented');
	}

	createGather(data: any): Promise<string> {
		throw new Error('Not implemented');
	}

	updateCall(callId: string, data: any): Promise<void> {
		throw new Error('Not implemented');
	}

	stopPlayAudioToCall(callId: string): Promise<void> {
		throw new Error('Not implemented');
	}

	playAudioToCall(callId: string, url: string, loop: boolean, tag: string): Promise<void> {
		throw new Error('Not implemented');
	}

	transferCall(to: string, callerId: string): Promise<string> {
		throw new Error('Not implemented');
	}

	speakSentenceToCall(callId: string, text: string, tag: string): Promise<void> {
		throw new Error('Not implemented');
	}

	getCall(callId: string): Promise<ICall> {
		throw new Error('Not implemented');
	}

	getRecording(recordingId: string): Promise<IRecording> {
		throw new Error('Not implemented');
	}

	hangup(callId: string): Promise<void> {
		throw new Error('Not implemented');
	}

	downloadMediaFile(name: string): Promise<IMediaFile> {
		throw new Error('Not implemented');
	}
}
