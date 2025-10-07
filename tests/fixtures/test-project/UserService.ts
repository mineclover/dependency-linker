
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
