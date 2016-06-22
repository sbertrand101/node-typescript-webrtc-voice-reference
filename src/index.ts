import * as Koa from 'koa';
import {Mongoose} from 'mongoose';
import {catapultMiddleware} from './catapult';
import getModels from './models';
import getRouter from './routes';

function getDatabaseUrl(): string {
	const env = process.env;
	// Docker support
	if (env.MONGO_PORT_27017_TCP_ADDR && env.MONGO_PORT_27017_TCP_PORT) {
		return `mongodb://${env.MONGO_PORT_27017_TCP_ADDR}:${env.MONGO_PORT_27017_TCP_PORT}/voiceApp`;
	}
	// Momgolab instances support
	if (env.MONGOLAB_URI) {
		return env.MONGOLAB_URI;
	}
	// via DATABASE_URL
	if (env.DATABASE_URL) {
		return env.DATABASE_URL;
	}
	return 'mongodb://localhost/voiceApp';
}

const app = new Koa();
const mongoose = new Mongoose();
mongoose.connect(getDatabaseUrl(), (err: any) => {
	if (err) {
		console.error(`Error on connecting to DB: ${err.message}`);
		process.exit(1);
	}
});

const models = getModels(mongoose);
const router = getRouter(app, models);

app
	.use(require('koa-static')('public'))
	.use(catapultMiddleware)
	.use(router.allowedMethods())
	.use(router.routes());

app.listen(process.env.PORT || 3000);
