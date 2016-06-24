import test from 'ava';
import {runWithServer, ISuperTest} from './helpers';

test(`GET '/' should return status 200`, async () => {
	await runWithServer(async (request: ISuperTest) => {
		await request.get('/')
		.expect(200);
	});
});
