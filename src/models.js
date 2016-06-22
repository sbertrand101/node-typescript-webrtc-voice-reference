"use strict";
const mongoose_1 = require('mongoose');
const bcryptjs_1 = require('bcryptjs');
const pepper = 'JixuYF0AUXLggGNqTP1N1DQi2fEQZgcP';
const userSchema = new mongoose_1.Schema({
    userName: { type: String, required: true, unique: true },
    passwordHash: { type: String, required: true },
    areaCode: { type: String, required: true },
    phoneNumber: { type: String, required: true, index: true },
    endpointId: { type: String, required: true },
    sipUri: { type: String, required: true },
    sipPassword: { type: String, required: true },
    greetingUrl: { type: String },
});
userSchema.method('setPassword', (password) => {
    return new Promise((resolve, reject) => {
        bcryptjs_1.hash(password + pepper, 10, (err, hash) => {
            if (err) {
                return reject(err);
            }
            this.passwordHash = hash;
            return resolve(hash);
        });
    });
});
userSchema.method('comparePassword', (password) => {
    return new Promise((resolve, reject) => {
        bcryptjs_1.compare(password + pepper, this.passwordHash, (err, result) => {
            if (err) {
                return reject(err);
            }
            return resolve(result);
        });
    });
});
function getModels(mongoose) {
    return {
        user: mongoose.model('user', userSchema)
    };
}
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = getModels;
//# sourceMappingURL=models.js.map