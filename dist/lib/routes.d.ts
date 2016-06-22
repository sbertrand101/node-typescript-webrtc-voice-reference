import * as Koa from 'koa';
import * as Router from 'koa-router';
import { IUser, IModels } from './models';
export interface IContext extends Router.IRouterContext {
    user: IUser;
}
export default function getRouter(app: Koa, models: IModels): Router;
