import { Mongoose, Model, Document } from 'mongoose';
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
export default function getModels(mongoose: Mongoose): IModels;
