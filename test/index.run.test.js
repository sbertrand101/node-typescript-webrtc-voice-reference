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
ava_1.default('index.ts should run app', (t) => __awaiter(this, void 0, void 0, function* () {
    process.env.DATABASE_URL = 'mongodb://localhost/tmp';
    process.env.CATAPULT_USER_ID = 'userId';
    process.env.CATAPULT_API_TOKEN = 'apiToken';
    process.env.CATAPULT_API_SECRET = 'apiSecret';
    process.env.NODE_ENV = 'test-run';
    require('../src/index');
}));
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaW5kZXgucnVuLnRlc3QuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyJpbmRleC5ydW4udGVzdC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7QUFBQSxzQkFBaUIsS0FBSyxDQUFDLENBQUE7QUFFdkIsYUFBSSxDQUFDLHlCQUF5QixFQUFFLENBQU0sQ0FBQztJQUN0QyxPQUFPLENBQUMsR0FBRyxDQUFDLFlBQVksR0FBRyx5QkFBeUIsQ0FBQztJQUNyRCxPQUFPLENBQUMsR0FBRyxDQUFDLGdCQUFnQixHQUFHLFFBQVEsQ0FBQztJQUN4QyxPQUFPLENBQUMsR0FBRyxDQUFDLGtCQUFrQixHQUFHLFVBQVUsQ0FBQztJQUM1QyxPQUFPLENBQUMsR0FBRyxDQUFDLG1CQUFtQixHQUFHLFdBQVcsQ0FBQztJQUM5QyxPQUFPLENBQUMsR0FBRyxDQUFDLFFBQVEsR0FBRyxVQUFVLENBQUM7SUFDbEMsT0FBTyxDQUFDLGNBQWMsQ0FBQyxDQUFDO0FBQ3pCLENBQUMsQ0FBQSxDQUFDLENBQUMiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgdGVzdCBmcm9tICdhdmEnO1xuXG50ZXN0KCdpbmRleC50cyBzaG91bGQgcnVuIGFwcCcsIGFzeW5jKHQpID0+IHtcblx0cHJvY2Vzcy5lbnYuREFUQUJBU0VfVVJMID0gJ21vbmdvZGI6Ly9sb2NhbGhvc3QvdG1wJztcblx0cHJvY2Vzcy5lbnYuQ0FUQVBVTFRfVVNFUl9JRCA9ICd1c2VySWQnO1xuXHRwcm9jZXNzLmVudi5DQVRBUFVMVF9BUElfVE9LRU4gPSAnYXBpVG9rZW4nO1xuXHRwcm9jZXNzLmVudi5DQVRBUFVMVF9BUElfU0VDUkVUID0gJ2FwaVNlY3JldCc7XG5cdHByb2Nlc3MuZW52Lk5PREVfRU5WID0gJ3Rlc3QtcnVuJztcblx0cmVxdWlyZSgnLi4vc3JjL2luZGV4Jyk7XG59KTtcbiJdfQ==