import test from 'ava';
import * as sinon from 'sinon';
import * as randomstring from 'randomstring';
import {buildAbsoluteUrl, CatapultApi, ICatapultApi} from '../src/catapult';
import {IContext} from '../src/routes';
import {createContext} from './helpers';

sinon.stub(randomstring, 'generate').returns('random');


test(`buildAbsoluteUrl() should build right absolute url`, async (t) => {
	const ctx = createContext();
	t.is(buildAbsoluteUrl(ctx, '/path1'), 'http://localhost/path1');
	t.is(buildAbsoluteUrl(ctx, 'path2'), 'http://localhost/path2');
	ctx.request.req.headers['x-forwarded-proto'] = 'https';
	t.is(buildAbsoluteUrl(ctx, '/path3'), 'https://localhost/path3');
});

test(`CatapultApi#getApplicationId should return existing application id If the app exists`, async (t) => {
	const api = createCatapultApi();
	const applications = [
		{	id: 'appId',	name: 'NodeJSVoiceReferenceApp on localhost' }
	];
	const stub1 = sinon.stub((<any>api).catapult.Application, 'list')
		.withArgs({ size: 1000 })
		.returns(Promise.resolve({applications}));
	t.is(await (<any>api).getApplicationId(createContext()), 'appId');
	t.true(stub1.called);
});

test(`CatapultApi#getApplicationId should return cached application id on second call`, async (t) => {
	const api = createCatapultApi();
	const applications = [
		{	id: 'appId',	name: 'NodeJSVoiceReferenceApp on localhost' }
	];
	const stub1 = sinon.stub((<any>api).catapult.Application, 'list')
		.withArgs({ size: 1000 })
		.returns(Promise.resolve({applications}));
	t.is(await (<any>api).getApplicationId(createContext()), 'appId');
	t.is(await (<any>api).getApplicationId(createContext()), 'appId');
	t.is(stub1.callCount, 1);
});

test(`CatapultApi#getApplicationId should create new app`, async (t) => {
	const api = createCatapultApi();
	const stub1 = sinon.stub((<any>api).catapult.Application, 'list')
		.withArgs({ size: 1000 })
		.returns(Promise.resolve({applications: []}));
	const stub2 = sinon.stub((<any>api).catapult.Application, 'create')
		.withArgs({
			name: 'NodeJSVoiceReferenceApp on localhost',
			autoAnswer: true,
			incomingCallUrl: 'http://localhost/callCallback'
		})
		.returns(Promise.resolve({id: 'appId'}));
	t.is(await (<any>api).getApplicationId(createContext()), 'appId');
	t.true(stub1.called);
	t.true(stub2.called);
});

test(`CatapultApi#getDomain should return existing domain info if the domain exists`, async (t) => {
	const api = createCatapultApi();
	const domains = [
		{	id: 'domainId',	name: 'domain', description: `NodeJSVoiceReferenceApp's domain` }
	];
	const stub1 = sinon.stub((<any>api).catapult.Domain, 'list')
		.withArgs({ size: 100 })
		.returns(Promise.resolve({domains}));
	t.deepEqual(await (<any>api).getDomain(createContext()), {	id: 'domainId',	name: 'domain' });
	t.true(stub1.called);
});

test(`CatapultApi#getDomain should return cached domain info on second call`, async (t) => {
	const api = createCatapultApi();
	const domains = [
		{	id: 'domainId',	name: 'domain', description: `NodeJSVoiceReferenceApp's domain` }
	];
	const stub1 = sinon.stub((<any>api).catapult.Domain, 'list')
		.withArgs({ size: 100 })
		.returns(Promise.resolve({domains}));
	t.deepEqual(await (<any>api).getDomain(createContext()), {	id: 'domainId',	name: 'domain' });
	t.deepEqual(await (<any>api).getDomain(createContext()), {	id: 'domainId',	name: 'domain' });
	t.is(stub1.callCount, 1);
});

