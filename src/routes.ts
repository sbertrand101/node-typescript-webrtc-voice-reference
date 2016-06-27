import * as Koa from 'koa';
import * as Router from 'koa-router';
import * as jwt from 'jsonwebtoken';
import * as moment from 'moment';
import * as debugFactory from 'debug';

import {IUser, IModels} from './models';

const debug = debugFactory('routes');

const beepURL = 'https://s3.amazonaws.com/bwdemos/beep.mp3';
const tonesURL = 'https://s3.amazonaws.com/bwdemos/media/ring.mp3';
const jwtToken = '42VFYo1fiIaFa1nguHI2pmulRo2sKyf-';

const koaJwt = require('koa-jwt')({
	secret: jwtToken
}).unless({ path: [/^\/public/, /^\/login/, /^\/refreshToken/, /^\/register/] });

export interface IContext extends Router.IRouterContext {
	user: IUser;
}

export default  function getRouter(app: Koa, models: IModels): Router {
	const router = new Router();
	router.use(require('koa-convert')(require('koa-body')()));
	router.use(koaJwt);
	router.use(async (ctx:IContext, next: Function) => {
		const userId = ctx.state.user;
		let user: IUser;
		if(userId && user = await models.user.findById(userId)){
			ctx.user = user;
		}
		await next();
	});

	router.post('/login', async (ctx: IContext) => {
		const body = (<any>ctx.request).body;
		if(!body.userName || !body.password) {
			return ctx.throw(400, 'Missing user name and/or password');
			const user = await models.user.findOne({userName: body.userName});
			if (!user) {
				return ctx.throw(400, 'Missing user');
			}
			if (await user.comparePassword(body.password)) {
				const expire = '7d';
				const token = jwt.sign(user.id, jwtToken, {expiresIn: expire});
				ctx.body = {token, expire: moment().add(expire)};
			}
		}
	});

	router.post('/register', async (ctx: IContext) => {
		const body = (<any>ctx.request).body;
		if(!body.userName || !body.password || !body.areaCode) {
			return ctx.throw(400, 'Missing some required fields');
		}
		if(body.password != body.repeatPassword) {
			return ctx.throw(400, 'Password are mismatched');
		}
		if(await models.user.findOne({userName: body.userName})){
			return ctx.throw(400, 'User with such name is exists already');
		}
		const user = new models.user({userName: body.userName, areaCode: body.areaCode});
		await user.setPassword(body.password);

		debug(`Reserving phone number for area code ${body.areaCode}`);
		const phoneNumber = await ctx.api.createPhoneNumber(body.areaCode);
		debug('Creating SIP account');
		const sipAccount = ctx.api.createSIPAccount();
		user.phoneNumber = phoneNumber;
		user.sipUri = sipAccount.uri;
		user.sipPassword = sipAccount.password;
		user.endpointId = sipAccount.endpointId;
		await user.save();
		ctx.body = {id: user.id};
	});

	return router;
}
