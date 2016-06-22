"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator.throw(value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments)).next());
    });
};
const debugFactory = require('debug');
const randomstring = require('randomstring');
const CatapultClient = require('node-bandwidth');
const debug = debugFactory('catapult');
const applicationName = 'NodeJSVoiceReferenceApp';
const applicationIds = new Map();
const domainInfo = {};
class CatapultApi {
    constructor(userId, apiToken, apiSecret) {
        this.userId = userId;
        this.apiToken = apiToken;
        this.apiSecret = apiSecret;
        this.catapult = new CatapultClient({ userId: userId, apiToken: apiToken, apiSecret: apiSecret });
    }
    createPhoneNumber(ctx, areaCode) {
        return __awaiter(this, void 0, Promise, function* () {
            debug(`Reserving a new phone number for area code ${areaCode}`);
            const applicationId = yield this.getApplicationId(ctx);
            debug(`Search and order available number`);
            const numbers = yield this.catapult.AvailableNumber.searchAndOrder('local', { areaCode: areaCode, quantity: 1 });
            yield this.catapult.PhoneNumber.update(numbers[0].id, { applicationId: applicationId });
            return numbers[0].number;
        });
    }
    createSIPAccount(ctx) {
        return __awaiter(this, void 0, Promise, function* () {
            const applicationId = yield this.getApplicationId(ctx);
            const domain = yield this.getDomain(ctx);
            const sipUserName = `vu-${randomstring.generate(12)}`;
            const sipPassword = randomstring.generate(16);
            debug('Creating SIP account');
            const endpoint = yield this.catapult.Endpoint.create(domain.id, {
                applicationId: applicationId,
                domainId: domain.id,
                name: sipUserName,
                description: `${applicationName}'s SIP Account`,
                credentials: { password: sipPassword }
            });
            return {
                endpointId: endpoint.id,
                uri: `sip:${sipUserName}@${domain.name}.bwapp.bwsip.io`,
                password: sipPassword
            };
        });
    }
    createSIPAuthToken(ctx, endpointId) {
        return __awaiter(this, void 0, Promise, function* () {
            debug('Creating SIP account auth token');
            const domain = yield this.getDomain(ctx);
            debug(`Creating auth token for domain ${domain.id} and endpoint ${endpointId}`);
            return (yield this.catapult.Endpoint.createAuthToken(domain.id, endpointId, { expires: 3600 }));
        });
    }
    createBridge(data) {
        return __awaiter(this, void 0, Promise, function* () {
            debug('Creating a bridge %j', data);
            return (yield this.catapult.Bridge.create(data)).id;
        });
    }
    createCall(data) {
        return __awaiter(this, void 0, Promise, function* () {
            debug('Creating a call %j', data);
            return (yield this.catapult.Call.create(data)).id;
        });
    }
    createGather(callId, data) {
        return __awaiter(this, void 0, Promise, function* () {
            debug('Creating a gather for call %s %j', callId, data);
            return (yield this.catapult.Call.createGather(callId, data)).id;
        });
    }
    updateCall(callId, data) {
        debug('Updating call %s %j', callId, data);
        return this.catapult.Call.update(callId, data);
    }
    stopPlayAudioToCall(callId) {
        return __awaiter(this, void 0, Promise, function* () {
            debug('Stop play of audio for call %s', callId);
            yield this.catapult.Call.playAudioAdvanced(callId, { fileUrl: '' });
        });
    }
    playAudioToCall(callId, url, loop, tag) {
        return __awaiter(this, void 0, Promise, function* () {
            debug('Play audio for call %s', callId);
            yield this.catapult.Call.playAudioAdvanced(callId, { fileUrl: url, tag: tag, loopEnabled: loop });
        });
    }
    transferCall(callId, to, callerId) {
        return __awaiter(this, void 0, Promise, function* () {
            debug('Transfering call %s to %s', callId, to);
            return (yield this.catapult.Call.transfer(callId, { transferTo: to, transferCallerId: callerId })).id;
        });
    }
    speakSentenceToCall(callId, text, tag) {
        return __awaiter(this, void 0, Promise, function* () {
            debug('Speak sentence to call %s', callId);
            yield this.catapult.Call.playAudioAdvanced(callId, { sentence: text, tag: tag });
        });
    }
    getCall(callId) {
        return __awaiter(this, void 0, Promise, function* () {
            debug('Get call info for %s', callId);
            return (yield this.catapult.Call.get(callId));
        });
    }
    getRecording(recordingId) {
        return __awaiter(this, void 0, Promise, function* () {
            debug('Get recording info for %s', recordingId);
            return (yield this.catapult.Recording.get(recordingId));
        });
    }
    hangup(callId) {
        debug('Hang up call %s', callId);
        return this.catapult.Call.update(callId, { state: 'completed' });
    }
    downloadMediaFile(name) {
        return __awaiter(this, void 0, Promise, function* () {
            debug('Downloading media file %s', name);
            return (yield this.catapult.Media.download(name));
        });
    }
    getApplicationId(ctx) {
        return __awaiter(this, void 0, Promise, function* () {
            const host = ctx.request.host;
            debug('Get application id');
            const applicationId = applicationIds.get(host);
            if (applicationId) {
                debug(`Using cached application id ${applicationId}`);
                return applicationId;
            }
            const appName = `${applicationName} on ${host}`;
            debug('Get application list');
            const applications = (yield this.catapult.Application.list({ size: 1000 })).applications;
            let application = applications.filter((a) => a.name === appName)[0];
            if (application) {
                applicationIds.set(host, application.id);
                debug(`Using existing application id ${application.id}`);
                return application.id;
            }
            debug(`Creating new application with callback ${buildAbsoluteUrl(ctx, '/callCallback')}`);
            application = yield this.catapult.Application.create({
                name: appName,
                autoAnswer: true,
                incomingCallUrl: buildAbsoluteUrl(ctx, '/callCallback')
            });
            applicationIds.set(host, application.id);
            debug(`Using new application id ${application.id}`);
            return application.id;
        });
    }
    getDomain(ctx) {
        return __awaiter(this, void 0, Promise, function* () {
            const getDomainInfo = (d) => {
                domainInfo.id = domain.id;
                domainInfo.name = domain.name;
                return Object.assign({}, domainInfo);
            };
            if (domainInfo.id) {
                debug(`Using cached domain info for ${domainInfo.name}`);
                return Object.assign({}, domainInfo);
            }
            const description = `${applicationName}'s domain`;
            const domains = (yield this.catapult.Domain.list({ size: 100 })).domains;
            let domain = domains.filter((d) => d.description === description)[0];
            if (domain) {
                debug(`Using existing domain info for ${domain.name}`);
                return getDomainInfo(domain);
            }
            const name = randomstring.generate({
                length: 1,
                charset: 'alphabetic'
            }) + randomstring.generate({
                length: 14,
                charset: 'alphanumeric'
            });
            debug(`Creating new domain ${name}`);
            domain = yield this.catapult.Domain.create({ name: name, description: description });
            debug(`Using new domain info for ${domain.name}`);
            return getDomainInfo(domain);
        });
    }
}
exports.CatapultApi = CatapultApi;
function buildAbsoluteUrl(ctx, path) {
    if (path[0] !== '/') {
        path = `/${path}`;
    }
    const baseUrl = ctx.request.headers.origin ? ctx.request.headers.origin : `${ctx.request.protocol}://${ctx.request.host}`;
    return `${baseUrl}${path}`;
}
exports.buildAbsoluteUrl = buildAbsoluteUrl;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2F0YXB1bHQuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyJjYXRhcHVsdC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7QUFFQSxNQUFZLFlBQVksV0FBTSxPQUFPLENBQUMsQ0FBQTtBQUN0QyxNQUFZLFlBQVksV0FBTSxjQUFjLENBQUMsQ0FBQTtBQUU3QyxNQUFNLGNBQWMsR0FBRyxPQUFPLENBQUMsZ0JBQWdCLENBQUMsQ0FBQztBQUNqRCxNQUFNLEtBQUssR0FBRyxZQUFZLENBQUMsVUFBVSxDQUFDLENBQUM7QUFFdkMsTUFBTSxlQUFlLEdBQUcseUJBQXlCLENBQUM7QUFDbEQsTUFBTSxjQUFjLEdBQUcsSUFBSSxHQUFHLEVBQWtCLENBQUM7QUFDakQsTUFBTSxVQUFVLEdBQWdCLEVBQUUsQ0FBQztBQWlEbkM7SUFJQyxZQUFvQixNQUFjLEVBQVUsUUFBZ0IsRUFBVSxTQUFpQjtRQUFuRSxXQUFNLEdBQU4sTUFBTSxDQUFRO1FBQVUsYUFBUSxHQUFSLFFBQVEsQ0FBUTtRQUFVLGNBQVMsR0FBVCxTQUFTLENBQVE7UUFDdEYsSUFBSSxDQUFDLFFBQVEsR0FBRyxJQUFJLGNBQWMsQ0FBQyxFQUFFLFFBQUEsTUFBTSxFQUFFLFVBQUEsUUFBUSxFQUFFLFdBQUEsU0FBUyxFQUFFLENBQUMsQ0FBQztJQUNyRSxDQUFDO0lBRUssaUJBQWlCLENBQUMsR0FBYSxFQUFFLFFBQWdCOztZQUN0RCxLQUFLLENBQUMsOENBQThDLFFBQVEsRUFBRSxDQUFDLENBQUM7WUFDaEUsTUFBTSxhQUFhLEdBQUcsTUFBTSxJQUFJLENBQUMsZ0JBQWdCLENBQUMsR0FBRyxDQUFDLENBQUM7WUFDdkQsS0FBSyxDQUFDLG1DQUFtQyxDQUFDLENBQUM7WUFDM0MsTUFBTSxPQUFPLEdBQUcsTUFBTSxJQUFJLENBQUMsUUFBUSxDQUFDLGVBQWUsQ0FBQyxjQUFjLENBQUMsT0FBTyxFQUFFLEVBQUUsVUFBQSxRQUFRLEVBQUUsUUFBUSxFQUFFLENBQUMsRUFB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UUFBUSxNQUFNLEdBQUcsQ0FBQyxPQUFPLENBQUMsSUFBSSxFQUFFLENBQUM7SUFDMUgsTUFBTSxDQUFDLEdBQUcsT0FBTyxHQUFHLElBQUksRUFBRSxDQUFDO0FBQzVCLENBQUM7QUFOZSx3QkFBZ0IsbUJBTS9CLENBQUEiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQge0lDb250ZXh0fSBmcm9tICcuL3JvdXRlcyc7XG5pbXBvcnQgKiBhcyB1cmwgZnJvbSAndXJsJztcbmltcG9ydCAqIGFzIGRlYnVnRmFjdG9yeSBmcm9tICdkZWJ1Zyc7XG5pbXBvcnQgKiBhcyByYW5kb21zdHJpbmcgZnJvbSAncmFuZG9tc3RyaW5nJztcblxuY29uc3QgQ2F0YXB1bHRDbGllbnQgPSByZXF1aXJlKCdub2RlLWJhbmR3aWR0aCcpO1xuY29uc3QgZGVidWcgPSBkZWJ1Z0ZhY3RvcnkoJ2NhdGFwdWx0Jyk7XG5cbmNvbnN0IGFwcGxpY2F0aW9uTmFtZSA9ICdOb2RlSlNWb2ljZVJlZmVyZW5jZUFwcCc7XG5jb25zdCBhcHBsaWNhdGlvbklkcyA9IG5ldyBNYXA8c3RyaW5nLCBzdHJpbmc+KCk7XG5jb25zdCBkb21haW5JbmZvID0gPElEb21haW5JbmZvPnt9O1xuXG5leHBvcnQgaW50ZXJmYWNlIElDYXRhcHVsdEFwaSB7XG5cdGNyZWF0ZVBob25lTnVtYmVyKGN0eDogSUNvbnRleHQsIGFyZWFDb2RlOiBzdHJpbmcpOiBQcm9taXNlPHN0cmluZz47XG5cdGNyZWF0ZVNJUEFjY291bnQoY3R4OiBJQ29udGV4dCk6IFByb21pc2U8SVNJUEFjY291bnQ+O1xuXHRjcmVhdGVTSVBBdXRoVG9rZW4oY3R4OiBJQ29udGV4dCwgZW5kcG9pbnRJZDogc3RyaW5nKTogUHJvbWlzZTxJU0lQQXV0aFRva2VuPjtcblx0Y3JlYXRlQnJpZGdlKGRhdGE6IGFueSk6IFByb21pc2U8c3RyaW5nPjtcblx0Y3JlYXRlQ2FsbChkYXRhOiBhbnkpOiBQcm9taXNlPHN0cmluZz47XG5cdGNyZWF0ZUdhdGhlcihjYWxsSWQ6IHN0cmluZywgZGF0YTogYW55KTogUHJvbWlzZTxzdHJpbmc+O1xuXHR1cGRhdGVDYWxsKGNhbGxJZDogc3RyaW5nLCBkYXRhOiBhbnkpOiBQcm9taXNlPHZvaWQ+O1xuXHRzdG9wUGxheUF1ZGlvVG9DYWxsKGNhbGxJZDogc3RyaW5nKTogUHJvbWlzZTx2b2lkPjtcblx0cGxheUF1ZGlvVG9DYWxsKGNhbGxJZDogc3RyaW5nLCB0b25lc1VSTDogc3RyaW5nLCBsb29wOiBib29sZWFuLCB0YWc6IHN0cmluZyk6IFByb21pc2U8dm9pZD47XG5cdHRyYW5zZmVyQ2FsbChjYWxsSWQ6IHN0cmluZywgdG86IHN0cmluZywgY2FsbGVySWQ6IHN0cmluZyk6IFByb21pc2U8c3RyaW5nPjtcblx0c3BlYWtTZW50ZW5jZVRvQ2FsbChjYWxsSWQ6IHN0cmluZywgdGV4dDogc3RyaW5nLCB0YWc6IHN0cmluZyk6IFByb21pc2U8dm9pZD47XG5cdGdldENhbGwoY2FsbElkOiBzdHJpbmcpOiBQcm9taXNlPElDYWxsPjtcblx0Z2V0UmVjb3JkaW5nKHJlY29yZGluZ0lkOiBzdHJpbmcpOiBQcm9taXNlPElSZWNvcmRpbmc+O1xuXHRoYW5ndXAoY2FsbElkOiBzdHJpbmcpOiBQcm9taXNlPHZvaWQ+O1xuXHRkb3dubG9hZE1lZGlhRmlsZShuYW1lOiBzdHJpbmcpOiBQcm9taXNlPElNZWRpYUZpbGU+O1xufVxuXG5leHBvcnQgaW50ZXJmYWNlIElTSVBBY2NvdW50IHtcblx0ZW5kcG9pbnRJZDogc3RyaW5nO1xuXHR1cmk6IHN0cmluZztcblx0cGFzc3dvcmQ6IHN0cmluZztcbn1cblxuZXhwb3J0IGludGVyZmFjZSBJU0lQQXV0aFRva2VuIHtcblx0dG9rZW46IHN0cmluZztcblx0ZXhwaXJlczogYW55O1xufVxuXG5leHBvcnQgaW50ZXJmYWNlIElDYWxsIHtcblx0Y2FsbElkOiBzdHJpbmc7XG5cdGZyb206IHN0cmluZztcblx0dG86IHN0cmluZztcblx0c3RhdGU6IHN0cmluZztcbn1cblxuZXhwb3J0IGludGVyZmFjZSBJUmVjb3JkaW5nIHtcblx0bWVkaWE6IHN0cmluZztcblx0c3RhcnRUaW1lOiBzdHJpbmc7XG5cdGVuZFRpbWU6IHN0cmluZztcbn1cblxuZXhwb3J0IGludGVyZmFjZSBJTWVkaWFGaWxlIHtcblx0Y29udGVudDogYW55O1xuXHRjb250ZW50VHlwZTogc3RyaW5nO1xufVxuXG5leHBvcnQgY2xhc3MgQ2F0YXB1bHRBcGkgaW1wbGVtZW50cyBJQ2F0YXB1bHRBcGkge1xuXG5cdHByaXZhdGUgY2F0YXB1bHQ6IGFueTtcblxuXHRjb25zdHJ1Y3Rvcihwcml2YXRlIHVzZXJJZDogc3RyaW5nLCBwcml2YXRlIGFwaVRva2VuOiBzdHJpbmcsIHByaXZhdGUgYXBpU2VjcmV0OiBzdHJpbmcpIHtcblx0XHR0aGlzLmNhdGFwdWx0ID0gbmV3IENhdGFwdWx0Q2xpZW50KHsgdXNlcklkLCBhcGlUb2tlbiwgYXBpU2VjcmV0IH0pO1xuXHR9XG5cblx0YXN5bmMgY3JlYXRlUGhvbmVOdW1iZXIoY3R4OiBJQ29udGV4dCwgYXJlYUNvZGU6IHN0cmluZyk6IFByb21pc2U8c3RyaW5nPiB7XG5cdFx0ZGVidWcoYFJlc2VydmluZyBhIG5ldyBwaG9uZSBudW1iZXIgZm9yIGFyZWEgY29kZSAke2FyZWFDb2RlfWApO1xuXHRcdGNvbnN0IGFwcGxpY2F0aW9uSWQgPSBhd2FpdCB0aGlzLmdldEFwcGxpY2F0aW9uSWQoY3R4KTtcblx0XHRkZWJ1ZyhgU2VhcmNoIGFuZCBvcmRlciBhdmFpbGFibGUgbnVtYmVyYCk7XG5cdFx0Y29uc3QgbnVtYmVycyA9IGF3YWl0IHRoaXMuY2F0YXB1bHQuQXZhaWxhYmxlTnVtYmVyLnNlYXJjaEFuZE9yZGVyKCdsb2NhbCcsIHsgYXJlYUNvZGUsIHF1YW50aXR5OiAxIH0pO1xuXHRcdGF3YWl0IHRoaXMuY2F0YXB1bHQuUGhvbmVOdW1iZXIudXBkYXRlKG51bWJlcnNbMF0uaWQsIHsgYXBwbGljYXRpb25JZCB9KTtcblx0XHRyZXR1cm4gbnVtYmVyc1swXS5udW1iZXI7XG5cdH1cblxuXHRhc3luYyBjcmVhdGVTSVBBY2NvdW50KGN0eDogSUNvbnRleHQpOiBQcm9taXNlPElTSVBBY2NvdW50PiB7XG5cdFx0Y29uc3QgYXBwbGljYXRpb25JZCA9IGF3YWl0IHRoaXMuZ2V0QXBwbGljYXRpb25JZChjdHgpO1xuXHRcdGNvbnN0IGRvbWFpbiA9IGF3YWl0IHRoaXMuZ2V0RG9tYWluKGN0eCk7XG5cdFx0Y29uc3Qgc2lwVXNlck5hbWUgPSBgdnUtJHtyYW5kb21zdHJpbmcuZ2VuZXJhdGUoMTIpfWA7XG5cdFx0Y29uc3Qgc2lwUGFzc3dvcmQgPSByYW5kb21zdHJpbmcuZ2VuZXJhdGUoMTYpO1xuXHRcdGRlYnVnKCdDcmVhdGluZyBTSVAgYWNjb3VudCcpO1xuXHRcdGNvbnN0IGVuZHBvaW50ID0gYXdhaXQgdGhpcy5jYXRhcHVsdC5FbmRwb2ludC5jcmVhdGUoZG9tYWluLmlkLCB7XG5cdFx0XHRhcHBsaWNhdGlvbklkLFxuXHRcdFx0ZG9tYWluSWQ6IGRvbWFpbi5pZCxcblx0XHRcdG5hbWU6IHNpcFVzZXJOYW1lLFxuXHRcdFx0ZGVzY3JpcHRpb246IGAke2FwcGxpY2F0aW9uTmFtZX0ncyBTSVAgQWNjb3VudGAsXG5cdFx0XHRjcmVkZW50aWFsczogeyBwYXNzd29yZDogc2lwUGFzc3dvcmQgfVxuXHRcdH0pO1xuXHRcdHJldHVybiA8SVNJUEFjY291bnQ+e1xuXHRcdFx0ZW5kcG9pbnRJZDogZW5kcG9pbnQuaWQsXG5cdFx0XHR1cmk6IGBzaXA6JHtzaXBVc2VyTmFtZX1AJHtkb21haW4ubmFtZX0uYndhcHAuYndzaXAuaW9gLFxuXHRcdFx0cGFzc3dvcmQ6IHNpcFBhc3N3b3JkXG5cdFx0fTtcblx0fVxuXG5cdGFzeW5jIGNyZWF0ZVNJUEF1dGhUb2tlbihjdHg6IElDb250ZXh0LCBlbmRwb2ludElkOiBzdHJpbmcpOiBQcm9taXNlPElTSVBBdXRoVG9rZW4+IHtcblx0XHRkZWJ1ZygnQ3JlYXRpbmcgU0lQIGFjY291bnQgYXV0aCB0b2tlbicpO1xuXHRcdGNvbnN0IGRvbWFpbiA9IGF3YWl0IHRoaXMuZ2V0RG9tYWluKGN0eCk7XG5cdFx0ZGVidWcoYENyZWF0aW5nIGF1dGggdG9rZW4gZm9yIGRvbWFpbiAke2RvbWFpbi5pZH0gYW5kIGVuZHBvaW50ICR7ZW5kcG9pbnRJZH1gKTtcblx0XHRyZXR1cm4gPElTSVBBdXRoVG9rZW4+KGF3YWl0IHRoaXMuY2F0YXB1bHQuRW5kcG9pbnQuY3JlYXRlQXV0aFRva2VuKGRvbWFpbi5pZCwgZW5kcG9pbnRJZCwge2V4cGlyZXM6IDM2MDB9KSk7XG5cdH1cblxuXHRhc3luYyBjcmVhdGVCcmlkZ2UoZGF0YTogYW55KTogUHJvbWlzZTxzdHJpbmc+IHtcblx0XHRkZWJ1ZygnQ3JlYXRpbmcgYSBicmlkZ2UgJWonLCBkYXRhKTtcblx0XHRyZXR1cm4gKGF3YWl0IHRoaXMuY2F0YXB1bHQuQnJpZGdlLmNyZWF0ZShkYXRhKSkuaWQ7XG5cdH1cblxuXHRhc3luYyBjcmVhdGVDYWxsKGRhdGE6IGFueSk6IFByb21pc2U8c3RyaW5nPiB7XG5cdFx0ZGVidWcoJ0NyZWF0aW5nIGEgY2FsbCAlaicsIGRhdGEpO1xuXHRcdHJldHVybiAoYXdhaXQgdGhpcy5jYXRhcHVsdC5DYWxsLmNyZWF0ZShkYXRhKSkuaWQ7XG5cdH1cblxuXHRhc3luYyBjcmVhdGVHYXRoZXIoY2FsbElkOiBzdHJpbmcsIGRhdGE6IGFueSk6IFByb21pc2U8c3RyaW5nPiB7XG5cdFx0ZGVidWcoJ0NyZWF0aW5nIGEgZ2F0aGVyIGZvciBjYWxsICVzICVqJywgY2FsbElkLCBkYXRhKTtcblx0XHRyZXR1cm4gKGF3YWl0IHRoaXMuY2F0YXB1bHQuQ2FsbC5jcmVhdGVHYXRoZXIoY2FsbElkLCBkYXRhKSkuaWQ7XG5cdH1cblxuXHR1cGRhdGVDYWxsKGNhbGxJZDogc3RyaW5nLCBkYXRhOiBhbnkpOiBQcm9taXNlPHZvaWQ+IHtcblx0XHRkZWJ1ZygnVXBkYXRpbmcgY2FsbCAlcyAlaicsIGNhbGxJZCwgZGF0YSk7XG5cdFx0cmV0dXJuIHRoaXMuY2F0YXB1bHQuQ2FsbC51cGRhdGUoY2FsbElkLCBkYXRhKTtcblx0fVxuXG5cdGFzeW5jIHN0b3BQbGF5QXVkaW9Ub0NhbGwoY2FsbElkOiBzdHJpbmcpOiBQcm9taXNlPHZvaWQ+IHtcblx0XHRkZWJ1ZygnU3RvcCBwbGF5IG9mIGF1ZGlvIGZvciBjYWxsICVzJywgY2FsbElkKTtcblx0XHRhd2FpdCB0aGlzLmNhdGFwdWx0LkNhbGwucGxheUF1ZGlvQWR2YW5jZWQoY2FsbElkLCB7IGZpbGVVcmw6ICcnIH0pO1xuXHR9XG5cblx0YXN5bmMgcGxheUF1ZGlvVG9DYWxsKGNhbGxJZDogc3RyaW5nLCB1cmw6IHN0cmluZywgbG9vcDogYm9vbGVhbiwgdGFnOiBzdHJpbmcpOiBQcm9taXNlPHZvaWQ+IHtcblx0XHRkZWJ1ZygnUGxheSBhdWRpbyBmb3IgY2FsbCAlcycsIGNhbGxJZCk7XG5cdFx0YXdhaXQgdGhpcy5jYXRhcHVsdC5DYWxsLnBsYXlBdWRpb0FkdmFuY2VkKGNhbGxJZCwgeyBmaWxlVXJsOiB1cmwsIHRhZywgbG9vcEVuYWJsZWQ6IGxvb3AgfSk7XG5cdH1cblxuXHRhc3luYyB0cmFuc2ZlckNhbGwoY2FsbElkOiBzdHJpbmcsIHRvOiBzdHJpbmcsIGNhbGxlcklkOiBzdHJpbmcpOiBQcm9taXNlPHN0cmluZz4ge1xuXHRcdGRlYnVnKCdUcmFuc2ZlcmluZyBjYWxsICVzIHRvICVzJywgY2FsbElkLCB0byk7XG5cdFx0cmV0dXJuIChhd2FpdCB0aGlzLmNhdGFwdWx0LkNhbGwudHJhbnNmZXIoY2FsbElkLCB7dHJhbnNmZXJUbzogdG8sIHRyYW5zZmVyQ2FsbGVySWQ6IGNhbGxlcklkfSkpLmlkO1xuXHR9XG5cblx0YXN5bmMgc3BlYWtTZW50ZW5jZVRvQ2FsbChjYWxsSWQ6IHN0cmluZywgdGV4dDogc3RyaW5nLCB0YWc6IHN0cmluZyk6IFByb21pc2U8dm9pZD4ge1xuXHRcdGRlYnVnKCdTcGVhayBzZW50ZW5jZSB0byBjYWxsICVzJywgY2FsbElkKTtcblx0XHRhd2FpdCB0aGlzLmNhdGFwdWx0LkNhbGwucGxheUF1ZGlvQWR2YW5jZWQoY2FsbElkLCB7IHNlbnRlbmNlOiB0ZXh0LCAgdGFnIH0pO1xuXHR9XG5cblx0YXN5bmMgZ2V0Q2FsbChjYWxsSWQ6IHN0cmluZyk6IFByb21pc2U8SUNhbGw+IHtcblx0XHRkZWJ1ZygnR2V0IGNhbGwgaW5mbyBmb3IgJXMnLCBjYWxsSWQpO1xuXHRcdHJldHVybiA8SUNhbGw+KGF3YWl0IHRoaXMuY2F0YXB1bHQuQ2FsbC5nZXQoY2FsbElkKSk7XG5cdH1cblxuXHRhc3luYyBnZXRSZWNvcmRpbmcocmVjb3JkaW5nSWQ6IHN0cmluZyk6IFByb21pc2U8SVJlY29yZGluZz4ge1xuXHRcdGRlYnVnKCdHZXQgcmVjb3JkaW5nIGluZm8gZm9yICVzJywgcmVjb3JkaW5nSWQpO1xuXHRcdHJldHVybiA8SVJlY29yZGluZz4oYXdhaXQgdGhpcy5jYXRhcHVsdC5SZWNvcmRpbmcuZ2V0KHJlY29yZGluZ0lkKSk7XG5cdH1cblxuXHRoYW5ndXAoY2FsbElkOiBzdHJpbmcpOiBQcm9taXNlPHZvaWQ+IHtcblx0XHRkZWJ1ZygnSGFuZyB1cCBjYWxsICVzJywgY2FsbElkKTtcblx0XHRyZXR1cm4gdGhpcy5jYXRhcHVsdC5DYWxsLnVwZGF0ZShjYWxsSWQsIHsgc3RhdGU6ICdjb21wbGV0ZWQnIH0pO1xuXHR9XG5cblx0YXN5bmMgZG93bmxvYWRNZWRpYUZpbGUobmFtZTogc3RyaW5nKTogUHJvbWlzZTxJTWVkaWFGaWxlPiB7XG5cdFx0ZGVidWcoJ0Rvd25sb2FkaW5nIG1lZGlhIGZpbGUgJXMnLCBuYW1lKTtcblx0XHRyZXR1cm4gPElNZWRpYUZpbGU+KGF3YWl0IHRoaXMuY2F0YXB1bHQuTWVkaWEuZG93bmxvYWQobmFtZSkpO1xuXHR9XG5cblx0cHJpdmF0ZSBhc3luYyBnZXRBcHBsaWNhdGlvbklkKGN0eDogSUNvbnRleHQpOiBQcm9taXNlPHN0cmluZz4ge1xuXHRcdGNvbnN0IGhvc3QgPSBjdHgucmVxdWVzdC5ob3N0O1xuXHRcdGRlYnVnKCdHZXQgYXBwbGljYXRpb24gaWQnKTtcblx0XHRjb25zdCBhcHBsaWNhdGlvbklkID0gYXBwbGljYXRpb25JZHMuZ2V0KGhvc3QpO1xuXHRcdGlmIChhcHBsaWNhdGlvbklkKSB7XG5cdFx0XHRkZWJ1ZyhgVXNpbmcgY2FjaGVkIGFwcGxpY2F0aW9uIGlkICR7YXBwbGljYXRpb25JZH1gKTtcblx0XHRcdHJldHVybiBhcHBsaWNhdGlvbklkO1xuXHRcdH1cblx0XHRjb25zdCBhcHBOYW1lID0gYCR7YXBwbGljYXRpb25OYW1lfSBvbiAke2hvc3R9YDtcblx0XHRkZWJ1ZygnR2V0IGFwcGxpY2F0aW9uIGxpc3QnKTtcblx0XHRjb25zdCBhcHBsaWNhdGlvbnMgPSAoYXdhaXQgdGhpcy5jYXRhcHVsdC5BcHBsaWNhdGlvbi5saXN0KHsgc2l6ZTogMTAwMCB9KSkuYXBwbGljYXRpb25zO1xuXHRcdGxldCBhcHBsaWNhdGlvbiA9IGFwcGxpY2F0aW9ucy5maWx0ZXIoKGE6IGFueSkgPT4gYS5uYW1lID09PSBhcHBOYW1lKVswXTtcblx0XHRpZiAoYXBwbGljYXRpb24pIHtcblx0XHRcdGFwcGxpY2F0aW9uSWRzLnNldChob3N0LCBhcHBsaWNhdGlvbi5pZCk7XG5cdFx0XHRkZWJ1ZyhgVXNpbmcgZXhpc3RpbmcgYXBwbGljYXRpb24gaWQgJHthcHBsaWNhdGlvbi5pZH1gKTtcblx0XHRcdHJldHVybiBhcHBsaWNhdGlvbi5pZDtcblx0XHR9XG5cdFx0ZGVidWcoYENyZWF0aW5nIG5ldyBhcHBsaWNhdGlvbiB3aXRoIGNhbGxiYWNrICR7YnVpbGRBYnNvbHV0ZVVybChjdHgsICcvY2FsbENhbGxiYWNrJyl9YCk7XG5cdFx0YXBwbGljYXRpb24gPSBhd2FpdCB0aGlzLmNhdGFwdWx0LkFwcGxpY2F0aW9uLmNyZWF0ZSh7XG5cdFx0XHRuYW1lOiBhcHBOYW1lLFxuXHRcdFx0YXV0b0Fuc3dlcjogdHJ1ZSxcblx0XHRcdGluY29taW5nQ2FsbFVybDogYnVpbGRBYnNvbHV0ZVVybChjdHgsICcvY2FsbENhbGxiYWNrJylcblx0XHR9KTtcblx0XHRhcHBsaWNhdGlvbklkcy5zZXQoaG9zdCwgYXBwbGljYXRpb24uaWQpO1xuXHRcdGRlYnVnKGBVc2luZyBuZXcgYXBwbGljYXRpb24gaWQgJHthcHBsaWNhdGlvbi5pZH1gKTtcblx0XHRyZXR1cm4gYXBwbGljYXRpb24uaWQ7XG5cdH1cblxuXHRwcml2YXRlIGFzeW5jIGdldERvbWFpbihjdHg6IElDb250ZXh0KTogUHJvbWlzZTxJRG9tYWluSW5mbz4ge1xuXHRcdGNvbnN0IGdldERvbWFpbkluZm8gPSAoZDogYW55KSA9PiB7XG5cdFx0XHRkb21haW5JbmZvLmlkID0gZG9tYWluLmlkO1xuXHRcdFx0ZG9tYWluSW5mby5uYW1lID0gZG9tYWluLm5hbWU7XG5cdFx0XHRyZXR1cm4gT2JqZWN0LmFzc2lnbig8SURvbWFpbkluZm8+e30sIGRvbWFpbkluZm8pO1xuXHRcdH07XG5cdFx0aWYgKGRvbWFpbkluZm8uaWQpIHtcblx0XHRcdGRlYnVnKGBVc2luZyBjYWNoZWQgZG9tYWluIGluZm8gZm9yICR7ZG9tYWluSW5mby5uYW1lfWApO1xuXHRcdFx0cmV0dXJuIE9iamVjdC5hc3NpZ24oPElEb21haW5JbmZvPnt9LCBkb21haW5JbmZvKTtcblx0XHR9XG5cdFx0Y29uc3QgZGVzY3JpcHRpb24gPSBgJHthcHBsaWNhdGlvbk5hbWV9J3MgZG9tYWluYDtcblx0XHRjb25zdCBkb21haW5zID0gKGF3YWl0IHRoaXMuY2F0YXB1bHQuRG9tYWluLmxpc3QoeyBzaXplOiAxMDAgfSkpLmRvbWFpbnM7XG5cdFx0bGV0IGRvbWFpbiA9IGRvbWFpbnMuZmlsdGVyKChkOiBhbnkpID0+IGQuZGVzY3JpcHRpb24gPT09IGRlc2NyaXB0aW9uKVswXTtcblx0XHRpZiAoZG9tYWluKSB7XG5cdFx0XHRkZWJ1ZyhgVXNpbmcgZXhpc3RpbmcgZG9tYWluIGluZm8gZm9yICR7ZG9tYWluLm5hbWV9YCk7XG5cdFx0XHRyZXR1cm4gZ2V0RG9tYWluSW5mbyhkb21haW4pO1xuXHRcdH1cblxuXHRcdGNvbnN0IG5hbWUgPSByYW5kb21zdHJpbmcuZ2VuZXJhdGUoe1xuXHRcdFx0bGVuZ3RoOiAxLFxuXHRcdFx0Y2hhcnNldDogJ2FscGhhYmV0aWMnXG5cdFx0fSkgKyByYW5kb21zdHJpbmcuZ2VuZXJhdGUoe1xuXHRcdFx0bGVuZ3RoOiAxNCxcblx0XHRcdGNoYXJzZXQ6ICdhbHBoYW51bWVyaWMnXG5cdFx0fSk7XG5cdFx0ZGVidWcoYENyZWF0aW5nIG5ldyBkb21haW4gJHtuYW1lfWApO1xuXHRcdGRvbWFpbiA9IGF3YWl0IHRoaXMuY2F0YXB1bHQuRG9tYWluLmNyZWF0ZSh7IG5hbWUsIGRlc2NyaXB0aW9uIH0pO1xuXHRcdGRlYnVnKGBVc2luZyBuZXcgZG9tYWluIGluZm8gZm9yICR7ZG9tYWluLm5hbWV9YCk7XG5cdFx0cmV0dXJuIGdldERvbWFpbkluZm8oZG9tYWluKTtcblx0fVxufVxuXG5pbnRlcmZhY2UgSURvbWFpbkluZm8ge1xuXHRuYW1lOiBzdHJpbmc7XG5cdGlkOiBzdHJpbmc7XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBidWlsZEFic29sdXRlVXJsKGN0eDogSUNvbnRleHQsIHBhdGg6IHN0cmluZyk6IHN0cmluZyB7XG5cdGlmIChwYXRoWzBdICE9PSAnLycpIHtcblx0XHRwYXRoID0gYC8ke3BhdGh9YDtcblx0fVxuXHRjb25zdCBiYXNlVXJsID0gY3R4LnJlcXVlc3QuaGVhZGVycy5vcmlnaW4gPyBjdHgucmVxdWVzdC5oZWFkZXJzLm9yaWdpbiA6IGAke2N0eC5yZXF1ZXN0LnByb3RvY29sfTovLyR7Y3R4LnJlcXVlc3QuaG9zdH1gO1xuXHRyZXR1cm4gYCR7YmFzZVVybH0ke3BhdGh9YDtcbn1cbiJdfQ==