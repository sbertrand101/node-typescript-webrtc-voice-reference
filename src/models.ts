import {Mongoose, Model, Schema, Document} from 'mongoose';
import {hash, compare} from 'bcryptjs';

const pepper = 'JixuYF0AUXLggGNqTP1N1DQi2fEQZgcP';

export interface IUser extends Document {
	userName: string;
	areaCode: string;
	phoneNumber: string;
	endpointId: string;
	sipUri: string;
	sipPassword: string;
	greetingUrl: string;
	setPassword(password: string): Promise<void>;
	comparePassword(password: string): Promise<boolean>;
}


export interface IModels {
	user: Model<IUser>;
}

const userSchema = new Schema({
	userName: { type: String, required: true, unique: true },
	passwordHash: { type: String, required: true },
	areaCode: { type: String, required: true },
	phoneNumber: { type: String, required: true, index: true },
	endpointId: { type: String, required: true },
	sipUri: { type: String, required: true },
	sipPassword: { type: String, required: true },
	greetingUrl: { type: String },
});

userSchema.method('setPassword', (password: string): Promise<void> => {
	return new Promise<void>((resolve, reject) => {
		hash(password + pepper, 10, (err: any, hash: any) => {
			if (err) {
				return reject(err);
			}
			this.passwordHash = hash;
			return resolve(hash);
		});
	});
});

userSchema.method('comparePassword', (password: string): Promise<boolean> => {
	return new Promise<boolean>((resolve, reject) => {
		compare(password + pepper, this.passwordHash, (err: any, result: boolean) => {
			if (err) {
				return reject(err);
			}
			return resolve(result);
		});
	});
});


export default function getModels(mongoose: Mongoose): IModels {
	return {
		user: mongoose.model('user', userSchema) as Model<IUser>
	};
}
