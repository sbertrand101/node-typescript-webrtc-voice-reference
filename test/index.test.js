"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator.throw(value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments)).next());
    });
};
const ava_1 = require('ava');
const index_1 = require('../src/index');
const helpers_1 = require('./helpers');
ava_1.default('getDatabaseUrl() should return url to mongo database', (t) => __awaiter(this, void 0, void 0, function* () {
    process.env.DATABASE_URL = 'url';
    t.is(index_1.getDatabaseUrl(), 'url');
    delete process.env.DATABASE_URL;
    process.env.MONGODB_URI = 'url1';
    t.is(index_1.getDatabaseUrl(), 'url1');
    delete process.env.MONGODB_URI;
    process.env.MONGO_PORT_27017_TCP_ADDR = 'host';
    process.env.MONGO_PORT_27017_TCP_PORT = 'port';
    t.is(index_1.getDatabaseUrl(), 'mongodb://host:port/voiceApp');
    delete process.env.MONGO_PORT_27017_TCP_ADDR;
    delete process.env.MONGO_PORT_27017_TCP_PORT;
    t.is(index_1.getDatabaseUrl(), 'mongodb://localhost/voiceApp');
}));
ava_1.default('Application should run an app', (t) => {
    const app = new index_1.Application(new helpers_1.MockCatapultApi());
    const server = app.listen();
    t.truthy(server);
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaW5kZXgudGVzdC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbImluZGV4LnRlc3QudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7O0FBQUEsc0JBQWlCLEtBQUssQ0FBQyxDQUFBO0FBSXZCLHdCQUEwQyxjQUFjLENBQUMsQ0FBQTtBQUN6RCwwQkFBOEIsV0FBVyxDQUFDLENBQUE7QUFFMUMsYUFBSSxDQUFDLHNEQUFzRCxFQUFFLENBQU0sQ0FBQztJQUNuRSxPQUFPLENBQUMsR0FBRyxDQUFDLFlBQVksR0FBRyxLQUFLLENBQUM7SUFDakMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxzQkFBYyxFQUFFLEVBQUUsS0FBSyxDQUFDLENBQUM7SUFDOUIsT0FBTyxPQUFPLENBQUMsR0FBRyxDQUFDLFlBQVksQ0FBQztJQUNoQyxPQUFPLENBQUMsR0FBRyxDQUFDLFdBQVcsR0FBRyxNQUFNLENBQUM7SUFDakMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxzQkFBYyxFQUFFLEVBQUUsTUFBTSxDQUFDLENBQUM7SUFDL0IsT0FBTyxPQUFPLENBQUMsR0FBRyxDQUFDLFdBQVcsQ0FBQztJQUMvQixPQUFPLENBQUMsR0FBRyxDQUFDLHlCQUF5QixHQUFHLE1BQU0sQ0FBQztJQUMvQyxPQUFPLENBQUMsR0FBRyxDQUFDLHlCQUF5QixHQUFHLE1BQU0sQ0FBQztJQUMvQyxDQUFDLENBQUMsRUFBRSxDQUFDLHNCQUFjLEVBQUUsRUFBRSw4QkFBOEIsQ0FBQyxDQUFDO0lBQ3ZELE9BQU8sT0FBTyxDQUFDLEdBQUcsQ0FBQyx5QkFBeUIsQ0FBQztJQUM3QyxPQUFPLE9BQU8sQ0FBQyxHQUFHLENBQUMseUJBQXlCLENBQUM7SUFDN0MsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxzQkFBYyxFQUFFLEVBQUUsOEJBQThCLENBQUMsQ0FBQztBQUN4RCxDQUFDLENBQUEsQ0FBQyxDQUFDO0FBRUgsYUFBSSxDQUFDLCtCQUErQixFQUFFLENBQUMsQ0FBQztJQUN2QyxNQUFNLEdBQUcsR0FBRyxJQUFJLG1CQUFXLENBQUMsSUFBSSx5QkFBZSxFQUFFLENBQUMsQ0FBQztJQUNuRCxNQUFNLE1BQU0sR0FBUyxHQUFJLENBQUMsTUFBTSxFQUFFLENBQUM7SUFDbkMsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxNQUFNLENBQUMsQ0FBQztBQUNsQixDQUFDLENBQUMsQ0FBQyIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCB0ZXN0IGZyb20gJ2F2YSc7XG5pbXBvcnQgKiBhcyBzaW5vbiBmcm9tICdzaW5vbic7XG5pbXBvcnQge01vbmdvb3NlfSBmcm9tICdtb25nb29zZSc7XG5cbmltcG9ydCB7Z2V0RGF0YWJhc2VVcmwsIEFwcGxpY2F0aW9ufSBmcm9tICcuLi9zcmMvaW5kZXgnO1xuaW1wb3J0IHtNb2NrQ2F0YXB1bHRBcGl9IGZyb20gJy4vaGVscGVycyc7XG5cbnRlc3QoJ2dldERhdGFiYXNlVXJsKCkgc2hvdWxkIHJldHVybiB1cmwgdG8gbW9uZ28gZGF0YWJhc2UnLCBhc3luYyh0KSA9PiB7XG5cdHByb2Nlc3MuZW52LkRBVEFCQVNFX1VSTCA9ICd1cmwnO1xuXHR0LmlzKGdldERhdGFiYXNlVXJsKCksICd1cmwnKTtcblx0ZGVsZXRlIHByb2Nlc3MuZW52LkRBVEFCQVNFX1VSTDtcblx0cHJvY2Vzcy5lbnYuTU9OR09EQl9VUkkgPSAndXJsMSc7XG5cdHQuaXMoZ2V0RGF0YWJhc2VVcmwoKSwgJ3VybDEnKTtcblx0ZGVsZXRlIHByb2Nlc3MuZW52Lk1PTkdPREJfVVJJO1xuXHRwcm9jZXNzLmVudi5NT05HT19QT1JUXzI3MDE3X1RDUF9BRERSID0gJ2hvc3QnO1xuXHRwcm9jZXNzLmVudi5NT05HT19QT1JUXzI3MDE3X1RDUF9QT1JUID0gJ3BvcnQnO1xuXHR0LmlzKGdldERhdGFiYXNlVXJsKCksICdtb25nb2RiOi8vaG9zdDpwb3J0L3ZvaWNlQXBwJyk7XG5cdGRlbGV0ZSBwcm9jZXNzLmVudi5NT05HT19QT1JUXzI3MDE3X1RDUF9BRERSO1xuXHRkZWxldGUgcHJvY2Vzcy5lbnYuTU9OR09fUE9SVF8yNzAxN19UQ1BfUE9SVDtcblx0dC5pcyhnZXREYXRhYmFzZVVybCgpLCAnbW9uZ29kYjovL2xvY2FsaG9zdC92b2ljZUFwcCcpO1xufSk7XG5cbnRlc3QoJ0FwcGxpY2F0aW9uIHNob3VsZCBydW4gYW4gYXBwJywgKHQpID0+IHtcblx0Y29uc3QgYXBwID0gbmV3IEFwcGxpY2F0aW9uKG5ldyBNb2NrQ2F0YXB1bHRBcGkoKSk7XG5cdGNvbnN0IHNlcnZlciA9ICg8YW55PmFwcCkubGlzdGVuKCk7XG5cdHQudHJ1dGh5KHNlcnZlcik7XG59KTtcbiJdfQ==