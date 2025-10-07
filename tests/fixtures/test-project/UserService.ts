export class UserService {
	private users: User[] = [];

	constructor() {
		this.users = [];
	}

	async getUser(id: string): Promise<User | null> {
		return this.users.find((user) => user.id === id) || null;
	}

	async createUser(userData: CreateUserRequest): Promise<User> {
		const user: User = {
			id: Math.random().toString(36).substr(2, 9),
			...userData,
			createdAt: new Date(),
		};
		this.users.push(user);
		return user;
	}

	async updateUser(id: string, updates: Partial<User>): Promise<User | null> {
		const userIndex = this.users.findIndex((user) => user.id === id);
		if (userIndex === -1) return null;

		this.users[userIndex] = { ...this.users[userIndex], ...updates };
		return this.users[userIndex];
	}

	async deleteUser(id: string): Promise<boolean> {
		const userIndex = this.users.findIndex((user) => user.id === id);
		if (userIndex === -1) return false;

		this.users.splice(userIndex, 1);
		return true;
	}

	async getAllUsers(): Promise<User[]> {
		return [...this.users];
	}
}

export interface User {
	id: string;
	name: string;
	email: string;
	createdAt: Date;
}

export interface CreateUserRequest {
	name: string;
	email: string;
}
