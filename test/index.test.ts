import test from 'ava';
import {runWithServer} from './helpers/app';

test(`GET '/' should return status 200`, async () => {
	await runWithServer(async request => {
		await request.get('/')
		.expect(200);
	});
});
