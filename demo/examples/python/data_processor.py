"""
Data Processor Module

@semantic-tags: data-module, processing-domain, public-api
@description: 데이터 처리 및 분석을 위한 모듈
"""

import asyncio
import json
import logging
from typing import List, Dict, Any, Optional, Union
from dataclasses import dataclass
from datetime import datetime
import pandas as pd
import numpy as np

# 로거 설정
logger = logging.getLogger(__name__)

@dataclass
class ProcessingResult:
    """
    데이터 처리 결과를 담는 클래스
    
    @semantic-tags: data-class, result-domain, public-api
    """
    success: bool
    data: Any
    metadata: Dict[str, Any]
    timestamp: datetime
    processing_time: float

class DataProcessor:
    """
    데이터 처리기 클래스
    
    @semantic-tags: processor-class, data-domain, public-api
    """
    
    def __init__(self, config: Optional[Dict[str, Any]] = None):
        """
        데이터 처리기 초기화
        
        @semantic-tags: constructor-method, public-api
        @param config: 설정 딕셔너리
        """
        self.config = config or {}
        self.processing_history = []
        self.logger = logging.getLogger(self.__class__.__name__)
    
    async def process_data(self, data: Union[List, Dict, str], 
                          operation: str = "transform") -> ProcessingResult:
        """
        데이터 처리 메인 메서드
        
        @semantic-tags: process-method, public-api
        @param data: 처리할 데이터
        @param operation: 수행할 연산
        @return: 처리 결과
        """
        start_time = datetime.now()
        
        try:
            self.logger.info(f"Starting data processing: {operation}")
            
            # 데이터 타입에 따른 처리
            if isinstance(data, str):
                result_data = await self._process_string_data(data, operation)
            elif isinstance(data, list):
                result_data = await self._process_list_data(data, operation)
            elif isinstance(data, dict):
                result_data = await self._process_dict_data(data, operation)
            else:
                raise ValueError(f"Unsupported data type: {type(data)}")
            
            processing_time = (datetime.now() - start_time).total_seconds()
            
            result = ProcessingResult(
                success=True,
                data=result_data,
                metadata={
                    "operation": operation,
                    "input_type": type(data).__name__,
                    "output_type": type(result_data).__name__,
                    "processing_time": processing_time
                },
                timestamp=start_time,
                processing_time=processing_time
            )
            
            self.processing_history.append(result)
            self.logger.info(f"Data processing completed: {operation}")
            
            return result
            
        except Exception as e:
            self.logger.error(f"Data processing failed: {str(e)}")
            return ProcessingResult(
                success=False,
                data=None,
                metadata={"error": str(e)},
                timestamp=start_time,
                processing_time=(datetime.now() - start_time).total_seconds()
            )
    
    async def _process_string_data(self, data: str, operation: str) -> Any:
        """
        문자열 데이터 처리
        
        @semantic-tags: process-method, private-method
        @param data: 문자열 데이터
        @param operation: 수행할 연산
        @return: 처리된 데이터
        """
        if operation == "transform":
            return data.upper()
        elif operation == "parse":
            try:
                return json.loads(data)
            except json.JSONDecodeError:
                return {"raw": data, "parsed": False}
        elif operation == "clean":
            return data.strip().replace('\n', ' ').replace('\r', ' ')
        else:
            return data
    
    async def _process_list_data(self, data: List, operation: str) -> Any:
        """
        리스트 데이터 처리
        
        @semantic-tags: process-method, private-method
        @param data: 리스트 데이터
        @param operation: 수행할 연산
        @return: 처리된 데이터
        """
        if operation == "transform":
            return [item.upper() if isinstance(item, str) else item for item in data]
        elif operation == "filter":
            return [item for item in data if item is not None]
        elif operation == "sort":
            return sorted(data)
        elif operation == "unique":
            return list(set(data))
        else:
            return data
    
    async def _process_dict_data(self, data: Dict, operation: str) -> Any:
        """
        딕셔너리 데이터 처리
        
        @semantic-tags: process-method, private-method
        @param data: 딕셔너리 데이터
        @param operation: 수행할 연산
        @return: 처리된 데이터
        """
        if operation == "transform":
            return {k.upper(): v for k, v in data.items()}
        elif operation == "filter":
            return {k: v for k, v in data.items() if v is not None}
        elif operation == "flatten":
            return self._flatten_dict(data)
        else:
            return data
    
    def _flatten_dict(self, data: Dict, parent_key: str = '', sep: str = '_') -> Dict:
        """
        딕셔너리 평면화
        
        @semantic-tags: utility-method, private-method
        @param data: 딕셔너리 데이터
        @param parent_key: 부모 키
        @param sep: 구분자
        @return: 평면화된 딕셔너리
        """
        items = []
        for k, v in data.items():
            new_key = f"{parent_key}{sep}{k}" if parent_key else k
            if isinstance(v, dict):
                items.extend(self._flatten_dict(v, new_key, sep=sep).items())
            else:
                items.append((new_key, v))
        return dict(items)
    
    def get_processing_history(self) -> List[ProcessingResult]:
        """
        처리 기록 조회
        
        @semantic-tags: history-method, public-api
        @return: 처리 기록 리스트
        """
        return self.processing_history.copy()
    
    def clear_history(self) -> None:
        """
        처리 기록 초기화
        
        @semantic-tags: reset-method, public-api
        """
        self.processing_history.clear()
        self.logger.info("Processing history cleared")
    
    def get_statistics(self) -> Dict[str, Any]:
        """
        처리 통계 조회
        
        @semantic-tags: stats-method, public-api
        @return: 처리 통계 딕셔너리
        """
        if not self.processing_history:
            return {"total_operations": 0, "success_rate": 0.0}
        
        total_operations = len(self.processing_history)
        successful_operations = sum(1 for result in self.processing_history if result.success)
        success_rate = successful_operations / total_operations
        
        total_processing_time = sum(result.processing_time for result in self.processing_history)
        average_processing_time = total_processing_time / total_operations
        
        return {
            "total_operations": total_operations,
            "successful_operations": successful_operations,
            "success_rate": success_rate,
            "total_processing_time": total_processing_time,
            "average_processing_time": average_processing_time
        }

