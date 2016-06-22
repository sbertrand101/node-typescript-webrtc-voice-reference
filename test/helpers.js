"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator.throw(value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments)).next());
    });
};
const Koa = require('koa');
const supertest_1 = require('supertest');
const index_1 = require('../src/index');
class TestApplication extends index_1.Application {
    constructor() {
        const api = new MockCatapultApi();
        super(api);
        this.api = api;
    }
}
exports.TestApplication = TestApplication;
function createUser(userName) {
    return __awaiter(this, void 0, Promise, function* () {
        yield index_1.models.user.remove({ userName: userName });
        const user = new index_1.models.user({
            userName: userName,
            areaCode: '910',
            phoneNumber: '+1234567890',
            endpointId: 'endpointId',
            sipUri: 'sip:test@test.net',
            sipPassword: '123456',
        });
        yield user.setPassword('123456');
        yield user.save();
        return user;
    });
}
exports.createUser = createUser;
function runWithServer(action) {
    return __awaiter(this, void 0, void 0, function* () {
        const app = new TestApplication();
        const server = (app).listen();
        const request = supertest_1.agent(server);
        request.login = (userName, useExistsUser) => __awaiter(this, void 0, Promise, function* () {
            if (!useExistsUser) {
                yield createUser(userName);
            }
            return (yield request
                .post('/login')
                .send({ userName: userName, password: '123456' }));
        });
        try {
            yield action(request, app, server);
        }
        finally {
            server.close();
        }
    });
}
exports.runWithServer = runWithServer;
function createContext() {
    const app = new Koa();
    app.proxy = true;
    const ctx = (app).createContext({ socket: {}, headers: { host: 'localhost' } }, {});
    return ctx;
}
exports.createContext = createContext;
class MockCatapultApi {
    createPhoneNumber(ctx, areaCode) {
        throw new Error('Not implemented');
    }
    createSIPAccount(ctx) {
        throw new Error('Not implemented');
    }
    createSIPAuthToken(ctx, endpointId) {
        throw new Error('Not implemented');
    }
    createBridge(data) {
        throw new Error('Not implemented');
    }
    createCall(data) {
        throw new Error('Not implemented');
    }
    createGather(callId, data) {
        throw new Error('Not implemented');
    }
    updateCall(callId, data) {
        throw new Error('Not implemented');
    }
    stopPlayAudioToCall(callId) {
        throw new Error('Not implemented');
    }
    playAudioToCall(callId, url, loop, tag) {
        throw new Error('Not implemented');
    }
    transferCall(callId, to, callerId) {
        throw new Error('Not implemented');
    }
    speakSentenceToCall(callId, text, tag) {
        throw new Error('Not implemented');
    }
    getCall(callId) {
        throw new Error('Not implemented');
    }
    getRecording(recordingId) {
        throw new Error('Not implemented');
    }
    hangup(callId) {
        throw new Error('Not implemented');
    }
    downloadMediaFile(name) {
        throw new Error('Not implemented');
    }
}
exports.MockCatapultApi = MockCatapultApi;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaGVscGVycy5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbImhlbHBlcnMudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7O0FBQUEsTUFBWSxHQUFHLFdBQU0sS0FBSyxDQUFDLENBQUE7QUFDM0IsNEJBQXlDLFdBQVcsQ0FBQyxDQUFBO0FBR3JELHdCQUFrQyxjQUFjLENBQUMsQ0FBQTtBQVFqRCw4QkFBcUMsbUJBQVc7SUFHL0M7UUFDQyxNQUFNLEdBQUcsR0FBRyxJQUFJLGVBQWUsRUFBRSxDQUFDO1FBQ2xDLE1BQU0sR0FBRyxDQUFDLENBQUM7UUFDWCxJQUFJLENBQUMsR0FBRyxHQUFHLEdBQUcsQ0FBQztJQUNoQixDQUFDO0FBQ0YsQ0FBQztBQVJZLHVCQUFlLGtCQVEzQixDQUFBO0FBRUQsb0JBQWlDLFFBQWdCOztRQUNoRCxNQUFNLGNBQU0sQ0FBQyxJQUFJLENBQUMsTUFBTSxDQUFDLEVBQUUsVUFBQSxRQUFRLEVBQUUsQ0FBQyxDQUFDO1FBQ3ZDLE1BQU0sSUFBSSxHQUFHLElBQUksY0FBTSxDQUFDLElBQUksQ0FBQztZQUMxQixVQUFBLFFBQVE7WUFDUixRQUFRLEVBQUUsS0FBSztZQUNmLFdBQVcsRUFBRSxhQUFhO1lBQzFCLFVBQVUsRUFBRSxZQUFZO1lBQ3hCLE1BQU0sRUFBRSxtQkFBbUI7WUFDM0IsV0FBVyxFQUFFLFFBQVE7U0FDdkIsQ0FBQyxDQUFDO1FBQ0gsTUFBTSxJQUFJLENBQUMsV0FBVyxDQUFDLFFBQVEsQ0FBQyxDQUFDO1FBQ2pDLE1BQU0sSUFBSSxDQUFDLElBQUksRUFBRSxDQUFDO1FBQ2xCLE1BQU0sQ0FBQyxJQUFJLENBQUM7SUFDYixDQUFDOztBQWJxQixrQkFBVSxhQWEvQixDQUFBO0FBRUQsdUJBQW9DLE1BQXdGOztRQUMzSCxNQUFNLEdBQUcsR0FBRyxJQUFJLGVBQWUsRUFBRSxDQUFDO1FBQ2xDLE1BQU0sTUFBTSxHQUFTLENBQUMsR0FBRyxDQUFFLENBQUMsTUFBTSxFQUFFLENBQUM7UUFD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LFlBQVksQ0FBQyxXQUFtQjtRQUMvQixNQUFNLElBQUksS0FBSyxDQUFDLGlCQUFpQixDQUFDLENBQUM7SUFDcEMsQ0FBQztJQUVELE1BQU0sQ0FBQyxNQUFjO1FBQ3BCLE1BQU0sSUFBSSxLQUFLLENBQUMsaUJBQWlCLENBQUMsQ0FBQztJQUNwQyxDQUFDO0lBRUQsaUJBQWlCLENBQUMsSUFBWTtRQUM3QixNQUFNLElBQUksS0FBSyxDQUFDLGlCQUFpQixDQUFDLENBQUM7SUFDcEMsQ0FBQztBQUNGLENBQUM7QUE1RFksdUJBQWUsa0JBNEQzQixDQUFBIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0ICogYXMgS29hIGZyb20gJ2tvYSc7XG5pbXBvcnQge2FnZW50LCBTdXBlclRlc3QsIFJlc3BvbnNlfSBmcm9tICdzdXBlcnRlc3QnO1xuaW1wb3J0IHtJQ2F0YXB1bHRBcGksIElTSVBBY2NvdW50LCBJQ2FsbCwgSU1lZGlhRmlsZSwgSVJlY29yZGluZywgSVNJUEF1dGhUb2tlbn0gZnJvbSAnLi4vc3JjL2NhdGFwdWx0JztcbmltcG9ydCB7SVVzZXJ9IGZyb20gJy4uL3NyYy9tb2RlbHMnO1xuaW1wb3J0IHttb2RlbHMsIEFwcGxpY2F0aW9ufSBmcm9tICcuLi9zcmMvaW5kZXgnO1xuaW1wb3J0IGdldFJvdXRlciwge0lDb250ZXh0fSBmcm9tICcuLi9zcmMvcm91dGVzJztcbmltcG9ydCAqIGFzIGh0dHAgZnJvbSAnaHR0cCc7XG5cbmV4cG9ydCBpbnRlcmZhY2UgSVN1cGVyVGVzdCBleHRlbmRzIFN1cGVyVGVzdCB7XG5cdGxvZ2luOiAodXNlck5hbWU6IHN0cmluZywgdXNlRXhpc3RzVXNlcj86IGJvb2xlYW4pID0+IFByb21pc2U8UmVzcG9uc2U+O1xufVxuXG5leHBvcnQgY2xhc3MgVGVzdEFwcGxpY2F0aW9uIGV4dGVuZHMgQXBwbGljYXRpb24ge1xuXHRhcGk6IElDYXRhcHVsdEFwaTtcblxuXHRjb25zdHJ1Y3RvcigpIHtcblx0XHRjb25zdCBhcGkgPSBuZXcgTW9ja0NhdGFwdWx0QXBpKCk7XG5cdFx0c3VwZXIoYXBpKTtcblx0XHR0aGlzLmFwaSA9IGFwaTtcblx0fVxufVxuXG5leHBvcnQgYXN5bmMgZnVuY3Rpb24gY3JlYXRlVXNlcih1c2VyTmFtZTogc3RyaW5nKTogUHJvbWlzZTxJVXNlcj4ge1xuXHRhd2FpdCBtb2RlbHMudXNlci5yZW1vdmUoeyB1c2VyTmFtZSB9KTtcblx0Y29uc3QgdXNlciA9IG5ldyBtb2RlbHMudXNlcih7XG5cdFx0XHRcdHVzZXJOYW1lLFxuXHRcdFx0XHRhcmVhQ29kZTogJzkxMCcsXG5cdFx0XHRcdHBob25lTnVtYmVyOiAnKzEyMzQ1Njc4OTAnLFxuXHRcdFx0XHRlbmRwb2ludElkOiAnZW5kcG9pbnRJZCcsXG5cdFx0XHRcdHNpcFVyaTogJ3NpcDp0ZXN0QHRlc3QubmV0Jyxcblx0XHRcdFx0c2lwUGFzc3dvcmQ6ICcxMjM0NTYnLFxuXHR9KTtcblx0YXdhaXQgdXNlci5zZXRQYXNzd29yZCgnMTIzNDU2Jyk7XG5cdGF3YWl0IHVzZXIuc2F2ZSgpO1xuXHRyZXR1cm4gdXNlcjtcbn1cblxuZXhwb3J0IGFzeW5jIGZ1bmN0aW9uIHJ1bldpdGhTZXJ2ZXIoYWN0aW9uOiAocmVxdWVzdDogSVN1cGVyVGVzdCwgYXBwOiBUZXN0QXBwbGljYXRpb24sIHNlcnZlcjogaHR0cC5TZXJ2ZXIpID0+IFByb21pc2U8YW55Pikge1xuXHRjb25zdCBhcHAgPSBuZXcgVGVzdEFwcGxpY2F0aW9uKCk7XG5cdGNvbnN0IHNlcnZlciA9ICg8YW55PihhcHApKS5saXN0ZW4oKTtcblx0Y29uc3QgcmVxdWVzdCA9IDxJU3VwZXJUZXN0PmFnZW50KHNlcnZlcik7XG5cdHJlcXVlc3QubG9naW4gPSBhc3luYyAodXNlck5hbWUsIHVzZUV4aXN0c1VzZXI/KTogUHJvbWlzZTxSZXNwb25zZT4gPT4ge1xuXHRcdGlmICghdXNlRXhpc3RzVXNlcikge1xuXHRcdFx0YXdhaXQgY3JlYXRlVXNlcih1c2VyTmFtZSk7XG5cdFx0fVxuXHRcdHJldHVybiA8UmVzcG9uc2U+PGFueT4oYXdhaXQgcmVxdWVzdFxuXHRcdFx0LnBvc3QoJy9sb2dpbicpXG5cdFx0XHQuc2VuZCh7IHVzZXJOYW1lLCBwYXNzd29yZDogJzEyMzQ1NicgfSkpO1xuXHR9O1xuXHR0cnkge1xuXHRcdGF3YWl0IGFjdGlvbihyZXF1ZXN0LCBhcHAsIHNlcnZlcik7XG5cdH0gZmluYWxseSB7XG5cdFx0c2VydmVyLmNsb3NlKCk7XG5cdH1cbn1cblxuZXhwb3J0IGZ1bmN0aW9uIGNyZWF0ZUNvbnRleHQoKTogSUNvbnRleHQge1xuXHRjb25zdCBhcHAgPSBuZXcgS29hKCk7XG5cdGFwcC5wcm94eSA9IHRydWU7XG5cdGNvbnN0IGN0eCA9ICg8YW55PihhcHApKS5jcmVhdGVDb250ZXh0KHsgc29ja2V0OiB7fSwgaGVhZGVyczogeyBob3N0OiAnbG9jYWxob3N0JyB9IH0sIHt9KTtcblx0cmV0dXJuIGN0eDtcbn1cblxuZXhwb3J0IGNsYXNzIE1vY2tDYXRhcHVsdEFwaSBpbXBsZW1lbnRzIElDYXRhcHVsdEFwaSB7XG5cblx0Y3JlYXRlUGhvbmVOdW1iZXIoY3R4OiBJQ29udGV4dCwgYXJlYUNvZGU6IHN0cmluZyk6IFByb21pc2U8c3RyaW5nPiB7XG5cdFx0dGhyb3cgbmV3IEVycm9yKCdOb3QgaW1wbGVtZW50ZWQnKTtcblx0fVxuXHRjcmVhdGVTSVBBY2NvdW50KGN0eDogSUNvbnRleHQpOiBQcm9taXNlPElTSVBBY2NvdW50PiB7XG5cdFx0dGhyb3cgbmV3IEVycm9yKCdOb3QgaW1wbGVtZW50ZWQnKTtcblx0fVxuXG5cdGNyZWF0ZVNJUEF1dGhUb2tlbihjdHg6IElDb250ZXh0LCBlbmRwb2ludElkOiBzdHJpbmcpOiBQcm9taXNlPElTSVBBdXRoVG9rZW4+IHtcblx0XHR0aHJvdyBuZXcgRXJyb3IoJ05vdCBpbXBsZW1lbnRlZCcpO1xuXHR9XG5cblx0Y3JlYXRlQnJpZGdlKGRhdGE6IGFueSk6IFByb21pc2U8c3RyaW5nPiB7XG5cdFx0dGhyb3cgbmV3IEVycm9yKCdOb3QgaW1wbGVtZW50ZWQnKTtcblx0fVxuXG5cdGNyZWF0ZUNhbGwoZGF0YTogYW55KTogUHJvbWlzZTxzdHJpbmc+IHtcblx0XHR0aHJvdyBuZXcgRXJyb3IoJ05vdCBpbXBsZW1lbnRlZCcpO1xuXHR9XG5cblx0Y3JlYXRlR2F0aGVyKGNhbGxJZDogc3RyaW5nLCBkYXRhOiBhbnkpOiBQcm9taXNlPHN0cmluZz4ge1xuXHRcdHRocm93IG5ldyBFcnJvcignTm90IGltcGxlbWVudGVkJyk7XG5cdH1cblxuXHR1cGRhdGVDYWxsKGNhbGxJZDogc3RyaW5nLCBkYXRhOiBhbnkpOiBQcm9taXNlPHZvaWQ+IHtcblx0XHR0aHJvdyBuZXcgRXJyb3IoJ05vdCBpbXBsZW1lbnRlZCcpO1xuXHR9XG5cblx0c3RvcFBsYXlBdWRpb1RvQ2FsbChjYWxsSWQ6IHN0cmluZyk6IFByb21pc2U8dm9pZD4ge1xuXHRcdHRocm93IG5ldyBFcnJvcignTm90IGltcGxlbWVudGVkJyk7XG5cdH1cblxuXHRwbGF5QXVkaW9Ub0NhbGwoY2FsbElkOiBzdHJpbmcsIHVybDogc3RyaW5nLCBsb29wOiBib29sZWFuLCB0YWc6IHN0cmluZyk6IFByb21pc2U8dm9pZD4ge1xuXHRcdHRocm93IG5ldyBFcnJvcignTm90IGltcGxlbWVudGVkJyk7XG5cdH1cblxuXHR0cmFuc2ZlckNhbGwoY2FsbElkOiBzdHJpbmcsIHRvOiBzdHJpbmcsIGNhbGxlcklkOiBzdHJpbmcpOiBQcm9taXNlPHN0cmluZz4ge1xuXHRcdHRocm93IG5ldyBFcnJvcignTm90IGltcGxlbWVudGVkJyk7XG5cdH1cblxuXHRzcGVha1NlbnRlbmNlVG9DYWxsKGNhbGxJZDogc3RyaW5nLCB0ZXh0OiBzdHJpbmcsIHRhZzogc3RyaW5nKTogUHJvbWlzZTx2b2lkPiB7XG5cdFx0dGhyb3cgbmV3IEVycm9yKCdOb3QgaW1wbGVtZW50ZWQnKTtcblx0fVxuXG5cdGdldENhbGwoY2FsbElkOiBzdHJpbmcpOiBQcm9taXNlPElDYWxsPiB7XG5cdFx0dGhyb3cgbmV3IEVycm9yKCdOb3QgaW1wbGVtZW50ZWQnKTtcblx0fVxuXG5cdGdldFJlY29yZGluZyhyZWNvcmRpbmdJZDogc3RyaW5nKTogUHJvbWlzZTxJUmVjb3JkaW5nPiB7XG5cdFx0dGhyb3cgbmV3IEVycm9yKCdOb3QgaW1wbGVtZW50ZWQnKTtcblx0fVxuXG5cdGhhbmd1cChjYWxsSWQ6IHN0cmluZyk6IFByb21pc2U8dm9pZD4ge1xuXHRcdHRocm93IG5ldyBFcnJvcignTm90IGltcGxlbWVudGVkJyk7XG5cdH1cblxuXHRkb3dubG9hZE1lZGlhRmlsZShuYW1lOiBzdHJpbmcpOiBQcm9taXNlPElNZWRpYUZpbGU+IHtcblx0XHR0aHJvdyBuZXcgRXJyb3IoJ05vdCBpbXBsZW1lbnRlZCcpO1xuXHR9XG59XG4iXX0=