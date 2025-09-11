import React, { useState } from 'react';
import { Button, Dialog } from '@mui/material';
import axios from 'axios';

// 의도적으로 구문 오류가 포함된 파일
// 분석기의 에러 복구 능력을 테스트

interface Props {
  title: string;
  onClose: () => void;
}

const BrokenComponent: React.FC<Props> = ({ title, onClose }) => {
  const [loading, setLoading] = useState(false);
  
  // 구문 오류 1: 함수 정의 불완전
  const handleSubmit = async (data) => {
    setLoading(true);
    try {
      const response = await axios.post('/api/submit', data
      // 누락된 닫는 괄호와 세미콜론
    } catch (error) {
      console.error('Error:', error);
    }
    setLoading(false);
  };

  // 구문 오류 2: JSX 태그 불완전
  return (
    <Dialog open={true} onClose={onClose}>
      <div>
        <h2>{title}</h2>
        <Button 
          onClick={() => handleSubmit({ test: 'data' })}
          disabled={loading
        >
          Submit
        </Button>
        // 누락된 닫는 태그들
      </div>
    </Dialog>
    // 추가적인 구문 문제들...
    const unusedVariable = "this will cause issues";
    
    // 잘못된 export 위치
    export const utilFunction = () => console.log('test');
  );
};

export default BrokenComponent;