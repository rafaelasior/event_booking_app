import {User} from "./entities/user.entity";

export const USERS: User[] = [
    {
        id: 1,
        username: 'maria',
        email: 'maria@example.org',
        passwordHash: '$2b$10$exampleHashForMaria',
        roles: ['user'],
        active: true,
    },
];