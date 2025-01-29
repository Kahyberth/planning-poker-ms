import { Injectable } from '@nestjs/common';

@Injectable()
export class PokerWsService {
  requestStory() {
    return [
      {
        id: 1,
        title: 'Implement user authentication',
        description: 'As a user, I want to be able to securely log in ...',
        priority: 'High',
      },
      {
        id: 2,
        title: 'Create dashboard layout',
        description: 'As a user, I want to see a clear overview ...',
        priority: 'Medium',
      },
      {
        id: 3,
        title: 'Login page design',
        description: 'As a user, I want to see a beautiful login page ...',
        priority: 'Low',
      },
      {
        id: 4,
        title: 'Manage user roles',
        description: 'As an admin, I want to be able to manage user roles ...',
        priority: 'High',
      },
    ];
  }
}
