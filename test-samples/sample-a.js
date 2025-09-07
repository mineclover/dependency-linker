
/**
 * Sample A - 기본 테스트 파일
 * Created at: 2025-09-08T03:14:57.269Z
 */

export class SampleA {
  constructor() {
    this.name = 'sample-a';
    this.type = 'utility';
    this.created = new Date();
  }
  
  greet() {
    return 'Hello from Sample A!';
  }
  
  // sample-b에 대한 의존성
  useSampleB() {
    // import { SpecialSampleB } from './sample-b.js';
    return 'Using sample-b functionality';
  }
}

export default SampleA;
