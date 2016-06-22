import {IContext} from './routes';

export const catapultMiddleware = async (ctx: IContext, next: Function) => {
	await next();
};
