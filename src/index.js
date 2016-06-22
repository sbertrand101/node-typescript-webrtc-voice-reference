"use strict";
const Koa = require('koa');
const mongoose_1 = require('mongoose');
const catapult_1 = require('./catapult');
const models_1 = require('./models');
const routes_1 = require('./routes');
function getDatabaseUrl() {
    const env = process.env;
    if (env.MONGO_PORT_27017_TCP_ADDR && env.MONGO_PORT_27017_TCP_PORT) {
        return `mongodb://${env.MONGO_PORT_27017_TCP_ADDR}:${env.MONGO_PORT_27017_TCP_PORT}/voiceApp`;
    }
    if (env.MONGOLAB_URI) {
        return env.MONGOLAB_URI;
    }
    if (env.DATABASE_URL) {
        return env.DATABASE_URL;
    }
    return 'mongodb://localhost/voiceApp';
}
const app = new Koa();
const mongoose = new mongoose_1.Mongoose();
mongoose.connect(getDatabaseUrl(), (err) => {
    if (err) {
        console.error(`Error on connecting to DB: ${err.message}`);
        process.exit(1);
    }
});
const models = models_1.default(mongoose);
const router = routes_1.default(app, models);
app
    .use(require('koa-static')('public'))
    .use(catapult_1.catapultMiddleware)
    .use(router.allowedMethods())
    .use(router.routes());
app.listen(process.env.PORT || 3000);
//# sourceMappingURL=index.js.map