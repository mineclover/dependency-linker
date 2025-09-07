
    /**
     * 🌟 SPECIAL CONTENT FOR TESTING 🌟
     * This is the ORIGINAL sample-b.js with unique content
     * Created at: 2025-09-08T03:14:57.266Z
     * Test ID: ORIGINAL-SAMPLE-B-1757301297267
     */
    
    export class SpecialSampleB {
      constructor() {
        this.id = 'ORIGINAL-SAMPLE-B';
        this.created = new Date();
        this.specialFlag = true;
        this.content = 'This is the original sample-b with special testing content';
      }
      
      getSpecialMessage() {
        return '🎯 This is the ORIGINAL sample-b.js that will be moved!';
      }
      
      // 특별한 기능: 의존성 추적 테스트
      dependsOn() {
        return ['sample-a.js', 'utils/helper.js'];
      }
    }
    