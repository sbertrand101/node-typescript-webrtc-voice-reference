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
const bcrypt = require('bcryptjs');
const mongoose_1 = require('mongoose');
const models_1 = require('../src/models');
const sinon = require('sinon');
const mongoose = new mongoose_1.Mongoose();
mongoose.Promise = global.Promise;
const models = models_1.default(mongoose);
ava_1.default.afterEach(t => {
    if (t.context.stub) {
        t.context.stub.restore();
        t.context.stub = null;
    }
});
ava_1.default.serial(`User#setPassword() should set field 'passwordHash'`, (t) => __awaiter(this, void 0, void 0, function* () {
    t.context.stub = sinon.stub(bcrypt, 'hash').callsArgWithAsync(2, null, 'hash');
    const user = new models.user();
    yield user.setPassword('password');
    t.true(t.context.stub.called);
    t.true(t.context.stub.lastCall.args[0].startsWith('password'));
    t.is(user.passwordHash, 'hash');
}));
ava_1.default.serial(`User#setPassword() should fail if bcrypt.hash failed'`, t => {
    t.context.stub = sinon.stub(bcrypt, 'hash').callsArgWithAsync(2, new Error('error'), null);
    const user = new models.user();
    t.throws(user.setPassword('password'), 'error');
});
ava_1.default.serial(`User#comparePassword() should compare password hashes`, (t) => __awaiter(this, void 0, void 0, function* () {
    const user = new models.user();
    yield user.setPassword('password');
    t.true(yield user.comparePassword('password'));
    t.false(yield user.comparePassword('123'));
}));
ava_1.default.serial(`User#comparePassword() should fail if bcrypt.compare failed`, (t) => __awaiter(this, void 0, void 0, function* () {
    t.context.stub = sinon.stub(bcrypt, 'compare').callsArgWithAsync(2, new Error('error'), null);
    const user = new models.user();
    yield user.setPassword('password');
    t.throws(user.comparePassword('password'), 'error');
}));
ava_1.default(`VoiceMailMessage#toJSON() should return valid json object`, (t) => __awaiter(this, void 0, void 0, function* () {
    const id = new mongoose_1.Types.ObjectId();
    const m = new models.voiceMailMessage({
        from: 'from',
        startTime: '2016-06-29T10:00:00Z',
        endTime: '2016-06-29T10:01:00Z',
        mediaUrl: 'url'
    });
    m._id = id;
    t.deepEqual(m.toJSON(), { id: id.toString(), from: 'from', startTime: '2016-06-29T10:00:00.000Z', endTime: '2016-06-29T10:01:00.000Z' });
}));
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibW9kZWxzLnRlc3QuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyJtb2RlbHMudGVzdC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7QUFBQSxzQkFBaUIsS0FBSyxDQUFDLENBQUE7QUFDdkIsTUFBWSxNQUFNLFdBQU0sVUFBVSxDQUFDLENBQUE7QUFDbkMsMkJBQThCLFVBQVUsQ0FBQyxDQUFBO0FBQ3pDLHlCQUFpQyxlQUFlLENBQUMsQ0FBQTtBQUNqRCxNQUFZLEtBQUssV0FBTSxPQUFPLENBQUMsQ0FBQTtBQUUvQixNQUFNLFFBQVEsR0FBRyxJQUFJLG1CQUFRLEVBQUUsQ0FBQztBQUMxQixRQUFTLENBQUMsT0FBTyxHQUFHLE1BQU0sQ0FBQyxPQUFPLENBQUM7QUFDekMsTUFBTSxNQUFNLEdBQUcsZ0JBQVMsQ0FBQyxRQUFRLENBQUMsQ0FBQztBQUVuQyxhQUFJLENBQUMsU0FBUyxDQUFDLENBQUM7SUFDZixFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUMsT0FBTyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUM7UUFDcEIsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxJQUFJLENBQUMsT0FBTyxFQUFFLENBQUM7UUFDekIsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxJQUFJLEdBQUcsSUFBSSxDQUFDO0lBQ3ZCLENBQUM7QUFDRixDQUFDLENBQUMsQ0FBQztBQUVILGFBQUksQ0FBQyxNQUFNLENBQUMsb0RBQW9ELEVBQUUsQ0FBTyxDQUFDO0lBQ3pFLENBQUMsQ0FBQyxPQUFPLENBQUMsSUFBSSxHQUFHLEtBQUssQ0FBQyxJQUFJLENBQUMsTUFBTSxFQUFFLE1BQU0sQ0FBQyxDQUFDLGlCQUFpQixDQUFDLENBQUMsRUFBRSxJQUFJLEVBQUUsTUFBTSxDQUFDLENBQUM7SUFDL0UsTUFBTSxJQUFJLEdBQUcsSUFBSSxNQUFNLENBQUMsSUFBSSxFQUFFLENBQUM7SUFDL0IsTUFBTSxJQUFJLENBQUMsV0FBVyxDQUFDLFVBQVUsQ0FBQyxDQUFDO0lBQ25D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WyJpbXBvcnQgdGVzdCBmcm9tICdhdmEnO1xuaW1wb3J0ICogYXMgYmNyeXB0IGZyb20gJ2JjcnlwdGpzJztcbmltcG9ydCB7TW9uZ29vc2UsIFR5cGVzfSBmcm9tICdtb25nb29zZSc7XG5pbXBvcnQgZ2V0TW9kZWxzLCB7SU1vZGVsc30gZnJvbSAnLi4vc3JjL21vZGVscyc7XG5pbXBvcnQgKiBhcyBzaW5vbiBmcm9tICdzaW5vbic7XG5cbmNvbnN0IG1vbmdvb3NlID0gbmV3IE1vbmdvb3NlKCk7XG4oPGFueT5tb25nb29zZSkuUHJvbWlzZSA9IGdsb2JhbC5Qcm9taXNlO1xuY29uc3QgbW9kZWxzID0gZ2V0TW9kZWxzKG1vbmdvb3NlKTtcblxudGVzdC5hZnRlckVhY2godCA9PiB7XG5cdGlmICh0LmNvbnRleHQuc3R1Yikge1xuXHRcdHQuY29udGV4dC5zdHViLnJlc3RvcmUoKTtcblx0XHR0LmNvbnRleHQuc3R1YiA9IG51bGw7XG5cdH1cbn0pO1xuXG50ZXN0LnNlcmlhbChgVXNlciNzZXRQYXNzd29yZCgpIHNob3VsZCBzZXQgZmllbGQgJ3Bhc3N3b3JkSGFzaCdgLCBhc3luYyAodCkgPT4ge1xuXHR0LmNvbnRleHQuc3R1YiA9IHNpbm9uLnN0dWIoYmNyeXB0LCAnaGFzaCcpLmNhbGxzQXJnV2l0aEFzeW5jKDIsIG51bGwsICdoYXNoJyk7XG5cdGNvbnN0IHVzZXIgPSBuZXcgbW9kZWxzLnVzZXIoKTtcblx0YXdhaXQgdXNlci5zZXRQYXNzd29yZCgncGFzc3dvcmQnKTtcblx0dC50cnVlKHQuY29udGV4dC5zdHViLmNhbGxlZCk7XG5cdHQudHJ1ZSh0LmNvbnRleHQuc3R1Yi5sYXN0Q2FsbC5hcmdzWzBdLnN0YXJ0c1dpdGgoJ3Bhc3N3b3JkJykpO1xuXHR0LmlzKCg8YW55PnVzZXIpLnBhc3N3b3JkSGFzaCwgJ2hhc2gnKTtcbn0pO1xuXG5cbnRlc3Quc2VyaWFsKGBVc2VyI3NldFBhc3N3b3JkKCkgc2hvdWxkIGZhaWwgaWYgYmNyeXB0Lmhhc2ggZmFpbGVkJ2AsIHQgPT4ge1xuXHR0LmNvbnRleHQuc3R1YiA9IHNpbm9uLnN0dWIoYmNyeXB0LCAnaGFzaCcpLmNhbGxzQXJnV2l0aEFzeW5jKDIsIG5ldyBFcnJvcignZXJyb3InKSwgbnVsbCk7XG5cdGNvbnN0IHVzZXIgPSBuZXcgbW9kZWxzLnVzZXIoKTtcblx0dC50aHJvd3ModXNlci5zZXRQYXNzd29yZCgncGFzc3dvcmQnKSwgJ2Vycm9yJyk7XG59KTtcblxudGVzdC5zZXJpYWwoYFVzZXIjY29tcGFyZVBhc3N3b3JkKCkgc2hvdWxkIGNvbXBhcmUgcGFzc3dvcmQgaGFzaGVzYCwgYXN5bmMgKHQpID0+IHtcblx0Y29uc3QgdXNlciA9IG5ldyBtb2RlbHMudXNlcigpO1xuXHRhd2FpdCB1c2VyLnNldFBhc3N3b3JkKCdwYXNzd29yZCcpO1xuXHR0LnRydWUoYXdhaXQgdXNlci5jb21wYXJlUGFzc3dvcmQoJ3Bhc3N3b3JkJykpO1xuXHR0LmZhbHNlKGF3YWl0IHVzZXIuY29tcGFyZVBhc3N3b3JkKCcxMjMnKSk7XG59KTtcblxudGVzdC5zZXJpYWwoYFVzZXIjY29tcGFyZVBhc3N3b3JkKCkgc2hvdWxkIGZhaWwgaWYgYmNyeXB0LmNvbXBhcmUgZmFpbGVkYCwgYXN5bmMgKHQpID0+IHtcblx0dC5jb250ZXh0LnN0dWIgPSBzaW5vbi5zdHViKGJjcnlwdCwgJ2NvbXBhcmUnKS5jYWxsc0FyZ1dpdGhBc3luYygyLCBuZXcgRXJyb3IoJ2Vycm9yJyksIG51bGwpO1xuXHRjb25zdCB1c2VyID0gbmV3IG1vZGVscy51c2VyKCk7XG5cdGF3YWl0IHVzZXIuc2V0UGFzc3dvcmQoJ3Bhc3N3b3JkJyk7XG5cdHQudGhyb3dzKHVzZXIuY29tcGFyZVBhc3N3b3JkKCdwYXNzd29yZCcpLCAnZXJyb3InKTtcbn0pO1xuXG50ZXN0KGBWb2ljZU1haWxNZXNzYWdlI3RvSlNPTigpIHNob3VsZCByZXR1cm4gdmFsaWQganNvbiBvYmplY3RgLCBhc3luYyAodCkgPT4ge1xuXHRjb25zdCBpZCA9IG5ldyBUeXBlcy5PYmplY3RJZCgpO1xuXHRjb25zdCBtID0gbmV3IG1vZGVscy52b2ljZU1haWxNZXNzYWdlKHtcblx0XHRmcm9tOiAnZnJvbScsXG5cdFx0c3RhcnRUaW1lOiAnMjAxNi0wNi0yOVQxMDowMDowMFonLFxuXHRcdGVuZFRpbWU6ICcyMDE2LTA2LTI5VDEwOjAxOjAwWicsXG5cdFx0bWVkaWFVcmw6ICd1cmwnXG5cdH0pO1xuXHRtLl9pZCA9IGlkO1xuXHR0LmRlZXBFcXVhbChtLnRvSlNPTigpLCA8YW55PntpZDogaWQudG9TdHJpbmcoKSwgZnJvbTogJ2Zyb20nLCBzdGFydFRpbWU6ICcyMDE2LTA2LTI5VDEwOjAwOjAwLjAwMFonLCBlbmRUaW1lOiAnMjAxNi0wNi0yOVQxMDowMTowMC4wMDBaJ30pO1xufSk7XG4iXX0=