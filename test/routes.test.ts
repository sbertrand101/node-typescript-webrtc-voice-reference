import test from 'ava';
import {runWithServer, ISuperTest} from './helpers';
import {Response} from 'supertest';
import * as TypeMoq from 'typemoq';
import * as sinon from 'sinon';
import getRouter, {IContext} from '../src/routes';
import {models} from '../src/index';

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
	await models.user.remove({userName: 'login3'});
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
		await models.user.remove({userName: 'register1'});
		const stub1 = sinon.stub(app.api, 'createPhoneNumber').withArgs('910').returns(Promise.resolve('+1234567890'));
		const stub2 = sinon.stub(app.api, 'createSIPAccount').returns(Promise.resolve({endpointId: 'endpointId', uri: 'uri', password: 'password'}));
		const response = <Response><any>(await request.post('/register').send({userName: 'register1', password: '123456', repeatPassword: '123456', areaCode: '910'}));
		t.true(response.ok);
		t.true(stub1.called);
		t.true(stub2.called);
		const user = await models.user.findOne({userName: 'register1'}).exec();
		t.truthy(user);
	});
});
