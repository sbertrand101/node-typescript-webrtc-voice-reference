import test from 'ava';
import {buildAbsoluteUrl, catapultMiddleware} from '../src/catapult';
import {IContext} from '../src/routes';
import {createContext} from './helpers';

test(`buildAbsoluteUrl() should build right absolute url`, async (t) => {
	const ctx = createContext();
	t.is(buildAbsoluteUrl(ctx, '/path1'), 'http://localhost/path1');
	t.is(buildAbsoluteUrl(ctx, 'path2'), 'http://localhost/path2');
	ctx.request.req.headers['x-forwarded-proto'] = 'https';
	t.is(buildAbsoluteUrl(ctx, '/path3'), 'https://localhost/path3');
});

test(`catapultMiddleware() should add api to context`, async (t) => {
	const ctx = createContext();
	await catapultMiddleware(ctx, () => Promise.resolve(null));
	t.truthy(ctx.api);
});
