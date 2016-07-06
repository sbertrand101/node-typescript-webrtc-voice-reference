import test from 'ava';

test('index.ts should run app', async(t) => {
	process.env.DATABASE_URL = 'mongodb://localhost/tmp';
	process.env.CATAPULT_USER_ID = 'userId';
	process.env.CATAPULT_API_TOKEN = 'apiToken';
	process.env.CATAPULT_API_SECRET = 'apiSecret';
	process.env.NODE_ENV = 'test-run';
	require('../src/index');
});