test(`CatapultApi#getDomain should create new domain`, async (t) => {
	const api = createCatapultApi();
	const name = 'randomrandom';
	const stub1 = sinon.stub((<any>api).catapult.Domain, 'list')
		.withArgs({ size: 100 })
		.returns(Promise.resolve({domains: []}));
	const stub2 = sinon.stub((<any>api).catapult.Domain, 'create')
		.withArgs({ name, description: `NodeJSVoiceReferenceApp's domain` })
		.returns(Promise.resolve({	id: 'domainId',	name }));
	t.deepEqual(await (<any>api).getDomain(createContext()), {	id: 'domainId',	name });
	t.true(stub1.called);
	t.true(stub2.called);
});

test(`CatapultApi#createPhoneNumber should search and register a phone number`, async (t) => {
	const api = createCatapultApi();
	const stub1 = sinon.stub((<any>api).catapult.AvailableNumber, 'searchAndOrder')
		.withArgs('local', { areaCode: '910', quantity: 1 })
		.returns(Promise.resolve([{id: 'id', number: '+1234567890'}]));
	const stub2 = sinon.stub((<any>api).catapult.PhoneNumber, 'update')
		.withArgs('id', { applicationId: 'appId' })
		.returns(Promise.resolve());
	const stub3 = sinon.stub((<any>api), 'getApplicationId')
		.returns(Promise.resolve('appId'));
	t.is(await api.createPhoneNumber(createContext(), '910'), '+1234567890');
	t.true(stub1.called);
	t.true(stub2.called);
	t.true(stub3.called);
});

test(`CatapultApi#createSIPAccount should create sip account for the app`, async (t) => {
	const api = createCatapultApi();
	const stub1 = sinon.stub((<any>api).catapult.Endpoint, 'create')
		.withArgs('domainId', {
			applicationId: 'appId',
			domainId: 'domainId',
			name: 'vu-random',
			description: `NodeJSVoiceReferenceApp's SIP Account`,
			credentials: {password: 'random'}
		})
		.returns(Promise.resolve({id: 'id'}));
	const stub2 = sinon.stub((<any>api), 'getApplicationId')
		.returns(Promise.resolve('appId'));
	const stub3 = sinon.stub((<any>api), 'getDomain')
		.returns(Promise.resolve({id: 'domainId', name: 'domain'}));
	t.deepEqual(await api.createSIPAccount(createContext()), {
		endpointId: 'id',
		uri: 'sip:vu-random@domain.bwapp.bwsip.io',
		password: 'random'
	});
	t.true(stub1.called);
	t.true(stub2.called);
	t.true(stub3.called);
});

test(`CatapultApi#createSIPAuthToken should create auth token for SIP account`, async (t) => {
	const api = createCatapultApi();
	const stub1 = sinon.stub((<any>api), 'getDomain')
		.returns(Promise.resolve({id: 'domainId', name: 'domain'}));
	const stub2 = sinon.stub((<any>api).catapult.Endpoint, 'createAuthToken')
		.withArgs('domainId', 'endpointId', {expires: 3600})
		.returns(Promise.resolve({expires: 3600, token: 'token'}));
	t.deepEqual(await api.createSIPAuthToken(createContext(), 'endpointId'), {expires: 3600, token: 'token'});
	t.true(stub1.called);
	t.true(stub2.called);
});

test(`CatapultApi#createBridge should create a bridge`, async (t) => {
	const api = createCatapultApi();
	const data = {callIds: ['callId']};
	const stub = sinon.stub((<any>api).catapult.Bridge, 'create')
		.withArgs(data)
		.returns(Promise.resolve({id: 'id'}));
	t.is(await api.createBridge(data), 'id');
	t.true(stub.called);
});

test(`CatapultApi#createCall should create a bridge`, async (t) => {
	const api = createCatapultApi();
	const data = {from: 'number1', to: 'number2'};
	const stub = sinon.stub((<any>api).catapult.Call, 'create')
		.withArgs(data)
		.returns(Promise.resolve({id: 'id'}));
	t.is(await api.createCall(data), 'id');
	t.true(stub.called);
});

