import * as Koa from 'koa';
import * as Router from 'koa-router';

import {Mongoose} from 'mongoose';
import * as debugFactory from 'debug';
import getModels, {IModels} from './models';
import getRouter from './routes';
import {ICatapultApi, CatapultApi} from './catapult';
import staticFilesOptions from './staticFilesOptions';

const debug = debugFactory('index');

export function getDatabaseUrl(): string {
	const env = process.env;
	// Docker support
	if (env.MONGO_PORT_27017_TCP_ADDR && env.MONGO_PORT_27017_TCP_PORT) {
		return `mongodb://${env.MONGO_PORT_27017_TCP_ADDR}:${env.MONGO_PORT_27017_TCP_PORT}/voiceApp`;
	}
	// Mongolab instances support
	if (env.MONGODB_URI) {
		return env.MONGODB_URI;
	}
	// via DATABASE_URL
	if (env.DATABASE_URL) {
		return env.DATABASE_URL;
	}
	return 'mongodb://localhost/voiceApp';
}

const mongoose = new Mongoose();
(<any>mongoose).Promise = global.Promise;
mongoose.connect(getDatabaseUrl());

export const models = getModels(mongoose);

export class Application extends Koa {
	router: Router;
	constructor(api: ICatapultApi) {
		super();
		this.router = getRouter(this, models, api);
		this
			.use(require('koa-static')(staticFilesOptions.root, staticFilesOptions))
			.use(this.router.allowedMethods())
			.use(this.router.routes());
	}
}

if (process.env.NODE_ENV !== 'test') {
	const app = new Application(new CatapultApi(process.env.CATAPULT_USER_ID, process.env.CATAPULT_API_TOKEN, process.env.CATAPULT_API_SECRET));
	app.listen(process.env.PORT || 3000, () => debug('Server started'));
}

