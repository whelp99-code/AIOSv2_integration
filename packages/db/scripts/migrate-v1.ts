/**
 * @deprecated C-Stack greenfield — portal :5434 migration not used.
 * See docs/40-ADR-DEPRECATED-MODELS.md
 *
 * AIOS v1 → v2 통합 마이그레이션 스크립트
 *
 * v1 레거시 데이터(Customer, Partner, Contact 등)를
 * v2 통합 스키마로 마이그레이션합니다.
 *
 * 실행: npx tsx scripts/migrate-v1.ts
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

interface MigrationResult {
  table: string;
  migrated: number;
  skipped: number;
  errors: string[];
}

/**
 * Customer 테이블 마이그레이션
 * - v1의 Customer에 userId가 없는 경우 기본 userId를 할당
 * - status 필드 표준화
 */
async function migrateCustomers(): Promise<MigrationResult> {
  const result: MigrationResult = { table: 'customers', migrated: 0, skipped: 0, errors: [] };

  try {
    const customers = await prisma.customer.findMany({
      where: { userId: '' },
    });

    for (const customer of customers) {
      try {
        // 빈 userId를 가진 레코드에 시스템 사용자 ID 할당
        await prisma.customer.update({
          where: { id: customer.id },
          data: {
            userId: 'system-migration-v1',
            status: customer.status || 'active',
          },
        });
        result.migrated++;
      } catch (err) {
        result.errors.push(`Customer ${customer.id}: ${String(err)}`);
      }
    }

    // 이미 userId가 있는 레코드는 스킵
    const allCustomers = await prisma.customer.count();
    result.skipped = allCustomers - customers.length;
  } catch (err) {
    result.errors.push(`Customer migration failed: ${String(err)}`);
  }

  return result;
}

/**
 * Partner 테이블 마이그레이션
 */
async function migratePartners(): Promise<MigrationResult> {
  const result: MigrationResult = { table: 'partners', migrated: 0, skipped: 0, errors: [] };

  try {
    const partners = await prisma.partner.findMany({
      where: { userId: '' },
    });

    for (const partner of partners) {
      try {
        await prisma.partner.update({
          where: { id: partner.id },
          data: {
            userId: 'system-migration-v1',
            status: partner.status || 'active',
          },
        });
        result.migrated++;
      } catch (err) {
        result.errors.push(`Partner ${partner.id}: ${String(err)}`);
      }
    }

    const allPartners = await prisma.partner.count();
    result.skipped = allPartners - partners.length;
  } catch (err) {
    result.errors.push(`Partner migration failed: ${String(err)}`);
  }

  return result;
}

/**
 * Contact 테이블 마이그레이션
 * - Customer에 연결되지 않은 Contact 정리
 */
async function migrateContacts(): Promise<MigrationResult> {
  const result: MigrationResult = { table: 'contacts', migrated: 0, skipped: 0, errors: [] };

  try {
    // customerId가 유효한 Customer를 참조하는지 확인
    const contacts = await prisma.contact.findMany({
      include: { customer: true },
    });

    for (const contact of contacts) {
      if (!contact.customer) {
        try {
          await prisma.contact.delete({ where: { id: contact.id } });
          result.migrated++;
        } catch (err) {
          result.errors.push(`Contact ${contact.id}: ${String(err)}`);
        }
      } else {
        result.skipped++;
      }
    }
  } catch (err) {
    result.errors.push(`Contact migration failed: ${String(err)}`);
  }

  return result;
}

/**
 * MailMessage 마이그레이션
 * - status가 null인 레코드를 'unread'로 표준화
 */
async function migrateMailMessages(): Promise<MigrationResult> {
  const result: MigrationResult = { table: 'mail_messages', migrated: 0, skipped: 0, errors: [] };

  try {
    const updated = await prisma.mailMessage.updateMany({
      where: { status: null },
      data: { status: 'unread' },
    });
    result.migrated = updated.count;

    const total = await prisma.mailMessage.count();
    result.skipped = total - updated.count;
  } catch (err) {
    result.errors.push(`MailMessage migration failed: ${String(err)}`);
  }

  return result;
}

/**
 * KnowledgeDocument 마이그레이션
 * - tags가 빈 배열인 경우 기본 태그 추가
 */
async function migrateKnowledgeDocuments(): Promise<MigrationResult> {
  const result: MigrationResult = { table: 'knowledge_documents', migrated: 0, skipped: 0, errors: [] };

  try {
    const docs = await prisma.knowledgeDocument.findMany({
      where: { tags: { isEmpty: true } },
    });

    for (const doc of docs) {
      try {
        await prisma.knowledgeDocument.update({
          where: { id: doc.id },
          data: { tags: ['uncategorized'] },
        });
        result.migrated++;
      } catch (err) {
        result.errors.push(`KnowledgeDocument ${doc.id}: ${String(err)}`);
      }
    }

    const total = await prisma.knowledgeDocument.count();
    result.skipped = total - docs.length;
  } catch (err) {
    result.errors.push(`KnowledgeDocument migration failed: ${String(err)}`);
  }

  return result;
}

async function main() {
  console.log('🚀 AIOS v1 → v2 마이그레이션 시작...\n');

  const results: MigrationResult[] = [];

  results.push(await migrateCustomers());
  results.push(await migratePartners());
  results.push(await migrateContacts());
  results.push(await migrateMailMessages());
  results.push(await migrateKnowledgeDocuments());

  console.log('\n📊 마이그레이션 결과:');
  console.log('─'.repeat(60));

  let totalMigrated = 0;
  let totalErrors = 0;

  for (const result of results) {
    const status = result.errors.length > 0 ? '⚠️' : '✅';
    console.log(`${status} ${result.table}: ${result.migrated} migrated, ${result.skipped} skipped`);
    if (result.errors.length > 0) {
      for (const err of result.errors) {
        console.log(`   ❌ ${err}`);
      }
    }
    totalMigrated += result.migrated;
    totalErrors += result.errors.length;
  }

  console.log('─'.repeat(60));
  console.log(`총 ${totalMigrated}건 마이그레이션, ${totalErrors}건 에러`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
