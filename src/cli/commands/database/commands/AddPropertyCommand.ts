/**
 * Database Add Property Command - 데이터베이스 속성 추가
 */

import { Command } from 'commander';
import { DatabaseCommandFactory } from '../DatabaseCommandFactory.js';

export function createAddPropertyCommand(): Command {
  return new Command('add-property')
    .description('데이터베이스에 새 속성을 추가합니다')
    .requiredOption('-d, --database <name>', '데이터베이스 이름 (files, functions, dependencies, libraries, classes)')
    .requiredOption('-n, --name <name>', '속성 이름')
    .requiredOption('-t, --type <type>', '속성 타입 (text, number, select, checkbox, date)')
    .option('-o, --options <options>', 'select 타입의 경우 옵션들 (쉼표로 구분)')
    .action(async (options) => {
      console.log(`🔧 ${options.database}에 "${options.name}" 속성을 추가합니다...`);
      
      try {
        const { config } = await DatabaseCommandFactory.getConfigService();
        const dbId = config.databases[options.database as keyof typeof config.databases];
        if (!dbId) {
          console.log(`❌ ${options.database} 데이터베이스 ID가 설정되지 않았습니다.`);
          process.exit(1);
        }

        let propertyConfig: any = {};
        
        switch (options.type) {
          case 'text':
            propertyConfig = { type: "rich_text", rich_text: {} };
            break;
          case 'number':
            propertyConfig = { type: "number", number: {} };
            break;
          case 'checkbox':
            propertyConfig = { type: "checkbox", checkbox: {} };
            break;
          case 'date':
            propertyConfig = { type: "date", date: {} };
            break;
          case 'select':
            if (!options.options) {
              console.log('❌ select 타입에는 --options가 필요합니다.');
              process.exit(1);
            }
            const selectOptions = options.options.split(',').map((opt: string, index: number) => ({
              name: opt.trim(),
              color: ['blue', 'green', 'yellow', 'red', 'purple', 'orange'][index % 6]
            }));
            propertyConfig = {
              type: "select",
              select: { options: selectOptions }
            };
            break;
          default:
            console.log(`❌ 지원되지 않는 속성 타입: ${options.type}`);
            process.exit(1);
        }

        const notionService = await DatabaseCommandFactory.createNotionService();
        const properties = { [options.name]: propertyConfig };
        
        const result = await notionService.updateDatabase(dbId, { properties });
        
        if (result.success) {
          console.log(`✅ "${options.name}" 속성 추가 완료!`);
        } else {
          console.log(`❌ 속성 추가 실패: ${result.error?.message}`);
          process.exit(1);
        }
        // Ensure process exits after successful completion
        process.exit(0);

      } catch (error: any) {
        console.error(`💥 속성 추가 실패: ${error.message}`);
        process.exit(1);
      }
    });
}
