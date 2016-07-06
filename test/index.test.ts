import test from 'ava';
import * as sinon from 'sinon';
import {Mongoose} from 'mongoose';

import {getDatabaseUrl, Application} from '../src/index';
import {MockCatapultApi} from './helpers';

test('getDatabaseUrl() should return url to mongo database', async(t) => {
	process.env.DATABASE_URL = 'url';
	t.is(getDatabaseUrl(), 'url');
	delete process.env.DATABASE_URL;
	process.env.MONGODB_URI = 'url1';
	t.is(getDatabaseUrl(), 'url1');
	delete process.env.MONGODB_URI;
	process.env.MONGO_PORT_27017_TCP_ADDR = 'host';
	process.env.MONGO_PORT_27017_TCP_PORT = 'port';
	t.is(getDatabaseUrl(), 'mongodb://host:port/voiceApp');
	delete process.env.MONGO_PORT_27017_TCP_ADDR;
	delete process.env.MONGO_PORT_27017_TCP_PORT;
	t.is(getDatabaseUrl(), 'mongodb://localhost/voiceApp');
});

test('Application should run an app', (t) => {
	const app = new Application(new MockCatapultApi());
	const server = (<any>app).listen();
	t.truthy(server);
});
