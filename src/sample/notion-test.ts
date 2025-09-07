
// src/main.ts와 동일하게 .env 파일을 최상단에서 로드합니다.
// 모든 api가 성공한 테스트 코드임

import dotenv from 'dotenv';
import * as path from 'path';
dotenv.config({ path: path.resolve(process.cwd(), '.env') });

import { Client, type DatabaseObjectResponse } from '@notionhq/client';
import { ConfigManager } from '../infrastructure/config/configManager.js';
import { logger } from '../shared/utils/index.js';


/**
 * Notion SDK 테스트를 위한 메인 함수
 */
export async function runNotionTest() {
  logger.info('🚀 Notion SDK 테스트를 시작합니다...');

  try {
    // 1. 프로젝트의 표준 설정 관리자를 사용하여 설정 로드
    logger.info('⚙️ 설정을 로드합니다...');
    const configManager = ConfigManager.getInstance();
    // .env와 deplink.config.json 파일로부터 설정을 명시적으로 로드합니다.
    await configManager.loadConfig();
 
    const notionConfig = configManager.getNotionConfig();

    if (!notionConfig || !notionConfig.apiKey) {
      logger.error('❌ Notion API 키가 설정되지 않았습니다. .env 또는 deplink.config.json 파일을 확인해주세요.');
      return;
    }
    logger.info('✅ 설정 로드 완료.');

    // 2. Notion 클라이언트 초기화
    logger.info('🔌 Notion 클라이언트를 초기화합니다...');
    const notion = new Client({ auth: notionConfig.apiKey });
    logger.info('✅ Notion 클라이언트 초기화 완료.');

    // 3. Notion API 연결 테스트 (사용자 목록 조회 - 가장 기본적인 읽기 작업)
  // --- Notion SDK 테스트 로직 ---
    // 이 아래에 자유롭게 Notion SDK를 사용하는 코드를 추가하여 테스트하세요.
    // 예: 특정 데이터베이스 조회, 페이지 생성/수정 등



    console.log('======================== create databases ==========================');


    // 기존 데이터베이스에 테스트할 경우 사용하지 않음
    // const createDB1  = await notion.databases.create({
    //   parent: {
    //     type: 'page_id',
    //     page_id: notionConfig.parentPageId
    //   },
    //   title: [{ text: { content: 'main Database' } }],
    // });

    // console.log(createDB1);

    //https://www.notion.so/graph-mcp/9b75f408ba6440c68157a21699f66c52?v=011fe66ba8b74af985588045231d3970&source=copy_link
    // const createDBId1 = createDB1.id;
    const createDBId1 = "9b75f408ba6440c68157a21699f66c52";
    


    const createDB2  = await notion.databases.create({
      parent: {
        type: 'page_id',
        page_id: notionConfig.parentPageId
      },
      title: [{ text: { content: 'sub Database' } }],
    }) as DatabaseObjectResponse;


    console.log( "createDB2 :: ", createDB2);

    // 생성 할 때 아이디를 가져올 수 있음
    const sub_data_sources_id = createDB2.data_sources[0].id;


    
    console.log(notionConfig);
    // 예시: 특정 데이터베이스 정보 가져오기
    console.log('======================== databases ==========================');
    // const dbInfo = await notion.databases.retrieve({ database_id: notionConfig.databases.files }) as DatabaseObjectResponse;
    // 데이터베이스 아이디가 있으면 retrieve 로 가져올 수 있음
    const dbInfo = await notion.databases.retrieve({ database_id: createDBId1 }) as DatabaseObjectResponse;
    console.log(dbInfo);

    const dataSourceId = dbInfo.data_sources[0].id;

    console.log('======================= dataSources ===========================');
    const dbProperties = await notion.dataSources.retrieve({ data_source_id: dataSourceId });
    // database 안에 data_sources 를 통해 properties 를 얻을 수 있음
    console.log(dbProperties);


    console.log('======================= properties ===========================');

    // RelationPropertyConfigurationRequest

    const properties = dbProperties.properties

    // 한 테이블에 dataSourceId 가 여러 개 생길 수 있게 되었기 때문에 업데이트 할 때는 data_source_id 를 통해 업데이트 해야 하고 2개 이상 생기지 않게 주의
    // 임의로 추가하게 됬을 때 그 아이디가 

    const createProperties = await notion.dataSources.update({ data_source_id : dataSourceId, properties: {

      imports: {
        relation : {

         // 자기 참조 관계
         data_source_id: dataSourceId,
         type: 'dual_property',
         dual_property: {
          // 동기화 할 속성의 이름
          // @ts-ignore
          synced_property_name: 'imported_by'
         
         }
        }
      },
      docs: {
        relation : {
          // 동기화 할 테이블의 dataSourceId 아이디
         data_source_id: sub_data_sources_id,
         type: 'dual_property',
         dual_property: {
          // 무조건 여기서 이 이름으로 설정해줘야 함
          // @ts-ignore
          // 동기화 할 속성의 이름
          // @ts-ignore
          synced_property_name: 'mentioned_in'
          // 이름이 다를 경우 Related to main Database (docs) 처럼 표시 됨
          // xx: 'mentioned_in'
         }
        }
      },
      sample: {
        checkbox : {}
      }
    } });
    console.log(createProperties);


    console.log('======================== update properties ==========================');


   const values = Object.values(createProperties.properties);
   console.log(values);
   
   const title = values.find((value: any) => value.type === 'title');
   const sample = values.find((value: any) => value.name === 'sample');

   // 이름을 변경할 때 properties 키에서는 기존 이름을 사용하고 이름을 변경해야 함

    const updateProperties = await notion.dataSources.update({ data_source_id: dataSourceId, properties: {
      
      //  type : "title" , "unique_id" , "created_by" 같은 유니크 값들은 타입 값이 데이터 소스 내에서 1개기 떄문에 key를 아무 이름으로 사용해도 됨

      title: {
        ...title,
        type: 'title',
        name: 'Hello'
      },   


      // 그러나 타입이 데이터 소스 내에서 여러개 일 경우에는 key를 기존 이름으로 사용해야, 기존 값을 수정함
      // 이름이 겹치지 않으면 새로 생성되고 변경될 이름도 이름이 중복되면 중복되지 않게 이름이 카운팅 됨 > 두번 실행 할 경우 Check 1이 생기고 sample은 항상 없는 결과가 반환
      // 기존 properties를 다시 호출 하지 않아도 됨
      [sample.name]: {
        ...sample,
        name: 'Check'
      },
      dummy: {
        type: 'checkbox',
        checkbox: {}
      }

    } });
    console.log(updateProperties);


    console.log('======================== create pages ==========================');

    

    const createPage1 = await notion.pages.create({
      parent: {
        type: 'database_id',
        database_id: createDBId1
      },
      properties: {
        Hello: {
          title: [{ text: { content: 'sample page A' } }]
        }
      },
    });

    console.log('======================== create page1 ==========================');

    console.log(createPage1);

    console.log('======================== create page2 ==========================');

    
    const createPage2 = await notion.pages.create({
      parent: {
        type: 'database_id',
        database_id: createDBId1
      },

    // properties 수정 할 때 Name 같은 값이 대소문자까지 포함해서 정확하게 적어줘야 함
    // 그런데 이 이름이 노션에서 쉽게 수정됨 그렇기 때문에 아이디를 따로 받아서 사용해야하고 정확한 스키마 정보를 받아서 사용해야 함
    // 기본 값이 Name이여서 이 이름을 사용하지만 

      properties: {
        Hello: {
          title: [{ text: { content: 'sample page B' } }]
        }
      },
    });

    console.log(createPage2);

    const createPage1Id = createPage1.id;
    const createPage2Id = createPage2.id;

    const updatePage1 = await notion.pages.update({
      page_id: createPage1Id,
      properties: {
        imports: {
          relation: [{ id: createPage2Id }]
        }
      },
    });
    console.log('======================== update page1 ==========================');
    console.log(updatePage1);

    

   // --- 테스트 로직 끝 ---

  } catch (error) {
    if (error instanceof Error) {
      logger.error(`❌ 테스트 중 오류 발생: ${error.message}`);
      console.error(error);
    } else {
      logger.error('❌ 알 수 없는 오류가 발생했습니다.');
    }
    process.exit(1);
  }

  logger.info('🎉 Notion SDK 테스트가 성공적으로 완료되었습니다.');
  process.exit(0);
}
