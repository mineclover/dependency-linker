
/**
 * 🆕 NEW Sample B - 새로 생성된 파일
 * Created at: 2025-09-08T03:14:57.270Z
 * Test ID: NEW-SAMPLE-B-1757301297270
 * 
 * This is a COMPLETELY DIFFERENT sample-b.js file!
 */

export class NewSampleB {
  constructor() {
    this.id = 'NEW-SAMPLE-B';
    this.created = new Date();
    this.specialFlag = false; // Different from original
    this.content = 'This is the NEW sample-b with different content';
  }
  
  getNewMessage() {
    return '🆕 This is the NEW sample-b.js with different functionality!';
  }
  
  // 다른 기능: 새로운 의존성
  dependsOn() {
    return ['sample-a.js', 'config/settings.js']; // Different dependencies
  }
  
  // 새로운 기능
  performNewAction() {
    return 'This is a new action only available in the new file';
  }
}

export default NewSampleB;
