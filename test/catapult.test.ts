import test from 'ava';
import * as nock from 'nock';
import {buildAbsoluteUrl, CatapultApi, ICatapultApi} from '../src/catapult';
import {IContext} from '../src/routes';
import {createContext} from './helpers';

test(`buildAbsoluteUrl() should build right absolute url`, async (t) => {
	const ctx = createContext();
	t.is(buildAbsoluteUrl(ctx, '/path1'), 'http://localhost/path1');
	t.is(buildAbsoluteUrl(ctx, 'path2'), 'http://localhost/path2');
	ctx.request.req.headers['x-forwarded-proto'] = 'https';
	t.is(buildAbsoluteUrl(ctx, '/path3'), 'https://localhost/path3');
});

test.skip(`CatapultApi#createPhoneNumber should search and register a phone number`, async (t) => {
	const api = createCatapultApi();
	nock(baseUrl, authHeaders).post('/v1/availableNumbers/local?areaCode=910&quantity=1', {}).reply(201, [{
		number: '+1234567890',
		price: '0.60',
		location: 'https://.../v1/users/.../phoneNumbers/numberId'
	}]);
	const phoneNumber = await api.createPhoneNumber('910');
	t.is(phoneNumber, '+1234567890');
});

function createCatapultApi(): ICatapultApi {
	return new CatapultApi('userId', 'apiToken', 'apiSecret');
}

const authHeaders = {
		reqheaders: {
		authorization: `Basic ${new Buffer('apiToken:apiSecret').toString('base64')}`
		}
};

const baseUrl = 'https://api.catapult.inetwork.com';