test(`CatapultApi#createGather should create a gather for a call`, async (t) => {
	const api = createCatapultApi();
	const data = {maxDigits: 1};
	const stub = sinon.stub((<any>api).catapult.Call, 'createGather')
		.withArgs('callId', data)
		.returns(Promise.resolve({id: 'id'}));
	t.is(await api.createGather('callId', data), 'id');
	t.true(stub.called);
});

test(`CatapultApi#updateCall should update call data`, async (t) => {
	const api = createCatapultApi();
	const data = {state: 'completed'};
	const stub = sinon.stub((<any>api).catapult.Call, 'update')
		.withArgs('callId', data)
		.returns(Promise.resolve());
	await api.updateCall('callId', data);
	t.true(stub.called);
});

test(`CatapultApi#stopPlayAudioToCall should stop audio`, async (t) => {
	const api = createCatapultApi();
	const stub = sinon.stub((<any>api).catapult.Call, 'playAudioAdvanced')
		.withArgs('callId', { fileUrl: '' })
		.returns(Promise.resolve());
	await api.stopPlayAudioToCall('callId');
	t.true(stub.called);
});

test(`CatapultApi#playAudioToCall should play audio file`, async (t) => {
	const api = createCatapultApi();
	const stub = sinon.stub((<any>api).catapult.Call, 'playAudioAdvanced')
		.withArgs('callId', { fileUrl: 'url', tag: 'tag', loopEnabled: false })
		.returns(Promise.resolve());
	await api.playAudioToCall('callId', 'url', false, 'tag');
	t.true(stub.called);
});

test(`CatapultApi#speakSentenceToCall should speak a sentence`, async (t) => {
	const api = createCatapultApi();
	const stub = sinon.stub((<any>api).catapult.Call, 'playAudioAdvanced')
		.withArgs('callId', { sentence: 'Hello',  tag: 'tag' })
		.returns(Promise.resolve());
	await api.speakSentenceToCall('callId', 'Hello', 'tag');
	t.true(stub.called);
});

test(`CatapultApi#transferCall should transfer call to another call`, async (t) => {
	const api = createCatapultApi();
	const stub = sinon.stub((<any>api).catapult.Call, 'transfer')
		.withArgs('callId', {transferTo: '+1234567890', transferCallerId: 'callerId'})
		.returns(Promise.resolve({id: 'id'}));
	t.is(await api.transferCall('callId', '+1234567890', 'callerId'), 'id');
	t.true(stub.called);
});

test(`CatapultApi#getCall should return a call data`, async (t) => {
	const api = createCatapultApi();
	const stub = sinon.stub((<any>api).catapult.Call, 'get')
		.withArgs('callId')
		.returns(Promise.resolve({callId: 'id'}));
	t.deepEqual(await api.getCall('callId'), {callId: 'id'});
	t.true(stub.called);
});

test(`CatapultApi#getRecording should return a call data`, async (t) => {
	const api = createCatapultApi();
	const stub = sinon.stub((<any>api).catapult.Recording, 'get')
		.withArgs('recordingId')
		.returns(Promise.resolve({media: 'url'}));
	t.deepEqual(await api.getRecording('recordingId'), {media: 'url'});
	t.true(stub.called);
});

test(`CatapultApi#hangup should complete a call`, async (t) => {
	const api = createCatapultApi();
	const stub = sinon.stub((<any>api).catapult.Call, 'update')
		.withArgs('callId', { state: 'completed' })
		.returns(Promise.resolve());
	await api.hangup('callId');
	t.true(stub.called);
});

test(`CatapultApi#downloadMediaFile should download a media file`, async (t) => {
	const api = createCatapultApi();
	const data = {content: '1234', contentType: 'text/plain'};
	const stub = sinon.stub((<any>api).catapult.Media, 'download')
		.withArgs('name')
		.returns(Promise.resolve(data));
	t.deepEqual(await api.downloadMediaFile('name'), data);
	t.true(stub.called);
});

function createCatapultApi(): ICatapultApi {
	return new CatapultApi('userId', 'apiToken', 'apiSecret');
}

