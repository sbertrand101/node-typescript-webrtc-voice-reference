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
	setPassword(password: string): Promise<string>;
	comparePassword(password: string): Promise<boolean>;
}

export interface IActiveCall extends Document {
	createdAt: Date;
	callId: string;
	bridgeId: string;
	from: string;
	to: string;
	user: IUser;
}

export interface IVoiceMailMessage extends Document {
	user: IUser;
	startTime: Date;
	endTime:   Date;
	mediaUrl:  string;
	from:      string;
}


export interface IModels {
	user: Model<IUser>;
	activeCall: Model<IActiveCall>;
	voiceMailMessage: Model<IVoiceMailMessage>;
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

userSchema.method('setPassword', function (password: string): Promise<string> {
	return new Promise<string>((resolve, reject) => {
		hash(password + pepper, 10, (err: any, hash: any) => {
			if (err) {
				return reject(err);
			}
			this.passwordHash = hash;
			return resolve(hash);
		});
	});
});

userSchema.method('comparePassword', function (password: string): Promise<boolean>  {
	return new Promise<boolean>((resolve, reject) => {
		compare(password + pepper, this.passwordHash, (err: any, result: boolean) => {
			if (err) {
				return reject(err);
			}
			return resolve(result);
		});
	});
});

const activeCallSchema = new Schema({
	createdAt: {type: Date, index: true, expires: 2 * 3600},
	callId: {type: String, index: true},
	bridgeId: {type: String, index: true},
	from: String,
	to: String,
	user:  {type: Schema.Types.ObjectId, ref: 'user'}
});


const voiceMailMessageSchema = new Schema({
	startTime: {type: Date, index: true},
	endTime:   Date,
	mediaUrl:  String,
	from:      String,
	user:  {type: Schema.Types.ObjectId, ref: 'user'}
});

voiceMailMessageSchema.set('toJSON', {transform: (doc: any, ret: any, options: any): any => {
	return {
		id: ret._id.toString(),
		from: ret.from,
		startTime: ret.startTime.toISOString(),
		endTime: ret.endTime.toISOString()
	};
}});

export default function getModels(mongoose: Mongoose): IModels {
	const defineModel = (name: string, schema: Schema): any => {
		return (<any>(mongoose)).models[name] || mongoose.model(name, schema);
	};
	return {
		user: defineModel('user', userSchema) as Model<IUser>,
		activeCall: defineModel('activeCall', activeCallSchema) as Model<IActiveCall>,
		voiceMailMessage: defineModel('voiceMailMessage', voiceMailMessageSchema) as Model<IVoiceMailMessage>
	};
}
