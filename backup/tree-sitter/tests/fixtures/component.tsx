
import React, { PropsWithChildren } from 'react';
import { styled } from '@mui/material/styles';

interface ButtonProps {
  variant?: 'primary' | 'secondary';
  size?: 'small' | 'medium' | 'large';
  disabled?: boolean;
}

const StyledButton = styled('button')<ButtonProps>`
  padding: ${props => props.size === 'small' ? '4px 8px' : '8px 16px'};
  background-color: ${props => props.variant === 'primary' ? 'blue' : 'gray'};
`;

export const Button: React.FC<PropsWithChildren<ButtonProps>> = ({
  children,
  variant = 'primary',
  size = 'medium',
  ...props
}) => {
  return (
    <StyledButton variant={variant} size={size} {...props}>
      {children}
    </StyledButton>
  );
};

export default Button;
