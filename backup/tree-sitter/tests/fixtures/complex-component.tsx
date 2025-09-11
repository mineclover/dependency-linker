
import React, { useState, useEffect, useCallback } from 'react';
import { Button } from '@mui/material';
import type { ComponentProps } from 'react';
import styled from 'styled-components';
import { api } from '../api/client';
import { UserData, ApiResponse } from '../types/user';

interface Props extends ComponentProps<'div'> {
  userId: string;
  onUserLoad?: (user: UserData) => void;
}

const Container = styled.div`
  padding: 16px;
  background: white;
`;

export const UserProfile: React.FC<Props> = ({ userId, onUserLoad, ...props }) => {
  const [user, setUser] = useState<UserData | null>(null);
  const [loading, setLoading] = useState(false);

  const loadUser = useCallback(async () => {
    setLoading(true);
    try {
      const response: ApiResponse<UserData> = await api.getUser(userId);
      setUser(response.data);
      onUserLoad?.(response.data);
    } catch (error) {
      console.error('Failed to load user:', error);
    } finally {
      setLoading(false);
    }
  }, [userId, onUserLoad]);

  useEffect(() => {
    loadUser();
  }, [loadUser]);

  if (loading) return <div>Loading...</div>;
  if (!user) return <div>User not found</div>;

  return (
    <Container {...props}>
      <h1>{user.name}</h1>
      <Button onClick={loadUser}>Refresh</Button>
    </Container>
  );
};

export default UserProfile;
