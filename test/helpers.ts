import * as Koa from 'koa';
import {agent, SuperTest} from 'supertest';
import app, {models} from '../src/index';
import {IContext} from '../src/routes';
import * as http from "http";
export interface ISuperTest extends SuperTest {
	login: (userName: string) => Promise<void>;
}
export async function runWithServer(action: (request: ISuperTest, app: Koa, server: http.Server) => Promise<any>) {
	const server = (<any>(app)).listen();
	const request = <ISuperTest>agent(server);
	request.login = async (userName:string) => {
		await models.user.remove({userName});
		const user = new models.user({
			userName,
			areaCode: '910',
			phoneNumber: '+1234567890',
			endpointId: 'endpointId',
			sipUri: 'test@test.net',
			sipPassword: '123456',
		});
		await user.setPassword('123456');
		await user.save();
		await request
			.post('/signin')
			.send({userName, password: '123456'})
			.expect(200);
	};
	try {
		await action(request, app, server);
	}	finally {
		server.close();
	}
}

export function createContext(): IContext {
	const app = new Koa();
	app.proxy = true;
	const ctx = (<any>(app)).createContext({socket: {}, headers: {host: 'localhost'}}, {});
	return ctx;
}
