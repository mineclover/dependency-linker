
import React, { useState, useEffect, useCallback } from 'react';
import { debounce } from 'lodash';
import axios from 'axios';
import { Router } from 'express';

export interface User {
  id: number;
  name: string;
  email: string;
}

export class UserService {
  private apiUrl: string;
  
  constructor(apiUrl: string) {
    this.apiUrl = apiUrl;
  }
  
  async getUsers(): Promise<User[]> {
    const response = await axios.get(`${this.apiUrl}/users`);
    return response.data;
  }
}

export const UserComponent: React.FC = () => {
  const [users, setUsers] = useState<User[]>([]);
  
  const debouncedFetch = useCallback(
    debounce(async () => {
      const service = new UserService('/api');
      const userData = await service.getUsers();
      setUsers(userData);
    }, 300),
    []
  );
  
  useEffect(() => {
    debouncedFetch();
  }, [debouncedFetch]);
  
  return <div>{users.map(u => <div key={u.id}>{u.name}</div>)}</div>;
};