# 비동기 데이터 처리 함수들
async def process_csv_data(file_path: str) -> pd.DataFrame:
    """
    CSV 파일 데이터 처리
    
    @semantic-tags: async-function, data-function, public-api
    @param file_path: CSV 파일 경로
    @return: 처리된 DataFrame
    """
    try:
        df = pd.read_csv(file_path)
        # 데이터 정리
        df = df.dropna()
        df = df.drop_duplicates()
        return df
    except Exception as e:
        logger.error(f"CSV processing failed: {str(e)}")
        raise

async def process_json_data(data: Union[str, Dict]) -> Dict:
    """
    JSON 데이터 처리
    
    @semantic-tags: async-function, data-function, public-api
    @param data: JSON 데이터
    @return: 처리된 딕셔너리
    """
    try:
        if isinstance(data, str):
            return json.loads(data)
        elif isinstance(data, dict):
            return data
        else:
            raise ValueError("Invalid data type for JSON processing")
    except Exception as e:
        logger.error(f"JSON processing failed: {str(e)}")
        raise

# 메인 실행 함수
async def main():
    """
    메인 실행 함수
    
    @semantic-tags: main-function, public-api
    """
    processor = DataProcessor()
    
    # 테스트 데이터
    test_data = {
        "users": [
            {"name": "John", "age": 30, "city": "New York"},
            {"name": "Jane", "age": 25, "city": "Los Angeles"},
            {"name": "Bob", "age": 35, "city": "Chicago"}
        ],
        "metadata": {
            "total": 3,
            "created_at": "2024-01-01T00:00:00Z"
        }
    }
    
    # 데이터 처리
    result = await processor.process_data(test_data, "transform")
    print(f"Processing result: {result.success}")
    print(f"Processed data: {result.data}")
    
    # 통계 출력
    stats = processor.get_statistics()
    print(f"Statistics: {stats}")

if __name__ == "__main__":
    asyncio.run(main())
