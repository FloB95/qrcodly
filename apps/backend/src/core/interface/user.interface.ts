import { type PlanName } from '../config/plan.config';

export interface IUser {
	id: string;
	tokenType: 'session_token' | 'api_key';
	plan: PlanName;
}
